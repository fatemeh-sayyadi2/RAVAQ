import { z } from 'zod';
import {
  Category,
  Product,
  ProductVariant,
  Coupon,
  CouponRedemption,
  CartItemInput,
  ValidatedCartItem,
  CartValidationResult,
  Order,
  OrderStatus,
  PaymentAttempt,
  PaymentStatus,
  OrderStatusHistoryEntry,
  InventoryMovement,
  CustomerAddressRecord,
  ReviewRecord,
  UserAccount,
  NewsletterSubscription,
  StoreSettings,
} from './types.ts';
import {
  INITIAL_CATEGORIES,
  INITIAL_PRODUCTS,
  INITIAL_COUPONS,
  INITIAL_REVIEWS,
  INITIAL_STORE_SETTINGS,
} from './seed-catalog.ts';
import {
  normalizeDigits,
  normalizePersianText,
  normalizeIranianMobile,
  isValidIranianMobile,
  normalizeIranianPostalCode,
  isValidIranianPostalCode,
} from './persian.ts';

export interface DatabaseState {
  categories: Category[];
  products: Product[];
  coupons: Coupon[];
  couponRedemptions: CouponRedemption[];
  orders: Order[];
  paymentAttempts: PaymentAttempt[];
  orderStatusHistory: OrderStatusHistoryEntry[];
  inventoryMovements: InventoryMovement[];
  users: UserAccount[];
  addresses: CustomerAddressRecord[];
  reviews: ReviewRecord[];
  newsletterSubscriptions: NewsletterSubscription[];
  settings: StoreSettings;
}

export function createInitialDatabaseState(): DatabaseState {
  return {
    categories: structuredClone(INITIAL_CATEGORIES),
    products: structuredClone(INITIAL_PRODUCTS),
    coupons: structuredClone(INITIAL_COUPONS),
    couponRedemptions: [],
    orders: [],
    paymentAttempts: [],
    orderStatusHistory: [],
    inventoryMovements: [],
    users: [
      {
        id: 'usr-admin-seed',
        uid: 'admin-demo-uid',
        email: 'fawti.tiri2@gmail.com',
        displayName: 'مدیر فروشگاه رواق (آزمایشی)',
        mobile: '09120000000',
        role: 'ADMIN',
        createdAt: '2026-10-01T08:00:00.000Z',
        updatedAt: '2026-10-01T08:00:00.000Z',
      },
    ],
    addresses: [],
    reviews: structuredClone(INITIAL_REVIEWS),
    newsletterSubscriptions: [],
    settings: structuredClone(INITIAL_STORE_SETTINGS),
  };
}

/**
 * Computes effective available stock for a product variant, enforcing bundle inventory rules
 * so a gift box cannot oversell its component products.
 */
export function getEffectiveVariantStock(
  state: DatabaseState,
  product: Product,
  variant: ProductVariant
): number {
  let available = Math.max(0, Math.floor(variant.stock));
  if (product.bundleItems && product.bundleItems.length > 0) {
    for (const bundleItem of product.bundleItems) {
      const compProduct = state.products.find((p) => p.slug === bundleItem.productSlug);
      if (!compProduct || !compProduct.published) {
        return 0;
      }
      const compVariant = bundleItem.variantSku
        ? compProduct.variants.find((v) => v.sku === bundleItem.variantSku)
        : compProduct.variants[0];
      if (!compVariant) {
        return 0;
      }
      const possibleBundles = Math.floor(
        Math.max(0, compVariant.stock) / Math.max(1, bundleItem.unitsRequired)
      );
      available = Math.min(available, possibleBundles);
    }
  }
  return available;
}

/**
 * Searches and filters products with Persian/Arabic character normalization.
 */
export interface ProductFilterOptions {
  query?: string;
  categorySlug?: string;
  occasionTag?: string;
  minPrice?: number;
  maxPrice?: number;
  onlyAvailable?: boolean;
  sortBy?: 'newest' | 'price_asc' | 'price_desc' | 'featured';
  includeUnpublished?: boolean;
}

export function queryProducts(
  state: DatabaseState,
  options: ProductFilterOptions = {}
): Product[] {
  const normalizedQuery = normalizePersianText(options.query || '');

  let list = state.products.filter((product) => {
    if (!options.includeUnpublished && !product.published) return false;

    if (options.categorySlug && options.categorySlug !== 'all') {
      if (options.categorySlug === 'occasion-gifts') {
        const hasOccasion =
          (product.occasionTags && product.occasionTags.length > 0) ||
          product.categorySlug === 'gift-boxes';
        if (!hasOccasion) return false;
      } else if (product.categorySlug !== options.categorySlug) {
        return false;
      }
    }

    if (options.occasionTag) {
      if (!product.occasionTags || !product.occasionTags.includes(options.occasionTag)) {
        return false;
      }
    }

    const lowestVariantPrice =
      product.variants.length > 0
        ? Math.min(...product.variants.map((v) => v.price))
        : product.basePrice;

    if (typeof options.minPrice === 'number' && !Number.isNaN(options.minPrice)) {
      if (lowestVariantPrice < options.minPrice) return false;
    }

    if (typeof options.maxPrice === 'number' && !Number.isNaN(options.maxPrice)) {
      if (lowestVariantPrice > options.maxPrice) return false;
    }

    if (options.onlyAvailable) {
      const totalStock = product.variants.reduce(
        (sum, v) => sum + getEffectiveVariantStock(state, product, v),
        0
      );
      if (totalStock <= 0) return false;
    }

    if (normalizedQuery) {
      const searchable = normalizePersianText(
        [
          product.name,
          product.shortDescription,
          product.fullDescription,
          product.categoryName,
          product.sku,
          ...(product.occasionTags || []),
        ].join(' ')
      );
      if (!searchable.includes(normalizedQuery)) return false;
    }

    return true;
  });

  const sortBy = options.sortBy || 'featured';
  list = [...list].sort((a, b) => {
    if (sortBy === 'price_asc') {
      return a.basePrice - b.basePrice;
    }
    if (sortBy === 'price_desc') {
      return b.basePrice - a.basePrice;
    }
    if (sortBy === 'newest') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    // featured default
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return a.name.localeCompare(b.name, 'fa');
  });

  return list;
}

/**
 * Validates a coupon code against server-side rules.
 */
export function validateCouponForItems(
  state: DatabaseState,
  rawCode: string,
  items: ValidatedCartItem[],
  subtotal: number,
  customerIdentifier?: { userId?: string; mobile?: string },
  now: Date = new Date()
): { valid: boolean; coupon?: Coupon; discountAmount: number; error?: string } {
  const code = normalizeDigits(rawCode).trim().toUpperCase();
  if (!code) {
    return { valid: false, discountAmount: 0, error: 'کد تخفیف وارد نشده است.' };
  }

  const coupon = state.coupons.find((c) => c.code.toUpperCase() === code);
  if (!coupon) {
    return { valid: false, discountAmount: 0, error: 'کد تخفیف واردشده معتبر نیست.' };
  }

  if (!coupon.active) {
    return { valid: false, discountAmount: 0, error: 'این کد تخفیف غیرفعال شده است.' };
  }

  const nowMs = now.getTime();
  if (nowMs < new Date(coupon.startsAt).getTime()) {
    return { valid: false, discountAmount: 0, error: 'زمان استفاده از این کد تخفیف هنوز آغاز نشده است.' };
  }
  if (nowMs > new Date(coupon.endsAt).getTime()) {
    return { valid: false, discountAmount: 0, error: 'مهلت استفاده از این کد تخفیف به پایان رسیده است.' };
  }

  if (coupon.usedCount >= coupon.usageLimit) {
    return { valid: false, discountAmount: 0, error: 'ظرفیت استفاده از این کد تخفیف تکمیل شده است.' };
  }

  if (customerIdentifier && (customerIdentifier.userId || customerIdentifier.mobile)) {
    const normalizedMobile = customerIdentifier.mobile
      ? normalizeIranianMobile(customerIdentifier.mobile)
      : '';
    const redemptionsByCustomer = state.couponRedemptions.filter(
      (r) =>
        r.couponId === coupon.id &&
        ((customerIdentifier.userId && r.userId === customerIdentifier.userId) ||
          (normalizedMobile && r.customerMobile === normalizedMobile))
    );
    if (redemptionsByCustomer.length >= coupon.perCustomerLimit) {
      return {
        valid: false,
        discountAmount: 0,
        error: 'شما پیش‌تر از سقف مجاز این کد تخفیف استفاده کرده‌اید.',
      };
    }
  }

  if (subtotal < coupon.minOrderAmount) {
    return {
      valid: false,
      discountAmount: 0,
      error: `حداقل مبلغ سفارش برای استفاده از این کد ${coupon.minOrderAmount.toLocaleString('fa-IR')} تومان است.`,
    };
  }

  let eligibleSubtotal = subtotal;
  if (coupon.categorySlugRestriction) {
    eligibleSubtotal = items
      .filter((item) => item.categorySlug === coupon.categorySlugRestriction)
      .reduce((sum, item) => sum + item.lineTotal, 0);

    if (eligibleSubtotal <= 0) {
      return {
        valid: false,
        discountAmount: 0,
        error: 'این کد تخفیف تنها برای دسته‌بندی مشخص‌شده قابل استفاده است.',
      };
    }
  }

  let rawDiscount =
    coupon.discountType === 'PERCENTAGE'
      ? Math.round((eligibleSubtotal * coupon.discountValue) / 100)
      : coupon.discountValue;

  if (coupon.maxDiscountAmount && rawDiscount > coupon.maxDiscountAmount) {
    rawDiscount = coupon.maxDiscountAmount;
  }

  const finalDiscount = Math.max(0, Math.min(rawDiscount, eligibleSubtotal, subtotal));

  return {
    valid: true,
    coupon,
    discountAmount: finalDiscount,
  };
}

/**
 * Authoritatively validates cart items against server product prices and stock.
 */
export function validateCart(
  state: DatabaseState,
  rawItems: CartItemInput[],
  options: {
    couponCode?: string;
    deliveryMethod?: 'STANDARD' | 'EXPRESS_TEHRAN';
    userId?: string;
    customerMobile?: string;
    now?: Date;
  } = {}
): CartValidationResult {
  const warnings: string[] = [];
  const mergedMap = new Map<string, CartItemInput>();

  for (const raw of rawItems || []) {
    if (!raw || !raw.productId || !raw.variantId) continue;
    const qty = Math.max(1, Math.min(50, Math.floor(Number(raw.quantity) || 1)));
    const key = `${raw.productId}::${raw.variantId}`;
    const existing = mergedMap.get(key);
    if (existing) {
      existing.quantity = Math.min(50, existing.quantity + qty);
      if (raw.giftMessage) existing.giftMessage = raw.giftMessage.slice(0, 200);
    } else {
      mergedMap.set(key, {
        productId: raw.productId,
        variantId: raw.variantId,
        quantity: qty,
        giftMessage: raw.giftMessage ? raw.giftMessage.slice(0, 200) : undefined,
      });
    }
  }

  const validatedItems: ValidatedCartItem[] = [];

  for (const item of mergedMap.values()) {
    const product = state.products.find((p) => p.id === item.productId);
    if (!product || !product.published) {
      warnings.push('یکی از محصولات سبد خرید دیگر در دسترس نیست و حذف شد.');
      continue;
    }

    const variant = product.variants.find((v) => v.id === item.variantId);
    if (!variant) {
      warnings.push(`تنوع انتخاب‌شده برای «${product.name}» یافت نشد.`);
      continue;
    }

    const availableStock = getEffectiveVariantStock(state, product, variant);
    if (availableStock <= 0) {
      warnings.push(`موجودی «${product.name} (${variant.label})» به پایان رسیده است.`);
      validatedItems.push({
        productId: product.id,
        productSlug: product.slug,
        productName: product.name,
        categorySlug: product.categorySlug,
        variantId: variant.id,
        variantLabel: variant.label,
        sku: variant.sku,
        unitPrice: variant.price,
        compareAtPrice: variant.compareAtPrice,
        quantity: 0,
        availableStock: 0,
        lineTotal: 0,
        illustrationKey: product.images[0]?.illustrationKey || 'nuts',
        giftMessage: item.giftMessage,
        unavailable: true,
      });
      continue;
    }

    let finalQty = item.quantity;
    let stockAdjusted = false;
    if (finalQty > availableStock) {
      finalQty = availableStock;
      stockAdjusted = true;
      warnings.push(
        `تعداد «${product.name} (${variant.label})» به دلیل محدودیت موجودی به ${availableStock.toLocaleString('fa-IR')} عدد تغییر یافت.`
      );
    }

    validatedItems.push({
      productId: product.id,
      productSlug: product.slug,
      productName: product.name,
      categorySlug: product.categorySlug,
      variantId: variant.id,
      variantLabel: variant.label,
      sku: variant.sku,
      unitPrice: variant.price,
      compareAtPrice: variant.compareAtPrice,
      quantity: finalQty,
      availableStock,
      lineTotal: variant.price * finalQty,
      illustrationKey: product.images[0]?.illustrationKey || 'nuts',
      giftMessage: item.giftMessage,
      stockAdjusted,
    });
  }

  const activeItems = validatedItems.filter((i) => !i.unavailable && i.quantity > 0);
  const subtotal = activeItems.reduce((sum, i) => sum + i.lineTotal, 0);

  let discountAmount = 0;
  let appliedCoupon: CartValidationResult['appliedCoupon'];
  let couponError: string | undefined;

  if (options.couponCode && options.couponCode.trim()) {
    const couponCheck = validateCouponForItems(
      state,
      options.couponCode,
      activeItems,
      subtotal,
      { userId: options.userId, mobile: options.customerMobile },
      options.now
    );
    if (couponCheck.valid && couponCheck.coupon) {
      discountAmount = couponCheck.discountAmount;
      appliedCoupon = {
        code: couponCheck.coupon.code,
        description: couponCheck.coupon.description,
        discountAmount,
      };
    } else {
      couponError = couponCheck.error;
    }
  }

  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const { freeShippingThreshold, standardShippingCost, expressTehranShippingCost } =
    state.settings;

  let shippingCost = 0;
  if (activeItems.length > 0) {
    if (afterDiscount >= freeShippingThreshold) {
      shippingCost = 0;
    } else {
      shippingCost =
        options.deliveryMethod === 'EXPRESS_TEHRAN'
          ? expressTehranShippingCost
          : standardShippingCost;
    }
  }

  const payableTotal = afterDiscount + shippingCost;

  return {
    items: validatedItems,
    subtotal,
    discountAmount,
    appliedCoupon,
    couponError,
    shippingCost,
    freeShippingThreshold,
    payableTotal,
    warnings,
  };
}

export const CheckoutInputSchema = z.object({
  customerName: z.string().trim().min(2, 'نام و نام خانوادگی گیرنده باید حداقل ۲ حرف باشد.').max(100),
  customerMobile: z.string().trim().min(10, 'شماره موبایل معتبر وارد کنید.'),
  customerEmail: z.string().trim().email('ایمیل واردشده معتبر نیست.').optional().or(z.literal('')),
  province: z.string().trim().min(2, 'انتخاب استان الزامی است.').max(60),
  city: z.string().trim().min(2, 'انتخاب شهر الزامی است.').max(60),
  addressLine: z.string().trim().min(8, 'نشانی کامل پستی باید حداقل ۸ کاراکتر باشد.').max(300),
  postalCode: z.string().trim().min(10, 'کد پستی ۱۰ رقمی معتبر وارد کنید.'),
  orderNote: z.string().trim().max(400).optional(),
  deliveryMethod: z.enum(['STANDARD', 'EXPRESS_TEHRAN']).default('STANDARD'),
  acceptedTerms: z.boolean().refine((val) => val === true, {
    message: 'تأیید قوانین و شرایط آزمایشی فروشگاه الزامی است.',
  }),
  couponCode: z.string().trim().optional(),
  idempotencyKey: z.string().trim().max(100).optional(),
  userId: z.string().trim().optional(),
  items: z.array(
    z.object({
      productId: z.string(),
      variantId: z.string(),
      quantity: z.number().int().min(1).max(50),
      giftMessage: z.string().max(200).optional(),
    })
  ).min(1, 'سبد خرید شما خالی است.'),
});

export type CheckoutInput = z.infer<typeof CheckoutInputSchema>;

export function createOrder(
  state: DatabaseState,
  rawInput: unknown,
  now: Date = new Date()
): {
  success: boolean;
  order?: Order;
  paymentAttempt?: PaymentAttempt;
  fieldErrors?: Record<string, string>;
  error?: string;
  idempotentReplay?: boolean;
} {
  const parsed = CheckoutInputSchema.safeParse(rawInput);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const pathKey = String(issue.path[0] || 'form');
      if (!fieldErrors[pathKey]) {
        fieldErrors[pathKey] = issue.message;
      }
    }
    return {
      success: false,
      fieldErrors,
      error: 'لطفاً اطلاعات فرم تسویه‌حساب را بررسی و تکمیل کنید.',
    };
  }

  const input = parsed.data;
  const normalizedMobile = normalizeIranianMobile(input.customerMobile);
  const normalizedPostal = normalizeIranianPostalCode(input.postalCode);

  const fieldErrors: Record<string, string> = {};
  if (!isValidIranianMobile(normalizedMobile)) {
    fieldErrors.customerMobile = 'شماره موبایل ایران باید ۱۱ رقم و با ۰۹ شروع شود (مانند ۰۹۱۲۳۴۵۶۷۸۹).';
  }
  if (!isValidIranianPostalCode(normalizedPostal)) {
    fieldErrors.postalCode = 'کد پستی باید دقیقاً ۱۰ رقم عددی باشد.';
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false,
      fieldErrors,
      error: 'برخی از فیلدهای اطلاعات ارسال معتبر نیستند.',
    };
  }

  // Prevent duplicate order creation when idempotencyKey matches an existing order
  if (input.idempotencyKey) {
    const existingOrder = state.orders.find((o) => o.idempotencyKey === input.idempotencyKey);
    if (existingOrder) {
      const existingAttempt = state.paymentAttempts.find((pa) => pa.orderId === existingOrder.id);
      return {
        success: true,
        order: existingOrder,
        paymentAttempt: existingAttempt,
        idempotentReplay: true,
      };
    }
  }

  // Validate authoritative cart, inventory, and coupon
  const cartResult = validateCart(state, input.items, {
    couponCode: input.couponCode,
    deliveryMethod: input.deliveryMethod,
    userId: input.userId,
    customerMobile: normalizedMobile,
    now,
  });

  if (cartResult.items.some((i) => i.unavailable || i.stockAdjusted)) {
    return {
      success: false,
      error:
        cartResult.warnings[0] ||
        'موجودی برخی از اقلام سبد خرید تغییر کرده است. لطفاً سبد خرید را بررسی کنید.',
    };
  }

  const validItems = cartResult.items.filter((i) => i.quantity > 0 && !i.unavailable);
  if (validItems.length === 0) {
    return {
      success: false,
      error: 'هیچ محصول قايل فروشی در سبد خرید وجود ندارد.',
    };
  }

  if (input.couponCode && input.couponCode.trim() && cartResult.couponError) {
    return {
      success: false,
      fieldErrors: { couponCode: cartResult.couponError },
      error: cartResult.couponError,
    };
  }

  if (cartResult.subtotal < state.settings.minOrderAmount) {
    return {
      success: false,
      error: `حداقل مبلغ سفارش در فروشگاه رواق ${state.settings.minOrderAmount.toLocaleString('fa-IR')} تومان است.`,
    };
  }

  const nowIso = now.toISOString();
  const seq = 1001 + state.orders.length;
  const orderId = `ord-${seq}-${Math.random().toString(36).slice(2, 7)}`;
  const orderNumber = `RVQ-1405-${seq}`;

  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
  const attemptSeq = 100 + state.paymentAttempts.length + 1;
  const attemptRef = `PAY-RVQ-${seq}-${attemptSeq}`;

  const order: Order = {
    id: orderId,
    orderNumber,
    userId: input.userId,
    customerName: input.customerName,
    customerMobile: normalizedMobile,
    customerEmail: input.customerEmail || undefined,
    province: input.province,
    city: input.city,
    addressLine: input.addressLine,
    postalCode: normalizedPostal,
    orderNote: input.orderNote,
    deliveryMethod: input.deliveryMethod,
    items: validItems.map((item, idx) => ({
      id: `${orderId}-item-${idx + 1}`,
      productId: item.productId,
      productSlug: item.productSlug,
      productName: item.productName,
      variantId: item.variantId,
      variantLabel: item.variantLabel,
      sku: item.sku,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: item.lineTotal,
      giftMessage: item.giftMessage,
    })),
    subtotal: cartResult.subtotal,
    discountAmount: cartResult.discountAmount,
    couponCode: cartResult.appliedCoupon?.code,
    shippingCost: cartResult.shippingCost,
    totalAmount: cartResult.payableTotal,
    status: 'PENDING_PAYMENT',
    paymentStatus: 'PENDING',
    stockDeducted: false,
    isSimulatedDemo: true,
    lastAttemptRef: attemptRef,
    idempotencyKey: input.idempotencyKey,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const paymentAttempt: PaymentAttempt = {
    id: `pay-${attemptSeq}`,
    attemptRef,
    orderId: order.id,
    orderNumber: order.orderNumber,
    userId: input.userId,
    amount: order.totalAmount,
    status: 'PENDING',
    isSimulatedDemo: true,
    createdAt: nowIso,
    updatedAt: nowIso,
    expiresAt,
  };

  const historyEntry: OrderStatusHistoryEntry = {
    id: `hist-${state.orderStatusHistory.length + 1}`,
    orderId: order.id,
    userId: input.userId,
    status: 'PENDING_PAYMENT',
    paymentStatus: 'PENDING',
    note: 'سفارش ثبت شد و در انتظار پرداخت آزمایشی است.',
    actor: input.userId || 'guest',
    createdAt: nowIso,
  };

  state.orders.unshift(order);
  state.paymentAttempts.unshift(paymentAttempt);
  state.orderStatusHistory.unshift(historyEntry);

  return {
    success: true,
    order,
    paymentAttempt,
  };
}

/**
 * Processes a simulated payment transition (SUCCEED, FAIL, CANCEL, EXPIRE).
 * Enforces idempotency, state machine validity, forged amount rejection, and atomic stock deduction.
 */
export function processPaymentAttempt(
  state: DatabaseState,
  params: {
    attemptRef: string;
    action: 'SUCCEED' | 'FAIL' | 'CANCEL' | 'EXPIRE';
    expectedAmount?: number;
    reason?: string;
    now?: Date;
  }
): {
  success: boolean;
  order?: Order;
  paymentAttempt?: PaymentAttempt;
  idempotentReplay?: boolean;
  error?: string;
} {
  const now = params.now || new Date();
  const nowIso = now.toISOString();

  const attempt = state.paymentAttempts.find((pa) => pa.attemptRef === params.attemptRef);
  if (!attempt) {
    return {
      success: false,
      error: 'مرجع تلاش پرداخت یافت نشد.',
    };
  }

  const order = state.orders.find((o) => o.id === attempt.orderId);
  if (!order) {
    return {
      success: false,
      error: 'سفارش مرتبط با این تلاش پرداخت یافت نشد.',
    };
  }

  // Reject forged or manipulated payment amounts
  if (
    typeof params.expectedAmount === 'number' &&
    params.expectedAmount !== order.totalAmount
  ) {
    return {
      success: false,
      error: 'مبلغ تراکنش با مبلغ ثبت‌شده سفارش در سرور مطابقت ندارد (خطای امنیتی).',
    };
  }

  // Idempotent replay check: if already SUCCEEDED and caller sends SUCCEED again
  if (attempt.status === 'SUCCEEDED' && params.action === 'SUCCEED') {
    return {
      success: true,
      order,
      paymentAttempt: attempt,
      idempotentReplay: true,
    };
  }

  // Prevent any transition out of a terminal payment state
  if (attempt.status !== 'PENDING') {
    return {
      success: false,
      order,
      paymentAttempt: attempt,
      error: `وضعیت این تلاش پرداخت قبلاً «${attempt.status}» ثبت شده و قابل تغییر به وضعیت جدید نیست.`,
    };
  }

  // Prevent paying an order that has already been paid via another attempt
  if (order.status !== 'PENDING_PAYMENT' || order.stockDeducted || order.paymentStatus === 'SUCCEEDED') {
    return {
      success: false,
      order,
      paymentAttempt: attempt,
      error: 'این سفارش قبلاً پرداخت یا تعیین تکلیف شده است.',
    };
  }

  // Check expiration
  if (now.getTime() > new Date(attempt.expiresAt).getTime() || params.action === 'EXPIRE') {
    attempt.status = 'EXPIRED';
    attempt.failureReason = params.reason || 'مهلت زمانی درگاه پرداخت آزمایشی منقضی شد.';
    attempt.updatedAt = nowIso;
    attempt.completedAt = nowIso;

    order.paymentStatus = 'EXPIRED';
    order.updatedAt = nowIso;

    state.orderStatusHistory.unshift({
      id: `hist-${state.orderStatusHistory.length + 1}`,
      orderId: order.id,
      status: order.status,
      paymentStatus: 'EXPIRED',
      note: attempt.failureReason,
      actor: 'system',
      createdAt: nowIso,
    });

    if (params.action === 'EXPIRE') {
      return { success: true, order, paymentAttempt: attempt };
    }
    return {
      success: false,
      order,
      paymentAttempt: attempt,
      error: 'مهلت این تلاش پرداخت به پایان رسیده است. لطفاً تلاش مجدد ایجاد کنید.',
    };
  }

  if (params.action === 'FAIL') {
    attempt.status = 'FAILED';
    attempt.failureReason = params.reason || 'تراکنش آزمایشی توسط شبیه‌ساز ناموفق اعلام شد.';
    attempt.updatedAt = nowIso;
    attempt.completedAt = nowIso;

    order.paymentStatus = 'FAILED';
    order.updatedAt = nowIso;

    state.orderStatusHistory.unshift({
      id: `hist-${state.orderStatusHistory.length + 1}`,
      orderId: order.id,
      status: order.status,
      paymentStatus: 'FAILED',
      note: attempt.failureReason,
      actor: 'payment-simulator',
      createdAt: nowIso,
    });

    return {
      success: true,
      order,
      paymentAttempt: attempt,
    };
  }

  if (params.action === 'CANCEL') {
    attempt.status = 'CANCELLED';
    attempt.failureReason = params.reason || 'فرآیند پرداخت آزمایشی توسط کاربر لغو شد.';
    attempt.updatedAt = nowIso;
    attempt.completedAt = nowIso;

    order.paymentStatus = 'CANCELLED';
    order.updatedAt = nowIso;

    state.orderStatusHistory.unshift({
      id: `hist-${state.orderStatusHistory.length + 1}`,
      orderId: order.id,
      status: order.status,
      paymentStatus: 'CANCELLED',
      note: attempt.failureReason,
      actor: 'customer',
      createdAt: nowIso,
    });

    return {
      success: true,
      order,
      paymentAttempt: attempt,
    };
  }

  // Action === 'SUCCEED': Verify stock for all items & bundle components before atomic deduction
  for (const item of order.items) {
    const product = state.products.find((p) => p.id === item.productId);
    const variant = product?.variants.find((v) => v.id === item.variantId);
    if (!product || !variant) {
      return {
        success: false,
        error: `محصول «${item.productName}» دیگر در کاتالوگ موجود نیست.`,
      };
    }
    const effectiveStock = getEffectiveVariantStock(state, product, variant);
    if (effectiveStock < item.quantity) {
      attempt.status = 'FAILED';
      attempt.failureReason = `عدم کفایت موجودی انبار برای «${item.productName}» در لحظه تسویه.`;
      attempt.updatedAt = nowIso;
      attempt.completedAt = nowIso;
      order.paymentStatus = 'FAILED';
      order.updatedAt = nowIso;
      return {
        success: false,
        order,
        paymentAttempt: attempt,
        error: attempt.failureReason,
      };
    }
  }

  // Deduct stock atomically and log InventoryMovements
  for (const item of order.items) {
    const product = state.products.find((p) => p.id === item.productId)!;
    const variant = product.variants.find((v) => v.id === item.variantId)!;
    const prevStock = variant.stock;
    variant.stock = Math.max(0, variant.stock - item.quantity);

    state.inventoryMovements.unshift({
      id: `inv-${state.inventoryMovements.length + 1}-${Math.random().toString(36).slice(2, 5)}`,
      productId: product.id,
      productName: product.name,
      variantId: variant.id,
      variantLabel: variant.label,
      sku: variant.sku,
      delta: -item.quantity,
      previousStock: prevStock,
      newStock: variant.stock,
      reason: 'ORDER_PAID',
      referenceId: order.orderNumber,
      createdAt: nowIso,
    });

    // If product is a gift bundle, also deduct component stocks
    if (product.bundleItems && product.bundleItems.length > 0) {
      for (const bundleItem of product.bundleItems) {
        const compProduct = state.products.find((p) => p.slug === bundleItem.productSlug);
        const compVariant = bundleItem.variantSku
          ? compProduct?.variants.find((v) => v.sku === bundleItem.variantSku)
          : compProduct?.variants[0];
        if (compProduct && compVariant) {
          const deductUnits = bundleItem.unitsRequired * item.quantity;
          const prevCompStock = compVariant.stock;
          compVariant.stock = Math.max(0, compVariant.stock - deductUnits);

          state.inventoryMovements.unshift({
            id: `inv-${state.inventoryMovements.length + 1}-${Math.random().toString(36).slice(2, 5)}`,
            productId: compProduct.id,
            productName: compProduct.name,
            variantId: compVariant.id,
            variantLabel: compVariant.label,
            sku: compVariant.sku,
            delta: -deductUnits,
            previousStock: prevCompStock,
            newStock: compVariant.stock,
            reason: 'BUNDLE_COMPONENT_PAID',
            referenceId: `${order.orderNumber} (${product.name})`,
            createdAt: nowIso,
          });
        }
      }
    }
  }

  // Record coupon redemption if applicable
  if (order.couponCode) {
    const coupon = state.coupons.find(
      (c) => c.code.toUpperCase() === order.couponCode!.toUpperCase()
    );
    if (coupon) {
      coupon.usedCount += 1;
      state.couponRedemptions.unshift({
        id: `red-${state.couponRedemptions.length + 1}`,
        couponId: coupon.id,
        couponCode: coupon.code,
        orderId: order.id,
        userId: order.userId,
        customerMobile: order.customerMobile,
        discountAmount: order.discountAmount,
        redeemedAt: nowIso,
      });
    }
  }

  attempt.status = 'SUCCEEDED';
  attempt.updatedAt = nowIso;
  attempt.completedAt = nowIso;

  order.status = 'PAID';
  order.paymentStatus = 'SUCCEEDED';
  order.stockDeducted = true;
  order.updatedAt = nowIso;

  state.orderStatusHistory.unshift({
    id: `hist-${state.orderStatusHistory.length + 1}`,
    orderId: order.id,
    status: 'PAID',
    paymentStatus: 'SUCCEEDED',
    note: `پرداخت آزمایشی با مرجع ${attempt.attemptRef} با موفقیت تأیید و موجودی انبار کسر شد.`,
    actor: 'payment-simulator',
    createdAt: nowIso,
  });

  return {
    success: true,
    order,
    paymentAttempt: attempt,
  };
}

/**
 * Creates a controlled retry payment attempt for an unpaid order whose previous attempt failed/cancelled/expired.
 */
export function createRetryPaymentAttempt(
  state: DatabaseState,
  orderNumber: string,
  now: Date = new Date()
): {
  success: boolean;
  order?: Order;
  paymentAttempt?: PaymentAttempt;
  error?: string;
} {
  const normalizedOrderNum = normalizeDigits(orderNumber).trim().toUpperCase();
  const order = state.orders.find((o) => o.orderNumber.toUpperCase() === normalizedOrderNum);
  if (!order) {
    return { success: false, error: 'سفارش مورد نظر یافت نشد.' };
  }

  if (order.status !== 'PENDING_PAYMENT' || order.paymentStatus === 'SUCCEEDED' || order.stockDeducted) {
    return {
      success: false,
      error: 'این سفارش قبلاً پرداخت شده یا قابلیت ایجاد تلاش پرداخت مجدد ندارد.',
    };
  }

  // Re-verify stock availability before issuing a new payment attempt
  for (const item of order.items) {
    const product = state.products.find((p) => p.id === item.productId);
    const variant = product?.variants.find((v) => v.id === item.variantId);
    if (!product || !variant || getEffectiveVariantStock(state, product, variant) < item.quantity) {
      return {
        success: false,
        error: `موجودی «${item.productName}» برای تلاش مجدد کافی نیست.`,
      };
    }
  }

  const nowIso = now.toISOString();
  // Mark any still-PENDING attempts for this order as EXPIRED
  for (const pa of state.paymentAttempts) {
    if (pa.orderId === order.id && pa.status === 'PENDING') {
      pa.status = 'EXPIRED';
      pa.failureReason = 'جایگزین‌شده با تلاش پرداخت جدید.';
      pa.updatedAt = nowIso;
    }
  }

  const attemptSeq = 100 + state.paymentAttempts.length + 1;
  const newAttempt: PaymentAttempt = {
    id: `pay-${attemptSeq}`,
    attemptRef: `PAY-${order.orderNumber}-${attemptSeq}`,
    orderId: order.id,
    orderNumber: order.orderNumber,
    userId: order.userId,
    amount: order.totalAmount,
    status: 'PENDING',
    isSimulatedDemo: true,
    createdAt: nowIso,
    updatedAt: nowIso,
    expiresAt: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
  };

  order.paymentStatus = 'PENDING';
  order.lastAttemptRef = newAttempt.attemptRef;
  order.updatedAt = nowIso;

  state.paymentAttempts.unshift(newAttempt);
  state.orderStatusHistory.unshift({
    id: `hist-${state.orderStatusHistory.length + 1}`,
    orderId: order.id,
    userId: order.userId,
    status: order.status,
    paymentStatus: 'PENDING',
    note: `تلاش پرداخت مجدد (${newAttempt.attemptRef}) ایجاد شد.`,
    actor: 'customer',
    createdAt: nowIso,
  });

  return {
    success: true,
    order,
    paymentAttempt: newAttempt,
  };
}

/**
 * Verifies order tracking request without exposing full address or full mobile number.
 */
export function trackOrderSafe(
  state: DatabaseState,
  rawOrderNumber: string,
  rawCustomerMobile: string
): {
  found: boolean;
  error?: string;
  trackingData?: {
    orderNumber: string;
    status: OrderStatus;
    paymentStatus: PaymentStatus;
    createdAt: string;
    updatedAt: string;
    city: string;
    province: string;
    maskedRecipient: string;
    maskedMobile: string;
    totalAmount: number;
    items: { productName: string; variantLabel: string; quantity: number }[];
    history: OrderStatusHistoryEntry[];
  };
} {
  const orderNum = normalizeDigits(rawOrderNumber).trim().toUpperCase();
  const mobile = normalizeIranianMobile(rawCustomerMobile);

  if (!orderNum || !mobile) {
    return {
      found: false,
      error: 'لطفاً شماره سفارش و شماره موبایل ثبت‌شده در سفارش را وارد کنید.',
    };
  }

  const order = state.orders.find((o) => o.orderNumber.toUpperCase() === orderNum);
  if (!order || order.customerMobile !== mobile) {
    return {
      found: false,
      error: 'سفارشی با این شماره سفارش و شماره موبایل یافت نشد.',
    };
  }

  const history = state.orderStatusHistory
    .filter((h) => h.orderId === order.id)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

  const maskedMobile =
    order.customerMobile.slice(0, 4) + '***' + order.customerMobile.slice(-4);
  const nameParts = order.customerName.split(' ');
  const maskedRecipient =
    nameParts[0] + (nameParts.length > 1 ? ` ${nameParts[1].charAt(0)}.` : '');

  return {
    found: true,
    trackingData: {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      city: order.city,
      province: order.province,
      maskedRecipient,
      maskedMobile,
      totalAmount: order.totalAmount,
      items: order.items.map((i) => ({
        productName: i.productName,
        variantLabel: i.variantLabel,
        quantity: i.quantity,
      })),
      history,
    },
  };
}

/**
 * Checks whether a user is authorized to view/modify an order.
 */
export function canUserAccessOrder(
  user: { uid?: string; role?: string } | null | undefined,
  order: Order
): boolean {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  if (user.uid && order.userId && user.uid === order.userId) return true;
  return false;
}

/**
 * Computes real database-derived metrics for the Admin Dashboard.
 */
export function getAdminDashboardMetrics(state: DatabaseState) {
  const totalOrders = state.orders.length;
  const pendingPayments = state.orders.filter((o) => o.status === 'PENDING_PAYMENT').length;
  const paidOrdersList = state.orders.filter(
    (o) =>
      o.paymentStatus === 'SUCCEEDED' &&
      (o.status === 'PAID' ||
        o.status === 'PROCESSING' ||
        o.status === 'SHIPPED' ||
        o.status === 'DELIVERED')
  );
  const paidOrders = paidOrdersList.length;
  const totalPaidSales = paidOrdersList.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalProducts = state.products.length;

  const lowStockVariants: {
    productId: string;
    productName: string;
    variantId: string;
    variantLabel: string;
    sku: string;
    stock: number;
  }[] = [];

  for (const product of state.products) {
    for (const variant of product.variants) {
      if (variant.stock <= 10) {
        lowStockVariants.push({
          productId: product.id,
          productName: product.name,
          variantId: variant.id,
          variantLabel: variant.label,
          sku: variant.sku,
          stock: variant.stock,
        });
      }
    }
  }

  return {
    totalOrders,
    pendingPayments,
    paidOrders,
    totalPaidSales,
    totalProducts,
    lowStockCount: lowStockVariants.length,
    lowStockVariants,
    recentOrders: state.orders.slice(0, 8),
  };
}

/**
 * Controlled admin fulfillment status transition.
 * Admins cannot mark an unpaid order as PAID/SHIPPED without a valid succeeded payment attempt.
 */
export function updateOrderFulfillmentStatus(
  state: DatabaseState,
  params: {
    orderId: string;
    newStatus: OrderStatus;
    note?: string;
    adminActor: string;
    now?: Date;
  }
): { success: boolean; order?: Order; error?: string } {
  const order = state.orders.find((o) => o.id === params.orderId);
  if (!order) {
    return { success: false, error: 'سفارش یافت نشد.' };
  }

  if (
    (params.newStatus === 'PAID' ||
      params.newStatus === 'PROCESSING' ||
      params.newStatus === 'SHIPPED' ||
      params.newStatus === 'DELIVERED') &&
    order.paymentStatus !== 'SUCCEEDED'
  ) {
    return {
      success: false,
      error: 'امکان تغییر وضعیت ارسال برای سفارشی که پرداخت آن تأیید نشده وجود ندارد.',
    };
  }

  const nowIso = (params.now || new Date()).toISOString();
  order.status = params.newStatus;
  order.updatedAt = nowIso;

  state.orderStatusHistory.unshift({
    id: `hist-${state.orderStatusHistory.length + 1}`,
    orderId: order.id,
    status: params.newStatus,
    paymentStatus: order.paymentStatus,
    note: params.note || `وضعیت سفارش توسط مدیر به «${params.newStatus}» تغییر یافت.`,
    actor: params.adminActor,
    createdAt: nowIso,
  });

  return { success: true, order };
}

/**
 * Auditable admin inventory adjustment.
 */
export function adjustVariantInventory(
  state: DatabaseState,
  params: {
    productId: string;
    variantId: string;
    newStock: number;
    referenceNote: string;
    now?: Date;
  }
): { success: boolean; movement?: InventoryMovement; error?: string } {
  const product = state.products.find((p) => p.id === params.productId);
  const variant = product?.variants.find((v) => v.id === params.variantId);
  if (!product || !variant) {
    return { success: false, error: 'محصول یا تنوع مورد نظر یافت نشد.' };
  }

  const cleanStock = Math.max(0, Math.floor(Number(params.newStock) || 0));
  const prevStock = variant.stock;
  const delta = cleanStock - prevStock;
  variant.stock = cleanStock;

  const movement: InventoryMovement = {
    id: `inv-${state.inventoryMovements.length + 1}-${Math.random().toString(36).slice(2, 5)}`,
    productId: product.id,
    productName: product.name,
    variantId: variant.id,
    variantLabel: variant.label,
    sku: variant.sku,
    delta,
    previousStock: prevStock,
    newStock: cleanStock,
    reason: 'ADMIN_ADJUSTMENT',
    referenceId: params.referenceNote || 'اصلاح موجودی توسط مدیر',
    createdAt: (params.now || new Date()).toISOString(),
  };

  state.inventoryMovements.unshift(movement);
  return { success: true, movement };
}

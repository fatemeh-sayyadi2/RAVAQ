import {
  db,
  auth,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  query,
  where,
  runTransaction,
  writeBatch,
  isVerifiedFirebaseAdmin,
} from './firebase.ts';
import {
  Category,
  Product,
  Coupon,
  CouponRedemption,
  CartItemInput,
  CartValidationResult,
  Order,
  OrderStatus,
  PaymentAttempt,
  OrderStatusHistoryEntry,
  InventoryMovement,
  CustomerAddressRecord,
  ReviewRecord,
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
  DatabaseState,
  createInitialDatabaseState,
  getEffectiveVariantStock,
  validateCart,
  CheckoutInputSchema,
  getAdminDashboardMetrics,
} from './commerce-engine.ts';
import {
  normalizeDigits,
  normalizeIranianMobile,
  isValidIranianMobile,
  normalizeIranianPostalCode,
  isValidIranianPostalCode,
} from './persian.ts';

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      out[k] = v;
    }
  }
  return out as T;
}

export function buildOrderTrackingKey(orderNumber: string, customerMobile: string): string {
  const cleanOrderNum = normalizeDigits(orderNumber).trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
  const cleanMobile = normalizeIranianMobile(customerMobile);
  return `${cleanOrderNum}_${cleanMobile}`;
}

export function buildMaskedTrackingSummary(
  order: Order,
  history: OrderStatusHistoryEntry[],
  userId: string
) {
  const trackingKey = buildOrderTrackingKey(order.orderNumber, order.customerMobile);
  const maskedMobile =
    order.customerMobile.slice(0, 4) + '***' + order.customerMobile.slice(-4);
  const nameParts = order.customerName.trim().split(/\s+/);
  const maskedRecipient =
    nameParts[0] + (nameParts.length > 1 ? ` ${nameParts[1].charAt(0)}.` : '');

  return {
    trackingKey,
    orderNumber: order.orderNumber,
    userId,
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
    history: history.slice(0, 25).map((h) => ({
      id: h.id,
      orderId: h.orderId,
      status: h.status,
      paymentStatus: h.paymentStatus,
      note: h.note,
      actor: h.actor,
      createdAt: h.createdAt,
    })),
  };
}

/**
 * Seeds the initial catalog into Firestore if the admin is signed in and collections are empty.
 */
export async function ensureCatalogSeededIfAdmin(): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) return;
  const isAdmin = await isVerifiedFirebaseAdmin(currentUser);
  if (!isAdmin) return;

  try {
    const prodSnap = await getDocs(collection(db, 'products'));
    if (prodSnap.empty) {
      const batch = writeBatch(db);
      for (const cat of INITIAL_CATEGORIES) {
        batch.set(doc(db, 'categories', cat.id), stripUndefined(cat));
      }
      for (const prod of INITIAL_PRODUCTS) {
        batch.set(doc(db, 'products', prod.id), stripUndefined(prod));
      }
      for (const cpn of INITIAL_COUPONS) {
        batch.set(doc(db, 'coupons', cpn.id), stripUndefined(cpn));
      }
      for (const rev of INITIAL_REVIEWS) {
        batch.set(doc(db, 'reviews', rev.id), stripUndefined(rev));
      }
      batch.set(doc(db, 'settings', 'store'), stripUndefined(INITIAL_STORE_SETTINGS));
      await batch.commit();
    } else {
      // Sync any existing Firestore product documents that still hold legacy .svg/.webp or /assets/categories/ URLs
      const seededById = new Map(INITIAL_PRODUCTS.map((p) => [p.id, p]));
      const batch = writeBatch(db);
      let needsCommit = false;
      for (const docSnap of prodSnap.docs) {
        const data = docSnap.data() as Product;
        const seeded = seededById.get(data.id);
        if (!seeded) continue;
        const hasStaleImage = (data.images || []).some(
          (img) =>
            !img.url ||
            img.url.endsWith('.svg') ||
            img.url.endsWith('.webp') ||
            img.url.startsWith('/assets/ravaq/') ||
            img.url.startsWith('/assets/categories/')
        );
        if (hasStaleImage || JSON.stringify(data.images) !== JSON.stringify(seeded.images)) {
          batch.update(doc(db, 'products', data.id), {
            images: stripUndefined(seeded.images),
          });
          needsCommit = true;
        }
      }
      if (needsCommit) {
        await batch.commit();
      }
    }
  } catch (err) {
    console.warn('Catalog seed skipped or awaiting rules deployment:', err);
  }
}

/**
 * Loads public catalog state from Firestore, merging with seed catalog if Firestore is not yet seeded.
 */
export async function loadPublicCatalogStateFromFirestore(): Promise<DatabaseState> {
  const baseState = createInitialDatabaseState();

  try {
    const [catSnap, prodSnap, cpnSnap, revSnap, settingsSnap] = await Promise.all([
      getDocs(query(collection(db, 'categories'), where('active', '==', true))).catch(() => null),
      getDocs(query(collection(db, 'products'), where('published', '==', true))).catch(() => null),
      getDocs(query(collection(db, 'coupons'), where('active', '==', true))).catch(() => null),
      getDocs(collection(db, 'reviews')).catch(() => null),
      getDoc(doc(db, 'settings', 'store')).catch(() => null),
    ]);

    if (catSnap && !catSnap.empty) {
      baseState.categories = catSnap.docs.map((d) => d.data() as Category);
    }
    if (prodSnap && !prodSnap.empty) {
      const fsProducts = prodSnap.docs.map((d) => d.data() as Product);
      const byId = new Map(baseState.products.map((p) => [p.id, p]));
      for (const fp of fsProducts) {
        const seededProd = byId.get(fp.id);
        byId.set(fp.id, {
          ...fp,
          images: seededProd ? seededProd.images : fp.images,
        });
      }
      baseState.products = Array.from(byId.values());
    }
    if (cpnSnap && !cpnSnap.empty) {
      const fsCoupons = cpnSnap.docs.map((d) => d.data() as Coupon);
      const byId = new Map(baseState.coupons.map((c) => [c.id, c]));
      for (const fc of fsCoupons) {
        byId.set(fc.id, fc);
      }
      baseState.coupons = Array.from(byId.values());
    }
    if (revSnap && !revSnap.empty) {
      const fsReviews = revSnap.docs.map((d) => d.data() as ReviewRecord);
      const byId = new Map(baseState.reviews.map((r) => [r.id, r]));
      for (const fr of fsReviews) {
        byId.set(fr.id, fr);
      }
      baseState.reviews = Array.from(byId.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    }
    if (settingsSnap && settingsSnap.exists()) {
      baseState.settings = {
        ...baseState.settings,
        ...(settingsSnap.data() as StoreSettings),
      };
    }
  } catch {
    // Fallback to initial state if offline
  }

  return baseState;
}

export async function firestoreBootstrap() {
  await ensureCatalogSeededIfAdmin();
  const state = await loadPublicCatalogStateFromFirestore();
  const seededRef = createInitialDatabaseState();
  const seededProductBySlug = new Map(seededRef.products.map((sp) => [sp.slug, sp]));

  const enrichedProducts = state.products
    .filter((p) => p.published)
    .map((p) => {
      const seededProd = seededProductBySlug.get(p.slug);
      const verifiedFallback =
        seededProd?.images[0]?.url || '/assets/products/gift-box-signature.jpg';
      const images = (seededProd ? seededProd.images : p.images).map((img) => ({
        ...img,
        url:
          !img.url ||
          img.url.startsWith('/assets/ravaq/') ||
          img.url.startsWith('/assets/categories/') ||
          img.url.endsWith('.svg') ||
          img.url.endsWith('.webp')
            ? verifiedFallback
            : img.url,
      }));
      return {
        ...p,
        images,
        variants: p.variants.map((v) => ({
          ...v,
          effectiveStock: getEffectiveVariantStock(state, p, v),
        })),
      };
    });

  return {
    categories: state.categories
      .filter((c) => c.active)
      .sort((a, b) => a.displayOrder - b.displayOrder),
    products: enrichedProducts,
    reviews: state.reviews,
    settings: state.settings,
    activeCoupons: state.coupons
      .filter(
        (c) =>
          c.active &&
          new Date(c.endsAt).getTime() > Date.now() &&
          c.usedCount < c.usageLimit
      )
      .map((c) => ({
        code: c.code,
        description: c.description,
        minOrderAmount: c.minOrderAmount,
      })),
  };
}

export async function firestoreValidateCart(params: {
  items: CartItemInput[];
  couponCode?: string;
  deliveryMethod?: 'STANDARD' | 'EXPRESS_TEHRAN';
  customerMobile?: string;
}): Promise<CartValidationResult> {
  const state = await loadPublicCatalogStateFromFirestore();
  const currentUser = auth.currentUser;

  if (currentUser && params.couponCode) {
    try {
      const redSnap = await getDocs(
        query(collection(db, 'couponRedemptions'), where('userId', '==', currentUser.uid))
      );
      state.couponRedemptions = redSnap.docs.map((d) => d.data() as CouponRedemption);
    } catch {
      // ignore if empty
    }
  }

  return validateCart(state, Array.isArray(params.items) ? params.items : [], {
    couponCode: params.couponCode,
    deliveryMethod: params.deliveryMethod === 'EXPRESS_TEHRAN' ? 'EXPRESS_TEHRAN' : 'STANDARD',
    userId: currentUser?.uid,
    customerMobile: params.customerMobile,
  });
}

/**
 * Creates a persistent order and initial simulated payment attempt in Firestore.
 * Requires an authenticated Firebase user so order ownership and security rules are enforced.
 */
export async function firestoreCreateOrder(rawInput: unknown): Promise<{
  success: boolean;
  order?: Order;
  paymentAttempt?: PaymentAttempt;
  fieldErrors?: Record<string, string>;
  error?: string;
  idempotentReplay?: boolean;
}> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return {
      success: false,
      error: 'برای ثبت نهایی سفارش و ورود به درگاه آزمایشی، لطفاً ابتدا وارد حساب کاربری خود شوید.',
    };
  }

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
    fieldErrors.customerMobile =
      'شماره موبایل ایران باید ۱۱ رقم و با ۰۹ شروع شود (مانند ۰۹۱۲۳۴۵۶۷۸۹).';
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

  // Check idempotency replay for this user's orders
  if (input.idempotencyKey) {
    try {
      const myOrdersSnap = await getDocs(
        query(collection(db, 'orders'), where('userId', '==', currentUser.uid))
      );
      const existingOrder = myOrdersSnap.docs
        .map((d) => d.data() as Order)
        .find((o) => o.idempotencyKey === input.idempotencyKey);

      if (existingOrder) {
        const attemptsSnap = await getDocs(
          query(collection(db, 'paymentAttempts'), where('userId', '==', currentUser.uid))
        );
        const existingAttempt = attemptsSnap.docs
          .map((d) => d.data() as PaymentAttempt)
          .find((pa) => pa.orderId === existingOrder.id);
        return {
          success: true,
          order: existingOrder,
          paymentAttempt: existingAttempt,
          idempotentReplay: true,
        };
      }
    } catch {
      // continue
    }
  }

  const state = await loadPublicCatalogStateFromFirestore();
  try {
    const redSnap = await getDocs(
      query(collection(db, 'couponRedemptions'), where('userId', '==', currentUser.uid))
    );
    state.couponRedemptions = redSnap.docs.map((d) => d.data() as CouponRedemption);
  } catch {
    // ignore
  }

  const now = new Date();
  const cartResult = validateCart(state, input.items, {
    couponCode: input.couponCode,
    deliveryMethod: input.deliveryMethod,
    userId: currentUser.uid,
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
      error: 'هیچ محصول قابل فروشی در سبد خرید وجود ندارد.',
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
  const suffix = `${Date.now().toString().slice(-5)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  const orderId = `ord-${suffix}`;
  const orderNumber = `RVQ-1405-${suffix}`;
  const attemptRef = `PAY-RVQ-${suffix}-1`;

  const order: Order & { isSimulatedDemo: boolean; lastAttemptRef: string } = stripUndefined({
    id: orderId,
    orderNumber,
    userId: currentUser.uid,
    customerName: input.customerName.trim().slice(0, 100),
    customerMobile: normalizedMobile,
    customerEmail: input.customerEmail ? input.customerEmail.trim().slice(0, 160) : undefined,
    province: input.province.trim().slice(0, 60),
    city: input.city.trim().slice(0, 60),
    addressLine: input.addressLine.trim().slice(0, 300),
    postalCode: normalizedPostal,
    orderNote: input.orderNote ? input.orderNote.trim().slice(0, 400) : undefined,
    deliveryMethod: input.deliveryMethod,
    items: validItems.map((item, idx) =>
      stripUndefined({
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
      })
    ),
    subtotal: cartResult.subtotal,
    discountAmount: cartResult.discountAmount,
    couponCode: cartResult.appliedCoupon?.code,
    shippingCost: cartResult.shippingCost,
    totalAmount: cartResult.payableTotal,
    status: 'PENDING_PAYMENT',
    paymentStatus: 'PENDING',
    stockDeducted: false,
    idempotencyKey: input.idempotencyKey,
    isSimulatedDemo: true,
    lastAttemptRef: attemptRef,
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
  const paymentAttempt: PaymentAttempt & { userId: string; isSimulatedDemo: boolean } = {
    id: attemptRef,
    attemptRef,
    orderId: order.id,
    orderNumber: order.orderNumber,
    userId: currentUser.uid,
    amount: order.totalAmount,
    status: 'PENDING',
    isSimulatedDemo: true,
    createdAt: nowIso,
    updatedAt: nowIso,
    expiresAt,
  };

  const historyEntry: OrderStatusHistoryEntry & { userId: string } = {
    id: `hist-${orderId}-1`,
    orderId: order.id,
    userId: currentUser.uid,
    status: 'PENDING_PAYMENT',
    paymentStatus: 'PENDING',
    note: 'سفارش ثبت شد و در انتظار پرداخت آزمایشی (شبیه‌سازی‌شده) است.',
    actor: currentUser.uid,
    createdAt: nowIso,
  };

  const trackingSummary = buildMaskedTrackingSummary(order, [historyEntry], currentUser.uid);

  const batch = writeBatch(db);
  batch.set(doc(db, 'orders', order.id), order);
  batch.set(doc(db, 'paymentAttempts', attemptRef), paymentAttempt);
  batch.set(doc(db, 'orderStatusHistory', historyEntry.id), historyEntry);
  batch.set(doc(db, 'orderTracking', trackingSummary.trackingKey), trackingSummary);

  await batch.commit();

  return {
    success: true,
    order,
    paymentAttempt,
  };
}

export async function firestoreGetPaymentStatus(attemptRef: string) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('برای مشاهده وضعیت پرداخت ابتدا وارد حساب کاربری خود شوید.');
  }

  const attemptSnap = await getDoc(doc(db, 'paymentAttempts', attemptRef));
  if (!attemptSnap.exists()) {
    throw new Error('مرجع تلاش پرداخت یافت نشد.');
  }
  const attempt = attemptSnap.data() as PaymentAttempt & { userId?: string };

  const orderSnap = await getDoc(doc(db, 'orders', attempt.orderId));
  if (!orderSnap.exists()) {
    throw new Error('سفارش مرتبط یافت نشد.');
  }
  const order = orderSnap.data() as Order;

  // Query all attempts and history for this user and filter by orderId
  const isAdmin = await isVerifiedFirebaseAdmin(currentUser);
  const attemptsQuery = isAdmin
    ? query(collection(db, 'paymentAttempts'), where('orderId', '==', order.id))
    : query(collection(db, 'paymentAttempts'), where('userId', '==', currentUser.uid));
  const historyQuery = isAdmin
    ? query(collection(db, 'orderStatusHistory'), where('orderId', '==', order.id))
    : query(collection(db, 'orderStatusHistory'), where('userId', '==', currentUser.uid));

  const [allAttemptsSnap, historySnap] = await Promise.all([
    getDocs(attemptsQuery).catch(() => null),
    getDocs(historyQuery).catch(() => null),
  ]);

  const allAttempts = (allAttemptsSnap?.docs.map((d) => d.data() as PaymentAttempt) || [attempt])
    .filter((pa) => pa.orderId === order.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const history = (historySnap?.docs.map((d) => d.data() as OrderStatusHistoryEntry) || [])
    .filter((h) => h.orderId === order.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return {
    paymentAttempt: attempt,
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      totalAmount: order.totalAmount,
      subtotal: order.subtotal,
      discountAmount: order.discountAmount,
      shippingCost: order.shippingCost,
      status: order.status,
      paymentStatus: order.paymentStatus,
      items: order.items,
      createdAt: order.createdAt,
    },
    allAttempts,
    history,
  };
}

/**
 * Concurrency-safe simulated payment transition using Firestore runTransaction.
 * Prevents double payment, forged amounts, and concurrent stock overselling.
 */
export async function firestoreProcessPaymentAttempt(params: {
  attemptRef: string;
  action: 'SUCCEED' | 'FAIL' | 'CANCEL' | 'EXPIRE';
  expectedAmount?: number;
  reason?: string;
}): Promise<{
  success: boolean;
  order?: Order;
  paymentAttempt?: PaymentAttempt;
  idempotentReplay?: boolean;
  error?: string;
}> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return {
      success: false,
      error: 'برای انجام عملیات درگاه آزمایشی ابتدا وارد حساب کاربری شوید.',
    };
  }

  const catalogState = await loadPublicCatalogStateFromFirestore();

  return runTransaction(db, async (tx) => {
    const now = new Date();
    const nowIso = now.toISOString();

    const attemptRefDoc = doc(db, 'paymentAttempts', params.attemptRef);
    const attemptSnap = await tx.get(attemptRefDoc);
    if (!attemptSnap.exists()) {
      return { success: false, error: 'مرجع تلاش پرداخت یافت نشد.' };
    }
    const attempt = attemptSnap.data() as PaymentAttempt & { userId: string; isSimulatedDemo?: boolean };

    const orderRefDoc = doc(db, 'orders', attempt.orderId);
    const orderSnap = await tx.get(orderRefDoc);
    if (!orderSnap.exists()) {
      return { success: false, error: 'سفارش مرتبط با این تلاش پرداخت یافت نشد.' };
    }
    const order = orderSnap.data() as Order & { isSimulatedDemo?: boolean; lastAttemptRef?: string };

    if (
      typeof params.expectedAmount === 'number' &&
      params.expectedAmount !== order.totalAmount
    ) {
      return {
        success: false,
        error: 'مبلغ تراکنش با مبلغ ثبت‌شده سفارش مطابقت ندارد (خطای امنیتی).',
      };
    }

    if (attempt.status === 'SUCCEEDED' && params.action === 'SUCCEED') {
      return {
        success: true,
        order,
        paymentAttempt: attempt,
        idempotentReplay: true,
      };
    }

    if (attempt.status !== 'PENDING') {
      return {
        success: false,
        order,
        paymentAttempt: attempt,
        error: `وضعیت این تلاش پرداخت قبلاً «${attempt.status}» ثبت شده و قابل تغییر نیست.`,
      };
    }

    if (
      order.status !== 'PENDING_PAYMENT' ||
      order.stockDeducted ||
      order.paymentStatus === 'SUCCEEDED'
    ) {
      return {
        success: false,
        order,
        paymentAttempt: attempt,
        error: 'این سفارش قبلاً پرداخت یا تعیین تکلیف شده است.',
      };
    }

    const trackingKey = buildOrderTrackingKey(order.orderNumber, order.customerMobile);
    const trackingRefDoc = doc(db, 'orderTracking', trackingKey);
    const trackingSnap = await tx.get(trackingRefDoc);
    const existingTrackingHistory: OrderStatusHistoryEntry[] = trackingSnap.exists()
      ? (trackingSnap.data().history as OrderStatusHistoryEntry[]) || []
      : [];

    const isExpiredByTime = now.getTime() > new Date(attempt.expiresAt).getTime();

    if (isExpiredByTime || params.action === 'EXPIRE') {
      const failReason = params.reason || 'مهلت زمانی درگاه پرداخت آزمایشی منقضی شد.';
      const updatedAttempt = {
        ...attempt,
        status: 'EXPIRED' as const,
        failureReason: failReason,
        updatedAt: nowIso,
        completedAt: nowIso,
      };
      const updatedOrder = {
        ...order,
        paymentStatus: 'EXPIRED' as const,
        isSimulatedDemo: true,
        lastAttemptRef: attempt.attemptRef,
        updatedAt: nowIso,
      };
      const histId = `hist-${order.id}-${Date.now()}`;
      const newHist: OrderStatusHistoryEntry & { userId: string } = {
        id: histId,
        orderId: order.id,
        userId: order.userId || currentUser.uid,
        status: order.status,
        paymentStatus: 'EXPIRED',
        note: failReason,
        actor: 'system',
        createdAt: nowIso,
      };

      tx.update(attemptRefDoc, {
        status: 'EXPIRED',
        failureReason: failReason,
        updatedAt: nowIso,
        completedAt: nowIso,
      });
      tx.update(orderRefDoc, {
        paymentStatus: 'EXPIRED',
        lastAttemptRef: attempt.attemptRef,
        updatedAt: nowIso,
      });
      tx.set(doc(db, 'orderStatusHistory', histId), newHist);
      if (trackingSnap.exists()) {
        tx.set(
          trackingRefDoc,
          buildMaskedTrackingSummary(
            updatedOrder,
            [newHist, ...existingTrackingHistory],
            order.userId || currentUser.uid
          )
        );
      }

      if (params.action === 'EXPIRE') {
        return { success: true, order: updatedOrder, paymentAttempt: updatedAttempt };
      }
      return {
        success: false,
        order: updatedOrder,
        paymentAttempt: updatedAttempt,
        error: 'مهلت این تلاش پرداخت به پایان رسیده است. لطفاً تلاش مجدد ایجاد کنید.',
      };
    }

    if (params.action === 'FAIL' || params.action === 'CANCEL') {
      const targetStatus = params.action === 'FAIL' ? ('FAILED' as const) : ('CANCELLED' as const);
      const failReason =
        params.reason ||
        (params.action === 'FAIL'
          ? 'تراکنش آزمایشی توسط شبیه‌ساز ناموفق اعلام شد.'
          : 'فرآیند پرداخت آزمایشی توسط کاربر لغو شد.');

      const updatedAttempt = {
        ...attempt,
        status: targetStatus,
        failureReason: failReason,
        updatedAt: nowIso,
        completedAt: nowIso,
      };
      const updatedOrder = {
        ...order,
        paymentStatus: targetStatus,
        isSimulatedDemo: true,
        lastAttemptRef: attempt.attemptRef,
        updatedAt: nowIso,
      };
      const histId = `hist-${order.id}-${Date.now()}`;
      const newHist: OrderStatusHistoryEntry & { userId: string } = {
        id: histId,
        orderId: order.id,
        userId: order.userId || currentUser.uid,
        status: order.status,
        paymentStatus: targetStatus,
        note: failReason,
        actor: params.action === 'FAIL' ? 'payment-simulator' : currentUser.uid,
        createdAt: nowIso,
      };

      tx.update(attemptRefDoc, {
        status: targetStatus,
        failureReason: failReason,
        updatedAt: nowIso,
        completedAt: nowIso,
      });
      tx.update(orderRefDoc, {
        paymentStatus: targetStatus,
        lastAttemptRef: attempt.attemptRef,
        updatedAt: nowIso,
      });
      tx.set(doc(db, 'orderStatusHistory', histId), newHist);
      if (trackingSnap.exists()) {
        tx.set(
          trackingRefDoc,
          buildMaskedTrackingSummary(
            updatedOrder,
            [newHist, ...existingTrackingHistory],
            order.userId || currentUser.uid
          )
        );
      }

      return {
        success: true,
        order: updatedOrder,
        paymentAttempt: updatedAttempt,
      };
    }

    // Action === 'SUCCEED': Read all affected product documents inside the transaction
    const productIdsToRead = new Set<string>();
    for (const item of order.items) {
      productIdsToRead.add(item.productId);
      const catProd = catalogState.products.find((p) => p.id === item.productId);
      if (catProd?.bundleItems) {
        for (const bi of catProd.bundleItems) {
          const comp = catalogState.products.find((p) => p.slug === bi.productSlug);
          if (comp) productIdsToRead.add(comp.id);
        }
      }
    }

    const txProductDocs = new Map<string, { existsInFs: boolean; data: Product }>();
    for (const pid of productIdsToRead) {
      const pSnap = await tx.get(doc(db, 'products', pid));
      if (pSnap.exists()) {
        txProductDocs.set(pid, {
          existsInFs: true,
          data: structuredClone(pSnap.data() as Product),
        });
      } else {
        const fallbackProd = catalogState.products.find((p) => p.id === pid);
        if (fallbackProd) {
          txProductDocs.set(pid, {
            existsInFs: false,
            data: structuredClone(fallbackProd),
          });
        }
      }
    }

    // Read coupon document if order used a coupon
    let couponDocSnap: { id: string; existsInFs: boolean; data: Coupon } | null = null;
    if (order.couponCode) {
      const matchedCoupon = catalogState.coupons.find(
        (c) => c.code.toUpperCase() === order.couponCode!.toUpperCase()
      );
      if (matchedCoupon) {
        const cSnap = await tx.get(doc(db, 'coupons', matchedCoupon.id));
        couponDocSnap = {
          id: matchedCoupon.id,
          existsInFs: cSnap.exists(),
          data: cSnap.exists()
            ? structuredClone(cSnap.data() as Coupon)
            : structuredClone(matchedCoupon),
        };
      }
    }

    // Build a transaction-consistent state for bundle & variant stock verification
    const txState: DatabaseState = {
      ...catalogState,
      products: catalogState.products.map((p) => txProductDocs.get(p.id)?.data || p),
    };

    // Verify stock for every item before deducting
    for (const item of order.items) {
      const prodEntry = txProductDocs.get(item.productId);
      const product = prodEntry?.data;
      const variant = product?.variants.find((v) => v.id === item.variantId);
      if (!product || !variant) {
        return {
          success: false,
          error: `محصول «${item.productName}» دیگر در کاتالوگ موجود نیست.`,
        };
      }
      const effectiveStock = getEffectiveVariantStock(txState, product, variant);
      if (effectiveStock < item.quantity) {
        const stockFailReason = `عدم کفایت موجودی انبار برای «${item.productName}» در لحظه تسویه.`;
        const failedAttempt = {
          ...attempt,
          status: 'FAILED' as const,
          failureReason: stockFailReason,
          updatedAt: nowIso,
          completedAt: nowIso,
        };
        const failedOrder = {
          ...order,
          paymentStatus: 'FAILED' as const,
          updatedAt: nowIso,
        };
        tx.update(attemptRefDoc, {
          status: 'FAILED',
          failureReason: stockFailReason,
          updatedAt: nowIso,
          completedAt: nowIso,
        });
        tx.update(orderRefDoc, {
          paymentStatus: 'FAILED',
          lastAttemptRef: attempt.attemptRef,
          updatedAt: nowIso,
        });
        return {
          success: false,
          order: failedOrder,
          paymentAttempt: failedAttempt,
          error: stockFailReason,
        };
      }
    }

    // Deduct stock atomically and log InventoryMovements
    const touchedProductIds = new Set<string>();
    const movementsToCreate: InventoryMovement[] = [];

    for (const item of order.items) {
      const prodEntry = txProductDocs.get(item.productId)!;
      const product = prodEntry.data;
      const variant = product.variants.find((v) => v.id === item.variantId)!;
      const prevStock = variant.stock;
      variant.stock = Math.max(0, variant.stock - item.quantity);
      product.updatedAt = nowIso;
      touchedProductIds.add(product.id);

      movementsToCreate.push({
        id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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

      if (product.bundleItems && product.bundleItems.length > 0) {
        for (const bundleItem of product.bundleItems) {
          const compProduct = Array.from(txProductDocs.values())
            .map((e) => e.data)
            .find((p) => p.slug === bundleItem.productSlug);
          const compVariant = bundleItem.variantSku
            ? compProduct?.variants.find((v) => v.sku === bundleItem.variantSku)
            : compProduct?.variants[0];

          if (compProduct && compVariant) {
            const deductUnits = bundleItem.unitsRequired * item.quantity;
            const prevCompStock = compVariant.stock;
            compVariant.stock = Math.max(0, compVariant.stock - deductUnits);
            compProduct.updatedAt = nowIso;
            touchedProductIds.add(compProduct.id);

            movementsToCreate.push({
              id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
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

    // Write product variant stock updates for existing Firestore product docs
    for (const pid of touchedProductIds) {
      const entry = txProductDocs.get(pid);
      if (entry && entry.existsInFs) {
        tx.update(doc(db, 'products', pid), {
          variants: entry.data.variants,
          updatedAt: nowIso,
        });
      }
    }

    // Write inventory movement audit records
    for (const mov of movementsToCreate) {
      tx.set(doc(db, 'inventoryMovements', mov.id), mov);
    }

    // Update coupon redemption if used
    if (couponDocSnap) {
      if (couponDocSnap.existsInFs) {
        tx.update(doc(db, 'coupons', couponDocSnap.id), {
          usedCount: couponDocSnap.data.usedCount + 1,
        });
      }
      const redemptionId = `red-${order.id}`;
      tx.set(doc(db, 'couponRedemptions', redemptionId), {
        id: redemptionId,
        couponId: couponDocSnap.id,
        couponCode: couponDocSnap.data.code,
        orderId: order.id,
        userId: order.userId || currentUser.uid,
        customerMobile: order.customerMobile,
        discountAmount: order.discountAmount,
        redeemedAt: nowIso,
      });
    }

    const succeededAttempt = {
      ...attempt,
      status: 'SUCCEEDED' as const,
      updatedAt: nowIso,
      completedAt: nowIso,
    };
    const paidOrder = {
      ...order,
      status: 'PAID' as const,
      paymentStatus: 'SUCCEEDED' as const,
      stockDeducted: true,
      isSimulatedDemo: true,
      lastAttemptRef: attempt.attemptRef,
      updatedAt: nowIso,
    };
    const histId = `hist-${order.id}-${Date.now()}`;
    const newHist: OrderStatusHistoryEntry & { userId: string } = {
      id: histId,
      orderId: order.id,
      userId: order.userId || currentUser.uid,
      status: 'PAID',
      paymentStatus: 'SUCCEEDED',
      note: `پرداخت آزمایشی (شبیه‌سازی‌شده) با مرجع ${attempt.attemptRef} تأیید و موجودی انبار کسر شد.`,
      actor: 'payment-simulator',
      createdAt: nowIso,
    };

    tx.update(attemptRefDoc, {
      status: 'SUCCEEDED',
      updatedAt: nowIso,
      completedAt: nowIso,
    });
    tx.update(orderRefDoc, {
      status: 'PAID',
      paymentStatus: 'SUCCEEDED',
      stockDeducted: true,
      lastAttemptRef: attempt.attemptRef,
      updatedAt: nowIso,
    });
    tx.set(doc(db, 'orderStatusHistory', histId), newHist);
    if (trackingSnap.exists()) {
      tx.set(
        trackingRefDoc,
        buildMaskedTrackingSummary(
          paidOrder,
          [newHist, ...existingTrackingHistory],
          order.userId || currentUser.uid
        )
      );
    }

    return {
      success: true,
      order: paidOrder,
      paymentAttempt: succeededAttempt,
    };
  });
}

export async function firestoreRetryPaymentAttempt(orderNumber: string): Promise<{
  success: boolean;
  order?: Order;
  paymentAttempt?: PaymentAttempt;
  error?: string;
}> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    return {
      success: false,
      error: 'برای ایجاد تلاش پرداخت مجدد ابتدا وارد حساب کاربری خود شوید.',
    };
  }

  const normalizedOrderNum = normalizeDigits(orderNumber).trim().toUpperCase();
  const isAdmin = await isVerifiedFirebaseAdmin(currentUser);
  const ordersSnap = await getDocs(
    isAdmin
      ? query(collection(db, 'orders'), where('orderNumber', '==', normalizedOrderNum))
      : query(collection(db, 'orders'), where('userId', '==', currentUser.uid))
  );

  const order = ordersSnap.docs
    .map((d) => d.data() as Order)
    .find((o) => o.orderNumber.toUpperCase() === normalizedOrderNum);

  if (!order) {
    return { success: false, error: 'سفارش مورد نظر یافت نشد.' };
  }

  if (
    order.status !== 'PENDING_PAYMENT' ||
    order.paymentStatus === 'SUCCEEDED' ||
    order.stockDeducted
  ) {
    return {
      success: false,
      error: 'این سفارش قبلاً پرداخت شده یا قابلیت ایجاد تلاش پرداخت مجدد ندارد.',
    };
  }

  const catalogState = await loadPublicCatalogStateFromFirestore();
  for (const item of order.items) {
    const product = catalogState.products.find((p) => p.id === item.productId);
    const variant = product?.variants.find((v) => v.id === item.variantId);
    if (
      !product ||
      !variant ||
      getEffectiveVariantStock(catalogState, product, variant) < item.quantity
    ) {
      return {
        success: false,
        error: `موجودی «${item.productName}» برای تلاش مجدد کافی نیست.`,
      };
    }
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const attemptsSnap = await getDocs(
    query(collection(db, 'paymentAttempts'), where('userId', '==', order.userId || currentUser.uid))
  );
  const orderAttempts = attemptsSnap.docs
    .map((d) => d.data() as PaymentAttempt)
    .filter((pa) => pa.orderId === order.id);

  const batch = writeBatch(db);
  for (const pa of orderAttempts) {
    if (pa.status === 'PENDING') {
      batch.update(doc(db, 'paymentAttempts', pa.attemptRef), {
        status: 'EXPIRED',
        failureReason: 'جایگزین‌شده با تلاش پرداخت جدید.',
        updatedAt: nowIso,
        completedAt: nowIso,
      });
    }
  }

  const attemptSeq = orderAttempts.length + 1;
  const attemptRef = `PAY-${order.orderNumber}-${attemptSeq}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  const newAttempt: PaymentAttempt & { userId: string; isSimulatedDemo: boolean } = {
    id: attemptRef,
    attemptRef,
    orderId: order.id,
    orderNumber: order.orderNumber,
    userId: order.userId || currentUser.uid,
    amount: order.totalAmount,
    status: 'PENDING',
    isSimulatedDemo: true,
    createdAt: nowIso,
    updatedAt: nowIso,
    expiresAt: new Date(now.getTime() + 15 * 60 * 1000).toISOString(),
  };

  const histId = `hist-${order.id}-retry-${attemptSeq}`;
  const newHist: OrderStatusHistoryEntry & { userId: string } = {
    id: histId,
    orderId: order.id,
    userId: order.userId || currentUser.uid,
    status: order.status,
    paymentStatus: 'PENDING',
    note: `تلاش پرداخت آزمایشی مجدد (${newAttempt.attemptRef}) ایجاد شد.`,
    actor: currentUser.uid,
    createdAt: nowIso,
  };

  batch.set(doc(db, 'paymentAttempts', attemptRef), newAttempt);
  batch.update(doc(db, 'orders', order.id), {
    paymentStatus: 'PENDING',
    lastAttemptRef: attemptRef,
    updatedAt: nowIso,
  });
  batch.set(doc(db, 'orderStatusHistory', histId), newHist);

  await batch.commit();

  return {
    success: true,
    order: { ...order, paymentStatus: 'PENDING', updatedAt: nowIso },
    paymentAttempt: newAttempt,
  };
}

export async function firestoreTrackOrder(
  rawOrderNumber: string,
  rawCustomerMobile: string
) {
  const orderNum = normalizeDigits(rawOrderNumber).trim().toUpperCase();
  const mobile = normalizeIranianMobile(rawCustomerMobile);

  if (!orderNum || !mobile) {
    return {
      found: false,
      error: 'لطفاً شماره سفارش و شماره موبایل ثبت‌شده در سفارش را وارد کنید.',
    };
  }

  const trackingKey = buildOrderTrackingKey(orderNum, mobile);
  const snap = await getDoc(doc(db, 'orderTracking', trackingKey));
  if (!snap.exists()) {
    return {
      found: false,
      error: 'سفارشی با این شماره سفارش و شماره موبایل یافت نشد.',
    };
  }

  return {
    found: true,
    trackingData: snap.data(),
  };
}

export async function firestoreGetAccountOverview() {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('برای دسترسی به این بخش ابتدا وارد حساب کاربری خود شوید.');
  }

  const [userDoc, privDoc, addrSnap, ordersSnap] = await Promise.all([
    getDoc(doc(db, 'users', currentUser.uid)).catch(() => null),
    getDoc(doc(db, 'users', currentUser.uid, 'private', 'info')).catch(() => null),
    getDocs(
      query(
        collection(db, 'users', currentUser.uid, 'addresses'),
        where('uid', '==', currentUser.uid)
      )
    ).catch(() => null),
    getDocs(query(collection(db, 'orders'), where('userId', '==', currentUser.uid))).catch(
      () => null
    ),
  ]);

  const isAdmin = await isVerifiedFirebaseAdmin(currentUser);
  const displayName =
    (userDoc?.exists() ? userDoc.data()?.displayName : null) ||
    currentUser.displayName ||
    'کاربر رواق';
  const mobile = privDoc?.exists() ? privDoc.data()?.mobile : undefined;

  const addresses: CustomerAddressRecord[] = (addrSnap?.docs || []).map((d) => {
    const data = d.data();
    return {
      id: d.id,
      userId: currentUser.uid,
      recipientName: data.recipientName,
      mobile: data.mobile,
      province: data.province,
      city: data.city,
      addressLine: data.addressLine,
      postalCode: data.postalCode,
      isDefault: Boolean(data.isDefault),
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : new Date().toISOString(),
    };
  });

  const orders: Order[] = (ordersSnap?.docs || [])
    .map((d) => d.data() as Order)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return {
    profile: {
      uid: currentUser.uid,
      email: currentUser.email || '',
      displayName,
      mobile,
      role: isAdmin ? ('ADMIN' as const) : ('CUSTOMER' as const),
    },
    addresses,
    orders,
  };
}

export async function firestoreUpdateProfile(params: {
  displayName: string;
  mobile?: string;
}) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('برای ویرایش مشخصات ابتدا وارد حساب کاربری خود شوید.');
  }

  const cleanName = String(params.displayName || '').trim();
  if (cleanName.length < 2) {
    throw new Error('نام و نام خانوادگی باید حداقل ۲ حرف باشد.');
  }

  let normMob: string | undefined;
  if (params.mobile && String(params.mobile).trim()) {
    normMob = normalizeIranianMobile(String(params.mobile));
    if (!isValidIranianMobile(normMob)) {
      throw new Error('شماره موبایل واردشده معتبر نیست.');
    }
  }

  const { serverTimestamp } = await import('./firebase.ts');
  await updateDoc(doc(db, 'users', currentUser.uid), {
    displayName: cleanName.slice(0, 100),
    updatedAt: serverTimestamp(),
  });

  if (currentUser.email) {
    await setDoc(
      doc(db, 'users', currentUser.uid, 'private', 'info'),
      {
        uid: currentUser.uid,
        email: currentUser.email.slice(0, 160),
        ...(normMob ? { mobile: normMob } : {}),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  }

  const isAdmin = await isVerifiedFirebaseAdmin(currentUser);
  return {
    profile: {
      uid: currentUser.uid,
      email: currentUser.email || '',
      displayName: cleanName.slice(0, 100),
      mobile: normMob,
      role: isAdmin ? ('ADMIN' as const) : ('CUSTOMER' as const),
    },
  };
}

export async function firestoreAddAddress(params: {
  recipientName: string;
  mobile: string;
  province: string;
  city: string;
  addressLine: string;
  postalCode: string;
  isDefault: boolean;
}) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('برای ثبت نشانی ابتدا وارد حساب کاربری خود شوید.');
  }

  const normMobile = normalizeIranianMobile(String(params.mobile || ''));
  const normPostal = normalizeIranianPostalCode(String(params.postalCode || ''));

  if (!params.recipientName || String(params.recipientName).trim().length < 2) {
    throw new Error('نام گیرنده الزامی است.');
  }
  if (!isValidIranianMobile(normMobile)) {
    throw new Error('شماره موبایل ایران معتبر نیست.');
  }
  if (
    !params.province ||
    !params.city ||
    !params.addressLine ||
    String(params.addressLine).trim().length < 8
  ) {
    throw new Error('استان، شهر و نشانی کامل پستی را وارد کنید.');
  }
  if (!isValidIranianPostalCode(normPostal)) {
    throw new Error('کد پستی باید ۱۰ رقم باشد.');
  }

  const { saveAddressToFirestore } = await import('./firebase.ts');
  const addressId = `addr-${Date.now()}`;
  await saveAddressToFirestore(currentUser.uid, addressId, {
    recipientName: String(params.recipientName).trim().slice(0, 100),
    mobile: normMobile,
    province: String(params.province).trim().slice(0, 60),
    city: String(params.city).trim().slice(0, 60),
    addressLine: String(params.addressLine).trim().slice(0, 300),
    postalCode: normPostal,
    isDefault: Boolean(params.isDefault),
  });

  const overview = await firestoreGetAccountOverview();
  return {
    address: overview.addresses.find((a) => a.id === addressId),
    addresses: overview.addresses,
  };
}

export async function firestoreDeleteAddress(addressId: string) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('برای حذف نشانی ابتدا وارد حساب کاربری خود شوید.');
  }
  await deleteDoc(doc(db, 'users', currentUser.uid, 'addresses', addressId));
  const overview = await firestoreGetAccountOverview();
  return { addresses: overview.addresses };
}

export async function firestoreGetOrderDetail(orderIdOrNumber: string) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('شما اجازه دسترسی به جزئیات این سفارش را ندارید.');
  }

  const isAdmin = await isVerifiedFirebaseAdmin(currentUser);
  let order: Order | null = null;

  const directSnap = await getDoc(doc(db, 'orders', orderIdOrNumber)).catch(() => null);
  if (directSnap && directSnap.exists()) {
    order = directSnap.data() as Order;
  } else {
    const qSnap = await getDocs(
      isAdmin
        ? query(collection(db, 'orders'), where('orderNumber', '==', orderIdOrNumber))
        : query(collection(db, 'orders'), where('userId', '==', currentUser.uid))
    );
    order =
      qSnap.docs
        .map((d) => d.data() as Order)
        .find((o) => o.id === orderIdOrNumber || o.orderNumber === orderIdOrNumber) || null;
  }

  if (!order || (!isAdmin && order.userId !== currentUser.uid)) {
    throw new Error('شما اجازه دسترسی به جزئیات این سفارش را ندارید.');
  }

  const attemptsQuery = isAdmin
    ? query(collection(db, 'paymentAttempts'), where('orderId', '==', order.id))
    : query(collection(db, 'paymentAttempts'), where('userId', '==', currentUser.uid));
  const historyQuery = isAdmin
    ? query(collection(db, 'orderStatusHistory'), where('orderId', '==', order.id))
    : query(collection(db, 'orderStatusHistory'), where('userId', '==', currentUser.uid));

  const [paSnap, histSnap] = await Promise.all([
    getDocs(attemptsQuery).catch(() => null),
    getDocs(historyQuery).catch(() => null),
  ]);

  return {
    order,
    paymentAttempts: (paSnap?.docs.map((d) => d.data() as PaymentAttempt) || []).filter(
      (pa) => pa.orderId === order!.id
    ),
    history: (histSnap?.docs.map((d) => d.data() as OrderStatusHistoryEntry) || []).filter(
      (h) => h.orderId === order!.id
    ),
  };
}

export async function firestoreCreateReview(params: {
  productId: string;
  rating: number;
  comment: string;
}): Promise<{ review: ReviewRecord }> {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error('برای ثبت دیدگاه ابتدا وارد حساب کاربری خود شوید.');
  }

  const state = await loadPublicCatalogStateFromFirestore();
  const product = state.products.find((p) => p.id === params.productId);
  if (!product) {
    throw new Error('محصول یافت نشد.');
  }

  const numRating = Math.max(1, Math.min(5, Math.round(Number(params.rating) || 5)));
  const cleanComment = String(params.comment || '').trim();
  if (cleanComment.length < 5) {
    throw new Error('متن دیدگاه باید حداقل ۵ کاراکتر باشد.');
  }

  const nowIso = new Date().toISOString();
  const reviewId = `rev-${Date.now()}`;
  const review: ReviewRecord = {
    id: reviewId,
    productId: product.id,
    productSlug: product.slug,
    userId: currentUser.uid,
    authorName: (currentUser.displayName || 'کاربر رواق').slice(0, 80),
    rating: numRating,
    comment: cleanComment.slice(0, 600),
    createdAt: nowIso,
  };

  await setDoc(doc(db, 'reviews', reviewId), review);
  return { review };
}

export async function firestoreSubscribeNewsletter(email: string): Promise<{ message: string }> {
  const cleanEmail = String(email || '').trim().toLowerCase();
  if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error('لطفاً یک آدرس ایمیل معتبر وارد کنید.');
  }

  const subId = `sub-${cleanEmail.replace(/[^a-z0-9]/g, '-').slice(0, 90)}`;
  try {
    await setDoc(doc(db, 'newsletterSubscriptions', subId), {
      id: subId,
      email: cleanEmail,
      createdAt: new Date().toISOString(),
    });
    return { message: 'ایمیل شما با موفقیت در خبرنامه رواق ثبت شد.' };
  } catch {
    throw new Error('این آدرس ایمیل پیش‌تر در خبرنامه رواق ثبت شده است.');
  }
}

// ============================================================================
// ADMIN OPERATIONS (Enforced by isVerifiedFirebaseAdmin + Firestore Rules)
// ============================================================================
async function requireVerifiedAdminUser() {
  const currentUser = auth.currentUser;
  const isAdmin = await isVerifiedFirebaseAdmin(currentUser);
  if (!currentUser || !isAdmin) {
    throw new Error('دسترسی غیرمجاز: این عملیات ویژه مدیر تاییدشده فروشگاه رواق است.');
  }
  return currentUser;
}

export async function firestoreGetAdminDashboard() {
  await requireVerifiedAdminUser();
  await ensureCatalogSeededIfAdmin();

  const state = await loadPublicCatalogStateFromFirestore();

  const [
    allProdsSnap,
    allCatsSnap,
    allCouponsSnap,
    ordersSnap,
    paSnap,
    histSnap,
    usersSnap,
    invSnap,
  ] = await Promise.all([
    getDocs(collection(db, 'products')).catch(() => null),
    getDocs(collection(db, 'categories')).catch(() => null),
    getDocs(collection(db, 'coupons')).catch(() => null),
    getDocs(collection(db, 'orders')).catch(() => null),
    getDocs(collection(db, 'paymentAttempts')).catch(() => null),
    getDocs(collection(db, 'orderStatusHistory')).catch(() => null),
    getDocs(collection(db, 'users')).catch(() => null),
    getDocs(collection(db, 'inventoryMovements')).catch(() => null),
  ]);

  if (allProdsSnap && !allProdsSnap.empty) {
    state.products = allProdsSnap.docs.map((d) => d.data() as Product);
  }
  if (allCatsSnap && !allCatsSnap.empty) {
    state.categories = allCatsSnap.docs.map((d) => d.data() as Category);
  }
  if (allCouponsSnap && !allCouponsSnap.empty) {
    state.coupons = allCouponsSnap.docs.map((d) => d.data() as Coupon);
  }
  if (ordersSnap) {
    state.orders = ordersSnap.docs
      .map((d) => d.data() as Order)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  if (paSnap) {
    state.paymentAttempts = paSnap.docs.map((d) => d.data() as PaymentAttempt);
  }
  if (histSnap) {
    state.orderStatusHistory = histSnap.docs.map((d) => d.data() as OrderStatusHistoryEntry);
  }
  if (invSnap) {
    state.inventoryMovements = invSnap.docs
      .map((d) => d.data() as InventoryMovement)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const customers = (usersSnap?.docs || []).map((d) => {
    const data = d.data();
    return {
      id: d.id,
      uid: data.uid || d.id,
      email: data.uid === auth.currentUser?.uid ? auth.currentUser?.email || '' : 'محافظت‌شده (PII)',
      displayName: data.displayName || 'کاربر رواق',
      role: data.role || 'CUSTOMER',
      createdAt: data.createdAt?.toDate
        ? data.createdAt.toDate().toISOString()
        : new Date().toISOString(),
      orderCount: state.orders.filter((o) => o.userId === (data.uid || d.id)).length,
    };
  });

  const metrics = getAdminDashboardMetrics(state);

  return {
    metrics,
    products: state.products,
    categories: state.categories,
    orders: state.orders,
    paymentAttempts: state.paymentAttempts,
    orderStatusHistory: state.orderStatusHistory,
    customers,
    coupons: state.coupons,
    inventoryMovements: state.inventoryMovements.slice(0, 100),
    reviews: state.reviews,
    settings: state.settings,
  };
}

export async function firestoreAdminCreateProduct(body: any) {
  await requireVerifiedAdminUser();
  const state = await loadPublicCatalogStateFromFirestore();

  if (!body.name || !body.slug || !body.categorySlug) {
    throw new Error('نام، اسلاگ و دسته‌بندی محصول الزامی است.');
  }
  if (state.products.some((p) => p.slug === body.slug)) {
    throw new Error('محصولی با این اسلاگ قبلاً ثبت شده است.');
  }

  const category = state.categories.find((c) => c.slug === body.categorySlug);
  const nowIso = new Date().toISOString();
  const basePrice = Math.max(1000, Math.floor(Number(normalizeDigits(body.basePrice)) || 250000));
  const sku = String(body.sku || `RVQ-NEW-${Date.now().toString().slice(-4)}`).trim();
  const id = `prod-${Date.now()}`;

  const newProduct: Product = stripUndefined({
    id,
    name: String(body.name).trim().slice(0, 160),
    slug: String(body.slug).trim().toLowerCase().slice(0, 120),
    categorySlug: String(body.categorySlug).slice(0, 80),
    categoryName: category?.name || 'سایر محصولات',
    shortDescription: String(body.shortDescription || '').trim().slice(0, 400),
    fullDescription: String(body.fullDescription || body.shortDescription || '').trim().slice(0, 2000),
    basePrice,
    published: body.published !== false,
    featured: Boolean(body.featured),
    sku,
    variants: [
      {
        id: `${sku}-STD`,
        sku: `${sku}-STD`,
        label: String(body.defaultVariantLabel || 'بسته استاندارد'),
        price: basePrice,
        stock: Math.max(0, Math.floor(Number(normalizeDigits(body.initialStock ?? 15)))),
      },
    ],
    images: [
      {
        id: `${body.slug}-img-1`,
        url: '/assets/products/pistachios-bowl.jpg',
        role: 'primary' as const,
        alt: `تصویر ${body.name}`,
        illustrationKey: String(body.illustrationKey || 'nuts'),
      },
    ],
    origin: body.origin || 'نامشخص در داده‌های نمونه',
    seoTitle: `${body.name} | رواق`,
    seoDescription: String(body.shortDescription || body.name),
    createdAt: nowIso,
    updatedAt: nowIso,
  });

  await setDoc(doc(db, 'products', id), newProduct);
  return { product: newProduct };
}

export async function firestoreAdminUpdateProduct(productId: string, body: any) {
  await requireVerifiedAdminUser();
  const state = await loadPublicCatalogStateFromFirestore();
  const existing = state.products.find((p) => p.id === productId);
  if (!existing) {
    throw new Error('محصول یافت نشد.');
  }

  const updated: Product = stripUndefined({
    ...existing,
    ...(body.name ? { name: String(body.name).trim() } : {}),
    ...(typeof body.published === 'boolean' ? { published: body.published } : {}),
    ...(typeof body.featured === 'boolean' ? { featured: body.featured } : {}),
    updatedAt: new Date().toISOString(),
  });

  await setDoc(doc(db, 'products', productId), updated);
  return { product: updated };
}

export async function firestoreAdminCreateCategory(body: any) {
  await requireVerifiedAdminUser();
  const state = await loadPublicCatalogStateFromFirestore();
  if (!body.name || !body.slug) {
    throw new Error('نام و اسلاگ دسته‌بندی الزامی است.');
  }
  if (state.categories.some((c) => c.slug === body.slug)) {
    throw new Error('دسته‌بندی با این اسلاگ وجود دارد.');
  }

  const id = `cat-${Date.now()}`;
  const newCat: Category = {
    id,
    name: String(body.name).trim().slice(0, 120),
    slug: String(body.slug).trim().toLowerCase().slice(0, 80),
    shortDescription: String(body.shortDescription || '').trim().slice(0, 300),
    description: String(body.description || body.shortDescription || '').trim().slice(0, 1000),
    displayOrder: state.categories.length + 1,
    active: true,
    illustrationKey: 'giftbox',
  };

  await setDoc(doc(db, 'categories', id), newCat);
  return { category: newCat };
}

export async function firestoreAdminDeleteCategory(categoryId: string) {
  await requireVerifiedAdminUser();
  const state = await loadPublicCatalogStateFromFirestore();
  const cat = state.categories.find((c) => c.id === categoryId);
  if (!cat) {
    throw new Error('دسته‌بندی یافت نشد.');
  }
  if (state.products.some((p) => p.categorySlug === cat.slug)) {
    throw new Error(
      'امکان حذف دسته‌بندی دارای محصول وجود ندارد. ابتدا محصولات آن را منتقل یا غیرفعال کنید.'
    );
  }
  await deleteDoc(doc(db, 'categories', categoryId));
  return { categories: state.categories.filter((c) => c.id !== categoryId) };
}

export async function firestoreAdminUpdateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  note?: string
) {
  const adminUser = await requireVerifiedAdminUser();
  const orderSnap = await getDoc(doc(db, 'orders', orderId));
  if (!orderSnap.exists()) {
    throw new Error('سفارش یافت نشد.');
  }
  const order = orderSnap.data() as Order;

  if (
    (newStatus === 'PAID' ||
      newStatus === 'PROCESSING' ||
      newStatus === 'SHIPPED' ||
      newStatus === 'DELIVERED') &&
    order.paymentStatus !== 'SUCCEEDED'
  ) {
    throw new Error('امکان تغییر وضعیت ارسال برای سفارشی که پرداخت آن تأیید نشده وجود ندارد.');
  }

  const nowIso = new Date().toISOString();
  const histId = `hist-${order.id}-${Date.now()}`;
  const newHist: OrderStatusHistoryEntry & { userId: string } = {
    id: histId,
    orderId: order.id,
    userId: order.userId || adminUser.uid,
    status: newStatus,
    paymentStatus: order.paymentStatus,
    note: note || `وضعیت سفارش توسط مدیر به «${newStatus}» تغییر یافت.`,
    actor: adminUser.email || adminUser.uid,
    createdAt: nowIso,
  };

  const batch = writeBatch(db);
  batch.update(doc(db, 'orders', order.id), {
    status: newStatus,
    updatedAt: nowIso,
  });
  batch.set(doc(db, 'orderStatusHistory', histId), newHist);

  const trackingKey = buildOrderTrackingKey(order.orderNumber, order.customerMobile);
  const trackingSnap = await getDoc(doc(db, 'orderTracking', trackingKey)).catch(() => null);
  if (trackingSnap && trackingSnap.exists()) {
    const existingHistory = (trackingSnap.data().history as OrderStatusHistoryEntry[]) || [];
    batch.set(
      doc(db, 'orderTracking', trackingKey),
      buildMaskedTrackingSummary(
        { ...order, status: newStatus, updatedAt: nowIso },
        [newHist, ...existingHistory],
        order.userId || adminUser.uid
      )
    );
  }

  await batch.commit();
  return { success: true, order: { ...order, status: newStatus, updatedAt: nowIso } };
}

export async function firestoreAdminAdjustInventory(params: {
  productId: string;
  variantId: string;
  newStock: number;
  referenceNote: string;
}) {
  await requireVerifiedAdminUser();
  const state = await loadPublicCatalogStateFromFirestore();
  const product = state.products.find((p) => p.id === params.productId);
  const variant = product?.variants.find((v) => v.id === params.variantId);
  if (!product || !variant) {
    throw new Error('محصول یا تنوع مورد نظر یافت نشد.');
  }

  const cleanStock = Math.max(0, Math.floor(Number(params.newStock) || 0));
  const prevStock = variant.stock;
  const delta = cleanStock - prevStock;
  variant.stock = cleanStock;
  const nowIso = new Date().toISOString();
  product.updatedAt = nowIso;

  const movement: InventoryMovement = {
    id: `inv-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
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
    createdAt: nowIso,
  };

  const batch = writeBatch(db);
  batch.set(doc(db, 'products', product.id), stripUndefined(product));
  batch.set(doc(db, 'inventoryMovements', movement.id), movement);
  await batch.commit();

  return { success: true, movement };
}

export async function firestoreAdminCreateCoupon(body: any) {
  await requireVerifiedAdminUser();
  const state = await loadPublicCatalogStateFromFirestore();
  const cleanCode = normalizeDigits(String(body.code || '')).trim().toUpperCase();
  if (!cleanCode) {
    throw new Error('کد تخفیف الزامی است.');
  }
  if (state.coupons.some((c) => c.code.toUpperCase() === cleanCode)) {
    throw new Error('این کد تخفیف قبلاً ثبت شده است.');
  }

  const id = `cpn-${Date.now()}`;
  const newCoupon: Coupon = {
    id,
    code: cleanCode,
    description: String(body.description || 'کد تخفیف رواق').trim().slice(0, 300),
    discountType: body.discountType === 'FIXED' ? 'FIXED' : 'PERCENTAGE',
    discountValue: Math.max(1, Math.floor(Number(normalizeDigits(body.discountValue)) || 10)),
    minOrderAmount: Math.max(0, Math.floor(Number(normalizeDigits(body.minOrderAmount)) || 0)),
    startsAt: new Date().toISOString(),
    endsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    active: true,
    usageLimit: Math.max(1, Math.floor(Number(normalizeDigits(body.usageLimit)) || 50)),
    usedCount: 0,
    perCustomerLimit: 2,
  };

  await setDoc(doc(db, 'coupons', id), stripUndefined(newCoupon));
  return { coupon: newCoupon };
}

export async function firestoreAdminToggleCoupon(couponId: string) {
  await requireVerifiedAdminUser();
  const state = await loadPublicCatalogStateFromFirestore();
  const coupon = state.coupons.find((c) => c.id === couponId);
  if (!coupon) {
    throw new Error('کد تخفیف یافت نشد.');
  }
  const updated = { ...coupon, active: !coupon.active };
  await setDoc(doc(db, 'coupons', couponId), stripUndefined(updated));
  return { coupon: updated };
}

export async function firestoreAdminSaveSettings(body: any) {
  await requireVerifiedAdminUser();
  const state = await loadPublicCatalogStateFromFirestore();
  const updated: StoreSettings = stripUndefined({
    ...state.settings,
    ...(body.storeName ? { storeName: String(body.storeName).trim().slice(0, 120) } : {}),
    ...(body.storeTagline ? { storeTagline: String(body.storeTagline).trim().slice(0, 240) } : {}),
    ...(body.supportEmail ? { supportEmail: String(body.supportEmail).trim().slice(0, 160) } : {}),
    ...(body.supportHours ? { supportHours: String(body.supportHours).trim().slice(0, 160) } : {}),
    ...(body.standardShippingCost !== undefined
      ? {
          standardShippingCost: Math.max(
            0,
            Math.floor(Number(normalizeDigits(body.standardShippingCost)) || 0)
          ),
        }
      : {}),
    ...(body.expressTehranShippingCost !== undefined
      ? {
          expressTehranShippingCost: Math.max(
            0,
            Math.floor(Number(normalizeDigits(body.expressTehranShippingCost)) || 0)
          ),
        }
      : {}),
    ...(body.freeShippingThreshold !== undefined
      ? {
          freeShippingThreshold: Math.max(
            0,
            Math.floor(Number(normalizeDigits(body.freeShippingThreshold)) || 0)
          ),
        }
      : {}),
    ...(body.minOrderAmount !== undefined
      ? {
          minOrderAmount: Math.max(
            0,
            Math.floor(Number(normalizeDigits(body.minOrderAmount)) || 0)
          ),
        }
      : {}),
  });

  await setDoc(doc(db, 'settings', 'store'), updated);
  return { settings: updated };
}

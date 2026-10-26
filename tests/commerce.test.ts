import { describe, it, expect, beforeEach } from 'vitest';
import {
  normalizeDigits,
  toPersianDigits,
  normalizePersianText,
  normalizeIranianMobile,
  isValidIranianMobile,
  normalizeIranianPostalCode,
  isValidIranianPostalCode,
  formatToman,
} from '../src/lib/persian.ts';
import {
  DatabaseState,
  createInitialDatabaseState,
  getEffectiveVariantStock,
  validateCart,
  createOrder,
  processPaymentAttempt,
  createRetryPaymentAttempt,
  trackOrderSafe,
  canUserAccessOrder,
  queryProducts,
  adjustVariantInventory,
} from '../src/lib/commerce-engine.ts';

describe('RAVĀQ (رَواق) — Persian Text, Numeral & Validation Utilities', () => {
  it('converts Persian and Arabic-Indic numerals to Latin digits accurately', () => {
    expect(normalizeDigits('۰۹۱۲۳۴۵۶۷۸۹')).toBe('09123456789');
    expect(normalizeDigits('٠٩١٢٣٤٥٦٧٨٩')).toBe('09123456789');
    expect(normalizeDigits('۱۹۸۷۶-۵۴۳۲۱')).toBe('19876-54321');
  });

  it('normalizes Iranian mobile numbers across Persian digits and +98 prefixes', () => {
    expect(normalizeIranianMobile('۰۹۱۲۳۴۵۶۷۸۹')).toBe('09123456789');
    expect(normalizeIranianMobile('+98 912 345 6789')).toBe('09123456789');
    expect(normalizeIranianMobile('00989123456789')).toBe('09123456789');
    expect(normalizeIranianMobile('9123456789')).toBe('09123456789');
    expect(isValidIranianMobile('۰۹۱۲۳۴۵۶۷۸۹')).toBe(true);
    expect(isValidIranianMobile('02188776655')).toBe(false);
    expect(isValidIranianMobile('0912345')).toBe(false);
  });

  it('validates 10-digit Iranian postal codes with Persian or Latin digits', () => {
    expect(normalizeIranianPostalCode('۱۹۸۷۶-۵۴۳۲۱')).toBe('1987654321');
    expect(isValidIranianPostalCode('۱۹۸۷۶۵۴۳۲۱')).toBe(true);
    expect(isValidIranianPostalCode('12345')).toBe(false);
  });

  it('normalizes Arabic Yeh/Kaf and ZWNJ for reliable Persian search', () => {
    expect(normalizePersianText('شيريني سنتي كرمان')).toBe('شیرینی سنتی کرمان');
    expect(formatToman(690000)).toContain('تومان');
    expect(toPersianDigits(1405)).toBe('۱۴۰۵');
  });
});

describe('RAVĀQ (رَواق) — Catalog, Bundle Inventory & Cart Validation', () => {
  let state: DatabaseState;

  beforeEach(() => {
    state = createInitialDatabaseState();
  });

  it('includes all 44 seeded products with "پسته" named strictly "پسته"', () => {
    expect(state.products.length).toBeGreaterThanOrEqual(44);
    const pistachio = state.products.find((p) => p.slug === 'pistachio');
    expect(pistachio).toBeDefined();
    expect(pistachio?.name).toBe('پسته');
  });

  it('calculates subtotal, shipping threshold, and clamps quantity to available stock', () => {
    // 1x 250g Pistachio (345,000 Toman) -> below 1,200,000 free shipping threshold -> +65,000 shipping
    const res1 = validateCart(state, [
      { productId: 'prod-pistachio', variantId: 'RVQ-NUT-001-250', quantity: 1 },
    ]);
    expect(res1.subtotal).toBe(345000);
    expect(res1.shippingCost).toBe(65000);
    expect(res1.payableTotal).toBe(410000);

    // Clamp excessive quantity to available stock (30)
    const resClamped = validateCart(state, [
      { productId: 'prod-pistachio', variantId: 'RVQ-NUT-001-250', quantity: 50 },
    ]);
    expect(resClamped.items[0].quantity).toBe(30);
    expect(resClamped.warnings.length).toBeGreaterThan(0);
  });

  it('enforces Gift Box / Bundle inventory based on child component stock', () => {
    const visitingBox = state.products.find((p) => p.id === 'prod-gift-visiting')!;
    const boxVariant = visitingBox.variants[0];
    expect(visitingBox.categorySlug).toBe('gift-boxes');

    // Initially effective stock is bounded by box variant stock (16) and child stocks
    const initialEffective = getEffectiveVariantStock(state, visitingBox, boxVariant);
    expect(initialEffective).toBeGreaterThan(0);

    // Reduce child pistachio (RVQ-NUT-001-250G) stock to 3 -> effective gift box stock must become 3
    const pistachio = state.products.find((p) => p.slug === 'pistachio')!;
    const v250 = pistachio.variants.find((v) => v.sku === 'RVQ-NUT-001-250G')!;
    v250.stock = 3;

    const constrainedEffective = getEffectiveVariantStock(state, visitingBox, boxVariant);
    expect(constrainedEffective).toBe(3);
  });

  it('validates coupons: percentage with cap, fixed amount, category scope, expired, and usage limit', () => {
    // 3x 1kg Pistachio = 3 * 1,276,500 = 3,829,500 Toman
    const items = [
      { productId: 'prod-pistachio', variantId: 'RVQ-NUT-001-1000', quantity: 3 },
    ];

    // NOWRUZ1405: 10% up to 200,000 Toman cap
    const nowruz = validateCart(state, items, { couponCode: 'NOWRUZ1405' });
    expect(nowruz.couponError).toBeUndefined();
    expect(nowruz.discountAmount).toBe(200000);
    expect(nowruz.shippingCost).toBe(0); // Free shipping above 1.2M
    expect(nowruz.payableTotal).toBe(nowruz.subtotal - 200000);

    // RAVAQ50: 50,000 Toman fixed
    const ravaq50 = validateCart(state, items, { couponCode: 'RAVAQ50' });
    expect(ravaq50.discountAmount).toBe(50000);

    // YALDA15: Scoped only to gift-boxes -> should reject pistachio-only cart
    const yaldaInvalid = validateCart(state, items, { couponCode: 'YALDA15' });
    expect(yaldaInvalid.discountAmount).toBe(0);
    expect(yaldaInvalid.couponError).toBeDefined();

    // YALDA15 on a Gift Box -> valid 15% up to 250,000 Toman
    const yaldaValid = validateCart(
      state,
      [{ productId: 'prod-gift-yalda', variantId: 'RVQ-GFT-006-STD', quantity: 1 }],
      { couponCode: 'YALDA15' }
    );
    expect(yaldaValid.couponError).toBeUndefined();
    expect(yaldaValid.discountAmount).toBe(Math.round(1120000 * 0.15));

    // EXPIRED1403 -> rejected
    const expired = validateCart(state, items, { couponCode: 'EXPIRED1403' });
    expect(expired.discountAmount).toBe(0);
    expect(expired.couponError).toContain('پایان');

    // FULL100 -> usage limit reached
    const full = validateCart(state, items, { couponCode: 'FULL100' });
    expect(full.discountAmount).toBe(0);
    expect(full.couponError).toContain('ظرفیت');
  });

  it('filters and sorts catalog queries with Persian search and stock filter', () => {
    const searchRes = queryProducts(state, { query: 'باقلوا' });
    expect(searchRes.length).toBeGreaterThanOrEqual(1);

    const giftBoxesRes = queryProducts(state, {
      categorySlug: 'gift-boxes',
      sortBy: 'price_desc',
    });
    expect(giftBoxesRes.every((p) => p.categorySlug === 'gift-boxes')).toBe(true);
    expect(giftBoxesRes[0].basePrice).toBeGreaterThanOrEqual(
      giftBoxesRes[giftBoxesRes.length - 1].basePrice
    );
  });
});

describe('RAVĀQ (رَواق) — Order Creation, Idempotency & Simulated Payment Gateway State Machine', () => {
  let state: DatabaseState;

  beforeEach(() => {
    state = createInitialDatabaseState();
  });

  const validCheckoutPayload = {
    customerName: 'امیرحسین رضایی',
    customerMobile: '۰۹۱۲۳۴۵۶۷۸۹', // Persian digits
    customerEmail: 'amir@example.com',
    province: 'تهران',
    city: 'تهران',
    addressLine: 'خیابان ولیعصر، بالاتر از میدان ونک، کوچه نگار، پلاک ۱۴، واحد ۲',
    postalCode: '۱۹۸۷۶۵۴۳۲۱', // Persian digits
    deliveryMethod: 'STANDARD' as const,
    acceptedTerms: true,
    couponCode: 'RAVAQ50',
    idempotencyKey: 'idem-test-key-001',
    userId: 'user-customer-1',
    items: [
      {
        productId: 'prod-gift-visiting',
        variantId: 'RVQ-GFT-007-STD',
        quantity: 1,
        giftMessage: 'نوروزتان پیروز',
      },
    ],
  };

  it('rejects checkout with invalid mobile or postal code', () => {
    const badRes = createOrder(state, {
      ...validCheckoutPayload,
      customerMobile: '02112345678',
      postalCode: '12345-6789',
    });
    expect(badRes.success).toBe(false);
    expect(badRes.fieldErrors?.customerMobile).toBeDefined();
    expect(badRes.fieldErrors?.postalCode).toBeDefined();
  });

  it('prevents duplicate order creation when submitted with the same idempotencyKey', () => {
    const first = createOrder(state, validCheckoutPayload);
    expect(first.success).toBe(true);
    expect(first.order).toBeDefined();

    const second = createOrder(state, validCheckoutPayload);
    expect(second.success).toBe(true);
    expect(second.idempotentReplay).toBe(true);
    expect(second.order?.id).toBe(first.order?.id);
    expect(state.orders.length).toBe(1);
  });

  it('handles Payment Gateway SUCCEED, deducts both Gift Box and child component stock atomically, and is idempotent on reload', () => {
    const created = createOrder(state, validCheckoutPayload);
    const attemptRef = created.paymentAttempt!.attemptRef;
    const order = created.order!;

    // Before payment: stock is untouched
    const boxBefore = state.products
      .find((p) => p.id === 'prod-gift-visiting')!
      .variants.find((v) => v.id === 'RVQ-GFT-007-STD')!.stock;
    const pistachioBefore = state.products
      .find((p) => p.slug === 'pistachio')!
      .variants.find((v) => v.sku === 'RVQ-NUT-001-250G')!.stock;

    // Confirm payment
    const payRes = processPaymentAttempt(state, {
      attemptRef,
      action: 'SUCCEED',
      expectedAmount: order.totalAmount,
    });
    expect(payRes.success).toBe(true);
    expect(payRes.order?.status).toBe('PAID');
    expect(payRes.order?.paymentStatus).toBe('SUCCEEDED');

    // Verify both box stock and child component stock were deducted
    const boxAfter = state.products
      .find((p) => p.id === 'prod-gift-visiting')!
      .variants.find((v) => v.id === 'RVQ-GFT-007-STD')!.stock;
    const pistachioAfter = state.products
      .find((p) => p.slug === 'pistachio')!
      .variants.find((v) => v.sku === 'RVQ-NUT-001-250G')!.stock;

    expect(boxAfter).toBe(boxBefore - 1);
    expect(pistachioAfter).toBe(pistachioBefore - 1);

    // Reload / duplicate confirmation must be idempotent and NOT deduct stock again
    const replayRes = processPaymentAttempt(state, {
      attemptRef,
      action: 'SUCCEED',
      expectedAmount: order.totalAmount,
    });
    expect(replayRes.success).toBe(true);
    expect(replayRes.idempotentReplay).toBe(true);

    const boxAfterReplay = state.products
      .find((p) => p.id === 'prod-gift-visiting')!
      .variants.find((v) => v.id === 'RVQ-GFT-007-STD')!.stock;
    expect(boxAfterReplay).toBe(boxAfter);
  });

  it('rejects forged/tampered expectedAmount on payment confirmation', () => {
    const created = createOrder(state, {
      ...validCheckoutPayload,
      idempotencyKey: 'idem-tamper-test',
    });
    const attemptRef = created.paymentAttempt!.attemptRef;

    const tampered = processPaymentAttempt(state, {
      attemptRef,
      action: 'SUCCEED',
      expectedAmount: 1000, // forged amount
    });
    expect(tampered.success).toBe(false);
    expect(tampered.error).toContain('مبلغ تراکنش');
  });

  it('supports FAIL / CANCEL payment transitions and controlled retry payment attempts', () => {
    const created = createOrder(state, {
      ...validCheckoutPayload,
      idempotencyKey: 'idem-retry-test',
    });
    const firstAttemptRef = created.paymentAttempt!.attemptRef;
    const order = created.order!;

    // Fail first attempt
    const failRes = processPaymentAttempt(state, {
      attemptRef: firstAttemptRef,
      action: 'FAIL',
    });
    expect(failRes.success).toBe(true);
    expect(failRes.paymentAttempt?.status).toBe('FAILED');
    expect(failRes.order?.status).toBe('PENDING_PAYMENT');
    expect(failRes.order?.paymentStatus).toBe('FAILED');

    // Create retry payment attempt
    const retryRes = createRetryPaymentAttempt(state, order.orderNumber);
    expect(retryRes.success).toBe(true);
    expect(retryRes.paymentAttempt?.attemptRef).not.toBe(firstAttemptRef);
    expect(retryRes.paymentAttempt?.status).toBe('PENDING');

    // Succeed on the retry attempt
    const succeedRetry = processPaymentAttempt(state, {
      attemptRef: retryRes.paymentAttempt!.attemptRef,
      action: 'SUCCEED',
      expectedAmount: order.totalAmount,
    });
    expect(succeedRetry.success).toBe(true);
    expect(succeedRetry.order?.status).toBe('PAID');
    expect(succeedRetry.order?.paymentStatus).toBe('SUCCEEDED');

    // Cannot create another retry once order is PAID
    const retryAfterPaid = createRetryPaymentAttempt(state, order.orderNumber);
    expect(retryAfterPaid.success).toBe(false);
  });

  it('enforces safe order tracking (requires matching mobile, masks recipient, hides street address) and user ownership', () => {
    const created = createOrder(state, {
      ...validCheckoutPayload,
      idempotencyKey: 'idem-security-test',
    });
    const order = created.order!;

    // Wrong mobile -> rejected
    const wrongTrack = trackOrderSafe(state, order.orderNumber, '09351112233');
    expect(wrongTrack.found).toBe(false);

    // Matching mobile (even with Persian digits) -> returns masked summary without street address
    const validTrack = trackOrderSafe(state, order.orderNumber, '۰۹۱۲۳۴۵۶۷۸۹');
    expect(validTrack.found).toBe(true);
    expect(validTrack.trackingData?.orderNumber).toBe(order.orderNumber);
    expect((validTrack.trackingData as any).addressLine).toBeUndefined();

    // Ownership checks: User A can access, User B cannot, Admin can
    expect(canUserAccessOrder({ uid: 'user-customer-1', role: 'CUSTOMER' }, order)).toBe(true);
    expect(canUserAccessOrder({ uid: 'user-other-2', role: 'CUSTOMER' }, order)).toBe(false);
    expect(canUserAccessOrder({ uid: 'admin-1', role: 'ADMIN' }, order)).toBe(true);
  });

  it('records audit logs when Admin adjusts inventory and clamps negative stock', () => {
    const clampRes = adjustVariantInventory(state, {
      productId: 'prod-pistachio',
      variantId: 'RVQ-NUT-001-250',
      newStock: -10,
      referenceNote: 'تست موجودی غیرمنفی',
    });
    expect(clampRes.success).toBe(true);
    expect(clampRes.movement?.newStock).toBe(0);

    const posRes = adjustVariantInventory(state, {
      productId: 'prod-pistachio',
      variantId: 'RVQ-NUT-001-250',
      newStock: 35,
      referenceNote: 'شارژ انبار نوروزی',
    });
    expect(posRes.success).toBe(true);
    expect(posRes.movement?.newStock).toBe(35);
    expect(state.inventoryMovements[0].referenceId).toBe('شارژ انبار نوروزی');
  });
});

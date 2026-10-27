import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  createInitialDatabaseState,
  createOrder,
  processPaymentAttempt,
  createRetryPaymentAttempt,
  validateCart,
  validateCouponForItems,
  getEffectiveVariantStock,
  trackOrderSafe,
  canUserAccessOrder,
  updateOrderFulfillmentStatus,
} from '../src/lib/commerce-engine.ts';
import { AUTHORIZED_ADMIN_EMAIL, isVerifiedFirebaseAdmin } from '../src/lib/firebase.ts';

const baseCheckoutFields = {
  customerName: 'سارا احمدی',
  customerMobile: '09123456789',
  customerEmail: 'sara@example.com',
  province: 'تهران',
  city: 'تهران',
  postalCode: '1968654321',
  addressLine: 'خیابان ولیعصر، کوچه رواق، پلاک ۱۲، واحد ۴',
  orderNote: 'تحویل به نگهبانی',
  deliveryMethod: 'EXPRESS_TEHRAN' as const,
  acceptedTerms: true,
};

test('1. Order creation initializes PENDING_PAYMENT order, PENDING simulated payment attempt, and status history', () => {
  const state = createInitialDatabaseState();
  const product = state.products[0];
  const variant = product.variants[0];

  const result = createOrder(state, {
    ...baseCheckoutFields,
    userId: 'user-customer-1',
    idempotencyKey: 'idem-order-1',
    items: [{ productId: product.id, variantId: variant.id, quantity: 2 }],
  });

  assert.equal(result.success, true);
  assert.ok(result.order);
  assert.ok(result.paymentAttempt);
  assert.equal(result.order.status, 'PENDING_PAYMENT');
  assert.equal(result.order.paymentStatus, 'PENDING');
  assert.equal(result.order.stockDeducted, false);
  assert.equal(result.order.isSimulatedDemo, true);
  assert.equal(result.paymentAttempt.status, 'PENDING');
  assert.equal(result.paymentAttempt.isSimulatedDemo, true);
  assert.equal(result.paymentAttempt.amount, result.order.totalAmount);
  assert.equal(result.order.lastAttemptRef, result.paymentAttempt.attemptRef);

  // Idempotent replay check
  const replay = createOrder(state, {
    ...baseCheckoutFields,
    userId: 'user-customer-1',
    idempotencyKey: 'idem-order-1',
    items: [{ productId: product.id, variantId: variant.id, quantity: 2 }],
  });
  assert.equal(replay.idempotentReplay, true);
  assert.equal(replay.order?.id, result.order.id);
});

test('2. Failed, cancelled, and expired payment attempts do not deduct stock and allow controlled retry', () => {
  const state = createInitialDatabaseState();
  const product = state.products[0];
  const variant = product.variants[0];
  const initialStock = variant.stock;

  const created = createOrder(state, {
    ...baseCheckoutFields,
    userId: 'user-customer-2',
    items: [{ productId: product.id, variantId: variant.id, quantity: 2 }],
  });
  assert.equal(created.success, true);
  const order = created.order!;
  const attempt1 = created.paymentAttempt!;

  // 2a. Forged payment amount must be rejected
  const forged = processPaymentAttempt(state, {
    attemptRef: attempt1.attemptRef,
    action: 'SUCCEED',
    expectedAmount: 1000,
  });
  assert.equal(forged.success, false);
  assert.match(forged.error || '', /خطای امنیتی/);

  // 2b. FAILED payment attempt
  const failedResult = processPaymentAttempt(state, {
    attemptRef: attempt1.attemptRef,
    action: 'FAIL',
  });
  assert.equal(failedResult.success, true);
  assert.equal(failedResult.paymentAttempt?.status, 'FAILED');
  assert.equal(failedResult.order?.paymentStatus, 'FAILED');
  assert.equal(failedResult.order?.status, 'PENDING_PAYMENT');
  assert.equal(variant.stock, initialStock, 'Stock must not be deducted on FAILED payment');

  // Cannot reuse terminal failed attempt
  const reuseFailed = processPaymentAttempt(state, {
    attemptRef: attempt1.attemptRef,
    action: 'SUCCEED',
  });
  assert.equal(reuseFailed.success, false);

  // 2c. Retry after FAILED -> then CANCEL
  const retry1 = createRetryPaymentAttempt(state, order.orderNumber);
  assert.equal(retry1.success, true);
  assert.ok(retry1.paymentAttempt);
  assert.notEqual(retry1.paymentAttempt.attemptRef, attempt1.attemptRef);

  const cancelledResult = processPaymentAttempt(state, {
    attemptRef: retry1.paymentAttempt.attemptRef,
    action: 'CANCEL',
  });
  assert.equal(cancelledResult.success, true);
  assert.equal(cancelledResult.paymentAttempt?.status, 'CANCELLED');
  assert.equal(cancelledResult.order?.paymentStatus, 'CANCELLED');
  assert.equal(variant.stock, initialStock, 'Stock must not be deducted on CANCELLED payment');

  // 2d. Retry after CANCELLED -> then EXPIRE
  const retry2 = createRetryPaymentAttempt(state, order.orderNumber);
  assert.equal(retry2.success, true);
  const expiredResult = processPaymentAttempt(state, {
    attemptRef: retry2.paymentAttempt!.attemptRef,
    action: 'EXPIRE',
  });
  assert.equal(expiredResult.success, true);
  assert.equal(expiredResult.paymentAttempt?.status, 'EXPIRED');
  assert.equal(expiredResult.order?.paymentStatus, 'EXPIRED');
  assert.equal(variant.stock, initialStock, 'Stock must not be deducted on EXPIRED payment');

  // 2e. Retry after EXPIRED -> then SUCCEED
  const retry3 = createRetryPaymentAttempt(state, order.orderNumber);
  assert.equal(retry3.success, true);
  const succeededResult = processPaymentAttempt(state, {
    attemptRef: retry3.paymentAttempt!.attemptRef,
    action: 'SUCCEED',
    expectedAmount: order.totalAmount,
  });
  assert.equal(succeededResult.success, true);
  assert.equal(succeededResult.paymentAttempt?.status, 'SUCCEEDED');
  assert.equal(succeededResult.order?.status, 'PAID');
  assert.equal(succeededResult.order?.paymentStatus, 'SUCCEEDED');
  assert.equal(succeededResult.order?.stockDeducted, true);
  assert.equal(variant.stock, initialStock - 2, 'Stock must be deducted exactly once upon SUCCEED');

  // Cannot retry an already paid order
  const retryPaid = createRetryPaymentAttempt(state, order.orderNumber);
  assert.equal(retryPaid.success, false);
});

test('3. Concurrent stock deduction & gift-box bundle stock constraints prevent overselling', () => {
  const state = createInitialDatabaseState();
  const giftBox = state.products.find((p) => p.bundleItems && p.bundleItems.length > 0)!;
  assert.ok(giftBox, 'Gift box with bundle items should exist');
  const giftBoxVariant = giftBox.variants[0];

  // Constrain one component product so only 1 gift box can be fulfilled
  const bundleItem = giftBox.bundleItems![0];
  const compProduct = state.products.find((p) => p.slug === bundleItem.productSlug)!;
  const compVariant = bundleItem.variantSku
    ? compProduct.variants.find((v) => v.sku === bundleItem.variantSku)!
    : compProduct.variants[0];
  compVariant.stock = bundleItem.unitsRequired; // Enough for exactly 1 gift box

  assert.equal(getEffectiveVariantStock(state, giftBox, giftBoxVariant), 1);

  // Two customers create pending orders for the last available gift box before either pays
  const orderA = createOrder(state, {
    ...baseCheckoutFields,
    userId: 'user-a',
    items: [{ productId: giftBox.id, variantId: giftBoxVariant.id, quantity: 1 }],
  });
  const orderB = createOrder(state, {
    ...baseCheckoutFields,
    userId: 'user-b',
    items: [{ productId: giftBox.id, variantId: giftBoxVariant.id, quantity: 1 }],
  });
  assert.equal(orderA.success, true);
  assert.equal(orderB.success, true);

  // Customer A completes payment first -> succeeds and deducts both gift box and component stock
  const paymentA = processPaymentAttempt(state, {
    attemptRef: orderA.paymentAttempt!.attemptRef,
    action: 'SUCCEED',
  });
  assert.equal(paymentA.success, true);
  assert.equal(paymentA.order?.status, 'PAID');
  assert.equal(compVariant.stock, 0);

  // Customer B attempts to complete payment second -> fails due to insufficient component stock
  const paymentB = processPaymentAttempt(state, {
    attemptRef: orderB.paymentAttempt!.attemptRef,
    action: 'SUCCEED',
  });
  assert.equal(paymentB.success, false);
  assert.match(paymentB.error || '', /عدم کفایت موجودی انبار/);
  assert.equal(compVariant.stock, 0, 'Component stock must never go negative');
});

test('4. Coupon validation, minimum subtotal, per-customer usage limits, and redemption tracking', () => {
  const state = createInitialDatabaseState();
  const expensiveProduct = state.products.find((p) => p.basePrice >= 900000) || state.products[0];
  const variant = expensiveProduct.variants[0];
  const coupon = state.coupons.find((c) => c.active)!;

  // Ensure quantity meets minOrderAmount
  const qty = Math.max(2, Math.ceil(coupon.minOrderAmount / variant.price));
  const cartItems = [{ productId: expensiveProduct.id, variantId: variant.id, quantity: qty }];

  const cartValidation = validateCart(state, cartItems, {
    couponCode: coupon.code,
    userId: 'user-coupon-1',
    customerMobile: '09123456789',
  });
  assert.equal(cartValidation.couponError, undefined);
  assert.ok(cartValidation.discountAmount > 0, 'Active coupon should apply a discount');

  // Exhaust perCustomerLimit for user-coupon-1
  for (let i = 0; i < coupon.perCustomerLimit; i++) {
    const created = createOrder(state, {
      ...baseCheckoutFields,
      userId: 'user-coupon-1',
      couponCode: coupon.code,
      items: cartItems,
    });
    assert.equal(created.success, true);
    const paid = processPaymentAttempt(state, {
      attemptRef: created.paymentAttempt!.attemptRef,
      action: 'SUCCEED',
    });
    assert.equal(paid.success, true);
  }

  // Subsequent attempt by the same user with the same coupon must be rejected
  const overLimitCheck = validateCouponForItems(
    state,
    coupon.code,
    cartValidation.items,
    cartValidation.subtotal,
    { userId: 'user-coupon-1', mobile: '09123456789' }
  );
  assert.equal(overLimitCheck.valid, false);
  assert.match(overLimitCheck.error || '', /سقف مجاز/);
});

test('5. Admin authorization enforces verified fawti.tiri2@gmail.com only and blocks unauthorized access', async () => {
  assert.equal(AUTHORIZED_ADMIN_EMAIL, 'fawti.tiri2@gmail.com');

  // Null/guest user
  assert.equal(await isVerifiedFirebaseAdmin(null), false);

  // Unverified fawti.tiri2@gmail.com must be rejected
  assert.equal(
    await isVerifiedFirebaseAdmin({
      uid: 'unverified-admin-uid',
      email: 'fawti.tiri2@gmail.com',
      emailVerified: false,
    } as any),
    false,
    'Unverified admin email must not be granted admin privileges'
  );

  // Verified fawti.tiri2@gmail.com is authorized immediately without needing Firestore lookup
  assert.equal(
    await isVerifiedFirebaseAdmin({
      uid: 'verified-admin-uid',
      email: 'fawti.tiri2@gmail.com',
      emailVerified: true,
    } as any),
    true
  );

  // Order access & fulfillment status protection
  const state = createInitialDatabaseState();
  const product = state.products[0];
  const created = createOrder(state, {
    ...baseCheckoutFields,
    userId: 'owner-uid-1',
    items: [{ productId: product.id, variantId: product.variants[0].id, quantity: 1 }],
  });
  const order = created.order!;

  assert.equal(canUserAccessOrder({ uid: 'other-uid', role: 'CUSTOMER' }, order), false);
  assert.equal(canUserAccessOrder({ uid: 'owner-uid-1', role: 'CUSTOMER' }, order), true);
  assert.equal(canUserAccessOrder({ uid: 'admin-uid', role: 'ADMIN' }, order), true);

  // Admin cannot mark an unpaid order as SHIPPED
  const unpaidShip = updateOrderFulfillmentStatus(state, {
    orderId: order.id,
    newStatus: 'SHIPPED',
    adminActor: 'fawti.tiri2@gmail.com',
  });
  assert.equal(unpaidShip.success, false);

  // Masked order tracking only returns safe masked summary when orderNumber + mobile match
  const tracked = trackOrderSafe(state, order.orderNumber, '09123456789');
  assert.equal(tracked.found, true);
  assert.ok(tracked.trackingData?.maskedMobile.includes('***'));

  const wrongTrack = trackOrderSafe(state, order.orderNumber, '09999999999');
  assert.equal(wrongTrack.found, false);
});

test('6. Vercel rewrite and Firestore security rules invariants are configured accurately', () => {
  const vercelJsonPath = path.resolve(process.cwd(), 'vercel.json');
  const vercelConfig = JSON.parse(fs.readFileSync(vercelJsonPath, 'utf8'));
  assert.ok(Array.isArray(vercelConfig.rewrites), 'vercel.json must define rewrites');
  assert.equal(vercelConfig.rewrites[0].source, '/((?!api/).*)');
  assert.equal(vercelConfig.rewrites[0].destination, '/index.html');

  const spaPattern = /^(?!api\/).*$/;
  assert.equal(spaPattern.test('catalog'), true);
  assert.equal(spaPattern.test('checkout'), true);
  assert.equal(spaPattern.test('api/products'), false, '/api/* must not be rewritten to /index.html');

  const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
  const rulesContent = fs.readFileSync(rulesPath, 'utf8');
  assert.ok(
    rulesContent.includes("request.auth.token.email == 'fawti.tiri2@gmail.com'") &&
      rulesContent.includes('request.auth.token.email_verified == true'),
    'firestore.rules must require verified fawti.tiri2@gmail.com for default admin access'
  );
  assert.ok(
    rulesContent.includes('allow get: if isValidId(trackingKey);') &&
      rulesContent.includes('allow list: if false;'),
    'orderTracking must allow single-doc get only and block public list enumeration'
  );
  assert.ok(
    rulesContent.includes('isSimulatedDemo == true'),
    'firestore.rules must enforce isSimulatedDemo == true on simulated payment transitions'
  );
  assert.ok(
    rulesContent.includes('isValidCustomerStockDeduction(incoming().variants, existing().variants)'),
    'firestore.rules must prevent customers from tampering with variant prices or inflating stock'
  );

  // Verify hero video files exist on disk and have valid MP4/H.264 headers
  for (const relVideoPath of ['public/assets/hero/ravaq-hero.mp4', 'public/assets/hero/ravaq-hero-desktop.mp4']) {
    const absVideoPath = path.resolve(process.cwd(), relVideoPath);
    assert.equal(fs.existsSync(absVideoPath), true, `${relVideoPath} must exist on disk`);
    const buf = fs.readFileSync(absVideoPath);
    assert.ok(buf.length > 3_000_000, `${relVideoPath} must be the complete 3.4MB MP4 file`);
    const headerStr = buf.subarray(0, 64).toString('latin1');
    assert.ok(headerStr.includes('ftyp'), `${relVideoPath} must contain MP4 ftyp box`);
  }
});

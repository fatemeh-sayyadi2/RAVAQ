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

test('4. All 5 seed coupons (NOWRUZ1405, RAVAQ50, YALDA15, EXPIRED1403, FULL100) validate math, caps, min purchase, category restrictions, expiration, and usage limits', () => {
  const state = createInitialDatabaseState();
  const nonGiftProd = state.products.find((p) => p.categorySlug !== 'gift-boxes')!;
  const giftBoxProd = state.products.find((p) => p.categorySlug === 'gift-boxes')!;

  // 4a. NOWRUZ1405: 10%, min 800,000, max 250,000
  const lowCart = validateCart(
    state,
    [{ productId: nonGiftProd.id, variantId: nonGiftProd.variants[0].id, quantity: 1 }],
    { couponCode: 'NOWRUZ1405' }
  );
  if (lowCart.subtotal < 800000) {
    assert.equal(lowCart.discountAmount, 0);
    assert.match(lowCart.couponError || '', /حداقل مبلغ سفارش/);
  }

  const qtyFor1M = Math.ceil(1000000 / nonGiftProd.variants[0].price);
  const validNowruz = validateCart(
    state,
    [{ productId: nonGiftProd.id, variantId: nonGiftProd.variants[0].id, quantity: qtyFor1M }],
    { couponCode: 'NOWRUZ1405' }
  );
  assert.equal(validNowruz.couponError, undefined);
  assert.equal(validNowruz.discountAmount, Math.min(250000, Math.round(validNowruz.subtotal * 0.1)));

  // Cap check for NOWRUZ1405 (> 2,500,000 subtotal -> capped at 250,000)
  const qtyFor3M = Math.ceil(3000000 / nonGiftProd.variants[0].price);
  const cappedNowruz = validateCart(
    state,
    [{ productId: nonGiftProd.id, variantId: nonGiftProd.variants[0].id, quantity: qtyFor3M }],
    { couponCode: 'NOWRUZ1405' }
  );
  assert.equal(cappedNowruz.discountAmount, 250000);

  // 4b. RAVAQ50: 50,000 Toman fixed, min 500,000
  const qtyFor600k = Math.ceil(600000 / nonGiftProd.variants[0].price);
  const validRavaq50 = validateCart(
    state,
    [{ productId: nonGiftProd.id, variantId: nonGiftProd.variants[0].id, quantity: qtyFor600k }],
    { couponCode: 'RAVAQ50' }
  );
  assert.equal(validRavaq50.couponError, undefined);
  assert.equal(validRavaq50.discountAmount, 50000);

  // 4c. YALDA15: 15% on gift-boxes only, min 1,200,000, max 250,000
  const yaldaWrongCat = validateCart(
    state,
    [{ productId: nonGiftProd.id, variantId: nonGiftProd.variants[0].id, quantity: qtyFor3M }],
    { couponCode: 'YALDA15' }
  );
  assert.equal(yaldaWrongCat.discountAmount, 0);
  assert.match(yaldaWrongCat.couponError || '', /دسته‌بندی مشخص‌شده/);

  const qtyGiftFor1_5M = Math.ceil(1500000 / giftBoxProd.variants[0].price);
  const yaldaValid = validateCart(
    state,
    [{ productId: giftBoxProd.id, variantId: giftBoxProd.variants[0].id, quantity: qtyGiftFor1_5M }],
    { couponCode: 'YALDA15' }
  );
  assert.equal(yaldaValid.couponError, undefined);
  assert.equal(
    yaldaValid.discountAmount,
    Math.min(250000, Math.round(yaldaValid.subtotal * 0.15))
  );

  // 4d. EXPIRED1403: Expired coupon rejected
  const expiredCheck = validateCart(
    state,
    [{ productId: nonGiftProd.id, variantId: nonGiftProd.variants[0].id, quantity: qtyFor1M }],
    { couponCode: 'EXPIRED1403' }
  );
  assert.equal(expiredCheck.discountAmount, 0);
  assert.match(expiredCheck.couponError || '', /مهلت استفاده/);

  // 4e. FULL100: Usage limit reached rejected
  const fullCheck = validateCart(
    state,
    [{ productId: nonGiftProd.id, variantId: nonGiftProd.variants[0].id, quantity: qtyFor1M }],
    { couponCode: 'FULL100' }
  );
  assert.equal(fullCheck.discountAmount, 0);
  assert.match(fullCheck.couponError || '', /ظرفیت استفاده/);

  // 4f. Invalid coupon code rejected
  const invalidCheck = validateCart(
    state,
    [{ productId: nonGiftProd.id, variantId: nonGiftProd.variants[0].id, quantity: qtyFor1M }],
    { couponCode: 'FAKECODE999' }
  );
  assert.equal(invalidCheck.discountAmount, 0);
  assert.match(invalidCheck.couponError || '', /معتبر نیست/);
});

test('5. Demo accounts (admin@ravaq.ir and sara@example.com), demo shipping address, and RBAC authorization', async () => {
  assert.equal(AUTHORIZED_ADMIN_EMAIL, 'admin@ravaq.ir');

  const state = createInitialDatabaseState();
  const adminUser = state.users.find((u) => u.email === 'admin@ravaq.ir');
  const customerUser = state.users.find((u) => u.email === 'sara@example.com');
  assert.ok(adminUser, 'Demo ADMIN account admin@ravaq.ir must be seeded');
  assert.equal(adminUser.role, 'ADMIN');
  assert.ok(customerUser, 'Demo CUSTOMER account sara@example.com must be seeded');
  assert.equal(customerUser.role, 'CUSTOMER');
  assert.equal(customerUser.displayName, 'سارا احمدی');

  const saraAddress = state.addresses.find((a) => a.userId === customerUser.uid);
  assert.ok(saraAddress, 'Demo shipping address for Sara Ahmadi must be seeded');
  assert.equal(saraAddress.recipientName, 'سارا احمدی');
  assert.equal(saraAddress.mobile, '09123456789');
  assert.equal(saraAddress.province, 'تهران');
  assert.equal(saraAddress.city, 'تهران');
  assert.equal(saraAddress.postalCode, '1234567890');
  assert.equal(saraAddress.addressLine, 'تهران، خیابان ولیعصر، خیابان نمونه، پلاک ۱۲، واحد ۳');

  // Null/guest user
  assert.equal(await isVerifiedFirebaseAdmin(null), false);

  // Unverified admin email must be rejected in Firebase Auth guard
  assert.equal(
    await isVerifiedFirebaseAdmin({
      uid: 'unverified-admin-uid',
      email: 'admin@ravaq.ir',
      emailVerified: false,
    } as any),
    false
  );

  // Verified admin@ravaq.ir is authorized
  assert.equal(
    await isVerifiedFirebaseAdmin({
      uid: 'verified-admin-uid',
      email: 'admin@ravaq.ir',
      emailVerified: true,
    } as any),
    true
  );

  // Order access & fulfillment status protection
  const product = state.products[0];
  const created = createOrder(state, {
    ...baseCheckoutFields,
    userId: customerUser.uid,
    items: [{ productId: product.id, variantId: product.variants[0].id, quantity: 1 }],
  });
  const order = created.order!;

  assert.equal(canUserAccessOrder({ uid: 'other-uid', role: 'CUSTOMER' }, order), false);
  assert.equal(canUserAccessOrder({ uid: customerUser.uid, role: 'CUSTOMER' }, order), true);
  assert.equal(canUserAccessOrder({ uid: adminUser.uid, role: 'ADMIN' }, order), true);

  // Admin cannot mark an unpaid order as SHIPPED
  const unpaidShip = updateOrderFulfillmentStatus(state, {
    orderId: order.id,
    newStatus: 'SHIPPED',
    adminActor: 'admin@ravaq.ir',
  });
  assert.equal(unpaidShip.success, false);

  // Masked order tracking only returns safe masked summary when orderNumber + mobile match
  const tracked = trackOrderSafe(state, order.orderNumber, '09123456789');
  assert.equal(tracked.found, true);
  assert.ok(tracked.trackingData?.maskedMobile.includes('***'));

  const wrongTrack = trackOrderSafe(state, order.orderNumber, '09999999999');
  assert.equal(wrongTrack.found, false);
});

test('6. Vercel rewrite, Firestore security rules, and HeroMedia studio photograph configuration', () => {
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
    rulesContent.includes("request.auth.token.email == 'admin@ravaq.ir'") &&
      rulesContent.includes('request.auth.token.email_verified == true'),
    'firestore.rules must use admin@ravaq.ir for default admin check'
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

  // Verify HeroMedia.tsx has removed the dev hero video and preserves the studio photograph
  const heroMediaPath = path.resolve(process.cwd(), 'src/components/homepage/HeroMedia.tsx');
  const heroMediaCode = fs.readFileSync(heroMediaPath, 'utf8');
  assert.equal(heroMediaCode.includes('<video'), false, 'HeroMedia must not render a dev <video> element');
  assert.equal(
    heroMediaCode.includes('DEV HERO VIDEO DIAGNOSTICS'),
    false,
    'HeroMedia must not include dev video diagnostics overlay'
  );
  assert.equal(
    heroMediaCode.includes('/assets/hero/ravaq-hero-desktop.jpg'),
    true,
    'HeroMedia must preserve the Hero studio photograph'
  );
});

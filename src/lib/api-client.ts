import {
  auth,
  AUTHORIZED_ADMIN_EMAIL,
  googleProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  syncFirebaseUserToFirestore,
  isVerifiedFirebaseAdmin,
} from './firebase.ts';
import {
  firestoreBootstrap,
  firestoreValidateCart,
  firestoreCreateOrder,
  firestoreGetPaymentStatus,
  firestoreProcessPaymentAttempt,
  firestoreRetryPaymentAttempt,
  firestoreTrackOrder,
  firestoreGetAccountOverview,
  firestoreUpdateProfile,
  firestoreAddAddress,
  firestoreDeleteAddress,
  firestoreGetOrderDetail,
  firestoreCreateReview,
  firestoreSubscribeNewsletter,
  firestoreGetAdminDashboard,
  firestoreAdminCreateProduct,
  firestoreAdminUpdateProduct,
  firestoreAdminCreateCategory,
  firestoreAdminDeleteCategory,
  firestoreAdminUpdateOrderStatus,
  firestoreAdminAdjustInventory,
  firestoreAdminCreateCoupon,
  firestoreAdminToggleCoupon,
  firestoreAdminSaveSettings,
} from './firestore-commerce.ts';
import { CartItemInput, OrderStatus } from './types.ts';

/**
 * Helper to check if a local Express backend is reachable and returning valid JSON
 * (used only when a local Express Bearer session token is active in local dev).
 */
async function tryLocalExpressJson<T>(
  url: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T } | null> {
  try {
    const res = await fetch(url, init);
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      return null;
    }
    const data = (await res.json()) as T;
    return { ok: res.ok, status: res.status, data };
  } catch {
    return null;
  }
}

export async function apiBootstrap() {
  return firestoreBootstrap();
}

export async function apiValidateCart(params: {
  items: CartItemInput[];
  couponCode?: string;
  deliveryMethod?: 'STANDARD' | 'EXPRESS_TEHRAN';
  customerMobile?: string;
}) {
  return firestoreValidateCart(params);
}

export async function apiCreateOrder(payload: unknown, authToken?: string | null) {
  if (auth.currentUser) {
    return firestoreCreateOrder(payload);
  }
  if (authToken) {
    const localRes = await tryLocalExpressJson<any>('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });
    if (localRes) return localRes.data;
  }
  return firestoreCreateOrder(payload);
}

export async function apiGetPaymentStatus(attemptRef: string) {
  if (auth.currentUser) {
    return firestoreGetPaymentStatus(attemptRef);
  }
  const localRes = await tryLocalExpressJson<any>(
    `/api/payments/${encodeURIComponent(attemptRef)}`
  );
  if (localRes && localRes.ok) {
    return localRes.data;
  }
  return firestoreGetPaymentStatus(attemptRef);
}

export async function apiProcessPaymentAttempt(params: {
  attemptRef: string;
  action: 'SUCCEED' | 'FAIL' | 'CANCEL' | 'EXPIRE';
  expectedAmount?: number;
  reason?: string;
}) {
  if (auth.currentUser) {
    return firestoreProcessPaymentAttempt(params);
  }
  const localRes = await tryLocalExpressJson<any>(
    `/api/payments/${encodeURIComponent(params.attemptRef)}/action`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: params.action,
        expectedAmount: params.expectedAmount,
        reason: params.reason,
      }),
    }
  );
  if (localRes) {
    return localRes.data;
  }
  return firestoreProcessPaymentAttempt(params);
}

export async function apiRetryPaymentAttempt(orderNumber: string) {
  if (auth.currentUser) {
    return firestoreRetryPaymentAttempt(orderNumber);
  }
  const localRes = await tryLocalExpressJson<any>(
    `/api/orders/${encodeURIComponent(orderNumber)}/retry-payment`,
    { method: 'POST' }
  );
  if (localRes) {
    return localRes.data;
  }
  return firestoreRetryPaymentAttempt(orderNumber);
}

export async function apiTrackOrder(orderNumber: string, customerMobile: string) {
  const fsRes = await firestoreTrackOrder(orderNumber, customerMobile).catch(() => null);
  if (fsRes && fsRes.found) {
    return fsRes;
  }
  const localRes = await tryLocalExpressJson<any>('/api/orders/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ orderNumber, customerMobile }),
  });
  if (localRes && localRes.data?.found) {
    return localRes.data;
  }
  return (
    fsRes || {
      found: false,
      error: 'سفارشی با این شماره سفارش و شماره موبایل یافت نشد.',
    }
  );
}

export async function apiGoogleLogin() {
  const cred = await signInWithPopup(auth, googleProvider);
  const synced = await syncFirebaseUserToFirestore(cred.user);
  const isAdmin = await isVerifiedFirebaseAdmin(cred.user);
  return {
    user: {
      uid: synced.uid,
      displayName: synced.displayName,
      email: synced.email,
      mobile: synced.mobile,
      role: isAdmin ? ('ADMIN' as const) : ('CUSTOMER' as const),
    },
    token: null,
  };
}

export async function apiEmailLogin(email: string, password: string) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  try {
    const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
    const synced = await syncFirebaseUserToFirestore(cred.user);
    const isAdmin = await isVerifiedFirebaseAdmin(cred.user);
    return {
      user: {
        uid: synced.uid,
        displayName: synced.displayName,
        email: synced.email,
        mobile: synced.mobile,
        role: isAdmin ? ('ADMIN' as const) : ('CUSTOMER' as const),
      },
      token: null,
    };
  } catch (fbErr: any) {
    // If running in local Node dev server, check local Express auth
    const localRes = await tryLocalExpressJson<any>('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail, password }),
    });
    if (localRes && localRes.ok && localRes.data?.user) {
      return {
        user: localRes.data.user,
        token: localRes.data.token as string,
      };
    }

    if (
      fbErr?.code === 'auth/operation-not-allowed' ||
      fbErr?.code === 'auth/configuration-not-found'
    ) {
      throw new Error(
        `ورود با ایمیل/رمز عبور در کنسول Firebase فعال نشده است. لطفاً از دکمه «ورود با حساب گوگل (Firebase Auth)» استفاده کنید (مدیر پروژه: ${AUTHORIZED_ADMIN_EMAIL}).`
      );
    }
    throw new Error('ایمیل یا رمز عبور واردشده نادرست است یا حساب کاربری یافت نشد.');
  }
}

export async function apiEmailRegister(params: {
  displayName: string;
  email: string;
  mobile?: string;
  password: string;
}) {
  const cleanEmail = String(params.email || '').trim().toLowerCase();
  const cleanName = String(params.displayName || '').trim();
  if (cleanName.length < 2) {
    throw new Error('نام و نام خانوادگی باید حداقل ۲ حرف باشد.');
  }
  if (String(params.password || '').length < 6) {
    throw new Error('رمز عبور باید حداقل ۶ کاراکتر باشد.');
  }

  try {
    const cred = await createUserWithEmailAndPassword(auth, cleanEmail, params.password);
    await updateProfile(cred.user, { displayName: cleanName });
    const synced = await syncFirebaseUserToFirestore(cred.user);
    if (params.mobile) {
      await firestoreUpdateProfile({ displayName: cleanName, mobile: params.mobile });
    }
    return {
      user: {
        uid: synced.uid,
        displayName: cleanName,
        email: synced.email,
        mobile: params.mobile || synced.mobile,
        role: 'CUSTOMER' as const,
      },
      token: null,
    };
  } catch (fbErr: any) {
    const localRes = await tryLocalExpressJson<any>('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (localRes && localRes.ok && localRes.data?.user) {
      return {
        user: localRes.data.user,
        token: localRes.data.token as string,
      };
    }
    if (fbErr?.code === 'auth/email-already-in-use') {
      throw new Error('کاربری با این ایمیل قبلاً ثبت‌نام کرده است.');
    }
    if (
      fbErr?.code === 'auth/operation-not-allowed' ||
      fbErr?.code === 'auth/configuration-not-found'
    ) {
      throw new Error(
        'ثبت‌نام با ایمیل/رمز عبور در کنسول Firebase فعال نشده است. لطفاً از دکمه «ورود با حساب گوگل (Firebase Auth)» استفاده کنید.'
      );
    }
    throw new Error(localRes?.data?.error || 'خطا در ایجاد حساب کاربری.');
  }
}

export async function apiForgotPassword(email: string) {
  const cleanEmail = String(email || '').trim().toLowerCase();
  try {
    await sendPasswordResetEmail(auth, cleanEmail);
    return {
      message: 'لینک بازنشانی رمز عبور از طریق Firebase Authentication به ایمیل شما ارسال شد.',
    };
  } catch {
    const localRes = await tryLocalExpressJson<any>('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: cleanEmail }),
    });
    if (localRes && localRes.ok) {
      return localRes.data;
    }
    return {
      message:
        'در صورت فعال بودن سرویس ایمیل در پروژه Firebase، لینک بازیابی رمز عبور برای این آدرس ارسال می‌شود.',
    };
  }
}

export async function apiResetPassword(code: string, newPassword: string) {
  const localRes = await tryLocalExpressJson<any>('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code, newPassword }),
  });
  if (localRes) {
    if (!localRes.ok) throw new Error(localRes.data?.error || 'خطا در بازنشانی رمز عبور.');
    return localRes.data;
  }
  throw new Error('در نسخه ابری (Firebase Auth)، تغییر رمز عبور از طریق لینک ارسال‌شده به ایمیل انجام می‌شود.');
}

export async function apiGetAccountOverview(authToken?: string | null) {
  if (auth.currentUser) {
    return firestoreGetAccountOverview();
  }
  if (authToken) {
    const localRes = await tryLocalExpressJson<any>('/api/account/overview', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (localRes && localRes.ok) return localRes.data;
  }
  return firestoreGetAccountOverview();
}

export async function apiUpdateProfile(
  params: { displayName: string; mobile?: string },
  authToken?: string | null
) {
  if (auth.currentUser) {
    return firestoreUpdateProfile(params);
  }
  if (authToken) {
    const localRes = await tryLocalExpressJson<any>('/api/account/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(params),
    });
    if (localRes) {
      if (!localRes.ok) throw new Error(localRes.data?.error || 'خطا در بروزرسانی مشخصات.');
      return localRes.data;
    }
  }
  return firestoreUpdateProfile(params);
}

export async function apiAddAddress(
  params: {
    recipientName: string;
    mobile: string;
    province: string;
    city: string;
    addressLine: string;
    postalCode: string;
    isDefault: boolean;
  },
  authToken?: string | null
) {
  if (auth.currentUser) {
    return firestoreAddAddress(params);
  }
  if (authToken) {
    const localRes = await tryLocalExpressJson<any>('/api/account/addresses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(params),
    });
    if (localRes) {
      if (!localRes.ok) throw new Error(localRes.data?.error || 'خطا در ثبت نشانی.');
      return localRes.data;
    }
  }
  return firestoreAddAddress(params);
}

export async function apiDeleteAddress(addressId: string, authToken?: string | null) {
  if (auth.currentUser) {
    return firestoreDeleteAddress(addressId);
  }
  if (authToken) {
    const localRes = await tryLocalExpressJson<any>(
      `/api/account/addresses/${encodeURIComponent(addressId)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    if (localRes && localRes.ok) return localRes.data;
  }
  return firestoreDeleteAddress(addressId);
}

export async function apiGetOrderDetail(orderId: string, authToken?: string | null) {
  if (auth.currentUser) {
    return firestoreGetOrderDetail(orderId);
  }
  if (authToken) {
    const localRes = await tryLocalExpressJson<any>(
      `/api/account/orders/${encodeURIComponent(orderId)}`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    if (localRes) {
      if (!localRes.ok) throw new Error(localRes.data?.error || 'خطا در دسترسی به سفارش.');
      return localRes.data;
    }
  }
  return firestoreGetOrderDetail(orderId);
}

export async function apiCreateReview(
  params: { productId: string; rating: number; comment: string },
  authToken?: string | null
) {
  if (auth.currentUser) {
    return firestoreCreateReview(params);
  }
  if (authToken) {
    const localRes = await tryLocalExpressJson<any>('/api/reviews', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(params),
    });
    if (localRes) {
      if (!localRes.ok) throw new Error(localRes.data?.error || 'خطا در ثبت دیدگاه.');
      return localRes.data;
    }
  }
  return firestoreCreateReview(params);
}

export async function apiSubscribeNewsletter(email: string) {
  if (auth.currentUser) {
    return firestoreSubscribeNewsletter(email);
  }
  try {
    return await firestoreSubscribeNewsletter(email);
  } catch (err: any) {
    const localRes = await tryLocalExpressJson<any>('/api/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (localRes && localRes.ok) return localRes.data;
    throw err;
  }
}

export async function apiGetAdminDashboard(authToken?: string | null) {
  if (auth.currentUser) {
    return firestoreGetAdminDashboard();
  }
  if (authToken) {
    const localRes = await tryLocalExpressJson<any>('/api/admin/dashboard', {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    if (localRes) {
      if (!localRes.ok) throw new Error(localRes.data?.error || 'عدم دسترسی به پنل مدیریت.');
      return localRes.data;
    }
  }
  return firestoreGetAdminDashboard();
}

export async function apiAdminCreateProduct(body: any, authToken?: string | null) {
  if (auth.currentUser) {
    return firestoreAdminCreateProduct(body);
  }
  if (authToken) {
    const localRes = await tryLocalExpressJson<any>('/api/admin/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
    });
    if (localRes) {
      if (!localRes.ok) throw new Error(localRes.data?.error || 'خطا در ایجاد محصول.');
      return localRes.data;
    }
  }
  return firestoreAdminCreateProduct(body);
}

export async function apiAdminUpdateProduct(
  productId: string,
  body: any,
  authToken?: string | null
) {
  if (auth.currentUser) {
    return firestoreAdminUpdateProduct(productId, body);
  }
  if (authToken) {
    const localRes = await tryLocalExpressJson<any>(
      `/api/admin/products/${encodeURIComponent(productId)}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(body),
      }
    );
    if (localRes) {
      if (!localRes.ok) throw new Error(localRes.data?.error || 'خطا در ویرایش محصول.');
      return localRes.data;
    }
  }
  return firestoreAdminUpdateProduct(productId, body);
}

export async function apiAdminCreateCategory(body: any, authToken?: string | null) {
  if (auth.currentUser) {
    return firestoreAdminCreateCategory(body);
  }
  if (authToken) {
    const localRes = await tryLocalExpressJson<any>('/api/admin/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
    });
    if (localRes) {
      if (!localRes.ok) throw new Error(localRes.data?.error || 'خطا در ایجاد دسته‌بندی.');
      return localRes.data;
    }
  }
  return firestoreAdminCreateCategory(body);
}

export async function apiAdminDeleteCategory(categoryId: string, authToken?: string | null) {
  if (auth.currentUser) {
    return firestoreAdminDeleteCategory(categoryId);
  }
  if (authToken) {
    const localRes = await tryLocalExpressJson<any>(
      `/api/admin/categories/${encodeURIComponent(categoryId)}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    if (localRes) {
      if (!localRes.ok) throw new Error(localRes.data?.error || 'خطا در حذف دسته‌بندی.');
      return localRes.data;
    }
  }
  return firestoreAdminDeleteCategory(categoryId);
}

export async function apiAdminUpdateOrderStatus(
  orderId: string,
  status: OrderStatus,
  authToken?: string | null
) {
  if (auth.currentUser) {
    return firestoreAdminUpdateOrderStatus(orderId, status);
  }
  if (authToken) {
    const localRes = await tryLocalExpressJson<any>(
      `/api/admin/orders/${encodeURIComponent(orderId)}/status`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ status }),
      }
    );
    if (localRes) {
      if (!localRes.ok) throw new Error(localRes.data?.error || 'خطا در بروزرسانی وضعیت سفارش.');
      return localRes.data;
    }
  }
  return firestoreAdminUpdateOrderStatus(orderId, status);
}

export async function apiAdminAdjustInventory(
  params: {
    productId: string;
    variantId: string;
    newStock: number;
    referenceNote: string;
  },
  authToken?: string | null
) {
  if (auth.currentUser) {
    return firestoreAdminAdjustInventory(params);
  }
  if (authToken) {
    const localRes = await tryLocalExpressJson<any>('/api/admin/inventory/adjust', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(params),
    });
    if (localRes) {
      if (!localRes.ok) throw new Error(localRes.data?.error || 'خطا در اصلاح موجودی.');
      return localRes.data;
    }
  }
  return firestoreAdminAdjustInventory(params);
}

export async function apiAdminCreateCoupon(body: any, authToken?: string | null) {
  if (auth.currentUser) {
    return firestoreAdminCreateCoupon(body);
  }
  if (authToken) {
    const localRes = await tryLocalExpressJson<any>('/api/admin/coupons', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
    });
    if (localRes) {
      if (!localRes.ok) throw new Error(localRes.data?.error || 'خطا در ایجاد کد تخفیف.');
      return localRes.data;
    }
  }
  return firestoreAdminCreateCoupon(body);
}

export async function apiAdminToggleCoupon(couponId: string, authToken?: string | null) {
  if (auth.currentUser) {
    return firestoreAdminToggleCoupon(couponId);
  }
  if (authToken) {
    const localRes = await tryLocalExpressJson<any>(
      `/api/admin/coupons/${encodeURIComponent(couponId)}/toggle`,
      {
        method: 'PUT',
        headers: { Authorization: `Bearer ${authToken}` },
      }
    );
    if (localRes) {
      if (!localRes.ok) throw new Error(localRes.data?.error || 'خطا در تغییر وضعیت کد تخفیف.');
      return localRes.data;
    }
  }
  return firestoreAdminToggleCoupon(couponId);
}

export async function apiAdminSaveSettings(body: any, authToken?: string | null) {
  if (auth.currentUser) {
    return firestoreAdminSaveSettings(body);
  }
  if (authToken) {
    const localRes = await tryLocalExpressJson<any>('/api/admin/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(body),
    });
    if (localRes) {
      if (!localRes.ok) throw new Error(localRes.data?.error || 'خطا در ذخیره تنظیمات.');
      return localRes.data;
    }
  }
  return firestoreAdminSaveSettings(body);
}

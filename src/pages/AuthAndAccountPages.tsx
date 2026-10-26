import React, { useState, useEffect } from 'react';
import {
  User,
  MapPin,
  Package,
  LogOut,
  Plus,
  Trash2,
  ShieldCheck,
  KeyRound,
} from 'lucide-react';
import {
  auth,
  googleProvider,
  signInWithPopup,
  syncFirebaseUserToFirestore,
  saveAddressToFirestore,
} from '../lib/firebase.ts';
import { CustomerAddressRecord, Order } from '../lib/types.ts';
import {
  formatToman,
  toPersianDigits,
  formatJalaliDate,
  IRAN_PROVINCES,
} from '../lib/persian.ts';

interface AuthPageProps {
  mode: 'login' | 'register' | 'forgot-password' | 'reset-password';
  onAuthSuccess: (
    user: {
      uid: string;
      displayName: string;
      email: string;
      mobile?: string;
      role: 'CUSTOMER' | 'ADMIN';
    },
    token: string | null
  ) => void;
  onNavigate: (path: string) => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({
  mode,
  onAuthSuccess,
  onNavigate,
}) => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [password, setPassword] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [devCodeHint, setDevCodeHint] = useState('');
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await syncFirebaseUserToFirestore(cred.user);
      const isAdmin = cred.user.email === 'fawti.tiri2@gmail.com';
      onAuthSuccess(
        {
          uid: cred.user.uid,
          displayName: cred.user.displayName || 'کاربر رواق',
          email: cred.user.email || '',
          role: isAdmin ? 'ADMIN' : 'CUSTOMER',
        },
        null
      );
      onNavigate('/account');
    } catch (err: any) {
      setError('ورود با حساب گوگل انجام نشد. می‌توانید از فرم ایمیل و رمز عبور استفاده کنید.');
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setInfoMsg('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'خطا در ورود.');
        } else {
          onAuthSuccess(data.user, data.token);
          onNavigate(data.user.role === 'ADMIN' ? '/admin' : '/account');
        }
      } else if (mode === 'register') {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ displayName, email, mobile, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'خطا در ثبت‌نام.');
        } else {
          onAuthSuccess(data.user, data.token);
          onNavigate('/account');
        }
      } else if (mode === 'forgot-password') {
        const res = await fetch('/api/auth/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        setInfoMsg(data.message);
        if (data.devResetCode) {
          setDevCodeHint(data.devResetCode);
        }
      } else if (mode === 'reset-password') {
        const res = await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: resetCode, newPassword: password }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'خطا در بازنشانی رمز عبور.');
        } else {
          setInfoMsg(data.message);
          setTimeout(() => onNavigate('/login'), 1200);
        }
      }
    } catch {
      setError('خطا در ارتباط با سرور.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoAdminLogin = async () => {
    setEmail('fawti.tiri2@gmail.com');
    setPassword('RavaqAdmin1405!');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'fawti.tiri2@gmail.com',
          password: 'RavaqAdmin1405!',
        }),
      });
      const data = await res.json();
      if (res.ok && data.user) {
        onAuthSuccess(data.user, data.token);
        onNavigate('/admin');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 pt-32 pb-20">
      <div className="bg-[#FFFFFF] border border-[#E4DCCF] rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="space-y-1.5 text-center">
          <h1 className="text-2xl font-bold text-[#292624]">
            {mode === 'login'
              ? 'ورود به حساب کاربری رَواق'
              : mode === 'register'
              ? 'ایجاد حساب کاربری در رَواق'
              : mode === 'forgot-password'
              ? 'بازیابی رمز عبور (محیط توسعه)'
              : 'تعیین رمز عبور جدید'}
          </h1>
          <p className="text-xs text-[#77716A]">
            برای مدیریت سفارش‌ها، نشانی‌های منتخب و پیگیری خرید وارد شوید.
          </p>
        </div>

        {error && (
          <div className="bg-[#F5E2E0] border border-[#742E3A] text-[#4C202B] p-3 rounded-xl text-xs">
            {error}
          </div>
        )}

        {infoMsg && (
          <div className="bg-[#E5EEE6] border border-[#2D8C88] text-[#292624] p-3 rounded-xl text-xs space-y-1">
            <p>{infoMsg}</p>
            {devCodeHint && (
              <p className="font-mono font-bold">
                کد بازیابی آزمایشی: {devCodeHint}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setResetCode(devCodeHint);
                    onNavigate('/reset-password');
                  }}
                  className="underline text-[#742E3A] mr-2 cursor-pointer"
                >
                  رفتن به صفحه تغییر رمز
                </button>
              </p>
            )}
          </div>
        )}

        {(mode === 'login' || mode === 'register') && (
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-2.5 px-4 bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg text-xs font-bold text-[#292624] hover:border-[#742E3A] transition-colors cursor-pointer"
            >
              ورود با حساب گوگل (Firebase Auth)
            </button>

            <button
              type="button"
              onClick={handleQuickDemoAdminLogin}
              disabled={loading}
              className="w-full py-2 px-4 bg-[#EFE5D6] text-[#4C202B] rounded-lg text-xs font-medium hover:bg-[#E4DCCF] transition-colors cursor-pointer"
            >
              ورود سریع با حساب مدیر آزمایشی (Demo Admin)
            </button>
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="space-y-4 pt-2 border-t border-[#E4DCCF]">
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-bold text-[#292624] mb-1">
                  نام و نام خانوادگی *
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#292624] mb-1">
                  شماره موبایل ایران (اختیاری)
                </label>
                <input
                  type="tel"
                  dir="ltr"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="09123456789"
                  className="w-full px-3.5 py-2 text-sm bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg text-left font-mono"
                />
              </div>
            </>
          )}

          {mode !== 'reset-password' && (
            <div>
              <label className="block text-xs font-bold text-[#292624] mb-1">
                آدرس ایمیل *
              </label>
              <input
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full px-3.5 py-2 text-sm bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg text-left font-mono"
                required
              />
            </div>
          )}

          {mode === 'reset-password' && (
            <div>
              <label className="block text-xs font-bold text-[#292624] mb-1">
                کد بازیابی ۶ رقمی *
              </label>
              <input
                type="text"
                dir="ltr"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg text-left font-mono"
                required
              />
            </div>
          )}

          {mode !== 'forgot-password' && (
            <div>
              <label className="block text-xs font-bold text-[#292624] mb-1">
                {mode === 'reset-password' ? 'رمز عبور جدید *' : 'رمز عبور *'}
              </label>
              <input
                type="password"
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg text-left"
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#742E3A] text-[#F8F4EC] text-xs font-bold rounded-lg hover:bg-[#4C202B] cursor-pointer"
          >
            {loading
              ? 'در حال بررسی...'
              : mode === 'login'
              ? 'ورود به حساب'
              : mode === 'register'
              ? 'ثبت‌نام در رواق'
              : mode === 'forgot-password'
              ? 'دریافت کد بازیابی'
              : 'تغییر رمز عبور'}
          </button>
        </form>

        <div className="pt-3 border-t border-[#E4DCCF] flex flex-wrap items-center justify-between gap-2 text-xs text-[#77716A]">
          {mode === 'login' ? (
            <>
              <button
                type="button"
                onClick={() => onNavigate('/register')}
                className="hover:text-[#742E3A] font-medium cursor-pointer"
              >
                حساب ندارید؟ ثبت‌نام کنید
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/forgot-password')}
                className="hover:text-[#742E3A] cursor-pointer"
              >
                فراموشی رمز عبور
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('/login')}
              className="hover:text-[#742E3A] font-medium cursor-pointer"
            >
              بازگشت به صفحه ورود
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

interface AccountPageProps {
  subRoute: 'overview' | 'profile' | 'addresses' | 'orders' | 'order-detail';
  orderIdParam?: string;
  user: {
    uid: string;
    displayName: string;
    email: string;
    mobile?: string;
    role: 'CUSTOMER' | 'ADMIN';
  } | null;
  authToken: string | null;
  addresses: CustomerAddressRecord[];
  orders: Order[];
  onRefreshAccount: () => void;
  onLogout: () => void;
  onNavigate: (path: string) => void;
}

export const AccountPage: React.FC<AccountPageProps> = ({
  subRoute,
  orderIdParam,
  user,
  authToken,
  addresses,
  orders,
  onRefreshAccount,
  onLogout,
  onNavigate,
}) => {
  const [editName, setEditName] = useState(user?.displayName || '');
  const [editMobile, setEditMobile] = useState(user?.mobile || '');
  const [profileMsg, setProfileMsg] = useState('');

  // New Address state
  const [recipientName, setRecipientName] = useState(user?.displayName || '');
  const [addrMobile, setAddrMobile] = useState(user?.mobile || '');
  const [province, setProvince] = useState('تهران');
  const [city, setCity] = useState('تهران');
  const [addressLine, setAddressLine] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [isDefault, setIsDefault] = useState(true);
  const [addrError, setAddrError] = useState('');

  // Order detail state
  const [orderDetailData, setOrderDetailData] = useState<any | null>(null);
  const [orderDetailError, setOrderDetailError] = useState('');

  useEffect(() => {
    if (user) {
      setEditName(user.displayName);
      setEditMobile(user.mobile || '');
    }
  }, [user]);

  useEffect(() => {
    if (subRoute === 'order-detail' && orderIdParam && user) {
      const headers: Record<string, string> = {};
      if (authToken) headers.Authorization = `Bearer ${authToken}`;
      headers['x-firebase-uid'] = user.uid;
      headers['x-firebase-email'] = user.email;
      fetch(`/api/account/orders/${encodeURIComponent(orderIdParam)}`, { headers })
        .then((r) => r.json().then((d) => ({ ok: r.ok, d })))
        .then(({ ok, d }) => {
          if (!ok) setOrderDetailError(d.error || 'خطا در دسترسی به سفارش.');
          else setOrderDetailData(d);
        })
        .catch(() => setOrderDetailError('خطا در دریافت اطلاعات سفارش.'));
    }
  }, [subRoute, orderIdParam, user, authToken]);

  if (!user) {
    return (
      <div className="max-w-lg mx-auto px-4 pt-32 pb-20 text-center space-y-4">
        <h1 className="text-xl font-bold text-[#292624]">
          برای مشاهده حساب کاربری ابتدا وارد شوید
        </h1>
        <button
          type="button"
          onClick={() => onNavigate('/login')}
          className="px-6 py-2.5 bg-[#742E3A] text-[#F8F4EC] text-xs font-bold rounded-lg cursor-pointer"
        >
          ورود به حساب کاربری
        </button>
      </div>
    );
  }

  const getHeaders = () => {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (authToken) h.Authorization = `Bearer ${authToken}`;
    h['x-firebase-uid'] = user.uid;
    h['x-firebase-email'] = user.email;
    h['x-firebase-name'] = user.displayName;
    return h;
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMsg('');
    const res = await fetch('/api/account/profile', {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ displayName: editName, mobile: editMobile }),
    });
    const data = await res.json();
    if (!res.ok) {
      setProfileMsg(data.error || 'خطا در بروزرسانی مشخصات.');
    } else {
      setProfileMsg('مشخصات حساب کاربری با موفقیت ذخیره شد.');
      onRefreshAccount();
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddrError('');
    const res = await fetch('/api/account/addresses', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        recipientName,
        mobile: addrMobile,
        province,
        city,
        addressLine,
        postalCode,
        isDefault,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setAddrError(data.error || 'خطا در ثبت نشانی.');
    } else {
      if (auth.currentUser && data.address) {
        try {
          await saveAddressToFirestore(auth.currentUser.uid, data.address.id, {
            recipientName: data.address.recipientName,
            mobile: data.address.mobile,
            province: data.address.province,
            city: data.address.city,
            addressLine: data.address.addressLine,
            postalCode: data.address.postalCode,
            isDefault: data.address.isDefault,
          });
        } catch {
          // Handled by server persistence fallback
        }
      }
      setAddressLine('');
      setPostalCode('');
      onRefreshAccount();
    }
  };

  const handleDeleteAddress = async (id: string) => {
    await fetch(`/api/account/addresses/${id}`, {
      method: 'DELETE',
      headers: getHeaders(),
    });
    onRefreshAccount();
  };

  const tabs = [
    { key: 'overview', path: '/account', label: 'نمای کلی حساب', icon: User },
    { key: 'profile', path: '/account/profile', label: 'ویرایش مشخصات', icon: KeyRound },
    { key: 'addresses', path: '/account/addresses', label: 'نشانی‌های من', icon: MapPin },
    { key: 'orders', path: '/account/orders', label: 'سفارش‌های من', icon: Package },
  ];

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Account Sidebar */}
        <aside className="lg:col-span-3 bg-[#FFFFFF] border border-[#E4DCCF] rounded-2xl p-5 space-y-4">
          <div className="border-b border-[#E4DCCF] pb-4">
            <h2 className="text-base font-bold text-[#292624]">{user.displayName}</h2>
            <p className="text-xs text-[#77716A] font-mono truncate">{user.email}</p>
          </div>

          <nav className="space-y-1">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = subRoute === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => onNavigate(t.path)}
                  className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#742E3A] text-[#F8F4EC] font-bold'
                      : 'text-[#292624] hover:bg-[#EFE5D6]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{t.label}</span>
                </button>
              );
            })}

            {user.role === 'ADMIN' && (
              <button
                type="button"
                onClick={() => onNavigate('/admin')}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs font-bold text-[#742E3A] bg-[#EFE5D6] hover:bg-[#E4DCCF] cursor-pointer mt-2"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>ورود به پنل مدیریت رواق</span>
              </button>
            )}

            <button
              type="button"
              onClick={onLogout}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs font-medium text-[#742E3A] hover:bg-[#F5E2E0] cursor-pointer mt-4"
            >
              <LogOut className="w-4 h-4" />
              <span>خروج از حساب کاربری</span>
            </button>
          </nav>
        </aside>

        {/* Account Content Area */}
        <div className="lg:col-span-9 space-y-6">
          {subRoute === 'overview' && (
            <div className="space-y-6">
              <div className="bg-[#FFFFFF] border border-[#E4DCCF] rounded-2xl p-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#F8F4EC] p-4 rounded-xl border border-[#E4DCCF]">
                  <span className="text-xs text-[#77716A] block">کل سفارش‌های ثبت‌شده</span>
                  <span className="text-2xl font-bold text-[#292624] tabular-nums">
                    {toPersianDigits(orders.length)}
                  </span>
                </div>
                <div className="bg-[#F8F4EC] p-4 rounded-xl border border-[#E4DCCF]">
                  <span className="text-xs text-[#77716A] block">نشانی‌های ذخیره‌شده</span>
                  <span className="text-2xl font-bold text-[#292624] tabular-nums">
                    {toPersianDigits(addresses.length)}
                  </span>
                </div>
                <div className="bg-[#F8F4EC] p-4 rounded-xl border border-[#E4DCCF]">
                  <span className="text-xs text-[#77716A] block">نقش کاربری</span>
                  <span className="text-sm font-bold text-[#742E3A] mt-1 block">
                    {user.role === 'ADMIN' ? 'مدیر فروشگاه' : 'مشتری رواق'}
                  </span>
                </div>
              </div>

              <div className="bg-[#FFFFFF] border border-[#E4DCCF] rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#292624]">آخرین سفارش‌های شما</h3>
                  <button
                    type="button"
                    onClick={() => onNavigate('/account/orders')}
                    className="text-xs text-[#742E3A] font-semibold cursor-pointer"
                  >
                    مشاهده همه سفارش‌ها
                  </button>
                </div>
                {orders.length === 0 ? (
                  <p className="text-xs text-[#77716A]">هنوز سفارشی ثبت نکرده‌اید.</p>
                ) : (
                  <div className="space-y-2.5">
                    {orders.slice(0, 3).map((ord) => (
                      <div
                        key={ord.id}
                        onClick={() => onNavigate(`/account/orders/${ord.id}`)}
                        className="p-4 rounded-xl border border-[#E4DCCF] bg-[#F8F4EC] flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:border-[#742E3A]"
                      >
                        <div>
                          <span className="font-mono font-bold text-sm text-[#292624]">
                            {ord.orderNumber}
                          </span>
                          <span className="block text-xs text-[#77716A]">
                            {formatJalaliDate(ord.createdAt)}
                          </span>
                        </div>
                        <span className="text-xs font-medium text-[#292624]">
                          وضعیت: {ord.status} (پرداخت: {ord.paymentStatus})
                        </span>
                        <span className="text-sm font-bold text-[#742E3A] tabular-nums">
                          {formatToman(ord.totalAmount)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {subRoute === 'profile' && (
            <form
              onSubmit={handleSaveProfile}
              className="bg-[#FFFFFF] border border-[#E4DCCF] rounded-2xl p-6 space-y-4"
            >
              <h2 className="text-lg font-bold text-[#292624]">ویرایش اطلاعات فردی</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#292624] mb-1">
                    نام و نام خانوادگی
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#292624] mb-1">
                    شماره موبایل ایران
                  </label>
                  <input
                    type="tel"
                    dir="ltr"
                    value={editMobile}
                    onChange={(e) => setEditMobile(e.target.value)}
                    placeholder="09123456789"
                    className="w-full px-3.5 py-2 text-sm bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg text-left font-mono"
                  />
                </div>
              </div>
              {profileMsg && (
                <p className="text-xs font-medium text-[#2D8C88]">{profileMsg}</p>
              )}
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#742E3A] text-[#F8F4EC] text-xs font-bold rounded-lg cursor-pointer"
              >
                ذخیره تغییرات
              </button>
            </form>
          )}

          {subRoute === 'addresses' && (
            <div className="space-y-6">
              <div className="bg-[#FFFFFF] border border-[#E4DCCF] rounded-2xl p-6 space-y-4">
                <h2 className="text-lg font-bold text-[#292624]">نشانی‌های ثبت‌شده شما</h2>
                {addresses.length === 0 ? (
                  <p className="text-xs text-[#77716A]">هنوز نشانی پستی ذخیره نکرده‌اید.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {addresses.map((addr) => (
                      <div
                        key={addr.id}
                        className="p-4 rounded-xl border border-[#E4DCCF] bg-[#F8F4EC] flex items-start justify-between gap-3 text-xs"
                      >
                        <div className="space-y-1">
                          <div className="font-bold text-[#292624]">
                            {addr.recipientName} · {toPersianDigits(addr.mobile)}
                          </div>
                          <div className="text-[#77716A]">
                            {addr.province}، {addr.city} — {addr.addressLine}
                          </div>
                          <div className="font-mono text-[#77716A]">
                            کد پستی: {toPersianDigits(addr.postalCode)}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="p-1.5 text-[#77716A] hover:text-[#742E3A] cursor-pointer"
                          aria-label="حذف نشانی"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <form
                onSubmit={handleAddAddress}
                className="bg-[#FFFFFF] border border-[#E4DCCF] rounded-2xl p-6 space-y-4"
              >
                <h3 className="text-base font-bold text-[#292624] flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-[#742E3A]" />
                  <span>افزودن نشانی پستی جدید</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="نام و نام خانوادگی گیرنده *"
                    className="px-3.5 py-2 text-sm bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg"
                    required
                  />
                  <input
                    type="tel"
                    dir="ltr"
                    value={addrMobile}
                    onChange={(e) => setAddrMobile(e.target.value)}
                    placeholder="شماره موبایل (۰۹۱۲...) *"
                    className="px-3.5 py-2 text-sm bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg text-left font-mono"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <select
                    value={province}
                    onChange={(e) => {
                      const p = e.target.value;
                      setProvince(p);
                      setCity(IRAN_PROVINCES.find((x) => x.name === p)?.cities[0] || p);
                    }}
                    className="px-3 py-2 text-sm bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg"
                  >
                    {IRAN_PROVINCES.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="px-3 py-2 text-sm bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg"
                  >
                    {(IRAN_PROVINCES.find((x) => x.name === province)?.cities || [province]).map(
                      (c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      )
                    )}
                  </select>
                  <input
                    type="text"
                    dir="ltr"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    placeholder="کد پستی ۱۰ رقمی *"
                    className="px-3.5 py-2 text-sm bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg text-left font-mono"
                    required
                  />
                </div>
                <input
                  type="text"
                  value={addressLine}
                  onChange={(e) => setAddressLine(e.target.value)}
                  placeholder="نشانی کامل پستی (خیابان، کوچه، پلاک، واحد) *"
                  className="w-full px-3.5 py-2 text-sm bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg"
                  required
                />
                {addrError && <p className="text-xs text-[#742E3A]">{addrError}</p>}
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-[#742E3A] text-[#F8F4EC] text-xs font-bold rounded-lg cursor-pointer"
                >
                  ثبت نشانی
                </button>
              </form>
            </div>
          )}

          {subRoute === 'orders' && (
            <div className="bg-[#FFFFFF] border border-[#E4DCCF] rounded-2xl p-6 space-y-4">
              <h2 className="text-lg font-bold text-[#292624]">تاریخچه سفارش‌های من</h2>
              {orders.length === 0 ? (
                <p className="text-xs text-[#77716A]">هنوز سفارشی در حساب شما ثبت نشده است.</p>
              ) : (
                <div className="space-y-3">
                  {orders.map((ord) => (
                    <div
                      key={ord.id}
                      onClick={() => onNavigate(`/account/orders/${ord.id}`)}
                      className="p-4 rounded-xl border border-[#E4DCCF] bg-[#F8F4EC] flex flex-wrap items-center justify-between gap-4 cursor-pointer hover:border-[#742E3A]"
                    >
                      <div>
                        <span className="font-mono font-bold text-sm text-[#292624]">
                          {ord.orderNumber}
                        </span>
                        <span className="block text-xs text-[#77716A]">
                          {formatJalaliDate(ord.createdAt, true)}
                        </span>
                      </div>
                      <div className="text-xs">
                        <span>وضعیت سفارش: {ord.status}</span>
                        <span className="mx-2">·</span>
                        <span>پرداخت: {ord.paymentStatus}</span>
                      </div>
                      <div className="text-sm font-bold text-[#742E3A] tabular-nums">
                        {formatToman(ord.totalAmount)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {subRoute === 'order-detail' && (
            <div className="bg-[#FFFFFF] border border-[#E4DCCF] rounded-2xl p-6 space-y-5">
              {orderDetailError ? (
                <p className="text-xs text-[#742E3A]">{orderDetailError}</p>
              ) : !orderDetailData ? (
                <p className="text-xs text-[#77716A]">در حال بارگذاری جزئیات سفارش...</p>
              ) : (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E4DCCF] pb-4">
                    <div>
                      <h2 className="text-lg font-bold font-mono text-[#292624]">
                        سفارش {orderDetailData.order.orderNumber}
                      </h2>
                      <p className="text-xs text-[#77716A]">
                        ثبت‌شده در {formatJalaliDate(orderDetailData.order.createdAt, true)}
                      </p>
                    </div>
                    <div className="text-xs font-bold text-[#2D8C88]">
                      وضعیت: {orderDetailData.order.status} · پرداخت:{' '}
                      {orderDetailData.order.paymentStatus}
                    </div>
                  </div>

                  <div className="space-y-2 text-xs">
                    <h3 className="font-bold text-[#292624]">اقلام خریداری‌شده (Snapshot):</h3>
                    {orderDetailData.order.items.map((item: any) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between py-2 border-b border-[#E4DCCF]/60"
                      >
                        <span>
                          {item.productName} ({item.variantLabel}) ×{' '}
                          {toPersianDigits(item.quantity)}
                        </span>
                        <span className="tabular-nums font-semibold">
                          {formatToman(item.lineTotal)}
                        </span>
                      </div>
                    ))}
                    <div className="pt-2 flex justify-between text-sm font-bold text-[#742E3A]">
                      <span>مبلغ کل سفارش:</span>
                      <span className="tabular-nums">
                        {formatToman(orderDetailData.order.totalAmount)}
                      </span>
                    </div>
                  </div>

                  {orderDetailData.paymentAttempts?.[0] && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          onNavigate(
                            `/checkout/result?attempt=${encodeURIComponent(
                              orderDetailData.paymentAttempts[0].attemptRef
                            )}`
                          )
                        }
                        className="px-4 py-2 bg-[#742E3A] text-[#F8F4EC] text-xs font-bold rounded-lg cursor-pointer"
                      >
                        مشاهده رسید / درگاه پرداخت آزمایشی این سفارش
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

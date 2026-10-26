import React, { useState, useEffect } from 'react';
import {
  Trash2,
  ShoppingBag,
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  Tag,
  MapPin,
  PackageSearch,
} from 'lucide-react';
import {
  CartItemInput,
  CartValidationResult,
  CustomerAddressRecord,
  Product,
} from '../lib/types.ts';
import { ProductIllustration } from '../components/RavaqVisuals.tsx';
import {
  formatToman,
  toPersianDigits,
  formatJalaliDate,
  IRAN_PROVINCES,
} from '../lib/persian.ts';

interface CartPageProps {
  cartItems: CartItemInput[];
  products: Product[];
  validation: CartValidationResult | null;
  couponCode: string;
  onCouponChange: (code: string) => void;
  onUpdateQuantity: (productId: string, variantId: string, quantity: number) => void;
  onChangeVariant: (productId: string, oldVariantId: string, newVariantId: string) => void;
  onRemoveItem: (productId: string, variantId: string) => void;
  onClearCart: () => void;
  onNavigate: (path: string) => void;
}

export const CartPage: React.FC<CartPageProps> = ({
  cartItems,
  products,
  validation,
  couponCode,
  onCouponChange,
  onUpdateQuantity,
  onChangeVariant,
  onRemoveItem,
  onClearCart,
  onNavigate,
}) => {
  const [couponInput, setCouponInput] = useState(couponCode);

  useEffect(() => {
    setCouponInput(couponCode);
  }, [couponCode]);

  const items = validation?.items || [];

  if (cartItems.length === 0 || items.length === 0) {
    return (
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20">
        <div className="max-w-lg mx-auto bg-[#FFFFFF] border border-[#E4DCCF] rounded-2xl p-10 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-[#EFE5D6] text-[#742E3A] flex items-center justify-center">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-[#292624]">سبد خرید شما خالی است</h1>
          <p className="text-xs sm:text-sm text-[#77716A] leading-relaxed">
            هنوز محصولی به سبد خرید خود اضافه نکرده‌اید. می‌توانید از میان آجیل و خشکبار، شیرینی‌های سنتی، زعفران یا جعبه‌های هدیه رواق انتخاب کنید.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('/shop')}
              className="px-6 py-3 bg-[#742E3A] text-[#F8F4EC] text-xs font-bold rounded-lg hover:bg-[#4C202B] cursor-pointer"
            >
              ورود به فروشگاه
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/gift-boxes')}
              className="px-6 py-3 bg-[#F8F4EC] text-[#292624] border border-[#E4DCCF] text-xs font-bold rounded-lg hover:border-[#742E3A] cursor-pointer"
            >
              مشاهده جعبه‌های هدیه
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#292624]">سبد خرید شما</h1>
          <p className="text-xs sm:text-sm text-[#77716A] mt-1">
            تمامی قیمت‌ها و موجودی‌ها به‌صورت لحظه‌ای از سرور رواق اعتبارسنجی شده‌اند.
          </p>
        </div>
        <button
          type="button"
          onClick={onClearCart}
          className="text-xs text-[#77716A] hover:text-[#742E3A] underline cursor-pointer"
        >
          خالی کردن سبد خرید
        </button>
      </div>

      {validation?.warnings && validation.warnings.length > 0 && (
        <div className="mb-6 bg-[#F5E9D7] border border-[#B89A62] rounded-xl p-4 space-y-1 text-xs text-[#292624]">
          {validation.warnings.map((w, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#742E3A] shrink-0" />
              <span>{w}</span>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Cart Items List */}
        <div className="lg:col-span-8 space-y-4">
          {items.map((item) => {
            const fullProduct = products.find((p) => p.id === item.productId);
            return (
              <div
                key={`${item.productId}::${item.variantId}`}
                className="bg-[#FFFFFF] border border-[#E4DCCF] rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-4">
                  <div
                    onClick={() => onNavigate(`/product/${item.productSlug}`)}
                    className="w-20 h-20 rounded-lg overflow-hidden border border-[#E4DCCF] shrink-0 cursor-pointer"
                  >
                    <ProductIllustration
                      illustrationKey={item.illustrationKey}
                      role="primary"
                      title={item.productName}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <h3
                      onClick={() => onNavigate(`/product/${item.productSlug}`)}
                      className="text-sm sm:text-base font-bold text-[#292624] hover:text-[#742E3A] cursor-pointer"
                    >
                      {item.productName}
                    </h3>

                    {/* Variant Switcher Inside Cart */}
                    {fullProduct && fullProduct.variants.length > 1 ? (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#77716A]">تنوع:</span>
                        <select
                          value={item.variantId}
                          onChange={(e) =>
                            onChangeVariant(
                              item.productId,
                              item.variantId,
                              e.target.value
                            )
                          }
                          aria-label={`تغییر تنوع برای ${item.productName}`}
                          className="px-2 py-1 text-xs bg-[#F8F4EC] border border-[#E4DCCF] rounded-md"
                        >
                          {fullProduct.variants.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.label} ({formatToman(v.price)})
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <p className="text-xs text-[#77716A]">{item.variantLabel}</p>
                    )}

                    {item.giftMessage && (
                      <p className="text-[11px] text-[#2D8C88]">
                        پیام هدیه: «{item.giftMessage}»
                      </p>
                    )}

                    <p className="text-xs text-[#77716A] tabular-nums">
                      قیمت واحد: {formatToman(item.unitPrice)}
                    </p>
                  </div>
                </div>

                <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-4 pt-3 sm:pt-0 border-t sm:border-t-0 border-[#E4DCCF]">
                  <div className="inline-flex items-center border border-[#E4DCCF] rounded-lg bg-[#F8F4EC]">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateQuantity(
                          item.productId,
                          item.variantId,
                          item.quantity - 1
                        )
                      }
                      className="px-3 py-1.5 text-sm font-bold text-[#292624] cursor-pointer"
                      aria-label="کاهش تعداد"
                    >
                      −
                    </button>
                    <span className="px-3 py-1.5 text-xs font-bold tabular-nums">
                      {toPersianDigits(item.quantity)}
                    </span>
                    <button
                      type="button"
                      disabled={item.quantity >= item.availableStock}
                      onClick={() =>
                        onUpdateQuantity(
                          item.productId,
                          item.variantId,
                          item.quantity + 1
                        )
                      }
                      className="px-3 py-1.5 text-sm font-bold text-[#292624] disabled:opacity-40 cursor-pointer"
                      aria-label="افزایش تعداد"
                    >
                      +
                    </button>
                  </div>

                  <div className="text-left min-w-[110px]">
                    <span className="block text-sm font-bold text-[#292624] tabular-nums">
                      {formatToman(item.lineTotal)}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.productId, item.variantId)}
                    className="p-2 text-[#77716A] hover:text-[#742E3A] transition-colors cursor-pointer"
                    aria-label={`حذف ${item.productName} از سبد خرید`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Cart Summary & Coupon Panel */}
        <div className="lg:col-span-4 bg-[#FFFFFF] border border-[#E4DCCF] rounded-2xl p-6 space-y-5">
          <h2 className="text-lg font-bold text-[#292624] border-b border-[#E4DCCF] pb-3">
            خلاصه صورت‌حساب
          </h2>

          {/* Coupon Form */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-[#292624]">
              کد تخفیف (آزمایشی):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                dir="ltr"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                placeholder="NOWRUZ1405"
                className="flex-1 px-3 py-2 text-xs font-mono bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg uppercase"
              />
              <button
                type="button"
                onClick={() => onCouponChange(couponInput.trim())}
                className="px-4 py-2 bg-[#292624] text-[#F8F4EC] text-xs font-medium rounded-lg hover:bg-[#4C202B] cursor-pointer"
              >
                اعمال کد
              </button>
            </div>
            {validation?.appliedCoupon && (
              <div className="flex items-center justify-between text-xs text-[#2D8C88] bg-[#E5EEE6] px-3 py-2 rounded-lg">
                <span>کد {validation.appliedCoupon.code} اعمال شد</span>
                <button
                  type="button"
                  onClick={() => {
                    setCouponInput('');
                    onCouponChange('');
                  }}
                  className="underline text-[#742E3A] cursor-pointer"
                >
                  حذف
                </button>
              </div>
            )}
            {validation?.couponError && (
              <p className="text-xs text-[#742E3A]">{validation.couponError}</p>
            )}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-[#77716A]">
              <Tag className="w-3 h-3" />
              <span>کدهای نمونه:</span>
              {['NOWRUZ1405', 'RAVAQ50', 'YALDA15'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setCouponInput(c);
                    onCouponChange(c);
                  }}
                  className="font-mono underline hover:text-[#742E3A] cursor-pointer"
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 pt-3 border-t border-[#E4DCCF] text-xs sm:text-sm">
            <div className="flex items-center justify-between text-[#77716A]">
              <span>جمع کل اقلام:</span>
              <span className="tabular-nums font-medium text-[#292624]">
                {formatToman(validation?.subtotal || 0)}
              </span>
            </div>

            {validation && validation.discountAmount > 0 && (
              <div className="flex items-center justify-between text-[#2D8C88]">
                <span>کسر تخفیف کوپن:</span>
                <span className="tabular-nums font-bold">
                  − {formatToman(validation.discountAmount)}
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-[#77716A]">
              <span>هزینه ارسال (برآورد استاندارد):</span>
              <span className="tabular-nums font-medium text-[#292624]">
                {validation?.shippingCost === 0
                  ? 'رایگان'
                  : formatToman(validation?.shippingCost || 0)}
              </span>
            </div>

            <div className="pt-3 border-t border-[#E4DCCF] flex items-center justify-between text-base font-bold text-[#292624]">
              <span>مبلغ قابل پرداخت:</span>
              <span className="tabular-nums text-[#742E3A]">
                {formatToman(validation?.payableTotal || 0)}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('/checkout')}
            className="w-full py-3.5 bg-[#742E3A] text-[#F8F4EC] text-sm font-bold rounded-lg hover:bg-[#4C202B] transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>ادامه جهت تسویه‌حساب</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface CheckoutPageProps {
  cartItems: CartItemInput[];
  validation: CartValidationResult | null;
  couponCode: string;
  user: {
    uid: string;
    displayName: string;
    email: string;
    mobile?: string;
  } | null;
  savedAddresses: CustomerAddressRecord[];
  authToken: string | null;
  onOrderCreated: (orderNumber: string, attemptRef: string) => void;
  onNavigate: (path: string) => void;
}

export const CheckoutPage: React.FC<CheckoutPageProps> = ({
  cartItems,
  validation,
  couponCode,
  user,
  savedAddresses,
  authToken,
  onOrderCreated,
  onNavigate,
}) => {
  const [customerName, setCustomerName] = useState(user?.displayName || '');
  const [customerMobile, setCustomerMobile] = useState(user?.mobile || '');
  const [customerEmail, setCustomerEmail] = useState(user?.email || '');
  const [province, setProvince] = useState('تهران');
  const [city, setCity] = useState('تهران');
  const [addressLine, setAddressLine] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState<'STANDARD' | 'EXPRESS_TEHRAN'>('STANDARD');
  const [acceptedTerms, setAcceptedTerms] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey] = useState(
    () => `idem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  );

  // Populate from default saved address if available
  useEffect(() => {
    if (savedAddresses.length > 0 && !addressLine) {
      const def = savedAddresses.find((a) => a.isDefault) || savedAddresses[0];
      if (def) {
        setCustomerName(def.recipientName);
        setCustomerMobile(def.mobile);
        setProvince(def.province);
        setCity(def.city);
        setAddressLine(def.addressLine);
        setPostalCode(def.postalCode);
      }
    }
  }, [savedAddresses, addressLine]);

  const currentProvinceCities =
    IRAN_PROVINCES.find((p) => p.name === province)?.cities || ['مرکز استان'];

  const handleProvinceChange = (newProv: string) => {
    setProvince(newProv);
    const firstCity = IRAN_PROVINCES.find((p) => p.name === newProv)?.cities[0] || newProv;
    setCity(firstCity);
  };

  const handleSelectSavedAddress = (addr: CustomerAddressRecord) => {
    setCustomerName(addr.recipientName);
    setCustomerMobile(addr.mobile);
    setProvince(addr.province);
    setCity(addr.city);
    setAddressLine(addr.addressLine);
    setPostalCode(addr.postalCode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFieldErrors({});
    setFormError('');
    setSubmitting(true);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers.Authorization = `Bearer ${authToken}`;
      if (user) {
        headers['x-firebase-uid'] = user.uid;
        headers['x-firebase-email'] = user.email;
        headers['x-firebase-name'] = user.displayName;
      }

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          customerName,
          customerMobile,
          customerEmail,
          province,
          city,
          addressLine,
          postalCode,
          orderNote,
          deliveryMethod,
          acceptedTerms,
          couponCode: couponCode || undefined,
          idempotencyKey,
          userId: user?.uid,
          items: cartItems,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        if (data.fieldErrors) setFieldErrors(data.fieldErrors);
        setFormError(data.error || 'خطا در ثبت سفارش. لطفاً مقادیر واردشده را بررسی کنید.');
      } else if (data.order && data.paymentAttempt) {
        onOrderCreated(data.order.orderNumber, data.paymentAttempt.attemptRef);
      }
    } catch {
      setFormError('خطا در برقراری ارتباط با سرور.');
    } finally {
      setSubmitting(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 text-center space-y-4">
        <h1 className="text-2xl font-bold text-[#292624]">سبد خرید شما خالی است</h1>
        <button
          type="button"
          onClick={() => onNavigate('/shop')}
          className="px-6 py-2.5 bg-[#742E3A] text-[#F8F4EC] text-xs font-bold rounded-lg cursor-pointer"
        >
          بازگشت به فروشگاه
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#292624]">
          تکمیل اطلاعات ارسال و ثبت سفارش
        </h1>
        <p className="text-xs sm:text-sm text-[#77716A] mt-1">
          امکان ثبت سفارش هم برای کاربران مهمان و هم برای اعضای رواق فراهم است. اعداد فارسی و انگلیسی به‌طور خودکار استانداردسازی می‌شوند.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-8 bg-[#FFFFFF] border border-[#E4DCCF] rounded-2xl p-6 sm:p-8 space-y-6">
          {/* Saved Addresses Selector for Logged-in Users */}
          {savedAddresses.length > 0 && (
            <div className="space-y-2.5 pb-5 border-b border-[#E4DCCF]">
              <h2 className="text-sm font-bold text-[#292624] flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#742E3A]" />
                <span>انتخاب از نشانی‌های ذخیره‌شده شما:</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {savedAddresses.map((addr) => (
                  <button
                    key={addr.id}
                    type="button"
                    onClick={() => handleSelectSavedAddress(addr)}
                    className="text-right p-3 rounded-xl border border-[#E4DCCF] bg-[#F8F4EC] hover:border-[#742E3A] transition-colors text-xs space-y-1 cursor-pointer"
                  >
                    <div className="font-bold text-[#292624]">
                      {addr.recipientName} ({toPersianDigits(addr.mobile)})
                    </div>
                    <div className="text-[#77716A] line-clamp-1">
                      {addr.province}، {addr.city} — {addr.addressLine}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {formError && (
            <div className="bg-[#F5E2E0] border border-[#742E3A] text-[#4C202B] p-4 rounded-xl text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#292624] mb-1.5">
                نام و نام خانوادگی گیرنده *
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="مثلاً: سارا محمدی"
                className="w-full px-3.5 py-2.5 text-sm bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg focus:outline-none focus:border-[#742E3A]"
                required
              />
              {fieldErrors.customerName && (
                <p className="text-xs text-[#742E3A] mt-1">{fieldErrors.customerName}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-[#292624] mb-1.5">
                شماره موبایل ایران * (پشتیبانی از اعداد فارسی و انگلیسی)
              </label>
              <input
                type="tel"
                dir="ltr"
                value={customerMobile}
                onChange={(e) => setCustomerMobile(e.target.value)}
                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                className="w-full px-3.5 py-2.5 text-sm bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg text-left font-mono focus:outline-none focus:border-[#742E3A]"
                required
              />
              {fieldErrors.customerMobile && (
                <p className="text-xs text-[#742E3A] mt-1">{fieldErrors.customerMobile}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#292624] mb-1.5">
                استان *
              </label>
              <select
                value={province}
                onChange={(e) => handleProvinceChange(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg"
              >
                {IRAN_PROVINCES.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#292624] mb-1.5">
                شهر *
              </label>
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg"
              >
                {currentProvinceCities.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#292624] mb-1.5">
                کد پستی ۱۰ رقمی *
              </label>
              <input
                type="text"
                dir="ltr"
                maxLength={12}
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                placeholder="۱۹۸۷۶۵۴۳۲۱"
                className="w-full px-3.5 py-2.5 text-sm bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg text-left font-mono focus:outline-none focus:border-[#742E3A]"
                required
              />
              {fieldErrors.postalCode && (
                <p className="text-xs text-[#742E3A] mt-1">{fieldErrors.postalCode}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#292624] mb-1.5">
              نشانی کامل پستی (خیابان، کوچه، پلاک، واحد) *
            </label>
            <textarea
              rows={2}
              value={addressLine}
              onChange={(e) => setAddressLine(e.target.value)}
              placeholder="تهران، خیابان ولیعصر، بالاتر از پارک ساعی، کوچه شبنم، پلاک ۱۲، واحد ۴"
              className="w-full px-3.5 py-2.5 text-sm bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg focus:outline-none focus:border-[#742E3A]"
              required
            />
            {fieldErrors.addressLine && (
              <p className="text-xs text-[#742E3A] mt-1">{fieldErrors.addressLine}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#292624] mb-1.5">
                شیوه ارسال (آزمایشی):
              </label>
              <select
                value={deliveryMethod}
                onChange={(e) =>
                  setDeliveryMethod(e.target.value as 'STANDARD' | 'EXPRESS_TEHRAN')
                }
                className="w-full px-3 py-2.5 text-sm bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg"
              >
                <option value="STANDARD">پست پیشتاز / بسته‌بندی ایمن استاندارد</option>
                <option value="EXPRESS_TEHRAN">ارسال ویژه منتخب (تهران)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#292624] mb-1.5">
                یادداشت سفارش (اختیاری):
              </label>
              <input
                type="text"
                value={orderNote}
                onChange={(e) => setOrderNote(e.target.value)}
                placeholder="توضیحات تحویل یا زمان پیشنهادی..."
                className="w-full px-3.5 py-2.5 text-sm bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-[#E4DCCF]">
            <label className="inline-flex items-center gap-2.5 text-xs text-[#292624] cursor-pointer">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="w-4 h-4 accent-[#742E3A] rounded"
              />
              <span>
                قوانین و شرایط آزمایشی فروشگاه رواق را مطالعه کرده‌ام و می‌دانم پرداخت در مرحله بعد به‌صورت شبیه‌سازی آزمایشی (بدون انتقال وجه واقعی) انجام می‌شود.
              </span>
            </label>
            {fieldErrors.acceptedTerms && (
              <p className="text-xs text-[#742E3A] mt-1">{fieldErrors.acceptedTerms}</p>
            )}
          </div>
        </div>

        {/* Order Summary Column */}
        <div className="lg:col-span-4 bg-[#FFFFFF] border border-[#E4DCCF] rounded-2xl p-6 space-y-5">
          <h2 className="text-lg font-bold text-[#292624] border-b border-[#E4DCCF] pb-3">
            مرور سفارش و پرداخت
          </h2>

          <div className="space-y-2.5 max-h-60 overflow-y-auto pl-1">
            {validation?.items.map((item) => (
              <div
                key={`${item.productId}::${item.variantId}`}
                className="flex items-center justify-between text-xs border-b border-[#E4DCCF]/60 pb-2"
              >
                <div>
                  <span className="font-bold text-[#292624]">{item.productName}</span>
                  <span className="text-[#77716A] block">
                    {item.variantLabel} × {toPersianDigits(item.quantity)}
                  </span>
                </div>
                <span className="font-semibold tabular-nums text-[#292624]">
                  {formatToman(item.lineTotal)}
                </span>
              </div>
            ))}
          </div>

          <div className="space-y-2.5 pt-2 text-xs sm:text-sm">
            <div className="flex justify-between text-[#77716A]">
              <span>جمع اقلام:</span>
              <span className="tabular-nums text-[#292624]">
                {formatToman(validation?.subtotal || 0)}
              </span>
            </div>
            {validation && validation.discountAmount > 0 && (
              <div className="flex justify-between text-[#2D8C88]">
                <span>تخفیف ({validation.appliedCoupon?.code}):</span>
                <span className="tabular-nums font-bold">
                  − {formatToman(validation.discountAmount)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-[#77716A]">
              <span>هزینه ارسال:</span>
              <span className="tabular-nums text-[#292624]">
                {validation?.shippingCost === 0
                  ? 'رایگان'
                  : formatToman(validation?.shippingCost || 0)}
              </span>
            </div>
            <div className="pt-3 border-t border-[#E4DCCF] flex justify-between text-base font-bold text-[#292624]">
              <span>مبلغ نهایی سفارش:</span>
              <span className="tabular-nums text-[#742E3A]">
                {formatToman(validation?.payableTotal || 0)}
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 bg-[#742E3A] text-[#F8F4EC] text-sm font-bold rounded-lg hover:bg-[#4C202B] transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>
              {submitting
                ? 'در حال ثبت سفارش در سرور...'
                : 'ثبت سفارش و ورود به درگاه آزمایشی'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};

interface PaymentGatewayPageProps {
  attemptRef: string;
  onPaymentStateChanged: () => void;
  onNavigate: (path: string) => void;
}

/**
 * Mandatory Simulated Payment Gateway & Order Result Page (/checkout/result)
 * Supports PENDING -> SUCCEEDED | FAILED | CANCELLED | EXPIRED, idempotent reloads, and controlled retry.
 */
export const PaymentGatewayAndResultPage: React.FC<PaymentGatewayPageProps> = ({
  attemptRef,
  onPaymentStateChanged,
  onNavigate,
}) => {
  const [loading, setLoading] = useState(true);
  const [processingAction, setProcessingAction] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [data, setData] = useState<{
    paymentAttempt: any;
    order: any;
    allAttempts: any[];
    history: any[];
  } | null>(null);

  const fetchPaymentStatus = async (ref: string) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fetch(`/api/payments/${encodeURIComponent(ref)}`);
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error || 'اطلاعات تلاش پرداخت یافت نشد.');
      } else {
        setData(json);
      }
    } catch {
      setErrorMsg('خطا در دریافت وضعیت پرداخت از سرور.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (attemptRef) {
      fetchPaymentStatus(attemptRef);
    } else {
      setLoading(false);
    }
  }, [attemptRef]);

  const handleAction = async (action: 'SUCCEED' | 'FAIL' | 'CANCEL' | 'EXPIRE') => {
    if (!data?.paymentAttempt) return;
    setProcessingAction(action);
    setErrorMsg('');
    try {
      const res = await fetch(
        `/api/payments/${encodeURIComponent(data.paymentAttempt.attemptRef)}/action`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            expectedAmount: data.order.totalAmount,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error || 'عملیات پرداخت آزمایشی با خطا روبه‌رو شد.');
      }
      await fetchPaymentStatus(data.paymentAttempt.attemptRef);
      onPaymentStateChanged();
    } catch {
      setErrorMsg('ارتباط با سرور قطع شد. می‌توانید صفحه را مجدداً بارگذاری کنید.');
    } finally {
      setProcessingAction(null);
    }
  };

  const handleRetryPayment = async () => {
    if (!data?.order) return;
    setProcessingAction('RETRY');
    setErrorMsg('');
    try {
      const res = await fetch(
        `/api/orders/${encodeURIComponent(data.order.orderNumber)}/retry-payment`,
        { method: 'POST' }
      );
      const json = await res.json();
      if (!res.ok || !json.paymentAttempt) {
        setErrorMsg(json.error || 'امکان ایجاد تلاش پرداخت مجدد وجود ندارد.');
      } else {
        onNavigate(`/checkout/result?attempt=${encodeURIComponent(json.paymentAttempt.attemptRef)}`);
      }
    } catch {
      setErrorMsg('خطا در ایجاد تلاش پرداخت مجدد.');
    } finally {
      setProcessingAction(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 pt-32 pb-20 text-center text-sm text-[#77716A]">
        در حال فراخوانی وضعیت سفارش و درگاه آزمایشی از سرور...
      </div>
    );
  }

  if (!data || !data.paymentAttempt || !data.order) {
    return (
      <div className="max-w-2xl mx-auto px-4 pt-32 pb-20 text-center space-y-4">
        <h1 className="text-xl font-bold text-[#292624]">
          {errorMsg || 'مرجع پرداخت آزمایشی مشخص نشده است'}
        </h1>
        <button
          type="button"
          onClick={() => onNavigate('/track-order')}
          className="px-5 py-2.5 bg-[#742E3A] text-[#F8F4EC] text-xs font-bold rounded-lg cursor-pointer"
        >
          پیگیری سفارش با شماره سفارش
        </button>
      </div>
    );
  }

  const { paymentAttempt, order, allAttempts } = data;
  const isPending = paymentAttempt.status === 'PENDING';
  const isSucceeded = paymentAttempt.status === 'SUCCEEDED';
  const isFailedOrCancelled =
    paymentAttempt.status === 'FAILED' ||
    paymentAttempt.status === 'CANCELLED' ||
    paymentAttempt.status === 'EXPIRED';

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-28 pb-20 space-y-6">
      {/* Explicit Test Gateway Banner */}
      <div className="bg-[#4C202B] text-[#F8F4EC] rounded-2xl p-6 border border-[#B89A62]/60 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold tracking-wider uppercase text-[#B89A62]">
            درگاه پرداخت آزمایشی رَواق · TEST PAYMENT SIMULATOR
          </span>
          <span className="text-xs font-mono bg-[#F8F4EC]/15 px-2.5 py-1 rounded">
            محیط شبیه‌سازی (بدون انتقال وجه واقعی)
          </span>
        </div>
        <p className="text-xs sm:text-sm text-[#EFE5D6]/90 leading-relaxed">
          این صفحه شبیه‌ساز رسمی درگاه پرداخت برای ارزیابی فنی ماشین وضعیت سفارش، کنترل موجودی انبار و جلوگیری از تراکنش تکراری (Idempotency) است. هیچ شماره کارت بانکی، رمز دوم یا اطلاعات مالی واقعی دریافت نمی‌شود.
        </p>
      </div>

      {errorMsg && (
        <div className="bg-[#F5E2E0] border border-[#742E3A] text-[#4C202B] p-4 rounded-xl text-xs font-medium">
          {errorMsg}
        </div>
      )}

      {/* Main Gateway / Result Card */}
      <div className="bg-[#FFFFFF] border border-[#E4DCCF] rounded-2xl p-6 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E4DCCF] pb-5">
          <div className="space-y-1">
            <span className="text-xs text-[#77716A]">شماره سفارش:</span>
            <h1 className="text-xl sm:text-2xl font-bold font-mono text-[#292624]">
              {order.orderNumber}
            </h1>
            <span className="text-xs text-[#77716A] font-mono block">
              مرجع تلاش پرداخت: {paymentAttempt.attemptRef}
            </span>
          </div>

          <div className="text-right sm:text-left">
            <span className="text-xs text-[#77716A] block">مبلغ تراکنش آزمایشی:</span>
            <span className="text-2xl font-bold text-[#742E3A] tabular-nums">
              {formatToman(paymentAttempt.amount)}
            </span>
          </div>
        </div>

        {/* Interactive Simulator Controls when PENDING */}
        {isPending && (
          <div className="bg-[#F8F4EC] border border-[#E4DCCF] rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-bold text-[#292624]">
              انتخاب سناریوی شبیه‌سازی پرداخت:
            </h2>
            <p className="text-xs text-[#77716A] leading-relaxed">
              یکی از نتیجه‌های زیر را برای تست رفتار سرور، کسر موجودی انبار و ثبت تاریخچه سفارش انتخاب کنید:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                disabled={Boolean(processingAction)}
                onClick={() => handleAction('SUCCEED')}
                className="p-3.5 bg-[#2D8C88] text-[#FFFFFF] rounded-xl text-xs font-bold hover:opacity-95 transition-opacity flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>تأیید پرداخت موفق (آزمایشی)</span>
              </button>

              <button
                type="button"
                disabled={Boolean(processingAction)}
                onClick={() => handleAction('FAIL')}
                className="p-3.5 bg-[#742E3A] text-[#F8F4EC] rounded-xl text-xs font-bold hover:bg-[#4C202B] transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>شبیه‌سازی خطای پرداخت</span>
              </button>

              <button
                type="button"
                disabled={Boolean(processingAction)}
                onClick={() => handleAction('CANCEL')}
                className="p-3.5 bg-[#EFE5D6] text-[#292624] border border-[#E4DCCF] rounded-xl text-xs font-bold hover:bg-[#E4DCCF] transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Clock className="w-4 h-4" />
                <span>انصراف کاربر از پرداخت</span>
              </button>
            </div>
          </div>
        )}

        {/* Result Banner when SUCCEEDED */}
        {isSucceeded && (
          <div className="bg-[#E5EEE6] border border-[#2D8C88] rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-[#292624] font-bold text-base">
              <CheckCircle2 className="w-5 h-5 text-[#2D8C88]" />
              <span>پرداخت آزمایشی با موفقیت تأیید شد و سفارش شما ثبت نهایی گردید.</span>
            </div>
            <p className="text-xs text-[#292624]/80 leading-relaxed">
              موجودی اقلام سفارش به‌صورت تراکنشی از انبار کسر شد. بارگذاری مجدد این صفحه هیچ هزینه یا کسر موجودی تکراری ایجاد نمی‌کند (Idempotent).
            </p>
            <div className="pt-2 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onNavigate('/account/orders')}
                className="px-4 py-2 bg-[#292624] text-[#F8F4EC] text-xs font-semibold rounded-lg cursor-pointer"
              >
                مشاهده در سفارش‌های من
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/track-order')}
                className="px-4 py-2 bg-[#FFFFFF] text-[#292624] border border-[#E4DCCF] text-xs font-semibold rounded-lg cursor-pointer"
              >
                پیگیری وضعیت ارسال
              </button>
            </div>
          </div>
        )}

        {/* Result Banner when FAILED / CANCELLED / EXPIRED */}
        {isFailedOrCancelled && (
          <div className="bg-[#F5E2E0] border border-[#742E3A] rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-[#4C202B] font-bold text-base">
              <XCircle className="w-5 h-5 text-[#742E3A]" />
              <span>
                پرداخت آزمایشی انجام نشد (وضعیت تلاش: {paymentAttempt.status})
              </span>
            </div>
            <p className="text-xs text-[#4C202B]/90 leading-relaxed">
              علت: {paymentAttempt.failureReason || 'تراکنش ناموفق یا لغوشده توسط کاربر.'} سفارش شما همچنان در وضعیت «در انتظار پرداخت» باقی مانده و می‌توانید تلاش پرداخت جدیدی ایجاد کنید.
            </p>
            {order.status === 'PENDING_PAYMENT' && (
              <div className="pt-2">
                <button
                  type="button"
                  disabled={processingAction === 'RETRY'}
                  onClick={handleRetryPayment}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#742E3A] text-[#F8F4EC] text-xs font-bold rounded-lg hover:bg-[#4C202B] cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>ایجاد تلاش پرداخت مجدد برای این سفارش</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Order Snapshot Details */}
        <div className="space-y-3 pt-4 border-t border-[#E4DCCF]">
          <h3 className="text-sm font-bold text-[#292624]">اقلام ثبت‌شده در سفارش:</h3>
          <div className="divide-y divide-[#E4DCCF] text-xs">
            {order.items.map((item: any) => (
              <div key={item.id} className="py-2.5 flex items-center justify-between">
                <div>
                  <span className="font-bold text-[#292624]">{item.productName}</span>
                  <span className="text-[#77716A] mr-2">
                    ({item.variantLabel} × {toPersianDigits(item.quantity)})
                  </span>
                </div>
                <span className="tabular-nums font-semibold">
                  {formatToman(item.lineTotal)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* All Payment Attempts Audit Log for this Order */}
        <div className="space-y-2 pt-4 border-t border-[#E4DCCF]">
          <h3 className="text-xs font-bold text-[#77716A]">
            تاریخچه تلاش‌های پرداخت این سفارش ({toPersianDigits(allAttempts.length)}):
          </h3>
          <div className="space-y-1.5 text-xs">
            {allAttempts.map((pa: any) => (
              <div
                key={pa.id}
                className="flex flex-wrap items-center justify-between bg-[#F8F4EC] px-3 py-2 rounded-lg border border-[#E4DCCF]"
              >
                <span className="font-mono">{pa.attemptRef}</span>
                <span>وضعیت: {pa.status}</span>
                <span className="text-[#77716A]">
                  {formatJalaliDate(pa.updatedAt, true)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const OrderTrackingPage: React.FC<{
  onNavigate: (path: string) => void;
}> = ({ onNavigate }) => {
  const [orderNumber, setOrderNumber] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [trackingResult, setTrackingResult] = useState<any | null>(null);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setTrackingResult(null);
    try {
      const res = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderNumber, customerMobile }),
      });
      const data = await res.json();
      if (!res.ok || !data.found) {
        setError(data.error || 'سفارشی با این مشخصات یافت نشد.');
      } else {
        setTrackingResult(data.trackingData);
      }
    } catch {
      setError('خطا در برقراری ارتباط با سرور.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-28 pb-20 space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#292624]">
          پیگیری سفارش
        </h1>
        <p className="text-xs sm:text-sm text-[#77716A] leading-relaxed">
          برای حفظ محرمانگی اطلاعات مشتریان، مشاهده وضعیت سفارش نیازمند وارد کردن هم‌زمان «شماره سفارش» و «شماره موبایل ثبت‌شده هنگام خرید» است.
        </p>
      </div>

      <form
        onSubmit={handleTrack}
        className="bg-[#FFFFFF] border border-[#E4DCCF] rounded-2xl p-6 space-y-4"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-[#292624] mb-1.5">
              شماره سفارش (مثلاً RVQ-1405-1001) *
            </label>
            <input
              type="text"
              dir="ltr"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="RVQ-1405-1001"
              className="w-full px-3.5 py-2.5 text-sm font-mono bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg text-left"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#292624] mb-1.5">
              شماره موبایل ثبت‌شده در سفارش *
            </label>
            <input
              type="tel"
              dir="ltr"
              value={customerMobile}
              onChange={(e) => setCustomerMobile(e.target.value)}
              placeholder="۰۹۱۲۳۴۵۶۷۸۹"
              className="w-full px-3.5 py-2.5 text-sm font-mono bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg text-left"
              required
            />
          </div>
        </div>

        {error && <p className="text-xs text-[#742E3A] font-medium">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-[#742E3A] text-[#F8F4EC] text-xs font-bold rounded-lg hover:bg-[#4C202B] inline-flex items-center gap-2 cursor-pointer"
        >
          <PackageSearch className="w-4 h-4" />
          <span>{loading ? 'در حال جستجو...' : 'مشاهده وضعیت سفارش'}</span>
        </button>
      </form>

      {trackingResult && (
        <div className="bg-[#FFFFFF] border border-[#E4DCCF] rounded-2xl p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#E4DCCF] pb-4">
            <div>
              <span className="text-xs text-[#77716A] block">شماره سفارش:</span>
              <span className="text-lg font-bold font-mono text-[#292624]">
                {trackingResult.orderNumber}
              </span>
            </div>
            <div>
              <span className="text-xs text-[#77716A] block">گیرنده و مقصد:</span>
              <span className="text-xs font-bold text-[#292624]">
                {trackingResult.maskedRecipient} ({trackingResult.province}، {trackingResult.city})
              </span>
            </div>
            <div>
              <span className="text-xs text-[#77716A] block">وضعیت فعلی سفارش:</span>
              <span className="text-xs font-bold text-[#2D8C88]">
                {trackingResult.status} (پرداخت: {trackingResult.paymentStatus})
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[#292624]">خط زمانی و تاریخچه وضعیت:</h3>
            <div className="space-y-2.5">
              {trackingResult.history.map((h: any) => (
                <div
                  key={h.id}
                  className="bg-[#F8F4EC] p-3.5 rounded-xl border border-[#E4DCCF] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <span className="font-bold text-[#292624] ml-2">[{h.status}]</span>
                    <span className="text-[#292624]/85">{h.note}</span>
                  </div>
                  <span className="text-[#77716A] shrink-0">
                    {formatJalaliDate(h.createdAt, true)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => onNavigate('/shop')}
              className="text-xs font-bold text-[#742E3A] hover:underline cursor-pointer"
            >
              بازگشت به فروشگاه رواق
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

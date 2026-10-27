import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingCart,
  Users,
  TicketPercent,
  Warehouse,
  MessageSquare,
  Settings,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import {
  formatToman,
  toPersianDigits,
  formatJalaliDate,
} from '../lib/persian.ts';
import { OrderStatus } from '../lib/types.ts';
import { AUTHORIZED_ADMIN_EMAIL } from '../lib/firebase.ts';
import {
  apiGetAdminDashboard,
  apiAdminCreateProduct,
  apiAdminUpdateProduct,
  apiAdminCreateCategory,
  apiAdminDeleteCategory,
  apiAdminUpdateOrderStatus,
  apiAdminAdjustInventory,
  apiAdminCreateCoupon,
  apiAdminToggleCoupon,
  apiAdminSaveSettings,
} from '../lib/api-client.ts';

interface AdminDashboardPageProps {
  currentPath: string;
  user: {
    uid: string;
    displayName: string;
    email: string;
    role: 'CUSTOMER' | 'ADMIN';
  } | null;
  authToken: string | null;
  onDataMutated: () => void;
  onNavigate: (path: string) => void;
}

export const AdminDashboardPage: React.FC<AdminDashboardPageProps> = ({
  currentPath,
  user,
  authToken,
  onDataMutated,
  onNavigate,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [adminData, setAdminData] = useState<any | null>(null);
  const [feedback, setFeedback] = useState('');

  // Filters
  const [productSearch, setProductSearch] = useState('');
  const [productCatFilter, setProductCatFilter] = useState('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');

  // New Product form
  const [newProdName, setNewProdName] = useState('');
  const [newProdSlug, setNewProdSlug] = useState('');
  const [newProdCat, setNewProdCat] = useState('nuts-dried-fruits');
  const [newProdPrice, setNewProdPrice] = useState('350000');
  const [newProdStock, setNewProdStock] = useState('20');
  const [newProdShortDesc, setNewProdShortDesc] = useState('');

  // New Category form
  const [newCatName, setNewCatName] = useState('');
  const [newCatSlug, setNewCatSlug] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  // New Coupon form
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDesc, setNewCouponDesc] = useState('');
  const [newCouponType, setNewCouponType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [newCouponVal, setNewCouponVal] = useState('10');
  const [newCouponMin, setNewCouponMin] = useState('500000');

  // Inventory adjustment state
  const [invAdjustStock, setInvAdjustStock] = useState<Record<string, string>>({});

  // Settings form state
  const [settingsForm, setSettingsForm] = useState<any>({});

  const fetchAdminData = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiGetAdminDashboard(authToken);
      setAdminData(data);
      setSettingsForm(data.settings || {});
    } catch (err: any) {
      setError(err?.message || 'شما دسترسی مدیر به این بخش را ندارید.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.role === 'ADMIN') {
      fetchAdminData();
    } else {
      setLoading(false);
    }
  }, [user?.uid, user?.role, authToken]);

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="max-w-lg mx-auto px-4 pt-32 pb-20 text-center space-y-4">
        <div className="bg-[#FFFFFF] border border-[#E4DCCF] rounded-2xl p-8 space-y-4">
          <AlertTriangle className="w-8 h-8 text-[#742E3A] mx-auto" />
          <h1 className="text-xl font-bold text-[#292624]">
            دسترسی محدود به مدیر فروشگاه رَواق
          </h1>
          <p className="text-xs text-[#77716A] leading-relaxed">
            این مسیر توسط قوانین امنیتی Firebase Authentication و Firestore محافظت شده و تنها برای حساب مدیر تاییدشده (<span dir="ltr" className="font-mono">{AUTHORIZED_ADMIN_EMAIL}</span>) مجاز است.
          </p>
          <button
            type="button"
            onClick={() => onNavigate('/login')}
            className="px-6 py-2.5 bg-[#742E3A] text-[#F8F4EC] text-xs font-bold rounded-lg cursor-pointer"
          >
            ورود با حساب مدیر تاییدشده
          </button>
        </div>
      </div>
    );
  }

  if (loading || !adminData) {
    return (
      <div className="max-w-[1360px] mx-auto px-4 pt-32 pb-20 text-center text-sm text-[#77716A]">
        {error || 'در حال بارگذاری پنل مدیریت رواق از پایگاه داده...'}
      </div>
    );
  }

  const navItems = [
    { path: '/admin', label: 'پیشخوان و آمار', icon: LayoutDashboard },
    { path: '/admin/products', label: 'محصولات', icon: Package },
    { path: '/admin/categories', label: 'دسته‌بندی‌ها', icon: FolderTree },
    { path: '/admin/orders', label: 'سفارش‌ها', icon: ShoppingCart },
    { path: '/admin/customers', label: 'مشتریان', icon: Users },
    { path: '/admin/coupons', label: 'کدهای تخفیف', icon: TicketPercent },
    { path: '/admin/inventory', label: 'انبار و موجودی', icon: Warehouse },
    { path: '/admin/reviews', label: 'دیدگاه‌ها', icon: MessageSquare },
    { path: '/admin/settings', label: 'تنظیمات فروشگاه', icon: Settings },
  ];

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback('');
    try {
      await apiAdminCreateProduct(
        {
          name: newProdName,
          slug: newProdSlug,
          categorySlug: newProdCat,
          basePrice: Number(newProdPrice),
          initialStock: Number(newProdStock),
          shortDescription: newProdShortDesc,
        },
        authToken
      );
      setFeedback('محصول جدید با موفقیت ثبت شد.');
      setNewProdName('');
      setNewProdSlug('');
      setNewProdShortDesc('');
      await fetchAdminData();
      onDataMutated();
      onNavigate('/admin/products');
    } catch (err: any) {
      setFeedback(err?.message || 'خطا در ایجاد محصول.');
    }
  };

  const handleToggleProductPublish = async (prod: any) => {
    try {
      await apiAdminUpdateProduct(prod.id, { published: !prod.published }, authToken);
      await fetchAdminData();
      onDataMutated();
    } catch (err: any) {
      setFeedback(err?.message || 'خطا در ویرایش وضعیت محصول.');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback('');
    try {
      await apiAdminCreateCategory(
        {
          name: newCatName,
          slug: newCatSlug,
          shortDescription: newCatDesc,
        },
        authToken
      );
      setFeedback('دسته‌بندی جدید اضافه شد.');
      setNewCatName('');
      setNewCatSlug('');
      setNewCatDesc('');
      await fetchAdminData();
      onDataMutated();
    } catch (err: any) {
      setFeedback(err?.message || 'خطا در ایجاد دسته‌بندی.');
    }
  };

  const handleDeleteCategory = async (id: string) => {
    setFeedback('');
    try {
      await apiAdminDeleteCategory(id, authToken);
      setFeedback('دسته‌بندی حذف شد.');
      await fetchAdminData();
      onDataMutated();
    } catch (err: any) {
      setFeedback(err?.message || 'خطا در حذف دسته‌بندی.');
    }
  };

  const handleOrderFulfillmentUpdate = async (orderId: string, status: OrderStatus) => {
    setFeedback('');
    try {
      await apiAdminUpdateOrderStatus(orderId, status, authToken);
      setFeedback('وضعیت سفارش بروزرسانی شد.');
      await fetchAdminData();
      onDataMutated();
    } catch (err: any) {
      setFeedback(err?.message || 'خطا در بروزرسانی وضعیت سفارش.');
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback('');
    try {
      await apiAdminCreateCoupon(
        {
          code: newCouponCode,
          description: newCouponDesc,
          discountType: newCouponType,
          discountValue: Number(newCouponVal),
          minOrderAmount: Number(newCouponMin),
        },
        authToken
      );
      setFeedback('کد تخفیف جدید ثبت شد.');
      setNewCouponCode('');
      setNewCouponDesc('');
      await fetchAdminData();
      onDataMutated();
    } catch (err: any) {
      setFeedback(err?.message || 'خطا در ایجاد کد تخفیف.');
    }
  };

  const handleToggleCoupon = async (id: string) => {
    try {
      await apiAdminToggleCoupon(id, authToken);
      await fetchAdminData();
      onDataMutated();
    } catch (err: any) {
      setFeedback(err?.message || 'خطا در تغییر وضعیت کد تخفیف.');
    }
  };

  const handleAdjustInventory = async (productId: string, variantId: string) => {
    const key = `${productId}::${variantId}`;
    const val = invAdjustStock[key];
    if (val === undefined) return;
    try {
      await apiAdminAdjustInventory(
        {
          productId,
          variantId,
          newStock: Number(val),
          referenceNote: 'اصلاح موجودی توسط مدیر در پنل انبار',
        },
        authToken
      );
      setFeedback('موجودی انبار بروزرسانی و در تاریخچه گردش انبار ثبت شد.');
      await fetchAdminData();
      onDataMutated();
    } catch (err: any) {
      setFeedback(err?.message || 'خطا در اصلاح موجودی انبار.');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiAdminSaveSettings(settingsForm, authToken);
      setFeedback('تنظیمات مرکزی فروشگاه ذخیره شد.');
      await fetchAdminData();
      onDataMutated();
    } catch (err: any) {
      setFeedback(err?.message || 'خطا در ذخیره تنظیمات فروشگاه.');
    }
  };

  const { metrics } = adminData;

  // Determine sub-view
  const isNewProduct = currentPath === '/admin/products/new';
  const editProductMatch = currentPath.match(/^\/admin\/products\/([^/]+)$/);
  const editProductId =
    editProductMatch && editProductMatch[1] !== 'new' ? editProductMatch[1] : null;
  const orderDetailMatch = currentPath.match(/^\/admin\/orders\/([^/]+)$/);
  const detailOrderId = orderDetailMatch ? orderDetailMatch[1] : null;

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#292624]">
            پنل مدیریت فروشگاه رَواق
          </h1>
          <p className="text-xs text-[#77716A] mt-1">
            تمامی آمار و شاخص‌ها مستقیماً از رکوردهای واقعی پایگاه داده محاسبه می‌شوند.
          </p>
        </div>
        {feedback && (
          <div className="bg-[#E5EEE6] border border-[#2D8C88] text-[#292624] px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#2D8C88]" />
            <span>{feedback}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Admin Navigation Sidebar */}
        <aside className="lg:col-span-3 bg-[#FFFFFF] border border-[#E4DCCF] rounded-2xl p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active =
              currentPath === item.path ||
              (item.path !== '/admin' && currentPath.startsWith(item.path));
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => {
                  setFeedback('');
                  onNavigate(item.path);
                }}
                className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#742E3A] text-[#F8F4EC] font-bold'
                    : 'text-[#292624] hover:bg-[#EFE5D6]'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Main Admin Workspace */}
        <div className="lg:col-span-9 space-y-6">
          {/* 1. OVERVIEW (/admin) */}
          {currentPath === '/admin' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-[#FFFFFF] p-5 rounded-xl border border-[#E4DCCF]">
                  <span className="text-xs text-[#77716A] block">فروش کل (فقط سفارش‌های پرداخت‌شده)</span>
                  <span className="text-xl font-bold text-[#2D8C88] tabular-nums mt-1 block">
                    {formatToman(metrics.totalPaidSales)}
                  </span>
                </div>
                <div className="bg-[#FFFFFF] p-5 rounded-xl border border-[#E4DCCF]">
                  <span className="text-xs text-[#77716A] block">کل سفارش‌ها / پرداخت‌شده</span>
                  <span className="text-xl font-bold text-[#292624] tabular-nums mt-1 block">
                    {toPersianDigits(metrics.totalOrders)} سفارش ({toPersianDigits(metrics.paidOrders)} پرداخت‌شده)
                  </span>
                </div>
                <div className="bg-[#FFFFFF] p-5 rounded-xl border border-[#E4DCCF]">
                  <span className="text-xs text-[#77716A] block">در انتظار پرداخت</span>
                  <span className="text-xl font-bold text-[#742E3A] tabular-nums mt-1 block">
                    {toPersianDigits(metrics.pendingPayments)} سفارش
                  </span>
                </div>
                <div className="bg-[#FFFFFF] p-5 rounded-xl border border-[#E4DCCF]">
                  <span className="text-xs text-[#77716A] block">تعداد کل محصولات</span>
                  <span className="text-xl font-bold text-[#292624] tabular-nums mt-1 block">
                    {toPersianDigits(metrics.totalProducts)} محصول
                  </span>
                </div>
                <div className="bg-[#FFFFFF] p-5 rounded-xl border border-[#E4DCCF]">
                  <span className="text-xs text-[#77716A] block">تنوع‌های کم‌موجودی (≤ ۱۰ عدد)</span>
                  <span className="text-xl font-bold text-[#742E3A] tabular-nums mt-1 block">
                    {toPersianDigits(metrics.lowStockCount)} مورد
                  </span>
                </div>
              </div>

              {/* Recent Orders Table */}
              <div className="bg-[#FFFFFF] border border-[#E4DCCF] rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-bold text-[#292624]">آخرین سفارش‌های ثبت‌شده</h2>
                  <button
                    type="button"
                    onClick={() => onNavigate('/admin/orders')}
                    className="text-xs font-bold text-[#742E3A] cursor-pointer"
                  >
                    مدیریت همه سفارش‌ها
                  </button>
                </div>
                {metrics.recentOrders.length === 0 ? (
                  <p className="text-xs text-[#77716A]">هنوز سفارشی ثبت نشده است.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-right">
                      <thead className="border-b border-[#E4DCCF] text-[#77716A]">
                        <tr>
                          <th className="py-2">شماره سفارش</th>
                          <th className="py-2">مشتری</th>
                          <th className="py-2">وضعیت سفارش</th>
                          <th className="py-2">وضعیت پرداخت</th>
                          <th className="py-2">مبلغ کل</th>
                          <th className="py-2">عملیات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E4DCCF]">
                        {metrics.recentOrders.map((ord: any) => (
                          <tr key={ord.id}>
                            <td className="py-3 font-mono font-bold">{ord.orderNumber}</td>
                            <td className="py-3">{ord.customerName}</td>
                            <td className="py-3">{ord.status}</td>
                            <td className="py-3">{ord.paymentStatus}</td>
                            <td className="py-3 tabular-nums font-bold">
                              {formatToman(ord.totalAmount)}
                            </td>
                            <td className="py-3">
                              <button
                                type="button"
                                onClick={() => onNavigate(`/admin/orders/${ord.id}`)}
                                className="text-[#742E3A] underline cursor-pointer"
                              >
                                بررسی
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. PRODUCTS (/admin/products, /admin/products/new, /admin/products/[id]) */}
          {(currentPath === '/admin/products' || isNewProduct || editProductId) && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-lg font-bold text-[#292624]">
                  {isNewProduct
                    ? 'افزودن محصول جدید به کاتالوگ'
                    : editProductId
                    ? 'ویرایش محصول'
                    : `مدیریت محصولات (${toPersianDigits(adminData.products.length)})`}
                </h2>
                {!isNewProduct && (
                  <button
                    type="button"
                    onClick={() => onNavigate('/admin/products/new')}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#742E3A] text-[#F8F4EC] text-xs font-bold rounded-lg cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>افزودن محصول جدید</span>
                  </button>
                )}
              </div>

              {isNewProduct && (
                <form
                  onSubmit={handleCreateProduct}
                  className="bg-[#FFFFFF] border border-[#E4DCCF] rounded-2xl p-6 space-y-4"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1">نام فارسی محصول *</label>
                      <input
                        type="text"
                        value={newProdName}
                        onChange={(e) => setNewProdName(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1">اسلاگ انگلیسی (Slug) *</label>
                      <input
                        type="text"
                        dir="ltr"
                        value={newProdSlug}
                        onChange={(e) => setNewProdSlug(e.target.value)}
                        placeholder="new-product-slug"
                        className="w-full px-3 py-2 text-sm bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg text-left font-mono"
                        required
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold mb-1">دسته‌بندی *</label>
                      <select
                        value={newProdCat}
                        onChange={(e) => setNewProdCat(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg"
                      >
                        {adminData.categories.map((c: any) => (
                          <option key={c.id} value={c.slug}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1">قیمت پایه (تومان) *</label>
                      <input
                        type="number"
                        dir="ltr"
                        value={newProdPrice}
                        onChange={(e) => setNewProdPrice(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg text-left tabular-nums"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1">موجودی اولیه *</label>
                      <input
                        type="number"
                        dir="ltr"
                        value={newProdStock}
                        onChange={(e) => setNewProdStock(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg text-left tabular-nums"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1">توضیح کوتاه محصول *</label>
                    <textarea
                      rows={2}
                      value={newProdShortDesc}
                      onChange={(e) => setNewProdShortDesc(e.target.value)}
                      className="w-full px-3 py-2 text-sm bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg"
                      required
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-[#742E3A] text-[#F8F4EC] text-xs font-bold rounded-lg cursor-pointer"
                    >
                      ثبت و انتشار محصول
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigate('/admin/products')}
                      className="px-4 py-2.5 bg-[#F8F4EC] text-[#292624] border border-[#E4DCCF] text-xs rounded-lg cursor-pointer"
                    >
                      انصراف
                    </button>
                  </div>
                </form>
              )}

              {!isNewProduct && (
                <div className="bg-[#FFFFFF] border border-[#E4DCCF] rounded-2xl p-6 space-y-4">
                  <div className="flex flex-wrap gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="w-4 h-4 text-[#77716A] absolute right-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="search"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="جستجوی نام یا کد محصول..."
                        className="w-full pr-9 pl-3 py-2 text-xs bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg"
                      />
                    </div>
                    <select
                      value={productCatFilter}
                      onChange={(e) => setProductCatFilter(e.target.value)}
                      className="px-3 py-2 text-xs bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg"
                    >
                      <option value="all">همه دسته‌ها</option>
                      {adminData.categories.map((c: any) => (
                        <option key={c.id} value={c.slug}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-right">
                      <thead className="border-b border-[#E4DCCF] text-[#77716A]">
                        <tr>
                          <th className="py-2">نام محصول</th>
                          <th className="py-2">دسته‌بندی</th>
                          <th className="py-2">قیمت پایه</th>
                          <th className="py-2">تنوع‌ها</th>
                          <th className="py-2">وضعیت انتشار</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E4DCCF]">
                        {adminData.products
                          .filter((p: any) => {
                            if (productCatFilter !== 'all' && p.categorySlug !== productCatFilter)
                              return false;
                            if (
                              productSearch &&
                              !p.name.includes(productSearch) &&
                              !p.sku.toLowerCase().includes(productSearch.toLowerCase())
                            )
                              return false;
                            return true;
                          })
                          .map((p: any) => (
                            <tr key={p.id}>
                              <td className="py-2.5 font-bold text-[#292624]">{p.name}</td>
                              <td className="py-2.5 text-[#77716A]">{p.categoryName}</td>
                              <td className="py-2.5 tabular-nums font-semibold">
                                {formatToman(p.basePrice)}
                              </td>
                              <td className="py-2.5">
                                {toPersianDigits(p.variants.length)} تنوع
                              </td>
                              <td className="py-2.5">
                                <button
                                  type="button"
                                  onClick={() => handleToggleProductPublish(p)}
                                  className={`px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer ${
                                    p.published
                                      ? 'bg-[#E5EEE6] text-[#2D8C88]'
                                      : 'bg-[#F5E2E0] text-[#742E3A]'
                                  }`}
                                >
                                  {p.published ? 'منتشرشده (تغییر)' : 'پیش‌نویس (انتشار)'}
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 3. CATEGORIES (/admin/categories) */}
          {currentPath === '/admin/categories' && (
            <div className="space-y-6">
              <div className="bg-[#FFFFFF] border border-[#E4DCCF] rounded-2xl p-6 space-y-4">
                <h2 className="text-base font-bold text-[#292624]">دسته‌بندی‌های فروشگاه</h2>
                <div className="space-y-2.5">
                  {adminData.categories.map((cat: any) => (
                    <div
                      key={cat.id}
                      className="p-3.5 rounded-xl border border-[#E4DCCF] bg-[#F8F4EC] flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-[#292624]">{cat.name}</span>
                        <span className="font-mono text-[#77716A] mr-2">({cat.slug})</span>
                        <p className="text-[#77716A] mt-0.5">{cat.shortDescription}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-2 text-[#77716A] hover:text-[#742E3A] cursor-pointer"
                        title="حذف امن دسته‌بندی"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <form
                onSubmit={handleCreateCategory}
                className="bg-[#FFFFFF] border border-[#E4DCCF] rounded-2xl p-6 space-y-4"
              >
                <h3 className="text-sm font-bold text-[#292624]">ایجاد دسته‌بندی جدید</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    placeholder="نام دسته‌بندی *"
                    className="px-3.5 py-2 text-sm bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg"
                    required
                  />
                  <input
                    type="text"
                    dir="ltr"
                    value={newCatSlug}
                    onChange={(e) => setNewCatSlug(e.target.value)}
                    placeholder="category-slug *"
                    className="px-3.5 py-2 text-sm bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg text-left font-mono"
                    required
                  />
                </div>
                <input
                  type="text"
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="توضیح کوتاه دسته‌بندی"
                  className="w-full px-3.5 py-2 text-sm bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg"
                />
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#742E3A] text-[#F8F4EC] text-xs font-bold rounded-lg cursor-pointer"
                >
                  ثبت دسته‌بندی
                </button>
              </form>
            </div>
          )}

          {/* 4. ORDERS (/admin/orders, /admin/orders/[id]) */}
          {(currentPath === '/admin/orders' || detailOrderId) && (
            <div className="bg-[#FFFFFF] border border-[#E4DCCF] rounded-2xl p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-base font-bold text-[#292624]">مدیریت سفارش‌ها و ارسال</h2>
                <div className="flex gap-2">
                  <input
                    type="search"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="جستجوی شماره سفارش..."
                    className="px-3 py-1.5 text-xs bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg"
                  />
                  <select
                    value={orderStatusFilter}
                    onChange={(e) => setOrderStatusFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg"
                  >
                    <option value="all">همه وضعیت‌ها</option>
                    <option value="PENDING_PAYMENT">PENDING_PAYMENT</option>
                    <option value="PAID">PAID</option>
                    <option value="PROCESSING">PROCESSING</option>
                    <option value="SHIPPED">SHIPPED</option>
                    <option value="DELIVERED">DELIVERED</option>
                  </select>
                </div>
              </div>

              {adminData.orders.length === 0 ? (
                <p className="text-xs text-[#77716A]">هنوز سفارشی ثبت نشده است.</p>
              ) : (
                <div className="space-y-4">
                  {adminData.orders
                    .filter((o: any) => {
                      if (detailOrderId && o.id !== detailOrderId) return false;
                      if (orderStatusFilter !== 'all' && o.status !== orderStatusFilter)
                        return false;
                      if (
                        orderSearch &&
                        !o.orderNumber.toLowerCase().includes(orderSearch.toLowerCase())
                      )
                        return false;
                      return true;
                    })
                    .map((ord: any) => (
                      <div
                        key={ord.id}
                        className="p-4 rounded-xl border border-[#E4DCCF] bg-[#F8F4EC] space-y-3 text-xs"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E4DCCF] pb-2">
                          <div>
                            <span className="font-mono font-bold text-sm text-[#292624]">
                              {ord.orderNumber}
                            </span>
                            <span className="mr-3 text-[#77716A]">
                              گیرنده: {ord.customerName} ({toPersianDigits(ord.customerMobile)})
                            </span>
                          </div>
                          <span className="font-bold text-[#742E3A] tabular-nums">
                            {formatToman(ord.totalAmount)}
                          </span>
                        </div>

                        <div className="text-[#77716A]">
                          نشانی Snapshot: {ord.province}، {ord.city}، {ord.addressLine} — کد پستی:{' '}
                          {toPersianDigits(ord.postalCode)}
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                          <div>
                            <span>وضعیت فعلی: </span>
                            <strong className="text-[#292624]">{ord.status}</strong>
                            <span className="mx-2">·</span>
                            <span>پرداخت: </span>
                            <strong className="text-[#2D8C88]">{ord.paymentStatus}</strong>
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5">
                            {(
                              [
                                'PROCESSING',
                                'SHIPPED',
                                'DELIVERED',
                                'CANCELLED',
                              ] as OrderStatus[]
                            ).map((st) => (
                              <button
                                key={st}
                                type="button"
                                onClick={() => handleOrderFulfillmentUpdate(ord.id, st)}
                                className={`px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer ${
                                  ord.status === st
                                    ? 'bg-[#292624] text-[#F8F4EC]'
                                    : 'bg-[#FFFFFF] text-[#292624] border border-[#E4DCCF] hover:border-[#742E3A]'
                                }`}
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* 5. CUSTOMERS (/admin/customers) */}
          {currentPath === '/admin/customers' && (
            <div className="bg-[#FFFFFF] border border-[#E4DCCF] rounded-2xl p-6 space-y-4">
              <h2 className="text-base font-bold text-[#292624]">فهرست مشتریان و کاربران</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right">
                  <thead className="border-b border-[#E4DCCF] text-[#77716A]">
                    <tr>
                      <th className="py-2">نام</th>
                      <th className="py-2">ایمیل</th>
                      <th className="py-2">نقش</th>
                      <th className="py-2">تعداد سفارش</th>
                      <th className="py-2">تاریخ عضویت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E4DCCF]">
                    {adminData.customers.map((c: any) => (
                      <tr key={c.id}>
                        <td className="py-2.5 font-bold">{c.displayName}</td>
                        <td className="py-2.5 font-mono">{c.email}</td>
                        <td className="py-2.5">{c.role}</td>
                        <td className="py-2.5 tabular-nums">{toPersianDigits(c.orderCount)}</td>
                        <td className="py-2.5">{formatJalaliDate(c.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. COUPONS (/admin/coupons) */}
          {currentPath === '/admin/coupons' && (
            <div className="space-y-6">
              <div className="bg-[#FFFFFF] border border-[#E4DCCF] rounded-2xl p-6 space-y-4">
                <h2 className="text-base font-bold text-[#292624]">کدهای تخفیف و آمار استفاده</h2>
                <div className="space-y-2.5">
                  {adminData.coupons.map((c: any) => (
                    <div
                      key={c.id}
                      className="p-4 rounded-xl border border-[#E4DCCF] bg-[#F8F4EC] flex flex-wrap items-center justify-between gap-4 text-xs"
                    >
                      <div>
                        <span className="font-mono font-bold text-sm text-[#292624]">
                          {c.code}
                        </span>
                        <span className="mr-3 text-[#77716A]">{c.description}</span>
                        <div className="text-[#77716A] mt-1">
                          استفاده‌شده: {toPersianDigits(c.usedCount)} از{' '}
                          {toPersianDigits(c.usageLimit)} · حداقل خرید:{' '}
                          {formatToman(c.minOrderAmount)}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleCoupon(c.id)}
                        className={`px-3 py-1.5 rounded-lg font-medium cursor-pointer ${
                          c.active
                            ? 'bg-[#E5EEE6] text-[#2D8C88]'
                            : 'bg-[#F5E2E0] text-[#742E3A]'
                        }`}
                      >
                        {c.active ? 'فعال (غیرفعال‌سازی)' : 'غیرفعال (فعال‌سازی)'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <form
                onSubmit={handleCreateCoupon}
                className="bg-[#FFFFFF] border border-[#E4DCCF] rounded-2xl p-6 space-y-4"
              >
                <h3 className="text-sm font-bold text-[#292624]">ایجاد کد تخفیف جدید</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <input
                    type="text"
                    dir="ltr"
                    value={newCouponCode}
                    onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                    placeholder="BAHAR1405 *"
                    className="px-3 py-2 text-xs font-mono bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg"
                    required
                  />
                  <select
                    value={newCouponType}
                    onChange={(e) => setNewCouponType(e.target.value as any)}
                    className="px-3 py-2 text-xs bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg"
                  >
                    <option value="PERCENTAGE">درصدی (%)</option>
                    <option value="FIXED">مبلغ ثابت (تومان)</option>
                  </select>
                  <input
                    type="number"
                    dir="ltr"
                    value={newCouponVal}
                    onChange={(e) => setNewCouponVal(e.target.value)}
                    placeholder="مقدار تخفیف *"
                    className="px-3 py-2 text-xs bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg tabular-nums"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={newCouponDesc}
                    onChange={(e) => setNewCouponDesc(e.target.value)}
                    placeholder="توضیح کد تخفیف"
                    className="px-3 py-2 text-xs bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg"
                  />
                  <input
                    type="number"
                    dir="ltr"
                    value={newCouponMin}
                    onChange={(e) => setNewCouponMin(e.target.value)}
                    placeholder="حداقل مبلغ سفارش (تومان)"
                    className="px-3 py-2 text-xs bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg tabular-nums"
                  />
                </div>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#742E3A] text-[#F8F4EC] text-xs font-bold rounded-lg cursor-pointer"
                >
                  ثبت کد تخفیف
                </button>
              </form>
            </div>
          )}

          {/* 7. INVENTORY (/admin/inventory) */}
          {currentPath === '/admin/inventory' && (
            <div className="space-y-6">
              <div className="bg-[#FFFFFF] border border-[#E4DCCF] rounded-2xl p-6 space-y-4">
                <h2 className="text-base font-bold text-[#292624]">
                  مدیریت موجودی انبار و هشدار کمبود
                </h2>
                <div className="max-h-96 overflow-y-auto space-y-2 pr-1">
                  {adminData.products.slice(0, 15).map((p: any) =>
                    p.variants.map((v: any) => {
                      const key = `${p.id}::${v.id}`;
                      return (
                        <div
                          key={key}
                          className="p-3 rounded-xl border border-[#E4DCCF] bg-[#F8F4EC] flex flex-wrap items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <span className="font-bold text-[#292624]">{p.name}</span>
                            <span className="text-[#77716A] mr-2">({v.label})</span>
                            <span className="font-mono text-[11px] text-[#77716A] mr-2">
                              [{v.sku}]
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[#77716A]">
                              موجودی فعلی: <strong>{toPersianDigits(v.stock)}</strong>
                            </span>
                            <input
                              type="number"
                              dir="ltr"
                              value={invAdjustStock[key] ?? v.stock}
                              onChange={(e) =>
                                setInvAdjustStock((prev) => ({
                                  ...prev,
                                  [key]: e.target.value,
                                }))
                              }
                              className="w-20 px-2 py-1 bg-[#FFFFFF] border border-[#E4DCCF] rounded text-center tabular-nums"
                            />
                            <button
                              type="button"
                              onClick={() => handleAdjustInventory(p.id, v.id)}
                              className="px-3 py-1 bg-[#292624] text-[#F8F4EC] rounded cursor-pointer"
                            >
                              ثبت
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="bg-[#FFFFFF] border border-[#E4DCCF] rounded-2xl p-6 space-y-3">
                <h3 className="text-sm font-bold text-[#292624]">
                  گردش حسابرسی انبار (Inventory Movements)
                </h3>
                {adminData.inventoryMovements.length === 0 ? (
                  <p className="text-xs text-[#77716A]">هنوز گردش انباری ثبت نشده است.</p>
                ) : (
                  <div className="space-y-2 text-xs">
                    {adminData.inventoryMovements.slice(0, 12).map((mov: any) => (
                      <div
                        key={mov.id}
                        className="p-3 rounded-lg bg-[#F8F4EC] border border-[#E4DCCF] flex flex-wrap items-center justify-between gap-2"
                      >
                        <span>
                          <strong>{mov.productName}</strong> ({mov.variantLabel})
                        </span>
                        <span
                          className={`font-mono font-bold ${
                            mov.delta < 0 ? 'text-[#742E3A]' : 'text-[#2D8C88]'
                          }`}
                        >
                          {mov.delta > 0 ? `+${mov.delta}` : mov.delta} (از {mov.previousStock} به{' '}
                          {mov.newStock})
                        </span>
                        <span className="text-[#77716A]">
                          {mov.reason} · {mov.referenceId}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 8. REVIEWS (/admin/reviews) */}
          {currentPath === '/admin/reviews' && (
            <div className="bg-[#FFFFFF] border border-[#E4DCCF] rounded-2xl p-6 space-y-4">
              <h2 className="text-base font-bold text-[#292624]">دیدگاه‌های ثبت‌شده مشتریان</h2>
              <div className="space-y-3 text-xs">
                {adminData.reviews.map((r: any) => (
                  <div
                    key={r.id}
                    className="p-4 rounded-xl border border-[#E4DCCF] bg-[#F8F4EC] space-y-1"
                  >
                    <div className="flex justify-between font-bold">
                      <span>
                        {r.authorName} (محصول: {r.productSlug})
                      </span>
                      <span>امتیاز: {toPersianDigits(r.rating)} از ۵</span>
                    </div>
                    <p className="text-[#292624]/85">{r.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 9. SETTINGS (/admin/settings) */}
          {currentPath === '/admin/settings' && (
            <form
              onSubmit={handleSaveSettings}
              className="bg-[#FFFFFF] border border-[#E4DCCF] rounded-2xl p-6 space-y-4"
            >
              <h2 className="text-base font-bold text-[#292624]">تنظیمات مرکزی فروشگاه رَواق</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold mb-1">نام نمایشی فروشگاه</label>
                  <input
                    type="text"
                    value={settingsForm.storeName || ''}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, storeName: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">ایمیل پشتیبانی</label>
                  <input
                    type="text"
                    dir="ltr"
                    value={settingsForm.supportEmail || ''}
                    onChange={(e) =>
                      setSettingsForm({ ...settingsForm, supportEmail: e.target.value })
                    }
                    className="w-full px-3 py-2 text-xs font-mono bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg text-left"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">
                    هزینه ارسال استاندارد (تومان)
                  </label>
                  <input
                    type="number"
                    dir="ltr"
                    value={settingsForm.standardShippingCost ?? 65000}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        standardShippingCost: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">
                    سقف ارسال رایگان (تومان)
                  </label>
                  <input
                    type="number"
                    dir="ltr"
                    value={settingsForm.freeShippingThreshold ?? 1200000}
                    onChange={(e) =>
                      setSettingsForm({
                        ...settingsForm,
                        freeShippingThreshold: Number(e.target.value),
                      })
                    }
                    className="w-full px-3 py-2 text-xs bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg tabular-nums"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#742E3A] text-[#F8F4EC] text-xs font-bold rounded-lg cursor-pointer"
              >
                ذخیره تنظیمات فروشگاه
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

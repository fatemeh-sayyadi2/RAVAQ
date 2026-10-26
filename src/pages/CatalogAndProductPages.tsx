import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronLeft,
  ShoppingBag,
  Check,
  AlertTriangle,
  Package,
  ShieldAlert,
  Star,
} from 'lucide-react';
import { Category, Product, ReviewRecord, ImageRole } from '../lib/types.ts';
import { ProductCard } from '../components/ProductCard.tsx';
import { ProductIllustration } from '../components/RavaqVisuals.tsx';
import {
  formatToman,
  toPersianDigits,
  normalizeDigits,
  normalizePersianText,
  formatJalaliDate,
} from '../lib/persian.ts';

interface CatalogPageProps {
  mode: 'shop' | 'category' | 'search' | 'gift-boxes';
  categorySlug?: string;
  initialSearchQuery?: string;
  categories: Category[];
  products: Array<
    Product & {
      variants: Array<Product['variants'][number] & { effectiveStock?: number }>;
    }
  >;
  reviews: ReviewRecord[];
  onNavigate: (path: string) => void;
  onAddToCart: (
    productId: string,
    variantId: string,
    quantity: number,
    giftMessage?: string
  ) => void;
}

export const CatalogPage: React.FC<CatalogPageProps> = ({
  mode,
  categorySlug,
  initialSearchQuery = '',
  categories,
  products,
  reviews,
  onNavigate,
  onAddToCart,
}) => {
  const [searchInput, setSearchInput] = useState(initialSearchQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialSearchQuery);
  const [selectedCategory, setSelectedCategory] = useState<string>(
    mode === 'gift-boxes' ? 'gift-boxes' : categorySlug || 'all'
  );
  const [selectedOccasion, setSelectedOccasion] = useState<string>('');
  const [minPriceStr, setMinPriceStr] = useState<string>('');
  const [maxPriceStr, setMaxPriceStr] = useState<string>('');
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'featured' | 'newest' | 'price_asc' | 'price_desc'>('featured');
  const [visibleCount, setVisibleCount] = useState<number>(12);

  useEffect(() => {
    setSelectedCategory(
      mode === 'gift-boxes' ? 'gift-boxes' : categorySlug || 'all'
    );
  }, [mode, categorySlug]);

  useEffect(() => {
    setSearchInput(initialSearchQuery);
    setDebouncedQuery(initialSearchQuery);
  }, [initialSearchQuery]);

  // Debounce search input (250ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const activeCategoryObj = categories.find((c) => c.slug === selectedCategory);

  const filteredProducts = useMemo(() => {
    const normQ = normalizePersianText(debouncedQuery);
    const minP = minPriceStr ? Number(normalizeDigits(minPriceStr)) : undefined;
    const maxP = maxPriceStr ? Number(normalizeDigits(maxPriceStr)) : undefined;

    const list = products.filter((p) => {
      if (!p.published) return false;

      if (selectedCategory && selectedCategory !== 'all') {
        if (selectedCategory === 'occasion-gifts') {
          const isOccasion =
            (p.occasionTags && p.occasionTags.length > 0) ||
            p.categorySlug === 'gift-boxes';
          if (!isOccasion) return false;
        } else if (p.categorySlug !== selectedCategory) {
          return false;
        }
      }

      if (selectedOccasion) {
        if (!p.occasionTags || !p.occasionTags.includes(selectedOccasion)) {
          return false;
        }
      }

      if (minP !== undefined && !Number.isNaN(minP) && p.basePrice < minP) {
        return false;
      }
      if (maxP !== undefined && !Number.isNaN(maxP) && p.basePrice > maxP) {
        return false;
      }

      if (onlyAvailable) {
        const totalAvail = p.variants.reduce(
          (sum, v) => sum + (v.effectiveStock ?? v.stock),
          0
        );
        if (totalAvail <= 0) return false;
      }

      if (normQ) {
        const haystack = normalizePersianText(
          [
            p.name,
            p.shortDescription,
            p.fullDescription,
            p.categoryName,
            p.sku,
            ...(p.occasionTags || []),
          ].join(' ')
        );
        if (!haystack.includes(normQ)) return false;
      }

      return true;
    });

    return [...list].sort((a, b) => {
      if (sortBy === 'price_asc') return a.basePrice - b.basePrice;
      if (sortBy === 'price_desc') return b.basePrice - a.basePrice;
      if (sortBy === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      return a.name.localeCompare(b.name, 'fa');
    });
  }, [
    products,
    debouncedQuery,
    selectedCategory,
    selectedOccasion,
    minPriceStr,
    maxPriceStr,
    onlyAvailable,
    sortBy,
  ]);

  const clearAllFilters = () => {
    setSearchInput('');
    setDebouncedQuery('');
    if (mode === 'shop' || mode === 'search') {
      setSelectedCategory('all');
    }
    setSelectedOccasion('');
    setMinPriceStr('');
    setMaxPriceStr('');
    setOnlyAvailable(false);
    setSortBy('featured');
    setVisibleCount(12);
  };

  const hasActiveFilters =
    Boolean(debouncedQuery) ||
    (mode === 'shop' && selectedCategory !== 'all') ||
    Boolean(selectedOccasion) ||
    Boolean(minPriceStr) ||
    Boolean(maxPriceStr) ||
    onlyAvailable;

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
      {/* Breadcrumb & Page Header */}
      <div className="mb-8 space-y-3">
        <nav className="flex items-center gap-2 text-xs text-[#77716A]" aria-label="مسیر صفحه">
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="hover:text-[#742E3A] cursor-pointer"
          >
            خانه
          </button>
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="text-[#292624] font-medium">
            {mode === 'gift-boxes'
              ? 'جعبه‌های هدیه'
              : activeCategoryObj
              ? activeCategoryObj.name
              : mode === 'search'
              ? 'نتایج جستجو'
              : 'فروشگاه رواق'}
          </span>
        </nav>

        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-4xl font-bold text-[#292624]">
              {mode === 'gift-boxes'
                ? 'جعبه‌های هدیه رَواق'
                : activeCategoryObj
                ? activeCategoryObj.name
                : mode === 'search'
                ? `جستجو در محصولات رواق`
                : 'همه محصولات رَواق'}
            </h1>
            <p className="text-sm text-[#77716A] mt-1.5 max-w-2xl">
              {activeCategoryObj
                ? activeCategoryObj.description
                : 'گزیده‌ای از آجیل و خشکبار دست‌چین، شیرینی‌های سنتی، زعفران، صنایع‌دستی ایرانی و جعبه‌های پیشکش.'}
            </p>
          </div>
          <div className="text-xs text-[#77716A] tabular-nums">
            نمایش {toPersianDigits(Math.min(visibleCount, filteredProducts.length))} از{' '}
            {toPersianDigits(filteredProducts.length)} محصول
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-[#FFFFFF] border border-[#E4DCCF] rounded-xl p-4 sm:p-5 mb-8 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center">
          {/* Search Input */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-[#77716A] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="جستجو در نام، توضیحات یا کد محصول..."
              className="w-full pr-10 pl-3 py-2 text-sm bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg focus:outline-none focus:border-[#742E3A]"
            />
          </div>

          {/* Category Select */}
          <div className="md:col-span-3">
            <select
              value={selectedCategory}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedCategory(val);
              }}
              aria-label="فیلتر دسته‌بندی"
              className="w-full px-3 py-2 text-sm bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg focus:outline-none focus:border-[#742E3A]"
            >
              <option value="all">همه دسته‌بندی‌ها</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Select */}
          <div className="md:col-span-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              aria-label="مرتب‌سازی بر اساس"
              className="w-full px-3 py-2 text-sm bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg focus:outline-none focus:border-[#742E3A]"
            >
              <option value="featured">مرتب‌سازی: پیشنهاد رواق</option>
              <option value="newest">مرتب‌سازی: جدیدترین</option>
              <option value="price_asc">قیمت: کم به زیاد</option>
              <option value="price_desc">قیمت: زیاد به کم</option>
            </select>
          </div>

          {/* Availability Toggle */}
          <div className="md:col-span-2 flex items-center">
            <label className="inline-flex items-center gap-2 text-xs font-medium text-[#292624] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)}
                className="w-4 h-4 accent-[#742E3A] rounded"
              />
              <span>فقط کالاهای موجود</span>
            </label>
          </div>
        </div>

        {/* Secondary Filter Row: Price Range & Occasion */}
        <div className="pt-3 border-t border-[#E4DCCF]/70 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-[#77716A]">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>محدوده قیمت (تومان):</span>
            </div>
            <input
              type="text"
              inputMode="numeric"
              value={minPriceStr}
              onChange={(e) => setMinPriceStr(e.target.value)}
              placeholder="از (مثلاً ۱۵۰۰۰۰)"
              className="w-32 px-2.5 py-1.5 text-xs bg-[#F8F4EC] border border-[#E4DCCF] rounded-md tabular-nums"
            />
            <span className="text-xs text-[#77716A]">تا</span>
            <input
              type="text"
              inputMode="numeric"
              value={maxPriceStr}
              onChange={(e) => setMaxPriceStr(e.target.value)}
              placeholder="تا (مثلاً ۲۰۰۰۰۰۰)"
              className="w-32 px-2.5 py-1.5 text-xs bg-[#F8F4EC] border border-[#E4DCCF] rounded-md tabular-nums"
            />

            <div className="flex items-center gap-1.5 mr-2">
              {['نوروز', 'شب یلدا', 'مهمانی و دیدار', 'سازمانی'].map((occ) => (
                <button
                  key={occ}
                  type="button"
                  onClick={() =>
                    setSelectedOccasion(selectedOccasion === occ ? '' : occ)
                  }
                  className={`px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer ${
                    selectedOccasion === occ
                      ? 'bg-[#742E3A] text-[#F8F4EC] font-medium'
                      : 'bg-[#F8F4EC] text-[#77716A] hover:text-[#292624] border border-[#E4DCCF]'
                  }`}
                >
                  {occ}
                </button>
              ))}
            </div>
          </div>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#742E3A] hover:text-[#4C202B] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>پاک کردن همه فیلترها</span>
            </button>
          )}
        </div>
      </div>

      {/* Product Grid or Empty State */}
      {filteredProducts.length === 0 ? (
        <div className="bg-[#FFFFFF] border border-[#E4DCCF] rounded-xl p-12 text-center space-y-4">
          <p className="text-base font-bold text-[#292624]">
            محصولی مطابق با فیلترهای انتخاب‌شده یافت نشد.
          </p>
          <p className="text-xs text-[#77716A]">
            پیشنهاد می‌کنیم عبارت جستجو یا محدودیت قیمت را تغییر دهید.
          </p>
          <button
            type="button"
            onClick={clearAllFilters}
            className="px-5 py-2.5 bg-[#742E3A] text-[#F8F4EC] text-xs font-medium rounded-lg hover:bg-[#4C202B] cursor-pointer"
          >
            نمایش همه محصولات
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProducts.slice(0, visibleCount).map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                reviews={reviews}
                onNavigate={onNavigate}
                onAddToCart={(pid, vid, qty) => onAddToCart(pid, vid, qty)}
              />
            ))}
          </div>

          {visibleCount < filteredProducts.length && (
            <div className="mt-10 text-center">
              <button
                type="button"
                onClick={() => setVisibleCount((prev) => prev + 12)}
                className="px-6 py-3 bg-[#FFFFFF] border border-[#E4DCCF] text-sm font-semibold text-[#292624] rounded-lg hover:border-[#742E3A] hover:text-[#742E3A] transition-colors cursor-pointer"
              >
                نمایش محصولات بیشتر ({toPersianDigits(filteredProducts.length - visibleCount)} محصول باقی‌مانده)
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

interface ProductDetailPageProps {
  slug: string;
  products: Array<
    Product & {
      variants: Array<Product['variants'][number] & { effectiveStock?: number }>;
    }
  >;
  reviews: ReviewRecord[];
  user: { uid: string; displayName: string } | null;
  authToken: string | null;
  onNavigate: (path: string) => void;
  onAddToCart: (
    productId: string,
    variantId: string,
    quantity: number,
    giftMessage?: string
  ) => void;
  onReviewAdded: (review: ReviewRecord) => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  slug,
  products,
  reviews,
  user,
  authToken,
  onNavigate,
  onAddToCart,
  onReviewAdded,
}) => {
  const product = products.find((p) => p.slug === slug);

  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    product?.variants[0]?.id || ''
  );
  const [selectedRole, setSelectedRole] = useState<ImageRole>('primary');
  const [quantity, setQuantity] = useState<number>(1);
  const [giftMessage, setGiftMessage] = useState<string>('');
  const [addedFeedback, setAddedFeedback] = useState<boolean>(false);

  // Review form state
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewError, setReviewError] = useState<string>('');
  const [reviewSubmitting, setReviewSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (product && product.variants[0]) {
      setSelectedVariantId(product.variants[0].id);
      setQuantity(1);
      setSelectedRole('primary');
      setGiftMessage('');
    }
  }, [slug, product]);

  if (!product) {
    return (
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 text-center space-y-4">
        <h1 className="text-2xl font-bold text-[#292624]">محصول مورد نظر یافت نشد</h1>
        <p className="text-sm text-[#77716A]">
          ممکن است نشانی صفحه تغییر کرده باشد یا این محصول در حال حاضر فعال نباشد.
        </p>
        <button
          type="button"
          onClick={() => onNavigate('/shop')}
          className="px-6 py-2.5 bg-[#742E3A] text-[#F8F4EC] text-xs font-semibold rounded-lg cursor-pointer"
        >
          بازگشت به فروشگاه رواق
        </button>
      </div>
    );
  }

  const activeVariant =
    product.variants.find((v) => v.id === selectedVariantId) || product.variants[0];
  const availableStock =
    activeVariant?.effectiveStock !== undefined
      ? activeVariant.effectiveStock
      : activeVariant?.stock ?? 0;
  const isAvailable = availableStock > 0;

  const productReviews = reviews.filter((r) => r.productId === product.id);
  const relatedProducts = products
    .filter((p) => p.published && p.id !== product.id && p.categorySlug === product.categorySlug)
    .slice(0, 3);

  const handleAdd = () => {
    if (!activeVariant || !isAvailable) return;
    const safeQty = Math.max(1, Math.min(availableStock, quantity));
    onAddToCart(
      product.id,
      activeVariant.id,
      safeQty,
      giftMessage.trim() ? giftMessage.trim() : undefined
    );
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1600);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setReviewError('');
    setReviewSubmitting(true);
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (authToken) headers.Authorization = `Bearer ${authToken}`;
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          productId: product.id,
          rating: reviewRating,
          comment: reviewComment,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setReviewError(data.error || 'خطا در ثبت دیدگاه.');
      } else if (data.review) {
        onReviewAdded(data.review);
        setReviewComment('');
      }
    } catch {
      setReviewError('خطا در برقراری ارتباط با سرور.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const galleryRoles: { role: ImageRole; label: string }[] = [
    { role: 'primary', label: 'نمای اصلی' },
    { role: 'detail', label: 'بافت و جزئیات' },
    { role: 'packaging', label: 'بسته‌بندی رواق' },
    { role: 'lifestyle', label: 'چیدمان پذیرایی' },
  ];

  // JSON-LD Product Structured Data (Backed strictly by actual product data)
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.shortDescription,
    sku: activeVariant?.sku || product.sku,
    offers: {
      '@type': 'Offer',
      price: activeVariant?.price || product.basePrice,
      priceCurrency: 'IRT',
      availability: isAvailable
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />

      {/* Breadcrumbs */}
      <nav
        className="flex flex-wrap items-center gap-2 text-xs text-[#77716A] mb-8"
        aria-label="مسیر صفحه"
      >
        <button
          type="button"
          onClick={() => onNavigate('/')}
          className="hover:text-[#742E3A] cursor-pointer"
        >
          خانه
        </button>
        <ChevronLeft className="w-3.5 h-3.5" />
        <button
          type="button"
          onClick={() => onNavigate('/shop')}
          className="hover:text-[#742E3A] cursor-pointer"
        >
          فروشگاه
        </button>
        <ChevronLeft className="w-3.5 h-3.5" />
        <button
          type="button"
          onClick={() =>
            onNavigate(
              product.categorySlug === 'gift-boxes'
                ? '/gift-boxes'
                : `/category/${product.categorySlug}`
            )
          }
          className="hover:text-[#742E3A] cursor-pointer"
        >
          {product.categoryName}
        </button>
        <ChevronLeft className="w-3.5 h-3.5" />
        <span className="text-[#292624] font-medium">{product.name}</span>
      </nav>

      {/* Main Contiguous Purchase Module (Gallery + Purchase Column) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Right Column (in RTL): Product Gallery */}
        <div className="lg:col-span-6 space-y-4">
          <div className="aspect-[4/3] w-full bg-[#FFFFFF] border border-[#E4DCCF] rounded-2xl overflow-hidden">
            <ProductIllustration
              illustrationKey={product.images[0]?.illustrationKey || 'nuts'}
              role={selectedRole}
              title={`${product.name} - ${selectedRole}`}
            />
          </div>

          <div className="grid grid-cols-4 gap-3">
            {galleryRoles.map((item) => (
              <button
                key={item.role}
                type="button"
                onClick={() => setSelectedRole(item.role)}
                className={`p-1.5 rounded-xl border text-center transition-colors cursor-pointer ${
                  selectedRole === item.role
                    ? 'border-[#742E3A] bg-[#EFE5D6]/60'
                    : 'border-[#E4DCCF] bg-[#FFFFFF] hover:border-[#B89A62]'
                }`}
              >
                <div className="aspect-[4/3] rounded-lg overflow-hidden mb-1">
                  <ProductIllustration
                    illustrationKey={product.images[0]?.illustrationKey || 'nuts'}
                    role={item.role}
                    title={item.label}
                  />
                </div>
                <span className="text-[11px] font-medium text-[#292624] block truncate">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Left Column (in RTL): Purchase Module & Specifications */}
        <div className="lg:col-span-6 bg-[#FFFFFF] border border-[#E4DCCF] rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="space-y-2 border-b border-[#E4DCCF] pb-5">
            <div className="flex items-center gap-2 text-xs text-[#77716A]">
              <span>{product.categoryName}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">کد کالا: {activeVariant?.sku || product.sku}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-[#292624]">
              {product.name}
            </h1>

            <p className="text-sm text-[#77716A] leading-relaxed">
              {product.shortDescription}
            </p>
          </div>

          {/* Price & Stock Display */}
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <div>
              {activeVariant?.compareAtPrice &&
                activeVariant.compareAtPrice > activeVariant.price && (
                  <span className="block text-xs text-[#77716A] line-through tabular-nums">
                    {formatToman(activeVariant.compareAtPrice)}
                  </span>
                )}
              <span className="text-2xl sm:text-3xl font-bold text-[#742E3A] tabular-nums">
                {formatToman(activeVariant?.price || product.basePrice)}
              </span>
              <span className="block text-[11px] text-[#77716A] mt-0.5">
                قیمت نمایشی (داده‌های نمونه)
              </span>
            </div>

            <div className="text-xs font-medium">
              {isAvailable ? (
                <span className="text-[#2D8C88]">
                  موجود در انبار ({toPersianDigits(availableStock)} عدد قابل سفارش)
                </span>
              ) : (
                <span className="text-[#742E3A]">ناموجود در حال حاضر</span>
              )}
            </div>
          </div>

          {/* Variant Selector */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-[#292624]">
              انتخاب وزن یا بسته‌بندی:
            </label>
            <div className="flex flex-wrap gap-2">
              {product.variants.map((variant) => {
                const isSelected = variant.id === activeVariant?.id;
                const varStock = variant.effectiveStock ?? variant.stock;
                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => {
                      setSelectedVariantId(variant.id);
                      setQuantity(1);
                    }}
                    className={`px-4 py-2.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#292624] text-[#F8F4EC] border-[#292624]'
                        : 'bg-[#F8F4EC] text-[#292624] border-[#E4DCCF] hover:border-[#742E3A]'
                    }`}
                  >
                    <span>{variant.label}</span>
                    <span className="mr-2 opacity-80 tabular-nums">
                      ({formatToman(variant.price)})
                    </span>
                    {varStock <= 0 && (
                      <span className="mr-1.5 text-[#742E3A]">(ناموجود)</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Gift Box Included Items (When product is a Gift Bundle) */}
          {product.bundleItems && product.bundleItems.length > 0 && (
            <div className="bg-[#F8F4EC] border border-[#E4DCCF] rounded-xl p-4 space-y-2.5">
              <div className="flex items-center gap-2 text-xs font-bold text-[#292624]">
                <Package className="w-4 h-4 text-[#742E3A]" />
                <span>اقلام موجود در این جعبه هدیه:</span>
              </div>
              <ul className="space-y-1.5 text-xs text-[#292624]">
                {product.bundleItems.map((item, idx) => (
                  <li key={idx} className="flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => onNavigate(`/product/${item.productSlug}`)}
                      className="hover:text-[#742E3A] underline decoration-[#E4DCCF] cursor-pointer"
                    >
                      {item.name}
                    </button>
                    <span className="text-[#77716A]">{item.quantityLabel}</span>
                  </li>
                ))}
              </ul>
              {product.packagingDetails && (
                <p className="text-[11px] text-[#77716A] pt-2 border-t border-[#E4DCCF]">
                  <strong>جزئیات بسته‌بندی:</strong> {product.packagingDetails}
                </p>
              )}
            </div>
          )}

          {/* Optional Gift Message Card for Gift Boxes */}
          {product.categorySlug === 'gift-boxes' && (
            <div className="space-y-1.5">
              <label
                htmlFor="gift-msg-input"
                className="block text-xs font-bold text-[#292624]"
              >
                متن کارت هدیه (اختیاری — چاپ روی کارت مخصوص رواق):
              </label>
              <input
                id="gift-msg-input"
                type="text"
                maxLength={160}
                value={giftMessage}
                onChange={(e) => setGiftMessage(e.target.value)}
                placeholder="مثلاً: نوروزتان پیروز و ایام به کام..."
                className="w-full px-3.5 py-2 text-xs bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg focus:outline-none focus:border-[#742E3A]"
              />
            </div>
          )}

          {/* Quantity Control & Add to Cart */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <div className="inline-flex items-center border border-[#E4DCCF] rounded-lg bg-[#F8F4EC]">
              <button
                type="button"
                disabled={!isAvailable || quantity <= 1}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-3.5 py-2.5 text-sm font-bold text-[#292624] disabled:opacity-40 cursor-pointer"
                aria-label="کاهش تعداد"
              >
                −
              </button>
              <span className="px-4 py-2.5 text-sm font-bold tabular-nums text-[#292624]">
                {toPersianDigits(quantity)}
              </span>
              <button
                type="button"
                disabled={!isAvailable || quantity >= availableStock}
                onClick={() => setQuantity((q) => Math.min(availableStock, q + 1))}
                className="px-3.5 py-2.5 text-sm font-bold text-[#292624] disabled:opacity-40 cursor-pointer"
                aria-label="افزایش تعداد"
              >
                +
              </button>
            </div>

            <button
              type="button"
              disabled={!isAvailable}
              onClick={handleAdd}
              className={`flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-bold rounded-lg transition-colors cursor-pointer ${
                !isAvailable
                  ? 'bg-[#EFE5D6] text-[#77716A] cursor-not-allowed'
                  : addedFeedback
                  ? 'bg-[#2D8C88] text-[#FFFFFF]'
                  : 'bg-[#742E3A] text-[#F8F4EC] hover:bg-[#4C202B]'
              }`}
            >
              {addedFeedback ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>به سبد خرید افزوده شد</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-4 h-4" />
                  <span>
                    {isAvailable ? 'افزودن به سبد خرید' : 'موجودی این تنوع به پایان رسیده'}
                  </span>
                </>
              )}
            </button>
          </div>

          {/* Fragile Warning if Handicraft / Ceramic */}
          {product.fragileWarning && (
            <div className="bg-[#F5E9D7] border border-[#B89A62]/50 rounded-lg p-3 flex items-start gap-2.5 text-xs text-[#292624]">
              <AlertTriangle className="w-4 h-4 text-[#742E3A] shrink-0 mt-0.5" />
              <span>{product.fragileWarning}</span>
            </div>
          )}

          {/* Product Specifications Table */}
          <div className="pt-4 border-t border-[#E4DCCF] space-y-3 text-xs">
            <h2 className="text-sm font-bold text-[#292624]">درباره محصول و مشخصات</h2>
            <p className="text-xs sm:text-sm text-[#292624]/85 leading-relaxed">
              {product.fullDescription}
            </p>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              {product.ingredientsOrMaterial && (
                <div className="bg-[#F8F4EC] p-3 rounded-lg border border-[#E4DCCF]">
                  <dt className="font-bold text-[#292624] mb-1">ترکیبات / جنس:</dt>
                  <dd className="text-[#77716A] leading-relaxed">
                    {product.ingredientsOrMaterial}
                  </dd>
                </div>
              )}
              {product.allergens && (
                <div className="bg-[#F8F4EC] p-3 rounded-lg border border-[#E4DCCF]">
                  <dt className="font-bold text-[#292624] mb-1 flex items-center gap-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-[#742E3A]" />
                    <span>اطلاعات حساسیت‌زایی (آلرژن):</span>
                  </dt>
                  <dd className="text-[#77716A] leading-relaxed">{product.allergens}</dd>
                </div>
              )}
              {product.storageOrCare && (
                <div className="bg-[#F8F4EC] p-3 rounded-lg border border-[#E4DCCF]">
                  <dt className="font-bold text-[#292624] mb-1">نگهداری و مراقبت:</dt>
                  <dd className="text-[#77716A] leading-relaxed">
                    {product.storageOrCare}
                  </dd>
                </div>
              )}
              {product.dimensionsOrWeight && (
                <div className="bg-[#F8F4EC] p-3 rounded-lg border border-[#E4DCCF]">
                  <dt className="font-bold text-[#292624] mb-1">ابعاد / وزن:</dt>
                  <dd className="text-[#77716A] leading-relaxed">
                    {product.dimensionsOrWeight}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </div>

      {/* Stored Customer Reviews Section */}
      <section className="mt-16 pt-12 border-t border-[#E4DCCF] grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 space-y-4">
          <h2 className="text-xl font-bold text-[#292624]">
            دیدگاه‌های ثبت‌شده درباره این محصول ({toPersianDigits(productReviews.length)})
          </h2>
          {productReviews.length === 0 ? (
            <p className="text-xs text-[#77716A] bg-[#FFFFFF] p-5 rounded-xl border border-[#E4DCCF]">
              هنوز دیدگاهی برای این محصول ثبت نشده است. امتیازهای رواق تنها بر پایه دیدگاه‌های واقعی ذخیره در پایگاه داده نمایش داده می‌شوند.
            </p>
          ) : (
            <div className="space-y-3">
              {productReviews.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-[#FFFFFF] p-4 rounded-xl border border-[#E4DCCF] space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#292624]">{rev.authorName}</span>
                    <div className="flex items-center gap-2 text-[#77716A]">
                      <span className="tabular-nums text-[#292624] font-semibold">
                        امتیاز: {toPersianDigits(rev.rating)} از ۵
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{formatJalaliDate(rev.createdAt)}</span>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-[#292624]/85 leading-relaxed">
                    {rev.comment}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-5 bg-[#FFFFFF] p-6 rounded-xl border border-[#E4DCCF] space-y-4">
          <h3 className="text-base font-bold text-[#292624]">ثبت دیدگاه جدید</h3>
          {!user ? (
            <div className="space-y-3 text-xs text-[#77716A]">
              <p>برای ثبت دیدگاه درباره این محصول، ابتدا وارد حساب کاربری خود شوید.</p>
              <button
                type="button"
                onClick={() => onNavigate('/login')}
                className="px-4 py-2 bg-[#742E3A] text-[#F8F4EC] font-medium rounded-lg cursor-pointer"
              >
                ورود به حساب کاربری
              </button>
            </div>
          ) : (
            <form onSubmit={handleReviewSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#292624] mb-1">
                  امتیاز شما (۱ تا ۵):
                </label>
                <div className="flex items-center gap-2">
                  {[5, 4, 3, 2, 1].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setReviewRating(num)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1 cursor-pointer ${
                        reviewRating === num
                          ? 'bg-[#742E3A] text-[#F8F4EC]'
                          : 'bg-[#F8F4EC] text-[#292624] border border-[#E4DCCF]'
                      }`}
                    >
                      <Star className="w-3 h-3" />
                      <span>{toPersianDigits(num)}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#292624] mb-1">
                  متن دیدگاه:
                </label>
                <textarea
                  rows={3}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="تجربه خود را از کیفیت، طعم یا بسته‌بندی این محصول بنویسید..."
                  className="w-full px-3 py-2 text-xs bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg focus:outline-none focus:border-[#742E3A]"
                  required
                />
              </div>
              {reviewError && <p className="text-xs text-[#742E3A]">{reviewError}</p>}
              <button
                type="submit"
                disabled={reviewSubmitting}
                className="px-5 py-2.5 bg-[#742E3A] text-[#F8F4EC] text-xs font-semibold rounded-lg hover:bg-[#4C202B] cursor-pointer disabled:opacity-50"
              >
                {reviewSubmitting ? 'در حال ثبت...' : 'ثبت دیدگاه'}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="mt-16 pt-12 border-t border-[#E4DCCF]">
          <h2 className="text-xl font-bold text-[#292624] mb-6">
            محصولات هم‌خانواده در {product.categoryName}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {relatedProducts.map((rel) => (
              <ProductCard
                key={rel.id}
                product={rel}
                reviews={reviews}
                onNavigate={onNavigate}
                onAddToCart={(pid, vid, qty) => onAddToCart(pid, vid, qty)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  ArrowLeft,
  Gift,
  ShieldCheck,
  PackageCheck,
  Sparkles,
  Headphones,
} from 'lucide-react';
import { Category, Product, ReviewRecord } from '../lib/types.ts';
import { RavaqLuxuryGiftBox3D, ProductIllustration } from '../components/RavaqVisuals.tsx';
import { ProductCard } from '../components/ProductCard.tsx';
import { HeroSection } from '../components/homepage/HeroSection.tsx';
import { CategoryShowcase } from '../components/homepage/CategoryShowcase.tsx';
import { formatToman, toPersianDigits } from '../lib/persian.ts';

interface HomePageProps {
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

export const HomePage: React.FC<HomePageProps> = ({
  categories,
  products,
  reviews,
  onNavigate,
  onAddToCart,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const [featuredTab, setFeaturedTab] = useState<string>('all');
  const [selectedOccasion, setSelectedOccasion] = useState<string>('همه مناسبت‌ها');

  const featuredProducts = products
    .filter((p) => {
      if (featuredTab === 'all') return p.featured;
      return p.categorySlug === featuredTab;
    })
    .slice(0, 6);

  const giftBoxes = products.filter((p) => p.categorySlug === 'gift-boxes');
  const filteredGiftBoxes =
    selectedOccasion === 'همه مناسبت‌ها'
      ? giftBoxes.slice(0, 4)
      : giftBoxes
          .filter((g) => g.occasionTags?.includes(selectedOccasion))
          .slice(0, 4);

  const occasions = ['همه مناسبت‌ها', 'نوروز', 'شب یلدا', 'مهمانی و دیدار', 'سازمانی'];

  return (
    <div className="bg-[#F8F4EC] text-[#292624]">
      {/* ============================================================
          SECTION B: FULL-VIEWPORT HERO («بانوی رَواق») — 100svh Edge-to-Edge
         ============================================================ */}
      <HeroSection
        totalProductCount={products.length}
        onNavigate={onNavigate}
      />

      {/* ============================================================
          SECTION C: CATEGORY SHOWCASE («از رواق چه می‌خواهید؟»)
         ============================================================ */}
      <CategoryShowcase
        categories={categories}
        onNavigate={onNavigate}
      />

      {/* ============================================================
          SECTION D: FEATURED PRODUCTS («انتخاب‌های محبوب رواق»)
         ============================================================ */}
      <section className="bg-[#EFE5D6]/55 border-y border-[#E4DCCF] py-16 md:py-24">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10"
          >
            <div className="space-y-2">
              <h2 className="ravaq-section-title text-[#292624]">
                انتخاب‌های محبوب رواق
              </h2>
              <p className="ravaq-section-subtitle text-[#77716A]">
                محصولات پرمخاطب از آجیل و خشکبار، شیرینی‌های سنتی، زعفران و صنایع‌دستی با موجودی و قیمت لحظه‌ای
              </p>
            </div>

            {/* Interactive Segmented Category Filter */}
            <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg">
              {[
                { key: 'all', label: 'برگزیده‌ها' },
                { key: 'nuts-dried-fruits', label: 'آجیل و خشکبار' },
                { key: 'traditional-sweets', label: 'شیرینی سنتی' },
                { key: 'saffron-select-foods', label: 'زعفران' },
                { key: 'iranian-handicrafts', label: 'صنایع‌دستی' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setFeaturedTab(tab.key)}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    featuredTab === tab.key
                      ? 'bg-[#742E3A] text-[#F8F4EC] shadow-xs'
                      : 'text-[#77716A] hover:text-[#292624]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                reviews={reviews}
                onNavigate={onNavigate}
                onAddToCart={(pid, vid, qty) => onAddToCart(pid, vid, qty)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION E: GIFT BOX FEATURE («هدیه‌ای که قصه دارد»)
         ============================================================ */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: prefersReducedMotion ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="bg-[#4C202B] text-[#F8F4EC] rounded-2xl overflow-hidden border border-[#B89A62]/40 mb-12"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
            <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <p className="text-xs font-medium text-[#B89A62]">
                  جعبه‌های هدیه رَواق · ترکیب طعم و هنر ایرانی
                </p>
                <h2 className="ravaq-section-title text-[#F8F4EC]">
                  هدیه‌ای که قصه دارد
                </h2>
                <p className="text-sm sm:text-base text-[#EFE5D6]/90 leading-relaxed max-w-2xl">
                  در رواق، هر جعبه هدیه پیوندی حساب‌شده میان خوراکی‌های اصیل ایرانی (پسته، زعفران، گز و سوهان) و صنایع‌دستی ماندگار (ظروف سرامیکی، سفال فیروزه‌ای و رومیزی‌های ایرانی) است. موجودی هر جعبه به‌صورت هوشمند با موجودی اقلام داخل آن در سرور هماهنگ می‌شود.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  {occasions.map((occ) => (
                    <button
                      key={occ}
                      type="button"
                      onClick={() => setSelectedOccasion(occ)}
                      className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        selectedOccasion === occ
                          ? 'bg-[#B89A62] text-[#292624] font-bold'
                          : 'bg-[#F8F4EC]/10 text-[#EFE5D6] hover:bg-[#F8F4EC]/20'
                      }`}
                    >
                      {occ}
                    </button>
                  ))}
                </div>

                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => onNavigate('/gift-boxes')}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#F8F4EC] text-[#4C202B] text-sm font-bold rounded-lg hover:bg-[#EFE5D6] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Gift className="w-4 h-4" />
                    <span>انتخاب جعبه هدیه</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 bg-[#36161E] min-h-[290px] p-8 flex flex-col items-center justify-center border-t lg:border-t-0 lg:border-r border-[#B89A62]/30 relative overflow-hidden">
              <div
                className="absolute inset-0 opacity-30 pointer-events-none"
                style={{
                  background:
                    'radial-gradient(circle at 50% 45%, rgba(248, 244, 236, 0.25) 0%, rgba(41, 38, 36, 0) 70%)',
                }}
              />
              <RavaqLuxuryGiftBox3D size="lg" />
            </div>
          </div>
        </motion.div>

        {/* Filtered Gift Boxes Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredGiftBoxes.map((box) => {
            const firstVar = box.variants[0];
            const primaryImg = box.images.find((i) => i.role === 'primary') || box.images[0];
            const stock = firstVar
              ? typeof firstVar.effectiveStock === 'number'
                ? firstVar.effectiveStock
                : firstVar.stock
              : 0;
            return (
              <div
                key={box.id}
                className="group bg-[#FFFFFF] border border-[#E4DCCF] rounded-xl overflow-hidden flex flex-col justify-between hover:border-[#B89A62] transition-colors"
              >
                <div>
                  <div
                    onClick={() => onNavigate(`/gift-boxes/${box.slug}`)}
                    className="aspect-[4/3] w-full overflow-hidden bg-[#F8F4EC] border-b border-[#E4DCCF] cursor-pointer"
                  >
                    <div className="w-full h-full transition-transform duration-500 ease-out group-hover:scale-[1.03]">
                      <ProductIllustration
                        illustrationKey={primaryImg?.illustrationKey || 'giftbox'}
                        role="primary"
                        title={box.name}
                        imageUrl={primaryImg?.url}
                      />
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between text-xs text-[#77716A]">
                      <span>{box.occasionTags?.join(' · ') || 'جعبه هدیه'}</span>
                      <span className="tabular-nums">
                        {stock > 0 ? `موجودی: ${toPersianDigits(stock)}` : 'ناموجود'}
                      </span>
                    </div>
                    <h3
                      onClick={() => onNavigate(`/gift-boxes/${box.slug}`)}
                      className="text-base font-bold text-[#292624] hover:text-[#742E3A] cursor-pointer transition-colors"
                    >
                      {box.name}
                    </h3>
                    <p className="text-xs text-[#77716A] leading-relaxed line-clamp-2">
                      {box.shortDescription}
                    </p>

                    {box.bundleItems && box.bundleItems.length > 0 && (
                      <div className="pt-2 border-t border-[#E4DCCF]/70 space-y-1">
                        <span className="text-[11px] font-semibold text-[#292624]">
                          اقلام داخل جعبه:
                        </span>
                        <ul className="text-[11px] text-[#77716A] space-y-0.5">
                          {box.bundleItems.slice(0, 3).map((bi, idx) => (
                            <li key={idx}>
                              • {bi.name} ({bi.quantityLabel})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-5 pb-5 pt-3 border-t border-[#E4DCCF] flex items-center justify-between gap-2">
                  <span className="text-sm font-bold text-[#292624] tabular-nums">
                    {formatToman(box.basePrice)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onNavigate(`/gift-boxes/${box.slug}`)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#742E3A] hover:text-[#4C202B] cursor-pointer"
                  >
                    <span>مشاهده جعبه</span>
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ============================================================
          SECTION F: BRAND STORY («رواق؛ جایی برای انتخاب‌های اصیل»)
         ============================================================ */}
      <section className="bg-[#EFE5D6] border-y border-[#E4DCCF] py-16 md:py-24">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-5">
              <p className="text-xs font-semibold text-[#742E3A]">
                فلسفه و نگاه ما در رَواق
              </p>
              <h2 className="ravaq-section-title text-[#292624]">
                رواق؛ جایی برای انتخاب‌های اصیل
              </h2>
              <p className="text-sm sm:text-base text-[#292624]/85 leading-relaxed">
                در معماری ایرانی، «رَواق» فضایی است میان بیرون و درون؛ جایی آرام، سایه‌دار و خوش‌نشین برای مکث، دیدار و گفت‌وگو. فروشگاه رواق با همین نگاه شکل گرفته است: گردآوری مجموعه‌ای گزیده از طعم‌های اصیل ایرانی و دست‌ساخته‌های کاربردی در بسته‌بندی‌هایی که شأن هدیه‌دادن و میزبانی ایرانی را حفظ می‌کنند.
              </p>
              <p className="text-xs sm:text-sm text-[#77716A] leading-relaxed">
                ما در این نسخه نمایشی از هرگونه ادعای تأییدنشده درباره گواهی‌های ارگانیک یا منشأ جغرافیایی اثبات‌نشده پرهیز کرده‌ایم و تمرکز خود را بر شفافیت اطلاعات محصول، سلامت بسته‌بندی و تجربه خرید دقیق قرار داده‌ایم.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => onNavigate('/about')}
                  className="inline-flex items-center gap-2 text-sm font-semibold text-[#742E3A] hover:text-[#4C202B] transition-colors cursor-pointer"
                >
                  <span>آشنایی بیشتر با داستان رواق</span>
                  <ArrowLeft className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="lg:col-span-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                {
                  title: 'گزینش دقیق محصولات',
                  desc: 'انتخاب متوازن از آجیل، شیرینی سنتی، زعفران و صنایع‌دستی در یک کاتالوگ منسجم.',
                },
                {
                  title: 'بسته‌بندی درخور پیشکش',
                  desc: 'جعبه‌های زرشکی و عاجی با جزئیات طلایی عتیق، مناسب هدیه‌های شخصی و سازمانی.',
                },
                {
                  title: 'موجودی و قیمت شفاف',
                  desc: 'محاسبه دقیق قیمت بر پایه تومان و کنترل هوشمند موجودی انبار و جعبه‌های ترکیبی.',
                },
                {
                  title: 'احترام به سنت میزبانی',
                  desc: 'طراحی‌شده برای مناسبت‌های ایرانی از نوروز و شب یلدا تا دید و بازدیدهای روزمره.',
                },
              ].map((pillar, idx) => (
                <div
                  key={idx}
                  className="bg-[#F8F4EC] border border-[#E4DCCF] rounded-xl p-5 space-y-2"
                >
                  <span className="text-xs font-bold text-[#B89A62] tabular-nums">
                    ۰{toPersianDigits(idx + 1)}
                  </span>
                  <h3 className="text-sm font-bold text-[#292624]">
                    {pillar.title}
                  </h3>
                  <p className="text-xs text-[#77716A] leading-relaxed">
                    {pillar.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          SECTION G: TRUST AND SERVICE STRIP (Only Real Capabilities)
         ============================================================ */}
      <section className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <div className="bg-[#FFFFFF] border border-[#E4DCCF] rounded-xl p-5 flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg bg-[#EFE5D6] text-[#742E3A] shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#292624]">
                پرداخت آزمایشی امن
              </h3>
              <p className="text-xs text-[#77716A] leading-relaxed">
                شبیه‌ساز کامل درگاه پرداخت با پشتیبانی از تراکنش موفق، ناموفق، انصراف و تلاش مجدد بدون دریافت اطلاعات بانکی واقعی.
              </p>
            </div>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E4DCCF] rounded-xl p-5 flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg bg-[#EFE5D6] text-[#2D8C88] shrink-0">
              <PackageCheck className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#292624]">
                پیگیری سفارش آنلاین
              </h3>
              <p className="text-xs text-[#77716A] leading-relaxed">
                مشاهده لحظه‌ای وضعیت سفارش و تاریخچه تغییرات با شماره سفارش و شماره موبایل ثبت‌شده.
              </p>
            </div>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E4DCCF] rounded-xl p-5 flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg bg-[#EFE5D6] text-[#742E3A] shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#292624]">
                بسته‌بندی هدیه رواق
              </h3>
              <p className="text-xs text-[#77716A] leading-relaxed">
                امکان ثبت پیام اختصاصی روی کارت تبریک برای جعبه‌های هدیه و پک‌های مناسبتی.
              </p>
            </div>
          </div>

          <div className="bg-[#FFFFFF] border border-[#E4DCCF] rounded-xl p-5 flex items-start gap-3.5">
            <div className="p-2.5 rounded-lg bg-[#EFE5D6] text-[#292624] shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-[#292624]">
                پشتیبانی و راهنمای شفاف
              </h3>
              <p className="text-xs text-[#77716A] leading-relaxed">
                سیاست‌های ارسال و بازگشت کالا به‌طور شفاف برای محیط نمایشی (Demo) مستندسازی شده‌اند.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

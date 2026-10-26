/**
 * Centralized Design Tokens, Typography Configuration & Media Manifest for RAVĀQ (رَواق)
 * Brand: Contemporary Iranian luxury boutique celebrating Iranian flavors, gifts, crafts, and hospitality.
 */

export const RAVAQ_COLORS = {
  warmIvory: '#F8F4EC',
  cream: '#EFE5D6',
  burgundy: '#742E3A',
  darkWine: '#4C202B',
  iranianTurquoise: '#2D8C88',
  antiqueGold: '#B89A62',
  warmCharcoal: '#292624',
  mutedText: '#77716A',
  border: '#E4DCCF',
  white: '#FFFFFF',
  softSuccess: '#E5EEE6',
  softWarning: '#F5E9D7',
  softError: '#F5E2E0',
} as const;

export const RAVAQ_TYPOGRAPHY = {
  primaryUiFont: 'Arad',
  displayFont: 'Ganjnameh',
  fallbackStackUi:
    '"Arad", "IRANSansX", "Yekan Bakh", -apple-system, BlinkMacSystemFont, "Segoe UI", Tahoma, sans-serif',
  fallbackStackDisplay:
    '"Ganjnameh", "Arad", "IRANSansX", "Yekan Bakh", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
} as const;

export interface HeroMediaSourceConfig {
  id: string;
  label: string;
  aspectRatio: '16:9' | '9:16';
  mediaQuery: string;
  expectedVideoSlot: string;
  expectedImageSlot: string;
  alt: string;
  subjectZoneDescription: string;
}

export const HERO_MEDIA_MANIFEST: {
  expectedSharedVideoSlot: string;
  desktop: HeroMediaSourceConfig;
  mobile: HeroMediaSourceConfig;
} = {
  expectedSharedVideoSlot: 'ravaq-hero.mp4',
  desktop: {
    id: 'asset-a-desktop-hero',
    label: 'Asset A — Desktop Cinematic Hero (16:9 Video / Image)',
    aspectRatio: '16:9',
    mediaQuery: '(min-width: 768px)',
    expectedVideoSlot: 'ravaq-hero-desktop.mp4',
    expectedImageSlot: 'ravaq-hero-desktop.jpg',
    alt: 'صحنه سینمایی بوتیک رواق؛ بانوی ایرانی در یک‌سوم راست قاب با جعبه هدیه زرشکی و عاجی رواق در میان طاق‌های معماری معاصر و قفسه‌های خشکبار، زعفران و صنایع‌دستی',
    subjectZoneDescription:
      'ترکیب‌بندی عریض ۱۶:۹ دسکتاپ: بانوی رواق با موهای فر طبیعی و جعبه هدیه زرشکی-عاجی در یک‌سوم راست، و فضای منفی آرام در سمت چپ برای تیتر و دکمه‌ها.',
  },
  mobile: {
    id: 'asset-b-mobile-hero',
    label: 'Asset B — Mobile Cinematic Hero (9:16 Video / Image)',
    aspectRatio: '9:16',
    mediaQuery: '(max-width: 767px)',
    expectedVideoSlot: 'ravaq-hero-mobile.mp4',
    expectedImageSlot: 'ravaq-hero-mobile.jpg',
    alt: 'صحنه عمودی موبایل بوتیک رواق؛ فضای امن تیتر در بالای قاب و بانوی رواق با جعبه هدیه در بخش پایینی در میان طاق معماری ایرانی',
    subjectZoneDescription:
      'ترکیب‌بندی عمودی ۹:۱۶ موبایل: فضای منفی آرام در بخش بالایی برای تیتر و دکمه‌ها بدون پوشاندن چهره یا جعبه هدیه در بخش میانی و پایینی.',
  },
};

export interface CategoryShowcaseItemConfig {
  slug: string;
  title: string;
  shortDescription: string;
  routePath: string;
  illustrationKey: string;
  imagePath: string;
  accentHex: string;
  kicker: string;
}

/**
 * Exact 6 categories in the order specified in Section 10 of the redesign specification.
 * Every imagePath references a verified, physically existing file in /public/assets/categories/.
 */
export const HOMEPAGE_CATEGORY_SHOWCASE: CategoryShowcaseItemConfig[] = [
  {
    slug: 'nuts-dried-fruits',
    title: 'آجیل و خشکبار',
    shortDescription: 'پسته، بادام، گردو، انجیر خشک و میوه‌های خشک دست‌چین در بسته‌بندی محافظ تازگی',
    routePath: '/category/nuts-dried-fruits',
    illustrationKey: 'nuts',
    imagePath: '/assets/products/pistachios-bowl.jpg',
    accentHex: '#742E3A',
    kicker: '۱۴ محصول منتخب',
  },
  {
    slug: 'traditional-sweets',
    title: 'شیرینی‌های سنتی',
    shortDescription: 'گز اصفهان، سوهان، باقلوا، قطاب و شیرینی‌های اصیل شهرهای ایران برای میز پذیرایی',
    routePath: '/category/traditional-sweets',
    illustrationKey: 'sweets',
    imagePath: '/assets/products/sweets-platter.jpg',
    accentHex: '#B89A62',
    kicker: '۱۲ محصول سنتی',
  },
  {
    slug: 'saffron-select-foods',
    title: 'زعفران و خوراکی‌های منتخب',
    shortDescription: 'زعفران خوش‌عطر، دمنوش‌های گیاهی منتخب و بسته‌های ترکیبی پذیرایی ایرانی',
    routePath: '/category/saffron-select-foods',
    illustrationKey: 'saffron',
    imagePath: '/assets/products/saffron-jar-ravaq.jpg',
    accentHex: '#742E3A',
    kicker: '۵ ترکیب معطر',
  },
  {
    slug: 'gift-boxes',
    title: 'جعبه‌های هدیه',
    shortDescription: 'جعبه‌های هدیه زرشکی و عاجی رواق با ترکیب خوراکی‌های اصیل و صنایع‌دستی ماندگار',
    routePath: '/gift-boxes',
    illustrationKey: 'giftbox',
    imagePath: '/assets/products/gift-box-signature.jpg',
    accentHex: '#4C202B',
    kicker: '۸ جعبه پیشکش',
  },
  {
    slug: 'iranian-handicrafts',
    title: 'صنایع‌دستی ایرانی',
    shortDescription: 'ظروف سفالی، کاسه‌های سرامیکی فیروزه‌ای، رانرهای پارچه‌ای و اشیای تزئینی معاصر',
    routePath: '/category/iranian-handicrafts',
    illustrationKey: 'crafts',
    imagePath: '/assets/products/handicrafts-trio.jpg',
    accentHex: '#2D8C88',
    kicker: '۵ اثر کاربردی',
  },
  {
    slug: 'occasion-gifts',
    title: 'هدیه‌های مناسبتی',
    shortDescription: 'پیشکش‌های ویژه نوروز، شب یلدا، مهمانی و دیدار و هدایای رسمی سازمانی',
    routePath: '/category/occasion-gifts',
    illustrationKey: 'occasion',
    imagePath: '/assets/products/nowruz-gift-box.jpg',
    accentHex: '#B89A62',
    kicker: '۴ مناسبت ایرانی',
  },
];

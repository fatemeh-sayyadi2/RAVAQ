import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, Gift } from 'lucide-react';
import { toPersianDigits } from '../../lib/persian.ts';

interface HeroContentProps {
  totalProductCount: number;
  onNavigate: (path: string) => void;
}

/**
 * HeroContent Component (Sections 4, 6, 7, 9)
 * - Renders the exact Persian copy as real HTML layered over the continuous boutique scene.
 * - Desktop: Positioned in the reserved calm negative-space area on the LEFT (md:mr-auto md:ml-0)
 *   while maintaining authentic Persian RTL text alignment (dir="rtl" text-right) so it never covers
 *   the character or gift box in the right third.
 * - Mobile: Positioned in the clean upper safe area so it never covers the face or gift box below.
 */
export const HeroContent: React.FC<HeroContentProps> = ({
  totalProductCount,
  onNavigate,
}) => {
  const prefersReducedMotion = useReducedMotion();

  const itemTransition = (delaySeconds: number) => ({
    duration: prefersReducedMotion ? 0 : 0.55,
    delay: prefersReducedMotion ? 0 : delaySeconds,
    ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
  });

  return (
    <div
      dir="rtl"
      className="relative z-20 w-full md:w-[54%] lg:w-[52%] md:mr-auto md:ml-0 text-right space-y-4 sm:space-y-5 text-[#F8F4EC] pointer-events-auto"
    >
      {/* Eyebrow (Section 7) */}
      <motion.div
        initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={itemTransition(0.08)}
        className="inline-flex items-center gap-2.5 text-[#EFE5D6]"
      >
        <span className="w-6 h-[1.5px] bg-[#B89A62]" aria-hidden="true" />
        <p className="ravaq-hero-eyebrow text-[#EFE5D6]">
          روایت تازه‌ای از زیبایی ایرانی
        </p>
      </motion.div>

      {/* Main Headline (Section 7) */}
      <motion.h1
        initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={itemTransition(0.16)}
        className="ravaq-hero-display text-[#F8F4EC] drop-shadow-xs"
      >
        هدیه‌ای از دلِ ایران
      </motion.h1>

      {/* Supporting Text (Section 7) */}
      <motion.p
        initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={itemTransition(0.24)}
        className="ravaq-hero-body text-[#EFE5D6]/95 max-w-[46ch]"
      >
        از طعم‌های اصیل تا هنرهای ماندگار؛ انتخاب‌هایی برای لحظه‌هایی که ارزش به‌یادماندن دارند.
      </motion.p>

      {/* Primary & Secondary CTAs (Section 7) */}
      <motion.div
        initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={itemTransition(0.32)}
        className="pt-2 flex flex-wrap items-center gap-3.5"
      >
        <button
          type="button"
          onClick={() => onNavigate('/shop')}
          className="inline-flex items-center justify-center gap-2.5 px-7 py-3.5 min-h-[46px] bg-[#742E3A] text-[#F8F4EC] border border-[#B89A62]/65 text-sm font-semibold rounded-lg hover:bg-[#4C202B] active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B89A62] transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer shadow-md"
        >
          <span>کشف محصولات</span>
          <ArrowLeft className="w-4 h-4" />
        </button>

        <button
          type="button"
          onClick={() => onNavigate('/gift-boxes')}
          className="inline-flex items-center justify-center gap-2 px-6 py-3.5 min-h-[46px] bg-[#F8F4EC]/12 backdrop-blur-xs text-[#F8F4EC] border border-[#F8F4EC]/40 text-sm font-semibold rounded-lg hover:bg-[#F8F4EC] hover:text-[#292624] active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#F8F4EC] transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Gift className="w-4 h-4 text-[#B89A62]" />
          <span>دیدن جعبه‌های هدیه</span>
        </button>
      </motion.div>

      {/* Quiet Unboxed Editorial Metadata (Zero-Pill Rule) */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={itemTransition(0.42)}
        className="pt-3 hidden sm:flex flex-wrap items-center gap-3 text-xs text-[#EFE5D6]/80"
      >
        <span className="tabular-nums">
          {toPersianDigits(totalProductCount)} محصول منتخب در کاتالوگ
        </span>
        <span aria-hidden="true" className="text-[#B89A62]">
          ·
        </span>
        <span>بسته‌بندی هدیه با نشان رَواق</span>
        <span aria-hidden="true" className="text-[#B89A62]">
          ·
        </span>
        <span>آجیل، شیرینی سنتی، زعفران و صنایع‌دستی</span>
      </motion.div>
    </div>
  );
};

import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowLeft } from 'lucide-react';
import { Category } from '../../lib/types.ts';
import { HOMEPAGE_CATEGORY_SHOWCASE } from '../../lib/design-tokens.ts';
import { ProductIllustration } from '../RavaqVisuals.tsx';

interface CategoryShowcaseProps {
  categories: Category[];
  onNavigate: (path: string) => void;
}

/**
 * CategoryShowcase Component (Sections 9, 10, 11)
 * - Immediately follows the 100svh hero section on the warm ivory (#F8F4EC) canvas.
 * - Renders the exact heading «از رواق چه می‌خواهید؟» and subheading «انتخاب‌هایی برای هر سلیقه و هر مناسبت».
 * - Displays the 6 curated categories in the exact required order with staggered scroll-reveal motion,
 *   consistent 4:3 aspect ratios, gentle desktop hover zoom, and real links to existing category routes.
 */
export const CategoryShowcase: React.FC<CategoryShowcaseProps> = ({
  categories,
  onNavigate,
}) => {
  const prefersReducedMotion = useReducedMotion();

  // Merge centralized showcase order with live category records from server/seed
  const orderedItems = HOMEPAGE_CATEGORY_SHOWCASE.map((item) => {
    const matched = categories.find((c) => c.slug === item.slug);
    return {
      ...item,
      title: matched?.name || item.title,
      shortDescription: matched?.shortDescription || item.shortDescription,
      illustrationKey: matched?.illustrationKey || item.illustrationKey,
    };
  });

  return (
    <section
      className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24"
      aria-labelledby="category-showcase-heading"
    >
      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: prefersReducedMotion ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10"
      >
        <div className="space-y-2">
          <h2
            id="category-showcase-heading"
            className="ravaq-section-title text-[#292624]"
          >
            از رواق چه می‌خواهید؟
          </h2>
          <p className="ravaq-section-subtitle text-[#77716A]">
            انتخاب‌هایی برای هر سلیقه و هر مناسبت
          </p>
        </div>

        <button
          type="button"
          onClick={() => onNavigate('/shop')}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#742E3A] hover:text-[#4C202B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#742E3A] rounded-md py-1 transition-colors self-start md:self-auto whitespace-nowrap shrink-0 cursor-pointer"
        >
          <span>مشاهده همه محصولات فروشگاه</span>
          <ArrowLeft className="w-4 h-4" />
        </button>
      </motion.div>

      {/* 6 Category Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-7">
        {orderedItems.map((cat, index) => (
          <motion.article
            key={cat.slug}
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.48,
              delay: prefersReducedMotion ? 0 : index * 0.06,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="group bg-[#FFFFFF] border border-[#E4DCCF] rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md flex flex-col"
          >
            <a
              href={cat.routePath}
              onClick={(e) => {
                e.preventDefault();
                onNavigate(cat.routePath);
              }}
              className="flex flex-col h-full focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#742E3A]"
            >
              {/* Consistent 4:3 Media Container with Gentle Desktop Hover Zoom */}
              <div className="aspect-[4/3] w-full overflow-hidden bg-[#F8F4EC] border-b border-[#E4DCCF] relative">
                <div className="w-full h-full transition-transform duration-500 ease-out group-hover:scale-[1.03]">
                  <ProductIllustration
                    illustrationKey={cat.illustrationKey}
                    role="primary"
                    title={cat.title}
                    imageUrl={cat.imagePath}
                  />
                </div>
              </div>

              {/* Card Text & Affordance */}
              <div className="p-5 sm:p-6 flex-1 flex flex-col justify-between gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-[#77716A]">
                    <span>{cat.kicker}</span>
                  </div>
                  <h3 className="ravaq-card-title text-[#292624] group-hover:text-[#742E3A] transition-colors">
                    {cat.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#77716A] leading-relaxed">
                    {cat.shortDescription}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#E4DCCF]/60 flex items-center justify-between text-xs font-semibold text-[#742E3A]">
                  <span>ورود به مجموعه {cat.title}</span>
                  <ArrowLeft className="w-4 h-4 transition-transform duration-200 group-hover:-translate-x-1" />
                </div>
              </div>
            </a>
          </motion.article>
        ))}
      </div>
    </section>
  );
};

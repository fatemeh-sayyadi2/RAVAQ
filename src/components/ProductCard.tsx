import React, { useState } from 'react';
import { ShoppingBag, Check } from 'lucide-react';
import { Product, ReviewRecord } from '../lib/types.ts';
import { formatToman, toPersianDigits } from '../lib/persian.ts';
import { ProductIllustration } from './RavaqVisuals.tsx';

interface ProductCardProps {
  product: Product & {
    variants: Array<Product['variants'][number] & { effectiveStock?: number }>;
  };
  reviews?: ReviewRecord[];
  onNavigate: (path: string) => void;
  onAddToCart: (productId: string, variantId: string, quantity: number) => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  reviews = [],
  onNavigate,
  onAddToCart,
}) => {
  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    product.variants[0]?.id || ''
  );
  const [addedFeedback, setAddedFeedback] = useState(false);

  const activeVariant =
    product.variants.find((v) => v.id === selectedVariantId) || product.variants[0];

  const availableStock =
    activeVariant?.effectiveStock !== undefined
      ? activeVariant.effectiveStock
      : activeVariant?.stock ?? 0;

  const isAvailable = availableStock > 0;

  const productReviews = reviews.filter((r) => r.productId === product.id);
  const avgRating =
    productReviews.length > 0
      ? (
          productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length
        ).toFixed(1)
      : null;

  const detailRoute =
    product.categorySlug === 'gift-boxes'
      ? `/gift-boxes/${product.slug}`
      : `/product/${product.slug}`;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeVariant || !isAvailable) return;
    onAddToCart(product.id, activeVariant.id, 1);
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1400);
  };

  return (
    <article className="group bg-[#FFFFFF] border border-[#E4DCCF] rounded-xl overflow-hidden flex flex-col transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md">
      {/* 4:3 Image Container */}
      <div
        onClick={() => onNavigate(detailRoute)}
        className="relative aspect-[4/3] w-full overflow-hidden bg-[#F8F4EC] cursor-pointer border-b border-[#E4DCCF]"
      >
        <div className="w-full h-full transition-transform duration-300 group-hover:scale-[1.03]">
          <ProductIllustration
            illustrationKey={product.images[0]?.illustrationKey || 'nuts'}
            role="primary"
            title={product.name}
            imageUrl={product.images[0]?.url}
          />
        </div>
      </div>

      {/* Card Body */}
      <div className="p-5 flex-1 flex flex-col justify-between gap-4">
        <div>
          {/* Clean Unboxed Metadata (Zero-Pill Discipline) */}
          <div className="flex items-center gap-2 text-xs text-[#77716A] mb-1.5">
            <span>{product.categoryName}</span>
            <span aria-hidden="true">·</span>
            <span>
              {isAvailable
                ? `موجود (${toPersianDigits(availableStock)} عدد)`
                : 'ناموجود'}
            </span>
            {avgRating && (
              <>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums text-[#292624]">
                  امتیاز {toPersianDigits(avgRating)} ({toPersianDigits(productReviews.length)} دیدگاه)
                </span>
              </>
            )}
          </div>

          <h3
            onClick={() => onNavigate(detailRoute)}
            className="text-base font-bold text-[#292624] hover:text-[#742E3A] transition-colors cursor-pointer leading-snug mb-1.5"
          >
            {product.name}
          </h3>

          <p className="text-xs text-[#77716A] leading-relaxed line-clamp-2">
            {product.shortDescription}
          </p>
        </div>

        <div className="space-y-3 pt-2 border-t border-[#E4DCCF]/70">
          {/* Interactive Variant Selector */}
          {product.variants.length > 1 && (
            <div
              className="flex flex-wrap items-center gap-1.5"
              role="group"
              aria-label={`انتخاب وزن یا بسته برای ${product.name}`}
            >
              {product.variants.map((variant) => {
                const isSelected = variant.id === activeVariant?.id;
                return (
                  <button
                    key={variant.id}
                    type="button"
                    onClick={() => setSelectedVariantId(variant.id)}
                    className={`px-2.5 py-1 text-xs rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isSelected
                        ? 'bg-[#292624] text-[#F8F4EC] font-medium'
                        : 'bg-[#F8F4EC] text-[#77716A] hover:text-[#292624] border border-[#E4DCCF]'
                    }`}
                  >
                    {variant.label}
                  </button>
                );
              })}
            </div>
          )}

          {/* Price & Add to Cart Row */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="flex flex-col">
              {activeVariant?.compareAtPrice &&
                activeVariant.compareAtPrice > activeVariant.price && (
                  <span className="text-xs text-[#77716A] line-through tabular-nums">
                    {formatToman(activeVariant.compareAtPrice)}
                  </span>
                )}
              <span className="text-base font-bold text-[#292624] tabular-nums">
                {formatToman(activeVariant?.price || product.basePrice)}
              </span>
            </div>

            <button
              type="button"
              disabled={!isAvailable}
              onClick={handleAdd}
              className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#742E3A] ${
                !isAvailable
                  ? 'bg-[#EFE5D6] text-[#77716A] cursor-not-allowed'
                  : addedFeedback
                  ? 'bg-[#2D8C88] text-[#FFFFFF]'
                  : 'bg-[#742E3A] text-[#F8F4EC] hover:bg-[#4C202B]'
              }`}
            >
              {addedFeedback ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>افزوده شد</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>{isAvailable ? 'افزودن به سبد' : 'ناموجود'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};

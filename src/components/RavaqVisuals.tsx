import React, { useState } from 'react';
import { ImageRole } from '../lib/types.ts';
import { resolveVerifiedCategoryAsset } from '../lib/seed-catalog.ts';

export interface LogoProps {
  variant?: 'dark' | 'light' | 'monochrome-dark' | 'monochrome-light';
  layout?: 'horizontal' | 'bilingual' | 'persian' | 'latin' | 'compact' | 'emblem';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Original Custom Vector Bilingual Identity System for RAVĀQ | رواق
 * - 100% pure vector outlines — zero dependence on system or web fonts.
 * - Sculpted Persian wordmark «رواق» (ر · و · ا · ق) with balanced negative space and two diamond dots on ق.
 * - Custom Latin wordmark «RAVĀQ» with macron above Ā and sculpted Q tail.
 * - Original Iranian architectural portico symbol («طاق و رواق») scalable down to 16×16px favicon.
 * - Supports multi-color dark/light and one-color monochrome-dark (#292624) / monochrome-light (#F8F4EC) on transparent backgrounds.
 */
export const RavaqLogo: React.FC<LogoProps> = ({
  variant = 'dark',
  layout = 'horizontal',
  size = 'md',
  className = '',
}) => {
  const isMonoDark = variant === 'monochrome-dark';
  const isMonoLight = variant === 'monochrome-light';
  const isLight = variant === 'light' || isMonoLight;

  const persianFill = isMonoDark
    ? '#292624'
    : isMonoLight
    ? '#F8F4EC'
    : isLight
    ? '#F8F4EC'
    : '#292624';

  const latinFill = isMonoDark
    ? '#292624'
    : isMonoLight
    ? '#F8F4EC'
    : isLight
    ? '#EFE5D6'
    : '#742E3A';

  const outerArchFill = isMonoDark
    ? '#292624'
    : isMonoLight
    ? '#F8F4EC'
    : isLight
    ? '#F8F4EC'
    : '#742E3A';

  const innerArchFill = isMonoDark
    ? '#292624'
    : isMonoLight
    ? '#F8F4EC'
    : '#B89A62';

  const turquoiseDotFill = isMonoDark
    ? '#292624'
    : isMonoLight
    ? '#F8F4EC'
    : '#2D8C88';

  const goldDotFill = isMonoDark
    ? '#292624'
    : isMonoLight
    ? '#F8F4EC'
    : '#B89A62';

  const dividerStroke = isMonoDark
    ? '#292624'
    : isMonoLight
    ? '#F8F4EC'
    : '#B89A62';

  // 1. Standalone Architectural Portico Symbol (emblem)
  if (layout === 'emblem') {
    const emblemSizeClass =
      size === 'lg' ? 'w-14 h-14' : size === 'sm' ? 'w-8 h-8' : 'w-11 h-11';
    return (
      <svg
        viewBox="0 0 64 64"
        fill="none"
        className={`shrink-0 select-none ${emblemSizeClass} ${className}`}
        role="img"
        aria-label="نشان معماری رواق | RAVĀQ"
      >
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M10 56V28C10 15.297 20.297 5 33 5H31C43.703 5 54 15.297 54 28V56H47.5V28.5C47.5 18.835 39.665 11 30 11H34C24.335 11 16.5 18.835 16.5 28.5V56H10Z"
          fill={outerArchFill}
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M21.5 56V31.5C21.5 24.596 26.649 19 32 19C37.351 19 42.5 24.596 42.5 31.5V56H37.5V32C37.5 27.582 35.038 24 32 24C28.962 24 26.5 27.582 26.5 32V56H21.5Z"
          fill={innerArchFill}
        />
        <path d="M32 11.8L35.2 15L32 18.2L28.8 15L32 11.8Z" fill={turquoiseDotFill} />
        <rect x="6" y="55" width="52" height="2.5" rx="1.25" fill={outerArchFill} />
      </svg>
    );
  }

  // 2. Standalone Persian Wordmark (رواق)
  if (layout === 'persian') {
    const persianSizeClass =
      size === 'lg' ? 'h-14' : size === 'sm' ? 'h-8' : 'h-10';
    return (
      <svg
        viewBox="0 0 220 84"
        fill="none"
        className={`w-auto shrink-0 select-none ${persianSizeClass} ${className}`}
        role="img"
        aria-label="رواق"
      >
        <g fill={persianFill}>
          <path d="M196.5 23.5L204 28.2C204.2 38.5 201.4 47.4 194.2 54.4C186.8 61.5 176.5 65.8 164.5 67.2L163.2 63.8C172.8 61.2 181.2 56.8 187.4 50.2C193.2 44.1 196.2 35.6 196.5 23.5Z" />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M149.5 22.5C157.2 22.5 162.5 28.2 162.5 36.8C162.5 46.2 158.4 53.8 150.2 59.8C142.4 65.5 131.8 67.8 119.5 67.2L118.8 63.8C128.8 63.2 137.5 59.8 144.2 54.2C149.4 49.8 152.8 44.8 153.8 39.2C151.6 40.8 148.8 41.6 145.6 41.6C138.8 41.6 134.2 37.2 134.2 31.4C134.2 25.8 139.8 22.5 149.5 22.5ZM148.2 28.2C143.6 28.2 141.2 29.8 141.2 32.2C141.2 34.6 143.6 36.2 147.4 36.2C151.2 36.2 154.2 34.4 154.2 31.8C154.2 29.5 151.8 28.2 148.2 28.2Z"
          />
          <path d="M113 10.5L104.2 15.2V48.5C104.2 51.2 105.8 52.8 108.6 52.8H113V10.5Z" />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M80.5 22.5C88.2 22.5 93.2 27.8 93.2 36.2V46.8C93.2 60.8 79.4 70.5 54.5 70.5C31.2 70.5 16.5 61.2 16.5 46.5C16.5 40.8 18.4 35.6 22.2 31.2L25.8 33.4C23.6 37.2 22.8 41.2 23.2 45.2C24.2 55.8 36.6 62.5 55.2 62.5C74.2 62.5 85.2 55.4 85.2 44.6V39.2C82.8 40.8 79.8 41.6 76.5 41.6C69.8 41.6 65.2 37.2 65.2 31.4C65.2 25.8 70.8 22.5 80.5 22.5ZM79.2 28.2C74.6 28.2 72.2 29.8 72.2 32.2C72.2 34.6 74.6 36.2 78.4 36.2C82.2 36.2 85.2 34.4 85.2 31.8C85.2 29.5 82.8 28.2 79.2 28.2Z"
          />
        </g>
        <path d="M73.5 7.5L79 13L73.5 18.5L68 13L73.5 7.5Z" fill={turquoiseDotFill} />
        <path d="M86.5 7.5L92 13L86.5 18.5L81 13L86.5 7.5Z" fill={goldDotFill} />
      </svg>
    );
  }

  // 3. Standalone Latin Wordmark (RAVĀQ)
  if (layout === 'latin') {
    const latinSizeClass =
      size === 'lg' ? 'h-10' : size === 'sm' ? 'h-5' : 'h-7';
    return (
      <svg
        viewBox="0 0 280 64"
        fill="none"
        className={`w-auto shrink-0 select-none ${latinSizeClass} ${className}`}
        role="img"
        aria-label="RAVĀQ"
      >
        <g fill={latinFill}>
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M18 14H34.5C43.2 14 48.5 18.2 48.5 24.8C48.5 29.8 45.1 33.5 39.4 34.8L51.2 50H43.8L32.8 35.5H24.2V50H18V14ZM24.2 19.2V30.4H33.8C39.2 30.4 42.2 28.2 42.2 24.8C42.2 21.4 39.2 19.2 33.8 19.2H24.2Z"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M81.5 14H86.8L102.8 50H96.2L92.2 40.6H75.8L71.8 50H65.5L81.5 14ZM84 21.4L77.9 35.6H90.1L84 21.4Z"
          />
          <path d="M114.5 14H121.2L134.2 42.8L147.2 14H153.6L136.8 50H131.5L114.5 14Z" />
          <rect x="173" y="6.5" width="22" height="3.8" rx="1.2" fill={goldDotFill} />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M181.5 14H186.8L202.8 50H196.2L192.2 40.6H175.8L171.8 50H165.5L181.5 14ZM184 21.4L177.9 35.6H190.1L184 21.4Z"
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M237.5 13.5C249.4 13.5 258 21.2 258 32C258 39.2 254.1 45.1 247.8 48.1C252.2 51.6 257.4 53.5 263.5 53.8L262.4 58.2C254.2 57.6 247.2 54.6 241.6 49.9C240.3 50.2 238.9 50.5 237.5 50.5C225.6 50.5 217 42.8 217 32C217 21.2 225.6 13.5 237.5 13.5ZM237.5 19C229.2 19 223.5 24.4 223.5 32C223.5 39.6 229.2 45 237.5 45C245.8 45 251.5 39.6 251.5 32C251.5 24.4 245.8 19 237.5 19Z"
          />
        </g>
      </svg>
    );
  }

  // 4. Compact Lockup (Symbol + Persian Wordmark رواق)
  if (layout === 'compact') {
    const compactSizeClass =
      size === 'lg' ? 'h-12' : size === 'sm' ? 'h-8' : 'h-10';
    return (
      <svg
        viewBox="0 0 276 96"
        fill="none"
        className={`w-auto shrink-0 select-none ${compactSizeClass} ${className}`}
        role="img"
        aria-label="رواق | RAVĀQ"
      >
        <g transform="translate(204, 14)">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10 56V28C10 15.297 20.297 5 33 5H31C43.703 5 54 15.297 54 28V56H47.5V28.5C47.5 18.835 39.665 11 30 11H34C24.335 11 16.5 18.835 16.5 28.5V56H10Z"
            fill={outerArchFill}
          />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M21.5 56V31.5C21.5 24.596 26.649 19 32 19C37.351 19 42.5 24.596 42.5 31.5V56H37.5V32C37.5 27.582 35.038 24 32 24C28.962 24 26.5 27.582 26.5 32V56H21.5Z"
            fill={innerArchFill}
          />
          <path d="M32 11.8L35.2 15L32 18.2L28.8 15L32 11.8Z" fill={turquoiseDotFill} />
          <rect x="6" y="55" width="52" height="2.5" rx="1.25" fill={outerArchFill} />
        </g>
        <g transform="translate(0, 8)">
          <g fill={persianFill}>
            <path d="M196.5 23.5L204 28.2C204.2 38.5 201.4 47.4 194.2 54.4C186.8 61.5 176.5 65.8 164.5 67.2L163.2 63.8C172.8 61.2 181.2 56.8 187.4 50.2C193.2 44.1 196.2 35.6 196.5 23.5Z" />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M149.5 22.5C157.2 22.5 162.5 28.2 162.5 36.8C162.5 46.2 158.4 53.8 150.2 59.8C142.4 65.5 131.8 67.8 119.5 67.2L118.8 63.8C128.8 63.2 137.5 59.8 144.2 54.2C149.4 49.8 152.8 44.8 153.8 39.2C151.6 40.8 148.8 41.6 145.6 41.6C138.8 41.6 134.2 37.2 134.2 31.4C134.2 25.8 139.8 22.5 149.5 22.5ZM148.2 28.2C143.6 28.2 141.2 29.8 141.2 32.2C141.2 34.6 143.6 36.2 147.4 36.2C151.2 36.2 154.2 34.4 154.2 31.8C154.2 29.5 151.8 28.2 148.2 28.2Z"
            />
            <path d="M113 10.5L104.2 15.2V48.5C104.2 51.2 105.8 52.8 108.6 52.8H113V10.5Z" />
            <path
              fillRule="evenodd"
              clipRule="evenodd"
              d="M80.5 22.5C88.2 22.5 93.2 27.8 93.2 36.2V46.8C93.2 60.8 79.4 70.5 54.5 70.5C31.2 70.5 16.5 61.2 16.5 46.5C16.5 40.8 18.4 35.6 22.2 31.2L25.8 33.4C23.6 37.2 22.8 41.2 23.2 45.2C24.2 55.8 36.6 62.5 55.2 62.5C74.2 62.5 85.2 55.4 85.2 44.6V39.2C82.8 40.8 79.8 41.6 76.5 41.6C69.8 41.6 65.2 37.2 65.2 31.4C65.2 25.8 70.8 22.5 80.5 22.5ZM79.2 28.2C74.6 28.2 72.2 29.8 72.2 32.2C72.2 34.6 74.6 36.2 78.4 36.2C82.2 36.2 85.2 34.4 85.2 31.8C85.2 29.5 82.8 28.2 79.2 28.2Z"
            />
          </g>
          <path d="M73.5 7.5L79 13L73.5 18.5L68 13L73.5 7.5Z" fill={turquoiseDotFill} />
          <path d="M86.5 7.5L92 13L86.5 18.5L81 13L86.5 7.5Z" fill={goldDotFill} />
        </g>
      </svg>
    );
  }

  // 5. Primary Bilingual Logo Lockup ('horizontal' | 'bilingual')
  // Right: Architectural Portico Symbol | Center: Persian Wordmark رواق | Left: Vector Latin Wordmark RAVĀQ
  const bilingualSizeClass =
    size === 'lg'
      ? 'h-12 sm:h-14 md:h-16'
      : size === 'sm'
      ? 'h-8 sm:h-9'
      : 'h-10 sm:h-11 md:h-12';

  return (
    <svg
      viewBox="0 0 420 96"
      fill="none"
      className={`w-auto shrink-0 select-none ${bilingualSizeClass} ${className}`}
      role="img"
      aria-label="رواق | RAVĀQ"
    >
      {/* 1. Right Architectural Portico Symbol (طاق و رواق) */}
      <g transform="translate(344, 14)">
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M10 56V28C10 15.297 20.297 5 33 5H31C43.703 5 54 15.297 54 28V56H47.5V28.5C47.5 18.835 39.665 11 30 11H34C24.335 11 16.5 18.835 16.5 28.5V56H10Z"
          fill={outerArchFill}
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M21.5 56V31.5C21.5 24.596 26.649 19 32 19C37.351 19 42.5 24.596 42.5 31.5V56H37.5V32C37.5 27.582 35.038 24 32 24C28.962 24 26.5 27.582 26.5 32V56H21.5Z"
          fill={innerArchFill}
        />
        <path d="M32 11.8L35.2 15L32 18.2L28.8 15L32 11.8Z" fill={turquoiseDotFill} />
        <rect x="6" y="55" width="52" height="2.5" rx="1.25" fill={outerArchFill} />
      </g>

      {/* 2. Center Custom Sculpted Persian Wordmark: رواق */}
      <g transform="translate(142, 8)">
        <g fill={persianFill}>
          <path d="M196.5 23.5L204 28.2C204.2 38.5 201.4 47.4 194.2 54.4C186.8 61.5 176.5 65.8 164.5 67.2L163.2 63.8C172.8 61.2 181.2 56.8 187.4 50.2C193.2 44.1 196.2 35.6 196.5 23.5Z" />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M149.5 22.5C157.2 22.5 162.5 28.2 162.5 36.8C162.5 46.2 158.4 53.8 150.2 59.8C142.4 65.5 131.8 67.8 119.5 67.2L118.8 63.8C128.8 63.2 137.5 59.8 144.2 54.2C149.4 49.8 152.8 44.8 153.8 39.2C151.6 40.8 148.8 41.6 145.6 41.6C138.8 41.6 134.2 37.2 134.2 31.4C134.2 25.8 139.8 22.5 149.5 22.5ZM148.2 28.2C143.6 28.2 141.2 29.8 141.2 32.2C141.2 34.6 143.6 36.2 147.4 36.2C151.2 36.2 154.2 34.4 154.2 31.8C154.2 29.5 151.8 28.2 148.2 28.2Z"
          />
          <path d="M113 10.5L104.2 15.2V48.5C104.2 51.2 105.8 52.8 108.6 52.8H113V10.5Z" />
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M80.5 22.5C88.2 22.5 93.2 27.8 93.2 36.2V46.8C93.2 60.8 79.4 70.5 54.5 70.5C31.2 70.5 16.5 61.2 16.5 46.5C16.5 40.8 18.4 35.6 22.2 31.2L25.8 33.4C23.6 37.2 22.8 41.2 23.2 45.2C24.2 55.8 36.6 62.5 55.2 62.5C74.2 62.5 85.2 55.4 85.2 44.6V39.2C82.8 40.8 79.8 41.6 76.5 41.6C69.8 41.6 65.2 37.2 65.2 31.4C65.2 25.8 70.8 22.5 80.5 22.5ZM79.2 28.2C74.6 28.2 72.2 29.8 72.2 32.2C72.2 34.6 74.6 36.2 78.4 36.2C82.2 36.2 85.2 34.4 85.2 31.8C85.2 29.5 82.8 28.2 79.2 28.2Z"
          />
        </g>
        <path d="M73.5 7.5L79 13L73.5 18.5L68 13L73.5 7.5Z" fill={turquoiseDotFill} />
        <path d="M86.5 7.5L92 13L86.5 18.5L81 13L86.5 7.5Z" fill={goldDotFill} />
      </g>

      {/* 3. Vertical Architectural Divider */}
      <line
        x1="142"
        y1="24"
        x2="142"
        y2="70"
        stroke={dividerStroke}
        strokeOpacity={isMonoDark || isMonoLight ? '0.85' : '0.55'}
        strokeWidth="1.5"
      />

      {/* 4. Left Custom Vector Latin Wordmark: RAVĀQ */}
      <g transform="translate(8, 25) scale(0.46)" fill={latinFill}>
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M18 14H34.5C43.2 14 48.5 18.2 48.5 24.8C48.5 29.8 45.1 33.5 39.4 34.8L51.2 50H43.8L32.8 35.5H24.2V50H18V14ZM24.2 19.2V30.4H33.8C39.2 30.4 42.2 28.2 42.2 24.8C42.2 21.4 39.2 19.2 33.8 19.2H24.2Z"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M81.5 14H86.8L102.8 50H96.2L92.2 40.6H75.8L71.8 50H65.5L81.5 14ZM84 21.4L77.9 35.6H90.1L84 21.4Z"
        />
        <path d="M114.5 14H121.2L134.2 42.8L147.2 14H153.6L136.8 50H131.5L114.5 14Z" />
        <rect x="173" y="6.5" width="22" height="3.8" rx="1.2" fill={goldDotFill} />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M181.5 14H186.8L202.8 50H196.2L192.2 40.6H175.8L171.8 50H165.5L181.5 14ZM184 21.4L177.9 35.6H190.1L184 21.4Z"
        />
        <path
          fillRule="evenodd"
          clipRule="evenodd"
          d="M237.5 13.5C249.4 13.5 258 21.2 258 32C258 39.2 254.1 45.1 247.8 48.1C252.2 51.6 257.4 53.5 263.5 53.8L262.4 58.2C254.2 57.6 247.2 54.6 241.6 49.9C240.3 50.2 238.9 50.5 237.5 50.5C225.6 50.5 217 42.8 217 32C217 21.2 225.6 13.5 237.5 13.5ZM237.5 19C229.2 19 223.5 24.4 223.5 32C223.5 39.6 229.2 45 237.5 45C245.8 45 251.5 39.6 251.5 32C251.5 24.4 245.8 19 237.5 19Z"
        />
      </g>
    </svg>
  );
};

/**
 * 3D-Shaded Perspective RAVĀQ Luxury Gift Box with Real Overlaid Brand Identity
 */
export const RavaqLuxuryGiftBox3D: React.FC<{
  className?: string;
  size?: 'md' | 'lg';
}> = ({ className = '', size = 'lg' }) => {
  const [useFallbackPhoto, setUseFallbackPhoto] = useState(false);

  return (
    <div
      className={`relative select-none ${
        size === 'lg' ? 'w-[280px] sm:w-[320px]' : 'w-[220px]'
      } ${className}`}
    >
      <div className="relative rounded-xl overflow-hidden border border-[#B89A62]/45 shadow-2xl bg-[#F8F4EC]">
        <img
          src={
            useFallbackPhoto
              ? '/assets/products/gift-box-plain.jpg'
              : '/assets/products/gift-box-signature.jpg'
          }
          alt="جعبه هدیه زرشکی و عاجی رواق با روبان ابریشمی"
          className="w-full h-auto object-cover"
          onError={() => {
            if (!useFallbackPhoto) {
              setUseFallbackPhoto(true);
            }
          }}
        />
      </div>
    </div>
  );
};

interface ProductIllustrationProps {
  illustrationKey: string;
  role?: ImageRole;
  title?: string;
  imageUrl?: string;
  className?: string;
}

/**
 * Commercial Studio Still-Life & Packaging Renderer for Category Cards, Product Cards, and Galleries.
 * Always renders verified real product photography in /assets/products/*.jpg without overlaid text or cartoon SVGs.
 */
function resolveVerifiedAssetForKey(illustrationKey: string, role: ImageRole = 'primary'): string {
  return resolveVerifiedCategoryAsset(illustrationKey, role);
}

export const ProductIllustration: React.FC<ProductIllustrationProps> = ({
  illustrationKey,
  role = 'primary',
  title = '',
  imageUrl,
  className = '',
}) => {
  const [imgFailed, setImgFailed] = useState(false);

  React.useEffect(() => {
    setImgFailed(false);
  }, [imageUrl, illustrationKey, role]);

  const canonicalFallbackUrl = resolveVerifiedAssetForKey(illustrationKey, role);

  const isLegacyOrStaleUrl =
    !imageUrl ||
    imageUrl.startsWith('/assets/ravaq/') ||
    imageUrl.startsWith('/assets/categories/') ||
    imageUrl.endsWith('.svg') ||
    imageUrl.endsWith('.webp');

  const effectiveImageUrl =
    !imgFailed && !isLegacyOrStaleUrl ? imageUrl : canonicalFallbackUrl;

  return (
    <div
      className={`relative w-full h-full bg-[#F8F4EC] overflow-hidden flex items-center justify-center select-none ${className}`}
    >
      <img
        src={effectiveImageUrl}
        alt={title || 'تصویر محصول رواق'}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={(e) => {
          if (!imgFailed) {
            setImgFailed(true);
          } else {
            const target = e.currentTarget;
            if (!target.src.endsWith('/assets/products/pistachios-bowl.jpg')) {
              target.src = '/assets/products/pistachios-bowl.jpg';
            }
          }
        }}
        className="w-full h-full object-cover"
      />
    </div>
  );
};


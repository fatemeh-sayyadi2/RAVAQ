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
  const [photoError, setPhotoError] = useState(false);

  return (
    <div
      className={`relative select-none ${
        size === 'lg' ? 'w-[280px] sm:w-[320px]' : 'w-[220px]'
      } ${className}`}
    >
      {!photoError ? (
        <div className="relative rounded-xl overflow-hidden border border-[#B89A62]/45 shadow-2xl bg-[#292624]">
          <img
            src="/assets/products/gift-box-signature.jpg"
            alt="جعبه هدیه زرشکی و عاجی رواق با روبان ابریشمی و پلاک طلایی"
            className="w-full h-auto object-cover"
            onError={() => setPhotoError(true)}
          />
          <div className="absolute bottom-2.5 inset-x-2.5 bg-[#F8F4EC]/95 backdrop-blur-xs border border-[#B89A62]/60 rounded-lg px-3 py-1.5 flex items-center justify-center shadow-md">
            <RavaqLogo variant="dark" layout="bilingual" size="sm" />
          </div>
        </div>
      ) : (
        <>
          <svg
            viewBox="0 0 360 260"
            fill="none"
            className="w-full h-auto drop-shadow-2xl"
            role="img"
            aria-label="جعبه هدیه زرشکی و عاجی رواق با روبان ابریشمی و پلاک طلایی"
          >
            <defs>
              <linearGradient id="boxFrontBurgundy" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#863644" />
                <stop offset="45%" stopColor="#742E3A" />
                <stop offset="100%" stopColor="#461C26" />
              </linearGradient>
              <linearGradient id="boxSideBurgundy" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#58232E" />
                <stop offset="100%" stopColor="#35141C" />
              </linearGradient>
              <linearGradient id="lidTopIvory" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FBF9F5" />
                <stop offset="60%" stopColor="#F8F4EC" />
                <stop offset="100%" stopColor="#E4DCCF" />
              </linearGradient>
              <linearGradient id="lidRimIvory" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#F8F4EC" />
                <stop offset="70%" stopColor="#EFE5D6" />
                <stop offset="100%" stopColor="#D5C8B4" />
              </linearGradient>
              <linearGradient id="antiqueGoldFoil" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#D6BC88" />
                <stop offset="50%" stopColor="#B89A62" />
                <stop offset="100%" stopColor="#8E723E" />
              </linearGradient>
              <radialGradient id="floorShadow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#14080B" stopOpacity="0.72" />
                <stop offset="65%" stopColor="#14080B" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#14080B" stopOpacity="0" />
              </radialGradient>
            </defs>

            <ellipse cx="180" cy="232" rx="155" ry="22" fill="url(#floorShadow)" />
            <polygon
              points="38,96 226,120 226,226 38,196"
              fill="url(#boxFrontBurgundy)"
              stroke="#B89A62"
              strokeOpacity="0.45"
              strokeWidth="1"
            />
            <polygon
              points="226,120 326,88 326,190 226,226"
              fill="url(#boxSideBurgundy)"
              stroke="#B89A62"
              strokeOpacity="0.35"
              strokeWidth="1"
            />
            <polygon points="38,94 226,118 226,125 38,101" fill="url(#antiqueGoldFoil)" />
            <polygon points="226,118 326,86 326,93 226,125" fill="#8E723E" />
            <polygon
              points="32,64 142,36 332,56 226,88"
              fill="url(#lidTopIvory)"
              stroke="#B89A62"
              strokeOpacity="0.55"
              strokeWidth="1.2"
            />
            <polygon
              points="56,63 144,41 306,58 220,83"
              fill="none"
              stroke="#B89A62"
              strokeOpacity="0.45"
              strokeWidth="1"
            />
            <polygon
              points="32,64 226,88 226,118 32,93"
              fill="url(#lidRimIvory)"
              stroke="#B89A62"
              strokeOpacity="0.5"
              strokeWidth="1"
            />
            <polygon
              points="226,88 332,56 332,85 226,118"
              fill="#DFD3C0"
              stroke="#B89A62"
              strokeOpacity="0.4"
              strokeWidth="1"
            />
            <polygon points="118,42 142,37 250,81 226,88" fill="#742E3A" opacity="0.95" />
            <polygon points="116,75 142,78 142,212 116,208" fill="url(#antiqueGoldFoil)" opacity="0.92" />
            <polygon points="268,75 286,70 286,203 268,209" fill="#8E723E" opacity="0.75" />
            <path
              d="M178 60C146 38 118 52 138 66C150 74 168 65 178 60Z"
              fill="#742E3A"
              stroke="#B89A62"
              strokeWidth="1.2"
            />
            <path
              d="M178 60C210 38 238 52 218 66C206 74 188 65 178 60Z"
              fill="#5E232E"
              stroke="#B89A62"
              strokeWidth="1.2"
            />
            <circle cx="178" cy="60" r="6" fill="url(#antiqueGoldFoil)" />
            <circle cx="178" cy="60" r="2.5" fill="#2D8C88" />
          </svg>

          <div
            className="absolute left-[18%] top-[51%] w-[42%] -rotate-[-7deg] bg-[#F8F4EC] border border-[#B89A62] rounded-md px-2.5 py-1.5 shadow-md flex flex-col items-center justify-center"
            style={{ transform: 'perspective(500px) rotateY(12deg) rotateZ(7deg)' }}
          >
            <div className="w-full border border-[#E4DCCF] rounded-xs py-1 px-1.5 flex flex-col items-center">
              <RavaqLogo variant="dark" layout="compact" size="sm" />
            </div>
          </div>
        </>
      )}
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
 * Prioritizes verified real product photography in /assets/products/*.jpg.
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
  const baseKey = illustrationKey.replace(/-(detail|packaging|lifestyle)$/, '');

  const isLegacyPlaceholderUrl =
    !imageUrl ||
    imageUrl.startsWith('/assets/ravaq/') ||
    imageUrl.endsWith('.svg');

  const effectiveImageUrl = !isLegacyPlaceholderUrl
    ? imageUrl
    : resolveVerifiedAssetForKey(illustrationKey, role);

  const showRealPhoto = Boolean(effectiveImageUrl) && !imgFailed;

  // Determine material palette by product family
  const isGiftOrOccasion =
    baseKey.startsWith('gift') || baseKey === 'giftbox' || baseKey === 'occasion';
  const isSaffronFamily =
    baseKey.includes('saffron') ||
    baseKey.includes('herbal') ||
    baseKey.includes('pantry') ||
    baseKey.includes('hospitality-pack');
  const isCraftFamily =
    baseKey === 'crafts' ||
    baseKey === 'pottery' ||
    baseKey === 'ceramic-bowl' ||
    baseKey === 'runner' ||
    baseKey === 'arch-decor' ||
    baseKey === 'craft-set';
  const isSweetFamily =
    baseKey === 'sweets' ||
    baseKey === 'gaz' ||
    baseKey === 'sohan' ||
    baseKey === 'baklava' ||
    baseKey === 'nan-berenji' ||
    baseKey === 'nokhodchi' ||
    baseKey === 'qottab' ||
    baseKey === 'kolompeh' ||
    baseKey === 'koloocheh' ||
    baseKey === 'baslogh' ||
    baseKey === 'poolaki' ||
    baseKey === 'masghati' ||
    baseKey === 'sweet-assortment';

  const primaryVesselColor = isGiftOrOccasion
    ? '#742E3A'
    : isSaffronFamily
    ? '#8B232D'
    : isCraftFamily
    ? '#2D8C88'
    : isSweetFamily
    ? '#B89A62'
    : '#5C3D2E';

  const secondaryTone = isGiftOrOccasion
    ? '#4C202B'
    : isSaffronFamily
    ? '#4C202B'
    : isCraftFamily
    ? '#1F6360'
    : isSweetFamily
    ? '#8E723E'
    : '#3F291F';

  const familyKicker = isGiftOrOccasion
    ? 'بسته‌بندی هدیه رواق'
    : isSaffronFamily
    ? 'زعفران و خوراکی‌های منتخب'
    : isCraftFamily
    ? 'صنایع‌دستی و هنر ایرانی'
    : isSweetFamily
    ? 'شیرینی‌های سنتی ایران'
    : 'آجیل و خشکبار دست‌چین';

  const roleBadgeLabel =
    role === 'detail'
      ? 'نمای نزدیک بافت و جزئیات'
      : role === 'packaging'
      ? 'بسته‌بندی اختصاصی رواق'
      : role === 'lifestyle'
      ? 'چیدمان پذیرایی ایرانی'
      : null;

  return (
    <div
      className={`relative w-full h-full bg-[#F8F4EC] overflow-hidden flex items-center justify-center select-none ${className}`}
    >
      {showRealPhoto ? (
        <img
          src={effectiveImageUrl}
          alt={title || 'تصویر محصول رواق'}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover"
        />
      ) : (
        <svg
          viewBox="0 0 420 315"
          className="w-full h-full object-cover"
          role="img"
          aria-label={title || 'تصویر محصول در فروشگاه رواق'}
        >
          <defs>
            <linearGradient
              id={`studioWall-${illustrationKey}-${role}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#FAF7F1" />
              <stop offset="55%" stopColor="#F8F4EC" />
              <stop offset="100%" stopColor="#EAE0D0" />
            </linearGradient>
            <linearGradient
              id={`travertineBase-${illustrationKey}-${role}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="0%"
            >
              <stop offset="0%" stopColor="#EFE5D6" />
              <stop offset="50%" stopColor="#E4DCCF" />
              <stop offset="100%" stopColor="#D6C9B6" />
            </linearGradient>
            <linearGradient
              id={`vesselBody-${illustrationKey}-${role}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor={primaryVesselColor} />
              <stop offset="100%" stopColor={secondaryTone} />
            </linearGradient>
            <linearGradient
              id={`goldTrim-${illustrationKey}-${role}`}
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#D6BC88" />
              <stop offset="50%" stopColor="#B89A62" />
              <stop offset="100%" stopColor="#8E723E" />
            </linearGradient>
          </defs>

          {/* Studio Warm Ivory Backdrop */}
          <rect
            width="420"
            height="315"
            fill={`url(#studioWall-${illustrationKey}-${role})`}
          />

          {/* Directional Window Sunlight Shadow Cast on Plaster Wall */}
          <polygon
            points="250,0 420,0 420,235 160,235"
            fill="#EFE5D6"
            opacity="0.55"
          />

          {/* Recessed Iranian Architectural Arch Niche */}
          <path
            d="M115 235V102C115 50 156 14 210 14C264 14 305 50 305 102V235H115Z"
            fill="#EFE5D6"
            fillOpacity="0.65"
            stroke="#E4DCCF"
            strokeWidth="1.5"
          />
          <path
            d="M128 235V106C128 60 164 27 210 27C256 27 292 60 292 106V235"
            fill="none"
            stroke="#B89A62"
            strokeOpacity="0.3"
            strokeWidth="1"
          />

          {/* Travertine Stone Plinth / Table Surface */}
          <rect
            x="0"
            y="235"
            width="420"
            height="80"
            fill={`url(#travertineBase-${illustrationKey}-${role})`}
          />
          <line x1="0" y1="235" x2="420" y2="235" stroke="#E4DCCF" strokeWidth="1.5" />

          {/* Plinth Contact Shadow */}
          <ellipse
            cx="210"
            cy="252"
            rx="105"
            ry="13"
            fill="#292624"
            opacity="0.16"
          />

          {/* 3D Perspective Boutique Packaging / Vessel Presentation */}
          {isGiftOrOccasion ? (
            <g transform="translate(88, 86)">
              {/* Perspective Luxury Box */}
              <polygon
                points="20,42 162,58 162,158 20,138"
                fill={`url(#vesselBody-${illustrationKey}-${role})`}
              />
              <polygon points="162,58 232,36 232,134 162,158" fill={secondaryTone} />
              <polygon
                points="16,24 94,6 236,20 162,42"
                fill="#F8F4EC"
                stroke="#B89A62"
                strokeWidth="1.2"
              />
              <polygon
                points="16,24 162,42 162,58 16,40"
                fill="#EFE5D6"
                stroke="#B89A62"
                strokeWidth="1"
              />
              <polygon
                points="162,42 236,20 236,36 162,58"
                fill="#DFD3C0"
                stroke="#B89A62"
                strokeWidth="1"
              />
              {/* Gold Ribbon & Seal */}
              <polygon
                points="82,32 98,34 98,148 82,146"
                fill={`url(#goldTrim-${illustrationKey}-${role})`}
              />
              <rect
                x="52"
                y="74"
                width="76"
                height="44"
                rx="4"
                fill="#F8F4EC"
                stroke="#B89A62"
                strokeWidth="1.5"
              />
              <circle cx="90" cy="84" r="2.2" fill="#2D8C88" />
              <text
                x="90"
                y="101"
                textAnchor="middle"
                fill="#4C202B"
                fontSize="13"
                fontWeight="700"
              >
                رَواق
              </text>
              <text
                x="90"
                y="112"
                textAnchor="middle"
                fill="#77716A"
                fontSize="6.5"
                letterSpacing="1.8"
              >
                RAVĀQ
              </text>
            </g>
          ) : isCraftFamily ? (
            <g transform="translate(115, 76)">
              {/* Sculpted Architectural Turquoise Glazed Vessel & Travertine Pedestal */}
              <rect
                x="30"
                y="148"
                width="130"
                height="24"
                rx="3"
                fill="#F8F4EC"
                stroke="#E4DCCF"
                strokeWidth="1.5"
              />
              <path
                d="M42 78C42 126 65 148 95 148C125 148 148 126 148 78H42Z"
                fill={`url(#vesselBody-${illustrationKey}-${role})`}
                stroke="#B89A62"
                strokeWidth="1.5"
              />
              <ellipse
                cx="95"
                cy="78"
                rx="53"
                ry="12"
                fill="#EFE5D6"
                stroke="#B89A62"
                strokeWidth="1.5"
              />
              <path
                d="M55 102Q95 116 135 102"
                stroke="#F8F4EC"
                strokeOpacity="0.65"
                strokeWidth="1.5"
                fill="none"
              />
            </g>
          ) : (
            <g transform="translate(112, 70)">
              {/* Cylindrical / Faceted Boutique Canister + Companion Ceramic Dish */}
              <rect
                x="44"
                y="34"
                width="108"
                height="142"
                rx="12"
                fill={`url(#vesselBody-${illustrationKey}-${role})`}
                stroke="#B89A62"
                strokeWidth="1.5"
              />
              {/* Brushed Antique Brass Lid */}
              <rect
                x="50"
                y="18"
                width="96"
                height="20"
                rx="5"
                fill={`url(#goldTrim-${illustrationKey}-${role})`}
              />
              {/* Warm Ivory Wrap-Around Boutique Label */}
              <rect
                x="54"
                y="64"
                width="88"
                height="78"
                rx="5"
                fill="#F8F4EC"
                stroke="#B89A62"
                strokeWidth="1.5"
              />
              <path
                d="M78 86V78C78 70 86 64 98 64C110 64 118 70 118 78V86"
                fill="none"
                stroke="#B89A62"
                strokeOpacity="0.45"
                strokeWidth="1"
              />
              <circle cx="98" cy="79" r="2.2" fill="#2D8C88" />
              <text
                x="98"
                y="102"
                textAnchor="middle"
                fill="#292624"
                fontSize="15"
                fontWeight="700"
              >
                رَواق
              </text>
              <text
                x="98"
                y="115"
                textAnchor="middle"
                fill="#77716A"
                fontSize="7"
                letterSpacing="2"
              >
                RAVĀQ
              </text>
              <line
                x1="70"
                y1="124"
                x2="126"
                y2="124"
                stroke="#E4DCCF"
                strokeWidth="1"
              />
            </g>
          )}
        </svg>
      )}

      {/* Subtle Family / Role Caption */}
      <div className="absolute inset-x-3 bottom-2.5 flex items-center justify-between pointer-events-none">
        <span className="text-[11px] font-medium text-[#77716A] bg-[#F8F4EC]/90 backdrop-blur-xs px-2.5 py-0.5 rounded border border-[#E4DCCF]/80">
          {roleBadgeLabel || familyKicker}
        </span>
      </div>
    </div>
  );
};

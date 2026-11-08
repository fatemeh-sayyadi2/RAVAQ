import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import { HERO_MEDIA_MANIFEST } from '../../lib/design-tokens.ts';
import { RavaqLuxuryGiftBox3D } from '../RavaqVisuals.tsx';

interface HeroMediaProps {
  /** Optional custom desktop render source override */
  desktopSrcOverride?: string;
  /** Optional custom mobile render source override */
  mobileSrcOverride?: string;
}

function resolvePublicAssetPath(rawPath: string | null | undefined): string | null {
  if (!rawPath) return null;
  if (
    rawPath.startsWith('http://') ||
    rawPath.startsWith('https://') ||
    rawPath.startsWith('blob:') ||
    rawPath.startsWith('data:')
  ) {
    return rawPath;
  }
  const baseUrl = (import.meta.env.BASE_URL || '/').replace(/\/+$/, '');
  const cleanRel = rawPath.replace(/^\/+/, '');
  return `${baseUrl}/${cleanRel}`;
}

/**
 * HeroMedia Component
 * Renders the full-viewport RAVĀQ studio photograph (/assets/hero/ravaq-hero-desktop.jpg)
 * with responsive <picture> support, smooth motion entrance, scroll parallax,
 * and an architectural boutique stage fallback.
 */
export const HeroMedia: React.FC<HeroMediaProps> = ({
  desktopSrcOverride,
  mobileSrcOverride,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const { scrollY } = useScroll();

  // Restrained environmental scroll parallax (compositor-only transform: translateY)
  const bgArchParallaxY = useTransform(
    scrollY,
    [0, 700],
    prefersReducedMotion ? [0, 0] : [0, 34]
  );
  const lightBeamParallaxY = useTransform(
    scrollY,
    [0, 700],
    prefersReducedMotion ? [0, 0] : [0, 20]
  );

  const [verifiedHero, setVerifiedHero] = useState<{
    desktopImage: string | null;
    mobileImage: string | null;
  }>({
    desktopImage: '/assets/hero/ravaq-hero-desktop.jpg',
    mobileImage: '/assets/hero/ravaq-hero-desktop.jpg',
  });

  const [desktopAssetLoaded, setDesktopAssetLoaded] = useState(true);
  const [desktopAssetError, setDesktopAssetError] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/assets/verified')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && data?.hero) {
          setVerifiedHero((prev) => ({
            desktopImage: data.hero.desktopImage || prev.desktopImage,
            mobileImage:
              data.hero.mobileImage || data.hero.desktopImage || prev.mobileImage,
          }));
        }
      })
      .catch(() => {
        // Static deployment uses verified default paths directly
      });
    return () => {
      active = false;
    };
  }, []);

  const activeDesktopSrc =
    resolvePublicAssetPath(
      desktopSrcOverride ||
        verifiedHero.desktopImage ||
        '/assets/hero/ravaq-hero-desktop.jpg'
    ) || '/assets/hero/ravaq-hero-desktop.jpg';

  const activeMobileSrc =
    resolvePublicAssetPath(
      mobileSrcOverride || verifiedHero.mobileImage || activeDesktopSrc
    ) || activeDesktopSrc;

  const hasValidRenderedImage =
    Boolean(activeDesktopSrc) && desktopAssetLoaded && !desktopAssetError;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 w-full h-full overflow-hidden select-none bg-[#2D131A]"
    >
      {/* ====================================================================
          1. RESPONSIVE <picture> ARCHITECTURE (16:9 Studio Hero Photograph)
          ==================================================================== */}
      {hasValidRenderedImage && activeDesktopSrc && (
        <picture className="block w-full h-full">
          <source
            media={HERO_MEDIA_MANIFEST.desktop.mediaQuery}
            srcSet={activeDesktopSrc}
          />
          {activeMobileSrc && (
            <source
              media={HERO_MEDIA_MANIFEST.mobile.mediaQuery}
              srcSet={activeMobileSrc}
            />
          )}
          <img
            src={activeDesktopSrc}
            alt={HERO_MEDIA_MANIFEST.desktop.alt}
            referrerPolicy="no-referrer"
            onLoad={() => {
              setDesktopAssetLoaded(true);
              setDesktopAssetError(false);
            }}
            onError={(e) => {
              const target = e.currentTarget;
              if (!target.src.endsWith('/assets/hero/boutique-hero.jpg')) {
                target.src = '/assets/hero/boutique-hero.jpg';
                setDesktopAssetError(false);
                setDesktopAssetLoaded(true);
              } else {
                setDesktopAssetError(true);
                setDesktopAssetLoaded(false);
              }
            }}
            className="w-full h-full object-cover object-[74%_center] md:object-[center_center]"
          />
        </picture>
      )}

      {/* ====================================================================
          2. CONTINUOUS FULL-VIEWPORT BOUTIQUE ARCHITECTURAL ENVIRONMENT
             (Fallback when external hero image files are unavailable)
          ==================================================================== */}
      {!hasValidRenderedImage && (
        <div className="relative w-full h-full">
          <motion.div
            style={{ y: bgArchParallaxY }}
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            <svg
              viewBox="0 0 1600 900"
              preserveAspectRatio="xMidYMid slice"
              className="hidden md:block w-full h-full"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="ravaqBoutiqueBase" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#261217" />
                  <stop offset="48%" stopColor="#3D1A23" />
                  <stop offset="82%" stopColor="#4C202B" />
                  <stop offset="100%" stopColor="#292624" />
                </linearGradient>
                <radialGradient id="rightBoutiqueWarmth" cx="76%" cy="46%" r="48%">
                  <stop offset="0%" stopColor="#F8F4EC" stopOpacity="0.22" />
                  <stop offset="45%" stopColor="#B89A62" stopOpacity="0.12" />
                  <stop offset="100%" stopColor="#292624" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="plasterArchGlow" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#F8F4EC" stopOpacity="0.16" />
                  <stop offset="65%" stopColor="#EFE5D6" stopOpacity="0.07" />
                  <stop offset="100%" stopColor="#292624" stopOpacity="0.02" />
                </linearGradient>
              </defs>

              <rect width="1600" height="900" fill="url(#ravaqBoutiqueBase)" />
              <rect width="1600" height="900" fill="url(#rightBoutiqueWarmth)" />

              <path
                d="M70 830V310C70 175 175 78 305 78C435 78 540 175 540 310V830"
                fill="none"
                stroke="#B89A62"
                strokeOpacity="0.16"
                strokeWidth="1.5"
              />
              <path
                d="M575 830V270C575 135 685 38 820 38C955 38 1065 135 1065 270V830"
                fill="url(#plasterArchGlow)"
                stroke="#B89A62"
                strokeOpacity="0.24"
                strokeWidth="1.5"
              />
              <path
                d="M935 830V220C935 88 1055 -10 1215 -10C1375 -10 1495 88 1495 220V830H935Z"
                fill="url(#plasterArchGlow)"
                stroke="#B89A62"
                strokeOpacity="0.48"
                strokeWidth="2"
              />
              <path
                d="M962 830V232C962 110 1072 16 1215 16C1358 16 1468 110 1468 232V830"
                fill="none"
                stroke="#F8F4EC"
                strokeOpacity="0.18"
                strokeWidth="1"
              />
              <rect
                x="988"
                y="218"
                width="454"
                height="8"
                rx="2"
                fill="#2D8C88"
                opacity="0.72"
              />
              <rect
                x="988"
                y="229"
                width="454"
                height="2"
                fill="#B89A62"
                opacity="0.55"
              />
              <rect x="0" y="810" width="1600" height="90" fill="#211D1B" opacity="0.7" />
              <line x1="0" y1="810" x2="1600" y2="810" stroke="#B89A62" strokeOpacity="0.25" strokeWidth="1" />
            </svg>

            <svg
              viewBox="0 0 720 1280"
              preserveAspectRatio="xMidYMid slice"
              className="block md:hidden w-full h-full"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="mobBoutiqueBase" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#241016" />
                  <stop offset="38%" stopColor="#3B1821" />
                  <stop offset="75%" stopColor="#4C202B" />
                  <stop offset="100%" stopColor="#262220" />
                </linearGradient>
                <radialGradient id="mobLowerGlow" cx="50%" cy="68%" r="48%">
                  <stop offset="0%" stopColor="#F8F4EC" stopOpacity="0.2" />
                  <stop offset="55%" stopColor="#B89A62" stopOpacity="0.1" />
                  <stop offset="100%" stopColor="#292624" stopOpacity="0" />
                </radialGradient>
              </defs>
              <rect width="720" height="1280" fill="url(#mobBoutiqueBase)" />
              <rect width="720" height="1280" fill="url(#mobLowerGlow)" />
              <path
                d="M56 1280V260C56 115 192 22 360 22C528 22 664 115 664 260V1280H56Z"
                fill="#F8F4EC"
                fillOpacity="0.06"
                stroke="#B89A62"
                strokeOpacity="0.38"
                strokeWidth="2"
              />
            </svg>
          </motion.div>

          <motion.div
            style={{ y: lightBeamParallaxY }}
            className="absolute inset-0 pointer-events-none"
            aria-hidden="true"
          >
            <div
              className="w-full h-full opacity-35"
              style={{
                background:
                  'radial-gradient(ellipse 55% 65% at 78% 35%, rgba(248, 244, 236, 0.26) 0%, rgba(184, 154, 98, 0.12) 45%, rgba(41, 38, 36, 0) 80%)',
              }}
            />
          </motion.div>

          <div className="relative z-10 w-full h-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 flex flex-col justify-end md:flex-row md:items-center md:justify-start pb-8 md:pb-0">
            <div className="w-full md:w-[44%] lg:w-[42%] flex flex-col items-center justify-end md:justify-center pt-72 sm:pt-80 md:pt-16">
              <div className="relative w-full max-w-[400px] rounded-t-[180px] rounded-b-2xl border border-[#B89A62]/45 bg-gradient-to-b from-[#F8F4EC]/12 via-[#4C202B]/55 to-[#292624]/85 backdrop-blur-[2px] px-5 pt-10 pb-6 flex flex-col items-center text-center shadow-2xl">
                <div className="w-3 h-3 rounded-full bg-[#2D8C88] ring-2 ring-[#B89A62]/70 mb-3" />
                <span className="text-[11px] font-medium text-[#B89A62] mb-1">
                  صحنه سینمایی «بانوی رَواق» · جایگاه کانونی یک‌سوم راست
                </span>
                <p className="text-xs text-[#EFE5D6]/85 leading-relaxed max-w-[290px] mb-4">
                  بانوی ایرانی با موهای فر طبیعی و پوشش معاصر زرشکی و عاجی، در حال نگه‌داشتن جعبه هدیه اختصاصی رَواق
                </p>
                <RavaqLuxuryGiftBox3D size="lg" className="my-1" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          3. MEASURED ENVIRONMENTAL CONTRAST SCRIM
          ==================================================================== */}
      <div
        className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[#231015]/65 via-[#292624]/20 to-[#231015]/55 md:bg-[linear-gradient(to_right,rgba(33,16,21,0.68)_0%,rgba(33,16,21,0.38)_36%,rgba(33,16,21,0.08)_60%,rgba(33,16,21,0)_100%)]"
        aria-hidden="true"
      />
    </motion.div>
  );
};

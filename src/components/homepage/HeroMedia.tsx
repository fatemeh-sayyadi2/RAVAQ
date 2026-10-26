import React, { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import { ImagePlus, Film, RotateCcw } from 'lucide-react';
import { HERO_MEDIA_MANIFEST } from '../../lib/design-tokens.ts';
import { RavaqLuxuryGiftBox3D } from '../RavaqVisuals.tsx';

interface HeroMediaProps {
  /** Optional custom hero video source override */
  videoSrcOverride?: string;
  /** Optional custom desktop render source override */
  desktopSrcOverride?: string;
  /** Optional custom mobile render source override */
  mobileSrcOverride?: string;
}

const CUSTOM_DESKTOP_HERO_KEY = 'ravaq_custom_hero_desktop_v1';
const CUSTOM_MOBILE_HERO_KEY = 'ravaq_custom_hero_mobile_v1';

/**
 * HeroMedia Component
 * Priority Order:
 * 1. User's Homepage Hero Video (<video> at /assets/hero/ravaq-hero.mp4 or ravaq-hero-desktop.mp4 / mobile.mp4, or local video preview)
 * 2. Responsive <picture> (16:9 Desktop / 9:16 Mobile still renders)
 * 3. Continuous Full-Viewport Boutique Architectural Stage + 3D RAVĀQ Gift Box
 */
export const HeroMedia: React.FC<HeroMediaProps> = ({
  videoSrcOverride,
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
    sharedVideo: string | null;
    desktopVideo: string | null;
    mobileVideo: string | null;
    desktopImage: string | null;
    mobileImage: string | null;
  }>({
    sharedVideo: '/assets/hero/ravaq-hero.mp4',
    desktopVideo: '/assets/hero/ravaq-hero-desktop.mp4',
    mobileVideo: null,
    desktopImage: '/assets/hero/ravaq-hero-desktop.jpg',
    mobileImage: '/assets/hero/ravaq-hero-desktop.jpg',
  });

  const [heroMode, setHeroMode] = useState<'video' | 'image'>('video');
  const [videoLoaded, setVideoLoaded] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [customVideoSrc, setCustomVideoSrc] = useState<string | null>(null);

  const [desktopAssetLoaded, setDesktopAssetLoaded] = useState(true);
  const [desktopAssetError, setDesktopAssetError] = useState(false);
  const [customDesktopSrc, setCustomDesktopSrc] = useState<string | null>(() => {
    try {
      return localStorage.getItem(CUSTOM_DESKTOP_HERO_KEY);
    } catch {
      return null;
    }
  });
  const [customMobileSrc, setCustomMobileSrc] = useState<string | null>(() => {
    try {
      return localStorage.getItem(CUSTOM_MOBILE_HERO_KEY);
    } catch {
      return null;
    }
  });
  const [showAssetPanel, setShowAssetPanel] = useState(false);

  const videoInputRef = useRef<HTMLInputElement>(null);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/assets/verified')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && data?.hero) {
          setVerifiedHero((prev) => ({
            sharedVideo: data.hero.sharedVideo || prev.sharedVideo,
            desktopVideo: data.hero.desktopVideo || prev.desktopVideo,
            mobileVideo: data.hero.mobileVideo || prev.mobileVideo,
            desktopImage: data.hero.desktopImage || prev.desktopImage,
            mobileImage: data.hero.mobileImage || data.hero.desktopImage || prev.mobileImage,
          }));
        }
      })
      .catch(() => {
        // ignore
      });
    return () => {
      active = false;
    };
  }, []);

  const activeVideoSrc =
    videoSrcOverride ||
    customVideoSrc ||
    verifiedHero.desktopVideo ||
    verifiedHero.sharedVideo ||
    verifiedHero.mobileVideo ||
    null;

  const activeDesktopSrc =
    desktopSrcOverride || customDesktopSrc || verifiedHero.desktopImage || '/assets/hero/ravaq-hero-desktop.jpg';
  const activeMobileSrc =
    mobileSrcOverride || customMobileSrc || verifiedHero.mobileImage || activeDesktopSrc;

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setCustomVideoSrc(objectUrl);
    setHeroMode('video');
    setVideoError(false);
    setVideoLoaded(true);
  };

  const handleFileUpload = (
    target: 'desktop' | 'mobile',
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    if (target === 'desktop') {
      setCustomDesktopSrc(objectUrl);
      setHeroMode('image');
      setDesktopAssetError(false);
      setDesktopAssetLoaded(true);
    } else {
      setCustomMobileSrc(objectUrl);
      setHeroMode('image');
      setDesktopAssetError(false);
      setDesktopAssetLoaded(true);
    }
  };

  const handleResetCustomAssets = () => {
    setCustomVideoSrc(null);
    setVideoLoaded(true);
    setVideoError(false);
    setCustomDesktopSrc(null);
    setCustomMobileSrc(null);
    setDesktopAssetLoaded(true);
    setDesktopAssetError(false);
    setHeroMode('video');
    try {
      localStorage.removeItem(CUSTOM_DESKTOP_HERO_KEY);
      localStorage.removeItem(CUSTOM_MOBILE_HERO_KEY);
    } catch {
      // ignore
    }
  };

  const hasValidHeroVideo =
    heroMode === 'video' &&
    Boolean(activeVideoSrc) &&
    (Boolean(customVideoSrc) || videoLoaded) &&
    !videoError;

  const hasValidRenderedImage =
    !hasValidHeroVideo &&
    Boolean(activeDesktopSrc) &&
    (Boolean(customDesktopSrc) || Boolean(customMobileSrc) || desktopAssetLoaded) &&
    !desktopAssetError;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: prefersReducedMotion ? 0 : 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="absolute inset-0 w-full h-full overflow-hidden select-none bg-[#2D131A]"
    >
      {/* ====================================================================
          0. PRIORITY LAYER: HOMEPAGE HERO VIDEO (<video> MP4/WebM)
             Plays the verified hero video on disk (/assets/hero/ravaq-hero.mp4).
          ==================================================================== */}
      {activeVideoSrc && heroMode === 'video' && (
        <video
          key={activeVideoSrc}
          autoPlay={!prefersReducedMotion}
          muted
          loop
          playsInline
          preload="auto"
          poster={activeDesktopSrc || '/assets/hero/ravaq-hero-desktop.jpg'}
          onLoadedData={() => {
            setVideoLoaded(true);
            setVideoError(false);
          }}
          onError={() => {
            setVideoError(true);
            setVideoLoaded(false);
          }}
          className={
            hasValidHeroVideo
              ? 'block w-full h-full object-cover object-[74%_center] md:object-[center_center]'
              : 'sr-only'
          }
        >
          {customVideoSrc ? (
            <source src={customVideoSrc} />
          ) : (
            <>
              {verifiedHero.desktopVideo && (
                <source src={verifiedHero.desktopVideo} media="(min-width: 768px)" />
              )}
              {verifiedHero.mobileVideo && (
                <source src={verifiedHero.mobileVideo} media="(max-width: 767px)" />
              )}
              {verifiedHero.sharedVideo && <source src={verifiedHero.sharedVideo} />}
            </>
          )}
        </video>
      )}

      {/* ====================================================================
          1. RESPONSIVE <picture> ARCHITECTURE (Clean 16:9 Studio Hero Photo)
             Displays /assets/hero/ravaq-hero-desktop.jpg (boutique-hero.jpg)
          ==================================================================== */}
      {activeDesktopSrc && (
        <picture className={hasValidRenderedImage ? 'block w-full h-full' : 'sr-only'}>
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
            fetchPriority="high"
            onLoad={() => {
              setDesktopAssetLoaded(true);
              setDesktopAssetError(false);
            }}
            onError={() => {
              setDesktopAssetError(true);
              setDesktopAssetLoaded(false);
            }}
            className="w-full h-full object-cover object-[74%_center] md:object-[center_center]"
          />
        </picture>
      )}

      {/* ====================================================================
          2. CONTINUOUS FULL-VIEWPORT BOUTIQUE ARCHITECTURAL ENVIRONMENT
             (Active when external hero video / 3D render files are not yet on disk)
          ==================================================================== */}
      {!hasValidHeroVideo && !hasValidRenderedImage && (
        <div className="relative w-full h-full">
          {/* Layer A: Deep Warm Boutique Interior & Architectural Arches (Desktop 16:9 & Mobile 9:16) */}
          <motion.div
            style={{ y: bgArchParallaxY }}
            className="absolute inset-0 w-full h-full pointer-events-none"
          >
            {/* Desktop Wide 16:9 Continuous Boutique Architecture */}
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
                <linearGradient id="walnutWoodShelf" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#43281C" />
                  <stop offset="50%" stopColor="#5E3A28" />
                  <stop offset="100%" stopColor="#3B2217" />
                </linearGradient>
              </defs>

              {/* Continuous Boutique Interior Canvas */}
              <rect width="1600" height="900" fill="url(#ravaqBoutiqueBase)" />
              <rect width="1600" height="900" fill="url(#rightBoutiqueWarmth)" />

              {/* Left & Center Recessed Iranian Plaster Arches (Calm Negative Space for Headline) */}
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

              {/* Right-Third Primary Boutique Display Arch (Framing the Subject & Shelving) */}
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

              {/* Restrained Iranian Turquoise Architectural Tile Inlay */}
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

              {/* Warm Natural Walnut Boutique Shelving in the Right Arch */}
              <g opacity="0.9">
                {/* Upper Shelf */}
                <rect x="988" y="348" width="454" height="14" rx="2" fill="url(#walnutWoodShelf)" />
                <rect x="988" y="348" width="454" height="2.5" fill="#B89A62" opacity="0.45" />
                {/* Saffron Apothecary Jars */}
                <rect x="1028" y="290" width="38" height="58" rx="6" fill="#F8F4EC" fillOpacity="0.85" stroke="#B89A62" />
                <rect x="1033" y="308" width="28" height="34" rx="3" fill="#8C1D28" />
                <rect x="1034" y="282" width="26" height="8" rx="2" fill="#B89A62" />

                <rect x="1080" y="298" width="34" height="50" rx="5" fill="#F8F4EC" fillOpacity="0.85" stroke="#B89A62" />
                <rect x="1085" y="314" width="24" height="28" rx="3" fill="#8C1D28" />
                <rect x="1086" y="291" width="22" height="7" rx="2" fill="#B89A62" />

                {/* Glazed Turquoise Ceramic Vessel */}
                <path
                  d="M1348 348C1334 330 1332 300 1345 282H1392C1405 300 1403 330 1389 348H1348Z"
                  fill="#2D8C88"
                  stroke="#B89A62"
                  strokeWidth="1.2"
                />

                {/* Middle Shelf */}
                <rect x="988" y="505" width="454" height="14" rx="2" fill="url(#walnutWoodShelf)" />
                <rect x="988" y="505" width="454" height="2.5" fill="#B89A62" opacity="0.45" />
                {/* Stacked Gift Boxes on Shelf */}
                <rect x="1312" y="456" width="102" height="49" rx="4" fill="#742E3A" stroke="#B89A62" strokeWidth="1.2" />
                <rect x="1326" y="422" width="74" height="34" rx="3" fill="#F8F4EC" stroke="#B89A62" strokeWidth="1.2" />

                {/* Lower Shelf */}
                <rect x="988" y="660" width="454" height="14" rx="2" fill="url(#walnutWoodShelf)" />
              </g>

              {/* Natural Travertine / Stone Floor Horizon Line */}
              <rect x="0" y="810" width="1600" height="90" fill="#211D1B" opacity="0.7" />
              <line x1="0" y1="810" x2="1600" y2="810" stroke="#B89A62" strokeOpacity="0.25" strokeWidth="1" />
            </svg>

            {/* Mobile Portrait 9:16 Separately Composed Vertical Boutique Architecture */}
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

              {/* Tall Iranian Arch Framing the Mobile Scene */}
              <path
                d="M56 1280V260C56 115 192 22 360 22C528 22 664 115 664 260V1280H56Z"
                fill="#F8F4EC"
                fillOpacity="0.06"
                stroke="#B89A62"
                strokeOpacity="0.38"
                strokeWidth="2"
              />
              {/* Restrained Turquoise Tile Strip in Lower Half (Below Headline Safe Area) */}
              <rect x="96" y="610" width="528" height="7" rx="2" fill="#2D8C88" opacity="0.65" />
              <rect x="96" y="730" width="528" height="12" rx="2" fill="#4E3021" opacity="0.85" />
              <rect x="96" y="920" width="528" height="12" rx="2" fill="#4E3021" opacity="0.85" />
            </svg>
          </motion.div>

          {/* Layer B: Gentle Golden-Hour Directional Light Wash */}
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

          {/* Layer C: Subject & Luxury RAVĀQ Gift Box Stage (Right Third on Desktop, Lower Half on Mobile) */}
          <div className="relative z-10 w-full h-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 flex flex-col justify-end md:flex-row md:items-center md:justify-start pb-8 md:pb-0">
            {/* In RTL container, the first child sits on the physical RIGHT third of the desktop screen */}
            <div className="w-full md:w-[44%] lg:w-[42%] flex flex-col items-center justify-end md:justify-center pt-72 sm:pt-80 md:pt-16">
              {/* Architectural Frame for The Lady of RAVĀQ + Real 3D Perspective Gift Box */}
              <div className="relative w-full max-w-[400px] rounded-t-[180px] rounded-b-2xl border border-[#B89A62]/45 bg-gradient-to-b from-[#F8F4EC]/12 via-[#4C202B]/55 to-[#292624]/85 backdrop-blur-[2px] px-5 pt-10 pb-6 flex flex-col items-center text-center shadow-2xl">
                {/* Subtle Iranian Turquoise Keystone Accent at Top of Arch */}
                <div className="w-3 h-3 rounded-full bg-[#2D8C88] ring-2 ring-[#B89A62]/70 mb-3" />

                <span className="text-[11px] font-medium text-[#B89A62] mb-1">
                  صحنه سینمایی «بانوی رَواق» · جایگاه کانونی یک‌سوم راست
                </span>
                <p className="text-xs text-[#EFE5D6]/85 leading-relaxed max-w-[290px] mb-4">
                  بانوی ایرانی با موهای فر طبیعی و پوشش معاصر زرشکی و عاجی، در حال نگه‌داشتن جعبه هدیه اختصاصی رَواق
                </p>

                {/* 3D Perspective Luxury RAVĀQ Gift Box with Real Overlaid SVG Brand Seal */}
                <RavaqLuxuryGiftBox3D size="lg" className="my-1" />

                {/* Honest Asset Status & Local Video / Render Loader */}
                <div className="mt-4 pt-3 border-t border-[#F8F4EC]/15 w-full flex flex-col items-center gap-2 pointer-events-auto">
                  <div className="flex items-center justify-between w-full text-[11px] text-[#EFE5D6]/75">
                    <span>ویدیو یا رندر سینمایی هیرو:</span>
                    <button
                      type="button"
                      onClick={() => setShowAssetPanel(!showAssetPanel)}
                      className="inline-flex items-center gap-1 text-[#B89A62] hover:text-[#F8F4EC] font-medium transition-colors cursor-pointer"
                    >
                      <Film className="w-3.5 h-3.5" />
                      <span>{showAssetPanel ? 'بستن پنل رسانه' : 'بارگذاری ویدیو / رندر هیرو'}</span>
                    </button>
                  </div>

                  {showAssetPanel && (
                    <div className="w-full bg-[#292624]/95 border border-[#B89A62]/40 rounded-lg p-3 text-right space-y-2.5 text-[11px] text-[#EFE5D6]">
                      <p className="leading-relaxed text-[#EFE5D6]/85">
                        لایه اولویت‌دار <code dir="ltr" className="text-[#B89A62]">&lt;video&gt;</code> برای{' '}
                        <code dir="ltr" className="text-[#B89A62]">/assets/hero/ravaq-hero.mp4</code> (یا{' '}
                        <code dir="ltr" className="text-[#B89A62]">ravaq-hero-desktop.mp4</code>) و لایه{' '}
                        <code dir="ltr" className="text-[#B89A62]">&lt;picture&gt;</code> آماده پخش خودکار هستند:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <input
                          ref={videoInputRef}
                          type="file"
                          accept="video/mp4,video/webm,video/*"
                          onChange={handleVideoUpload}
                          className="hidden"
                        />
                        <input
                          ref={desktopInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload('desktop', e)}
                          className="hidden"
                        />
                        <input
                          ref={mobileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleFileUpload('mobile', e)}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => videoInputRef.current?.click()}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#B89A62] text-[#292624] rounded font-bold hover:bg-[#D6BC88] transition-colors cursor-pointer"
                        >
                          <Film className="w-3.5 h-3.5" />
                          <span>انتخاب ویدیو هیرو (MP4/WebM)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => desktopInputRef.current?.click()}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#742E3A] text-[#F8F4EC] rounded font-medium hover:bg-[#4C202B] transition-colors cursor-pointer"
                        >
                          <ImagePlus className="w-3.5 h-3.5" />
                          <span>رندر دسکتاپ (16:9)</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => mobileInputRef.current?.click()}
                          className="px-2.5 py-1.5 bg-[#EFE5D6]/15 text-[#F8F4EC] border border-[#EFE5D6]/30 rounded font-medium hover:bg-[#EFE5D6]/25 transition-colors cursor-pointer"
                        >
                          رندر موبایل (9:16)
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Discreet Hero Media Mode Toggle (Video vs Studio Photo) */}
      {(hasValidHeroVideo || hasValidRenderedImage) && (
        <div className="absolute bottom-4 right-4 z-30 flex items-center gap-2 pointer-events-auto">
          {Boolean(activeVideoSrc) && !videoError && (
            <div className="inline-flex items-center p-1 bg-[#231015]/80 backdrop-blur-md border border-[#B89A62]/40 rounded-lg text-[11px] text-[#F8F4EC]">
              <button
                type="button"
                onClick={() => setHeroMode('video')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  heroMode === 'video'
                    ? 'bg-[#742E3A] text-[#F8F4EC] font-semibold'
                    : 'text-[#EFE5D6]/75 hover:text-[#F8F4EC]'
                }`}
              >
                <Film className="w-3.5 h-3.5 text-[#B89A62]" />
                <span>ویدیوی سینمایی</span>
              </button>
              <button
                type="button"
                onClick={() => setHeroMode('image')}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  heroMode === 'image'
                    ? 'bg-[#742E3A] text-[#F8F4EC] font-semibold'
                    : 'text-[#EFE5D6]/75 hover:text-[#F8F4EC]'
                }`}
              >
                <ImagePlus className="w-3.5 h-3.5 text-[#B89A62]" />
                <span>تصویر استودیویی</span>
              </button>
            </div>
          )}

          {(customVideoSrc || customDesktopSrc || customMobileSrc) && (
            <button
              type="button"
              onClick={handleResetCustomAssets}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#292624]/85 text-[#F8F4EC] border border-[#B89A62]/50 rounded-lg text-xs hover:bg-[#292624] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#B89A62]" />
              <span>بازگشت به صحنه پیش‌فرض</span>
            </button>
          )}
        </div>
      )}

      {/* ====================================================================
          3. MEASURED ENVIRONMENTAL CONTRAST SCRIM
             - Desktop: Darker calm negative space on the LEFT for headline & CTAs,
               leaving the RIGHT third bright and clear for the character & gift box.
             - Mobile: Darker calm negative space at the TOP for headline & CTAs,
               leaving the LOWER two-thirds clear for the character & gift box.
          ==================================================================== */}
      <div
        className={`absolute inset-0 pointer-events-none ${
          hasValidHeroVideo
            ? 'bg-gradient-to-b from-[#231015]/92 via-[#292624]/45 to-[#231015]/78 md:bg-[linear-gradient(to_right,#211015_0%,#241117_42%,rgba(36,17,23,0.82)_50%,rgba(36,17,23,0)_64%)]'
            : 'bg-gradient-to-b from-[#231015]/88 via-[#292624]/35 to-[#231015]/75 md:bg-gradient-to-r md:from-[#211015]/90 md:via-[#292624]/55 md:to-transparent'
        }`}
        aria-hidden="true"
      />
    </motion.div>
  );
};

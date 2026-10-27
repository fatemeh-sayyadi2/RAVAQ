import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, useScroll, useTransform, useReducedMotion } from 'motion/react';
import { ImagePlus, Film, RotateCcw, Play, Pause, Activity } from 'lucide-react';
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

interface VideoRuntimeDiagnostics {
  currentSrc: string;
  readyState: number;
  readyStateLabel: string;
  networkState: number;
  networkStateLabel: string;
  paused: boolean;
  ended: boolean;
  currentTime: number;
  duration: number;
  decodedFrames: number;
  videoWidth: number;
  videoHeight: number;
  muted: boolean;
  defaultMuted: boolean;
  errorCode: number | null;
  errorMessage: string | null;
  playPromiseStatus: string;
  lastEvent: string;
  usingBlobFallback: boolean;
}

const READY_STATE_LABELS: Record<number, string> = {
  0: '0 (HAVE_NOTHING)',
  1: '1 (HAVE_METADATA)',
  2: '2 (HAVE_CURRENT_DATA)',
  3: '3 (HAVE_FUTURE_DATA)',
  4: '4 (HAVE_ENOUGH_DATA)',
};

const NETWORK_STATE_LABELS: Record<number, string> = {
  0: '0 (NETWORK_EMPTY)',
  1: '1 (NETWORK_IDLE)',
  2: '2 (NETWORK_LOADING)',
  3: '3 (NETWORK_NO_SOURCE)',
};

const CUSTOM_DESKTOP_HERO_KEY = 'ravaq_custom_hero_desktop_v1';
const CUSTOM_MOBILE_HERO_KEY = 'ravaq_custom_hero_mobile_v1';

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
 * Priority Order:
 * 1. Homepage Hero Video (<video> at /assets/hero/ravaq-hero.mp4)
 * 2. Responsive <picture> (16:9 Desktop / 9:16 Mobile studio renders)
 * 3. Continuous Full-Viewport Boutique Architectural Stage + 3D RAVĀQ Gift Box
 */
export const HeroMedia: React.FC<HeroMediaProps> = ({
  videoSrcOverride,
  desktopSrcOverride,
  mobileSrcOverride,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const isDevPreview = Boolean(import.meta.env.DEV);

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

  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );
  const [heroMode, setHeroMode] = useState<'video' | 'image'>('video');
  const [videoLoaded, setVideoLoaded] = useState(true);
  const [videoError, setVideoError] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [userPausedVideo, setUserPausedVideo] = useState(false);
  const [customVideoSrc, setCustomVideoSrc] = useState<string | null>(null);
  const [blobFallbackSrc, setBlobFallbackSrc] = useState<string | null>(null);
  const blobAttemptedForSrcRef = useRef<string | null>(null);

  const [desktopAssetLoaded, setDesktopAssetLoaded] = useState(true);
  const [desktopAssetError, setDesktopAssetError] = useState(false);
  const [customDesktopSrc, setCustomDesktopSrc] = useState<string | null>(null);
  const [customMobileSrc, setCustomMobileSrc] = useState<string | null>(null);
  const [showAssetPanel, setShowAssetPanel] = useState(false);
  const [showDevDiag, setShowDevDiag] = useState(false);
  const playPromiseStatusRef = useRef<string>('PENDING');
  const lastEventRef = useRef<string>('init');

  const [diagnostics, setDiagnostics] = useState<VideoRuntimeDiagnostics>({
    currentSrc: '',
    readyState: 0,
    readyStateLabel: READY_STATE_LABELS[0],
    networkState: 0,
    networkStateLabel: NETWORK_STATE_LABELS[0],
    paused: true,
    ended: false,
    currentTime: 0,
    duration: 0,
    decodedFrames: 0,
    videoWidth: 0,
    videoHeight: 0,
    muted: true,
    defaultMuted: true,
    errorCode: null,
    errorMessage: null,
    playPromiseStatus: 'PENDING',
    lastEvent: 'init',
    usingBlobFallback: false,
  });

  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.removeItem(CUSTOM_DESKTOP_HERO_KEY);
      localStorage.removeItem(CUSTOM_MOBILE_HERO_KEY);
    } catch {
      // ignore
    }
    const handleResize = () => {
      setIsMobileViewport(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
        // Static deployment (e.g. Vercel SPA) uses verified default paths directly
      });
    return () => {
      active = false;
    };
  }, []);

  // Use a stable canonical video URL (/assets/hero/ravaq-hero.mp4) unless a dedicated
  // mobileVideo or custom override is present so resizing across 768px never reloads the video.
  const rawVideoCandidate =
    videoSrcOverride ||
    customVideoSrc ||
    (isMobileViewport && verifiedHero.mobileVideo
      ? verifiedHero.mobileVideo
      : verifiedHero.sharedVideo || verifiedHero.desktopVideo) ||
    null;

  const canonicalVideoSrc = resolvePublicAssetPath(rawVideoCandidate);
  const activeVideoSrc = blobFallbackSrc || canonicalVideoSrc;
  const activeVideoPoster =
    resolvePublicAssetPath('/assets/hero/ravaq-hero-poster.jpg') ||
    '/assets/hero/ravaq-hero-poster.jpg';

  const activeDesktopSrc =
    resolvePublicAssetPath(
      desktopSrcOverride ||
        customDesktopSrc ||
        verifiedHero.desktopImage ||
        '/assets/hero/ravaq-hero-desktop.jpg'
    ) || '/assets/hero/ravaq-hero-desktop.jpg';
  const activeMobileSrc =
    resolvePublicAssetPath(
      mobileSrcOverride || customMobileSrc || verifiedHero.mobileImage || activeDesktopSrc
    ) || activeDesktopSrc;

  const syncDiagnosticsFromDom = useCallback(
    (eventLabel?: string) => {
      if (eventLabel) {
        lastEventRef.current = eventLabel;
      }
      const v = videoElementRef.current;
      if (!v) return;
      let decodedFrames = 0;
      try {
        const quality =
          typeof v.getVideoPlaybackQuality === 'function'
            ? v.getVideoPlaybackQuality()
            : null;
        decodedFrames =
          quality?.totalVideoFrames ??
          (v as HTMLVideoElement & { webkitDecodedFrameCount?: number })
            .webkitDecodedFrameCount ??
          0;
      } catch {
        // ignore
      }
      setDiagnostics({
        currentSrc: v.currentSrc || v.getAttribute('src') || '',
        readyState: v.readyState,
        readyStateLabel: READY_STATE_LABELS[v.readyState] || String(v.readyState),
        networkState: v.networkState,
        networkStateLabel: NETWORK_STATE_LABELS[v.networkState] || String(v.networkState),
        paused: v.paused,
        ended: v.ended,
        currentTime: Number(v.currentTime.toFixed(2)),
        duration: Number.isFinite(v.duration) ? Number(v.duration.toFixed(2)) : 0,
        decodedFrames,
        videoWidth: v.videoWidth,
        videoHeight: v.videoHeight,
        muted: v.muted,
        defaultMuted: v.defaultMuted,
        errorCode: v.error ? v.error.code : null,
        errorMessage: v.error ? v.error.message || 'MEDIA_ELEMENT_ERROR' : null,
        playPromiseStatus: playPromiseStatusRef.current,
        lastEvent: lastEventRef.current,
        usingBlobFallback: Boolean(blobFallbackSrc),
      });
    },
    [blobFallbackSrc]
  );

  // Attempt fetch -> Blob URL fallback if direct <video src> fails or stalls in proxy environments
  const tryBlobVideoFallback = useCallback(async () => {
    if (!canonicalVideoSrc || canonicalVideoSrc.startsWith('blob:')) return;
    if (blobAttemptedForSrcRef.current === canonicalVideoSrc) return;
    blobAttemptedForSrcRef.current = canonicalVideoSrc;

    try {
      const response = await fetch(canonicalVideoSrc, { cache: 'force-cache' });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const rawBlob = await response.blob();
      const videoBlob =
        rawBlob.type === 'video/mp4'
          ? rawBlob
          : new Blob([rawBlob], { type: 'video/mp4' });
      const objectUrl = URL.createObjectURL(videoBlob);
      setBlobFallbackSrc(objectUrl);
      setVideoError(false);
      setVideoLoaded(true);
      lastEventRef.current = 'blob-fallback-loaded';
    } catch (err) {
      setVideoError(true);
      setVideoLoaded(false);
      setIsVideoPlaying(false);
      playPromiseStatusRef.current = `BLOB_FETCH_FAILED: ${
        err instanceof Error ? err.message : String(err)
      }`;
      syncDiagnosticsFromDom('blob-fallback-error');
    }
  }, [canonicalVideoSrc, syncDiagnosticsFromDom]);

  const attemptVideoPlay = useCallback(
    (triggerSource: string) => {
      const videoEl = videoElementRef.current;
      if (!videoEl || heroMode !== 'video' || !activeVideoSrc) return;

      videoEl.defaultMuted = true;
      videoEl.muted = true;
      videoEl.playsInline = true;
      videoEl.setAttribute('muted', '');
      videoEl.setAttribute('playsinline', '');
      videoEl.setAttribute('webkit-playsinline', '');

      if (userPausedVideo) {
        videoEl.pause();
        setIsVideoPlaying(false);
        playPromiseStatusRef.current = 'USER_PAUSED';
        syncDiagnosticsFromDom(`${triggerSource}:paused`);
        return;
      }

      const playPromise = videoEl.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            playPromiseStatusRef.current = 'RESOLVED';
            setIsVideoPlaying(true);
            setVideoLoaded(true);
            setVideoError(false);
            syncDiagnosticsFromDom(`${triggerSource}:play-resolved`);
          })
          .catch((err: unknown) => {
            const errName = err instanceof Error ? err.name : 'PlayError';
            const errMsg = err instanceof Error ? err.message : String(err);
            playPromiseStatusRef.current = `REJECTED (${errName}: ${errMsg})`;
            setIsVideoPlaying(!videoEl.paused);
            syncDiagnosticsFromDom(`${triggerSource}:play-rejected`);
          });
      }
    },
    [activeVideoSrc, heroMode, userPausedVideo, syncDiagnosticsFromDom]
  );

  // Enforce DOM-level muted + playsInline attributes and initiate playback reliably.
  // Note: OS prefers-reduced-motion is intentionally NOT used to block or pause the hero video
  // when heroMode === 'video', because Windows/macOS reduced-motion settings otherwise freeze
  // the hero on frame 0 even when "ویدیوی سینمایی" is active.
  useEffect(() => {
    attemptVideoPlay('effect');
  }, [attemptVideoPlay]);

  // Periodically refresh runtime diagnostics in development preview & watch for stalled Range loads
  useEffect(() => {
    if (heroMode !== 'video') return;
    const interval = window.setInterval(() => {
      const v = videoElementRef.current;
      if (!v) return;
      if (!v.paused && !v.ended && v.readyState >= 2) {
        setIsVideoPlaying(true);
      }
      if (isDevPreview) {
        syncDiagnosticsFromDom();
      }
    }, 250);

    const stallTimer = window.setTimeout(() => {
      const v = videoElementRef.current;
      if (v && v.readyState === 0 && (v.networkState === 3 || v.error)) {
        tryBlobVideoFallback();
      }
    }, 3500);

    return () => {
      window.clearInterval(interval);
      window.clearTimeout(stallTimer);
    };
  }, [heroMode, isDevPreview, syncDiagnosticsFromDom, tryBlobVideoFallback]);

  const handleToggleVideoPlayback = () => {
    const videoEl = videoElementRef.current;
    if (!videoEl) return;
    videoEl.defaultMuted = true;
    videoEl.muted = true;
    if (videoEl.paused) {
      setUserPausedVideo(false);
      videoEl
        .play()
        .then(() => {
          playPromiseStatusRef.current = 'RESOLVED (manual)';
          setIsVideoPlaying(true);
          syncDiagnosticsFromDom('manual-play');
        })
        .catch((err: unknown) => {
          const errName = err instanceof Error ? err.name : 'PlayError';
          const errMsg = err instanceof Error ? err.message : String(err);
          playPromiseStatusRef.current = `REJECTED (${errName}: ${errMsg})`;
          setIsVideoPlaying(false);
          syncDiagnosticsFromDom('manual-play-rejected');
        });
    } else {
      setUserPausedVideo(true);
      videoEl.pause();
      playPromiseStatusRef.current = 'USER_PAUSED';
      setIsVideoPlaying(false);
      syncDiagnosticsFromDom('manual-pause');
    }
  };

  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setBlobFallbackSrc(null);
    setCustomVideoSrc(objectUrl);
    setHeroMode('video');
    setUserPausedVideo(false);
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
    setBlobFallbackSrc(null);
    blobAttemptedForSrcRef.current = null;
    setVideoLoaded(true);
    setVideoError(false);
    setUserPausedVideo(false);
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
          0. PRIORITY LAYER: HOMEPAGE HERO VIDEO (<video> MP4)
             Plays the verified faststart video-only MP4 (/assets/hero/ravaq-hero.mp4)
             with frame-0 matching poster (/assets/hero/ravaq-hero-poster.jpg).
          ==================================================================== */}
      {activeVideoSrc && heroMode === 'video' && (
        <video
          ref={videoElementRef}
          src={activeVideoSrc}
          autoPlay={!userPausedVideo}
          muted
          loop
          playsInline
          preload="auto"
          poster={activeVideoPoster}
          onLoadStart={() => syncDiagnosticsFromDom('loadstart')}
          onLoadedMetadata={() => syncDiagnosticsFromDom('loadedmetadata')}
          onLoadedData={() => {
            setVideoLoaded(true);
            setVideoError(false);
            syncDiagnosticsFromDom('loadeddata');
            attemptVideoPlay('loadeddata');
          }}
          onCanPlay={() => {
            setVideoLoaded(true);
            setVideoError(false);
            syncDiagnosticsFromDom('canplay');
            if (!userPausedVideo && videoElementRef.current?.paused) {
              attemptVideoPlay('canplay');
            }
          }}
          onPlaying={() => {
            setIsVideoPlaying(true);
            setVideoLoaded(true);
            setVideoError(false);
            syncDiagnosticsFromDom('playing');
          }}
          onPlay={() => {
            setIsVideoPlaying(true);
            syncDiagnosticsFromDom('play');
          }}
          onPause={() => {
            setIsVideoPlaying(false);
            syncDiagnosticsFromDom('pause');
          }}
          onWaiting={() => syncDiagnosticsFromDom('waiting')}
          onStalled={() => syncDiagnosticsFromDom('stalled')}
          onError={() => {
            syncDiagnosticsFromDom('error');
            tryBlobVideoFallback();
          }}
          className={
            hasValidHeroVideo
              ? 'block w-full h-full object-cover object-[80%_center] lg:object-[center_center]'
              : 'sr-only'
          }
        />
      )}

      {/* ====================================================================
          1. RESPONSIVE <picture> ARCHITECTURE (Clean 16:9 Studio Hero Photo)
             Rendered only when heroMode === 'image' or video is unavailable
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
              if (customDesktopSrc || customMobileSrc) {
                setCustomDesktopSrc(null);
                setCustomMobileSrc(null);
                setDesktopAssetError(false);
                setDesktopAssetLoaded(true);
              } else {
                const target = e.currentTarget;
                if (!target.src.endsWith('/assets/hero/boutique-hero.jpg')) {
                  target.src = '/assets/hero/boutique-hero.jpg';
                  setDesktopAssetError(false);
                  setDesktopAssetLoaded(true);
                } else {
                  setDesktopAssetError(true);
                  setDesktopAssetLoaded(false);
                }
              }
            }}
            className="w-full h-full object-cover object-[74%_center] md:object-[center_center]"
          />
        </picture>
      )}

      {/* ====================================================================
          2. CONTINUOUS FULL-VIEWPORT BOUTIQUE ARCHITECTURAL ENVIRONMENT
             (Fallback when external hero video / 3D render files are unavailable)
          ==================================================================== */}
      {!hasValidHeroVideo && !hasValidRenderedImage && (
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
                <linearGradient id="walnutWoodShelf" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#43281C" />
                  <stop offset="50%" stopColor="#5E3A28" />
                  <stop offset="100%" stopColor="#3B2217" />
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

      {/* ====================================================================
          DEVELOPMENT-ONLY LIVE VIDEO DIAGNOSTIC PANEL (Hidden in Production & Studio Photo Mode)
          Shows real-time <video> DOM properties, frame counter & errors
          ==================================================================== */}
      {isDevPreview && heroMode === 'video' && (
        <div
          dir="ltr"
          className="absolute bottom-4 left-4 z-40 max-w-[380px] rounded-lg bg-[#1A0D10]/90 backdrop-blur-md border border-[#B89A62]/50 text-[#F8F4EC] text-[11px] font-mono shadow-xl pointer-events-auto"
        >
          <div className="flex items-center justify-between gap-3 px-3 py-1.5 border-b border-[#B89A62]/30">
            <div className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#B89A62]" />
              <span className="font-bold text-[#B89A62]">DEV HERO VIDEO DIAGNOSTICS</span>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  !diagnostics.paused && diagnostics.readyState >= 2
                    ? 'bg-emerald-500/25 text-emerald-300 border border-emerald-500/40'
                    : diagnostics.errorCode !== null
                    ? 'bg-red-500/25 text-red-300 border border-red-500/40'
                    : 'bg-amber-500/25 text-amber-300 border border-amber-500/40'
                }`}
              >
                {!diagnostics.paused && diagnostics.readyState >= 2
                  ? 'PLAYING'
                  : diagnostics.errorCode !== null
                  ? 'ERROR'
                  : diagnostics.paused
                  ? 'PAUSED'
                  : 'LOADING'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowDevDiag((prev) => !prev)}
              className="text-[10px] text-[#EFE5D6]/75 hover:text-[#F8F4EC] underline cursor-pointer"
            >
              {showDevDiag ? 'Hide' : 'Show'}
            </button>
          </div>

          {showDevDiag && (
            <div className="p-2.5 space-y-1 text-[10px] leading-relaxed">
              <div className="truncate" title={diagnostics.currentSrc}>
                <span className="text-[#EFE5D6]/60">currentSrc: </span>
                <span className="text-[#F8F4EC]">{diagnostics.currentSrc || 'none'}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-2">
                <div>
                  <span className="text-[#EFE5D6]/60">readyState: </span>
                  <span>{diagnostics.readyStateLabel}</span>
                </div>
                <div>
                  <span className="text-[#EFE5D6]/60">networkState: </span>
                  <span>{diagnostics.networkStateLabel}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-2">
                <div>
                  <span className="text-[#EFE5D6]/60">paused / ended: </span>
                  <span>
                    {String(diagnostics.paused)} / {String(diagnostics.ended)}
                  </span>
                </div>
                <div>
                  <span className="text-[#EFE5D6]/60">dimensions: </span>
                  <span>
                    {diagnostics.videoWidth}×{diagnostics.videoHeight}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-x-2">
                <div>
                  <span className="text-[#EFE5D6]/60">time / dur: </span>
                  <span className="text-emerald-300 font-semibold">
                    {diagnostics.currentTime.toFixed(2)}s / {diagnostics.duration.toFixed(2)}s
                  </span>
                </div>
                <div>
                  <span className="text-[#EFE5D6]/60">decodedFrames: </span>
                  <span className="text-emerald-300 font-semibold">
                    {diagnostics.decodedFrames}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-[#EFE5D6]/60">play() promise: </span>
                <span
                  className={
                    diagnostics.playPromiseStatus.startsWith('RESOLVED')
                      ? 'text-emerald-300'
                      : 'text-amber-300'
                  }
                >
                  {diagnostics.playPromiseStatus}
                </span>
              </div>
              <div>
                <span className="text-[#EFE5D6]/60">video.error: </span>
                <span className={diagnostics.errorCode ? 'text-red-300 font-bold' : 'text-[#EFE5D6]/80'}>
                  {diagnostics.errorCode
                    ? `code=${diagnostics.errorCode} (${diagnostics.errorMessage})`
                    : 'null (no error)'}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-[#F8F4EC]/15">
                <span className="text-[#EFE5D6]/60">
                  osReducedMotion={String(Boolean(prefersReducedMotion))} · last={diagnostics.lastEvent}
                </span>
                <button
                  type="button"
                  onClick={() => attemptVideoPlay('dev-diag-btn')}
                  className="px-2 py-0.5 rounded bg-[#B89A62] text-[#292624] font-bold hover:bg-[#D6BC88] cursor-pointer"
                >
                  Force play()
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Discreet Hero Media Mode Toggle (Video vs Studio Photo + Play/Pause Control) */}
      {(hasValidHeroVideo || hasValidRenderedImage) && (
        <div className="absolute bottom-4 right-4 z-30 flex items-center gap-2 pointer-events-auto">
          {Boolean(activeVideoSrc) && !videoError && (
            <div className="inline-flex items-center p-1 bg-[#231015]/80 backdrop-blur-md border border-[#B89A62]/40 rounded-lg text-[11px] text-[#F8F4EC]">
              <button
                type="button"
                onClick={() => {
                  setHeroMode('video');
                  setUserPausedVideo(false);
                }}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                  heroMode === 'video'
                    ? 'bg-[#742E3A] text-[#F8F4EC] font-semibold'
                    : 'text-[#EFE5D6]/75 hover:text-[#F8F4EC]'
                }`}
              >
                <Film className="w-3.5 h-3.5 text-[#B89A62]" />
                <span>ویدیوی سینمایی</span>
              </button>
              {heroMode === 'video' && (
                <button
                  type="button"
                  onClick={handleToggleVideoPlayback}
                  aria-label={isVideoPlaying ? 'توقف ویدیو هیرو' : 'پخش ویدیو هیرو'}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[#B89A62] hover:text-[#F8F4EC] transition-colors cursor-pointer"
                >
                  {isVideoPlaying ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>توقف</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>پخش</span>
                    </>
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setHeroMode('image');
                  setDesktopAssetError(false);
                  setDesktopAssetLoaded(true);
                }}
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
          ==================================================================== */}
      <div
        className={`absolute inset-0 pointer-events-none ${
          hasValidHeroVideo
            ? 'bg-gradient-to-b from-[#231015]/92 via-[#292624]/45 to-[#231015]/78 md:bg-[linear-gradient(to_right,#211015_0%,#241117_42%,rgba(36,17,23,0.82)_50%,rgba(36,17,23,0)_64%)]'
            : 'bg-gradient-to-b from-[#231015]/65 via-[#292624]/20 to-[#231015]/55 md:bg-[linear-gradient(to_right,rgba(33,16,21,0.68)_0%,rgba(33,16,21,0.38)_36%,rgba(33,16,21,0.08)_60%,rgba(33,16,21,0)_100%)]'
        }`}
        aria-hidden="true"
      />
    </motion.div>
  );
};

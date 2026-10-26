import React from 'react';
import { HeroMedia } from './HeroMedia.tsx';
import { HeroContent } from './HeroContent.tsx';

interface HeroSectionProps {
  totalProductCount: number;
  onNavigate: (path: string) => void;
}

/**
 * HeroSection Component (Sections 2, 3, 4, 7, 9, 11)
 * - Fills the entire initial viewport edge-to-edge (min-h-[100svh]).
 * - Continuous boutique environment: never a split-screen layout or half-screen card.
 * - Mobile: HeroContent sits in the safe upper zone (pt-20) while the character & gift box occupy the lower zone.
 * - Desktop: Character & gift box occupy the right third, while HeroContent occupies the calm negative space on the left.
 */
export const HeroSection: React.FC<HeroSectionProps> = ({
  totalProductCount,
  onNavigate,
}) => {
  return (
    <section
      className="relative w-full min-h-[100svh] flex flex-col justify-start md:justify-center overflow-hidden bg-[#2D131A]"
      aria-label="بخش آغازین؛ بوتیک رواق و هدیه‌ای از دل ایران"
    >
      {/* Full-Viewport Edge-to-Edge Media & Architectural Boutique Stage */}
      <HeroMedia />

      {/* Foreground HTML Overlay Container */}
      <div className="relative z-20 w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 pt-20 pb-8 md:py-24 pointer-events-none">
        <HeroContent
          totalProductCount={totalProductCount}
          onNavigate={onNavigate}
        />
      </div>
    </section>
  );
};

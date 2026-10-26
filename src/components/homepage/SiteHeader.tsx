import React, { useState, useEffect } from 'react';
import {
  Search,
  ShoppingBag,
  User,
  Menu,
  X,
  ShieldCheck,
} from 'lucide-react';
import { RavaqLogo } from '../RavaqVisuals.tsx';
import { toPersianDigits } from '../../lib/persian.ts';

export interface SiteHeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  cartCount: number;
  user: {
    uid: string;
    displayName: string;
    email: string;
    role: 'CUSTOMER' | 'ADMIN';
  } | null;
}

/**
 * SiteHeader Component (Sections 8 & 11)
 * - Initially renders a compact, transparent overlay over the full-viewport hero with strong contrast.
 * - Smoothly transitions to a warm ivory (#F8F4EC) bar with warm charcoal (#292624) text when scrolled.
 * - Never places a large opaque bar over the hero character or gift box.
 */
export const SiteHeader: React.FC<SiteHeaderProps> = ({
  currentPath,
  onNavigate,
  cartCount,
  user,
}) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isHomeHero =
    currentPath === '/' && !scrolled && !mobileMenuOpen && !searchOpen;

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 32);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Exact navigation items required by Section 8
  const navItems = [
    { label: 'خانه', path: '/' },
    { label: 'فروشگاه', path: '/shop' },
    { label: 'آجیل و خشکبار', path: '/category/nuts-dried-fruits' },
    { label: 'شیرینی سنتی', path: '/category/traditional-sweets' },
    { label: 'زعفران و خوراکی‌ها', path: '/category/saffron-select-foods' },
    { label: 'صنایع‌دستی', path: '/category/iranian-handicrafts' },
    { label: 'جعبه‌های هدیه', path: '/gift-boxes' },
  ];

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    setSearchOpen(false);
    setMobileMenuOpen(false);
    if (q) {
      onNavigate(`/search?q=${encodeURIComponent(q)}`);
    } else {
      onNavigate('/shop');
    }
  };

  return (
    <header
      className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        isHomeHero
          ? 'bg-gradient-to-b from-[#231015]/82 via-[#231015]/38 to-transparent border-b border-transparent text-[#F8F4EC]'
          : 'bg-[#F8F4EC]/96 backdrop-blur-md border-b border-[#E4DCCF] text-[#292624] shadow-2xs'
      }`}
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 h-16 md:h-20 flex items-center justify-between gap-4 lg:gap-8">
        {/* Zone 1 (Right Side in RTL): Prominent Bilingual Brand Identity + Mobile Menu Trigger */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`xl:hidden p-2 rounded-lg transition-colors cursor-pointer ${
              isHomeHero
                ? 'hover:bg-[#F8F4EC]/15 text-[#F8F4EC]'
                : 'hover:bg-[#EFE5D6] text-[#292624]'
            }`}
            aria-label={mobileMenuOpen ? 'بستن منوی ناوبری' : 'باز کردن منوی ناوبری'}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('/');
            }}
            className="inline-flex items-center py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B89A62] rounded-md transition-opacity hover:opacity-90"
            aria-label="صفحه اصلی بوتیک رواق | RAVĀQ"
          >
            <RavaqLogo
              variant={isHomeHero ? 'light' : 'dark'}
              layout="bilingual"
              size="md"
              className="h-10 sm:h-11 md:h-12"
            />
          </a>
        </div>

        {/* Zone 2: Primary Persian Navigation Links */}
        <nav
          className="hidden xl:flex items-center gap-6 ravaq-nav-link"
          aria-label="ناوبری اصلی فروشگاه رواق"
        >
          {navItems.map((item) => {
            const active =
              currentPath === item.path ||
              (item.path !== '/' && currentPath.startsWith(item.path));
            return (
              <a
                key={item.path}
                href={item.path}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(item.path);
                }}
                className={`whitespace-nowrap shrink-0 py-1 transition-colors border-b-2 ${
                  active
                    ? isHomeHero
                      ? 'border-[#B89A62] text-[#F8F4EC] font-semibold'
                      : 'border-[#742E3A] text-[#742E3A] font-semibold'
                    : isHomeHero
                    ? 'border-transparent text-[#F8F4EC]/90 hover:text-[#FFFFFF]'
                    : 'border-transparent text-[#292624]/85 hover:text-[#742E3A]'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Search, Account & Cart Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setSearchOpen(!searchOpen)}
            className={`p-2 rounded-lg transition-colors cursor-pointer ${
              isHomeHero
                ? 'hover:bg-[#F8F4EC]/15 text-[#F8F4EC]'
                : 'hover:bg-[#EFE5D6] text-[#292624]'
            }`}
            aria-label="جستجوی محصولات"
            aria-expanded={searchOpen}
          >
            <Search className="w-4 h-4" />
          </button>

          {user?.role === 'ADMIN' && (
            <button
              type="button"
              onClick={() => onNavigate('/admin')}
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                isHomeHero
                  ? 'bg-[#B89A62] text-[#292624] hover:bg-[#EFE5D6]'
                  : 'bg-[#EFE5D6] text-[#4C202B] hover:bg-[#E4DCCF]'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>مدیریت</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => onNavigate(user ? '/account' : '/login')}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isHomeHero
                ? 'hover:bg-[#F8F4EC]/15 text-[#F8F4EC]'
                : 'hover:bg-[#EFE5D6] text-[#292624]'
            }`}
            aria-label={user ? 'حساب کاربری' : 'ورود یا ثبت‌نام'}
          >
            <User className="w-4 h-4" />
            <span className="hidden md:inline">
              {user ? user.displayName.split(' ')[0] : 'حساب کاربری'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('/cart')}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 min-h-[38px] text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isHomeHero
                ? 'bg-[#F8F4EC] text-[#4C202B] hover:bg-[#EFE5D6]'
                : 'bg-[#742E3A] text-[#F8F4EC] hover:bg-[#4C202B]'
            }`}
            aria-label={`سبد خرید شامل ${toPersianDigits(cartCount)} کالا`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>سبد خرید</span>
            <span className="tabular-nums font-bold">
              ({toPersianDigits(cartCount)})
            </span>
          </button>
        </div>
      </div>

      {/* Expandable Search Bar */}
      {searchOpen && (
        <div className="bg-[#F8F4EC] text-[#292624] border-b border-[#E4DCCF] py-3 px-4 sm:px-6">
          <form
            onSubmit={handleSearchSubmit}
            className="max-w-2xl mx-auto flex items-center gap-2"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[#77716A] absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو در رواق (مثلاً: پسته، زعفران، گز اصفهان، جعبه هدیه شب یلدا...)"
                className="w-full pr-10 pl-4 py-2.5 text-sm bg-[#FFFFFF] border border-[#E4DCCF] rounded-lg focus:outline-none focus:border-[#742E3A]"
                autoFocus
              />
            </div>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#742E3A] text-[#F8F4EC] text-xs font-medium rounded-lg hover:bg-[#4C202B] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              جستجو
            </button>
            <button
              type="button"
              onClick={() => setSearchOpen(false)}
              className="px-3 py-2.5 text-xs text-[#77716A] hover:text-[#292624] cursor-pointer"
            >
              بستن
            </button>
          </form>
        </div>
      )}

      {/* Compact Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="xl:hidden bg-[#F8F4EC] text-[#292624] border-b border-[#E4DCCF] px-4 py-4 space-y-3 shadow-lg max-h-[75vh] overflow-y-auto">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="جستجوی محصول..."
              className="flex-1 px-3.5 py-2 text-sm bg-[#FFFFFF] border border-[#E4DCCF] rounded-lg"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#742E3A] text-[#F8F4EC] text-xs font-medium rounded-lg cursor-pointer"
            >
              جستجو
            </button>
          </form>

          <nav className="grid grid-cols-1 gap-1" aria-label="منوی موبایل">
            {navItems.map((item) => (
              <a
                key={item.path}
                href={item.path}
                onClick={(e) => {
                  e.preventDefault();
                  setMobileMenuOpen(false);
                  onNavigate(item.path);
                }}
                className={`px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  currentPath === item.path
                    ? 'bg-[#EFE5D6] text-[#742E3A] font-semibold'
                    : 'text-[#292624] hover:bg-[#EFE5D6]/60'
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="pt-2.5 border-t border-[#E4DCCF] flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate('/track-order');
              }}
              className="text-[#742E3A] font-medium cursor-pointer"
            >
              پیگیری سفارش
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onNavigate(user ? '/account' : '/login');
              }}
              className="text-[#292624] font-medium cursor-pointer"
            >
              {user ? `حساب کاربری (${user.displayName})` : 'ورود / ثبت‌نام'}
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

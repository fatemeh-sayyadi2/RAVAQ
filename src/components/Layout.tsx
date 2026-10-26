import React, { useState } from 'react';
import {
  ShieldCheck,
  PackageSearch,
} from 'lucide-react';
import { RavaqLogo } from './RavaqVisuals.tsx';
import { StoreSettings } from '../lib/types.ts';
import { toPersianDigits } from '../lib/persian.ts';
import { SiteHeader } from './homepage/SiteHeader.tsx';

export { SiteHeader, SiteHeader as Header };

interface FooterProps {
  settings: StoreSettings;
  onNavigate: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ settings, onNavigate }) => {
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterState, setNewsletterState] = useState<{
    status: 'idle' | 'loading' | 'success' | 'error';
    message?: string;
  }>({ status: 'idle' });

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewsletterState({ status: 'loading' });
    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        setNewsletterState({
          status: 'error',
          message: data.error || 'خطا در ثبت ایمیل.',
        });
      } else {
        setNewsletterEmail('');
        setNewsletterState({
          status: 'success',
          message: data.message || 'ایمیل شما با موفقیت ثبت شد.',
        });
      }
    } catch {
      setNewsletterState({
        status: 'error',
        message: 'ارتباط با سرور برقرار نشد.',
      });
    }
  };

  const currentPersianYear = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
    year: 'numeric',
  }).format(new Date());

  return (
    <footer className="bg-[#EFE5D6] border-t border-[#E4DCCF] text-[#292624] mt-20">
      {/* Newsletter Section (Section 5.H) */}
      <div className="border-b border-[#E4DCCF]">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8">
          <div className="max-w-xl space-y-2">
            <h3 className="text-xl font-bold text-[#292624]">
              خبرنامه و تازه‌های فصلی رَواق
            </h3>
            <p className="text-sm text-[#77716A] leading-relaxed">
              از مجموعه‌های جدید نوروز و شب یلدا، جعبه‌های هدیه فصلی و کدهای تخفیف آزمایشی رواق باخبر شوید.
            </p>
          </div>

          <div className="w-full lg:w-auto flex-1 max-w-md">
            <form onSubmit={handleNewsletterSubmit} className="flex gap-2">
              <input
                type="email"
                value={newsletterEmail}
                onChange={(e) => setNewsletterEmail(e.target.value)}
                placeholder="آدرس ایمیل شما (مثلاً name@example.com)"
                dir="ltr"
                className="flex-1 px-4 py-2.5 text-sm bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg text-left focus:outline-none focus:border-[#742E3A]"
                required
              />
              <button
                type="submit"
                disabled={newsletterState.status === 'loading'}
                className="px-5 py-2.5 bg-[#742E3A] text-[#F8F4EC] text-xs font-medium rounded-lg hover:bg-[#4C202B] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
              >
                {newsletterState.status === 'loading' ? 'در حال ثبت...' : 'عضویت در خبرنامه'}
              </button>
            </form>
            {newsletterState.message && (
              <p
                className={`mt-2 text-xs ${
                  newsletterState.status === 'success'
                    ? 'text-[#2D8C88] font-medium'
                    : 'text-[#742E3A] font-medium'
                }`}
              >
                {newsletterState.message}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Main Footer Grid */}
      <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 py-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
        {/* Column 1: Brand Statement */}
        <div className="space-y-4">
          <RavaqLogo variant="dark" layout="bilingual" size="md" className="h-11" />
          <p className="text-sm text-[#77716A] leading-relaxed">
            {settings.storeTagline}. رواق پیوندی میان طعم‌های اصیل ایرانی، هنرهای کاربردی و فرهنگ پیشکش و مهمان‌نوازی است.
          </p>
          <p className="text-xs text-[#77716A] bg-[#F8F4EC] p-3 rounded-lg border border-[#E4DCCF] leading-relaxed">
            {settings.demoModeNotice}
          </p>
        </div>

        {/* Column 2: Product Categories */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-[#292624]">دسته‌بندی محصولات</h4>
          <ul className="space-y-2 text-sm text-[#77716A]">
            <li>
              <button
                type="button"
                onClick={() => onNavigate('/category/nuts-dried-fruits')}
                className="hover:text-[#742E3A] transition-colors cursor-pointer"
              >
                آجیل و خشکبار
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onNavigate('/category/traditional-sweets')}
                className="hover:text-[#742E3A] transition-colors cursor-pointer"
              >
                شیرینی‌های سنتی
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onNavigate('/category/saffron-select-foods')}
                className="hover:text-[#742E3A] transition-colors cursor-pointer"
              >
                زعفران و خوراکی‌های منتخب
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onNavigate('/category/iranian-handicrafts')}
                className="hover:text-[#742E3A] transition-colors cursor-pointer"
              >
                صنایع‌دستی ایرانی
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onNavigate('/gift-boxes')}
                className="hover:text-[#742E3A] transition-colors cursor-pointer"
              >
                جعبه‌های هدیه
              </button>
            </li>
          </ul>
        </div>

        {/* Column 3: Customer Service & Policies */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-[#292624]">خدمات مشتریان و راهنما</h4>
          <ul className="space-y-2 text-sm text-[#77716A]">
            <li>
              <button
                type="button"
                onClick={() => onNavigate('/track-order')}
                className="hover:text-[#742E3A] transition-colors cursor-pointer"
              >
                پیگیری سفارش
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onNavigate('/faq')}
                className="hover:text-[#742E3A] transition-colors cursor-pointer"
              >
                پرسش‌های متداول
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onNavigate('/shipping')}
                className="hover:text-[#742E3A] transition-colors cursor-pointer"
              >
                شیوه‌ها و سیاست ارسال (آزمایشی)
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onNavigate('/returns')}
                className="hover:text-[#742E3A] transition-colors cursor-pointer"
              >
                شرایط بازگشت و استرداد (آزمایشی)
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onNavigate('/privacy')}
                className="hover:text-[#742E3A] transition-colors cursor-pointer"
              >
                حریم خصوصی
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onNavigate('/terms')}
                className="hover:text-[#742E3A] transition-colors cursor-pointer"
              >
                قوانین و شرایط استفاده
              </button>
            </li>
          </ul>
        </div>

        {/* Column 4: About & Centralized Contact */}
        <div className="space-y-3">
          <h4 className="text-sm font-bold text-[#292624]">درباره و ارتباط با رَواق</h4>
          <ul className="space-y-2 text-sm text-[#77716A]">
            <li>
              <button
                type="button"
                onClick={() => onNavigate('/about')}
                className="hover:text-[#742E3A] transition-colors cursor-pointer"
              >
                داستان و فلسفه رواق
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => onNavigate('/contact')}
                className="hover:text-[#742E3A] transition-colors cursor-pointer"
              >
                فرم تماس با ما
              </button>
            </li>
            <li className="pt-2 text-xs">
              <span className="block text-[#292624] font-medium">ایمیل پشتیبانی (پیکربندی مرکزی):</span>
              <span dir="ltr" className="font-mono text-[#77716A]">
                {settings.supportEmail}
              </span>
            </li>
            <li className="text-xs">
              <span className="block text-[#292624] font-medium">ساعات پاسخگویی:</span>
              <span>{settings.supportHours}</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Copyright Strip */}
      <div className="border-t border-[#E4DCCF] py-6">
        <div className="max-w-[1360px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#77716A]">
          <p>
            © {currentPersianYear} رَواق (RAVĀQ). تمامی حقوق طراحی و کدنویسی این نمونه تجاری و فنی محفوظ است.
          </p>
          <div className="flex items-center gap-4">
            <span>واحد پول: تومان (نمایشی)</span>
            <span aria-hidden="true">·</span>
            <span>درگاه پرداخت: شبیه‌ساز آزمایشی امن</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

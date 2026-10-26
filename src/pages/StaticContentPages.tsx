import React, { useState } from 'react';
import { CheckCircle2, ArrowLeft } from 'lucide-react';
import { StoreSettings } from '../lib/types.ts';
import { formatToman } from '../lib/persian.ts';

interface StaticPageProps {
  page: 'about' | 'contact' | 'faq' | 'shipping' | 'returns' | 'privacy' | 'terms' | 'not-found';
  settings: StoreSettings;
  onNavigate: (path: string) => void;
}

export const StaticContentPage: React.FC<StaticPageProps> = ({
  page,
  settings,
  onNavigate,
}) => {
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactMessage, setContactMessage] = useState('');
  const [contactSubmitted, setContactSubmitted] = useState(false);

  if (page === 'not-found') {
    return (
      <div className="max-w-xl mx-auto px-4 pt-36 pb-24 text-center space-y-4">
        <span className="text-xs font-bold text-[#742E3A]">خطای ۴۰۴</span>
        <h1 className="text-3xl font-bold text-[#292624]">صفحه مورد نظر در رواق یافت نشد</h1>
        <p className="text-sm text-[#77716A] leading-relaxed">
          نشانی واردشده موجود نیست یا جابه‌جا شده است. می‌توانید به صفحه اصلی یا فروشگاه رواق بازگردید.
        </p>
        <div className="pt-2 flex justify-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('/shop')}
            className="px-6 py-3 bg-[#742E3A] text-[#F8F4EC] text-xs font-bold rounded-lg cursor-pointer"
          >
            ورود به فروشگاه رواق
          </button>
          <button
            type="button"
            onClick={() => onNavigate('/')}
            className="px-6 py-3 bg-[#FFFFFF] text-[#292624] border border-[#E4DCCF] text-xs font-bold rounded-lg cursor-pointer"
          >
            بازگشت به خانه
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">
      <div className="bg-[#FFFFFF] border border-[#E4DCCF] rounded-2xl p-6 sm:p-10 space-y-6">
        {page === 'about' && (
          <>
            <p className="text-xs font-semibold text-[#742E3A]">درباره رَواق | RAVĀQ</p>
            <h1 className="text-2xl sm:text-4xl font-bold text-[#292624]">
              رواق؛ بوتیک معاصر طعم‌ها، صنایع‌دستی و پیشکش‌های ایرانی
            </h1>
            <p className="text-sm sm:text-base text-[#292624]/85 leading-relaxed">
              رَواق با هدف بازتعریف تجربه خرید سوغات، خشکبار، شیرینی‌های سنتی، زعفران و هدایای ایرانی شکل گرفته است. ما باور داریم یک هدیه خوب، ترکیبی از کیفیت خوراکی، اصالت ظروف و دقت در بسته‌بندی است.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="bg-[#F8F4EC] p-4 rounded-xl border border-[#E4DCCF] space-y-1.5">
                <h3 className="text-sm font-bold text-[#292624]">صداقت در معرفی محصول</h3>
                <p className="text-xs text-[#77716A] leading-relaxed">
                  در رواق هیچ ادعای تأییدنشده‌ای درباره گواهی‌های ارگانیک، خواص درمانی یا منشأ جغرافیایی نادقیق درج نمی‌شود.
                </p>
              </div>
              <div className="bg-[#F8F4EC] p-4 rounded-xl border border-[#E4DCCF] space-y-1.5">
                <h3 className="text-sm font-bold text-[#292624]">بسته‌بندی درخور پیشکش</h3>
                <p className="text-xs text-[#77716A] leading-relaxed">
                  جعبه‌های هدیه رواق با پالت رنگی عاجی، زرشکی و فیروزه‌ای برای نوروز، شب یلدا و مناسبت‌های سازمانی طراحی شده‌اند.
                </p>
              </div>
              <div className="bg-[#F8F4EC] p-4 rounded-xl border border-[#E4DCCF] space-y-1.5">
                <h3 className="text-sm font-bold text-[#292624]">معماری فنی کامل</h3>
                <p className="text-xs text-[#77716A] leading-relaxed">
                  این پروژه یک نمونه تمام‌عیار تجاری و فنی با مدیریت موجودی، کوپن، احراز هویت و درگاه پرداخت آزمایشی است.
                </p>
              </div>
            </div>
          </>
        )}

        {page === 'contact' && (
          <>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#292624]">تماس با رَواق</h1>
            <p className="text-xs sm:text-sm text-[#77716A] leading-relaxed">
              اطلاعات تماس زیر از پیکربندی مرکزی فروشگاه فراخوانی شده است (بدون درج آدرس یا شماره تلفن ساختگی).
            </p>
            <div className="bg-[#F8F4EC] p-4 rounded-xl border border-[#E4DCCF] text-xs space-y-1.5">
              <div>
                <strong>ایمیل پشتیبانی:</strong>{' '}
                <span dir="ltr" className="font-mono">
                  {settings.supportEmail}
                </span>
              </div>
              <div>
                <strong>ساعات پاسخگویی:</strong> {settings.supportHours}
              </div>
            </div>

            {contactSubmitted ? (
              <div className="bg-[#E5EEE6] border border-[#2D8C88] p-5 rounded-xl flex items-center gap-2.5 text-xs font-medium text-[#292624]">
                <CheckCircle2 className="w-5 h-5 text-[#2D8C88]" />
                <span>پیام شما با موفقیت ثبت شد. سپاس از همراهی شما با رواق.</span>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  setContactSubmitted(true);
                }}
                className="space-y-4 pt-2"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="نام و نام خانوادگی *"
                    className="px-3.5 py-2.5 text-sm bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg"
                    required
                  />
                  <input
                    type="email"
                    dir="ltr"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="آدرس ایمیل *"
                    className="px-3.5 py-2.5 text-sm bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg text-left"
                    required
                  />
                </div>
                <textarea
                  rows={4}
                  value={contactMessage}
                  onChange={(e) => setContactMessage(e.target.value)}
                  placeholder="متن پیام یا درخواست سفارش سازمانی *"
                  className="w-full px-3.5 py-2.5 text-sm bg-[#F8F4EC] border border-[#E4DCCF] rounded-lg"
                  required
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-[#742E3A] text-[#F8F4EC] text-xs font-bold rounded-lg cursor-pointer"
                >
                  ارسال پیام
                </button>
              </form>
            )}
          </>
        )}

        {page === 'faq' && (
          <>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#292624]">پرسش‌های متداول</h1>
            <div className="space-y-4 text-xs sm:text-sm">
              <div className="p-4 rounded-xl bg-[#F8F4EC] border border-[#E4DCCF] space-y-1">
                <h3 className="font-bold text-[#292624]">
                  آیا درگاه پرداخت این وب‌سایت وجه واقعی دریافت می‌کند؟
                </h3>
                <p className="text-[#77716A] leading-relaxed">
                  خیر. درگاه پرداخت رواق یک شبیه‌ساز آزمایشی (Test Payment Gateway) است که بدون دریافت اطلاعات کارت بانکی، سناریوهای پرداخت موفق، ناموفق، لغو و تلاش مجدد را در پایگاه داده اجرا می‌کند.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#F8F4EC] border border-[#E4DCCF] space-y-1">
                <h3 className="font-bold text-[#292624]">
                  موجودی جعبه‌های هدیه چگونه محاسبه می‌شود؟
                </h3>
                <p className="text-[#77716A] leading-relaxed">
                  موجودی هر جعبه هدیه در سرور بر اساس کمترین موجودی اقلام تشکیل‌دهنده آن محاسبه می‌شود تا از فروش بیش از موجودی (Overselling) جلوگیری شود.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-[#F8F4EC] border border-[#E4DCCF] space-y-1">
                <h3 className="font-bold text-[#292624]">
                  چگونه می‌توانم سفارش خود را پیگیری کنم؟
                </h3>
                <p className="text-[#77716A] leading-relaxed">
                  از بخش «پیگیری سفارش» با وارد کردن شماره سفارش (مثلاً RVQ-1405-1001) و شماره موبایل ثبت‌شده هنگام خرید می‌توانید وضعیت لحظه‌ای سفارش را مشاهده کنید.
                </p>
              </div>
            </div>
          </>
        )}

        {page === 'shipping' && (
          <>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#292624]">
              سیاست و شیوه‌های ارسال (نسخه آزمایشی / Demo Policy)
            </h1>
            <p className="text-xs sm:text-sm text-[#77716A] leading-relaxed">
              قوانین زیر جهت محاسبه خودکار هزینه ارسال در محیط توسعه و نمایش نمونه کار تنظیم شده‌اند:
            </p>
            <ul className="list-disc pr-5 space-y-2 text-xs sm:text-sm text-[#292624]/85">
              <li>
                ارسال استاندارد پستی: <strong>{formatToman(settings.standardShippingCost)}</strong>
              </li>
              <li>
                ارسال ویژه منتخب (تهران):{' '}
                <strong>{formatToman(settings.expressTehranShippingCost)}</strong>
              </li>
              <li>
                ارسال رایگان برای سفارش‌های بالای{' '}
                <strong>{formatToman(settings.freeShippingThreshold)}</strong>
              </li>
              <li>
                محصولات شکستنی در دسته صنایع‌دستی و جعبه‌های هدیه با بسته‌بندی محافظ چندلایه ارسال می‌شوند.
              </li>
            </ul>
          </>
        )}

        {page === 'returns' && (
          <>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#292624]">
              شرایط بازگشت و استرداد (نسخه آزمایشی / Demo Policy)
            </h1>
            <p className="text-xs sm:text-sm text-[#77716A] leading-relaxed">
              در این نسخه نمایشی، قوانین نمونه بازگشت کالا به شرح زیر تعریف شده است:
            </p>
            <ul className="list-disc pr-5 space-y-2 text-xs sm:text-sm text-[#292624]/85">
              <li>
                اقلام خوراکی (آجیل، خشکبار، شیرینی سنتی و زعفران) تنها در صورت پلمب بودن بسته‌بندی اولیه و عدم باز شدن پلمب بهداشتی قابل بررسی هستند.
              </li>
              <li>
                در صورت آسیب‌دیدگی فیزیکی ظروف سفالی یا سرامیکی در حین حمل‌ونقل، ثبت گزارش تا ۲۴ ساعت پس از تحویل امکان‌پذیر است.
              </li>
            </ul>
          </>
        )}

        {page === 'privacy' && (
          <>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#292624]">حریم خصوصی</h1>
            <p className="text-xs sm:text-sm text-[#292624]/85 leading-relaxed">
              در معماری پایگاه داده رواق، اطلاعات شخصی کاربران (ایمیل، شماره موبایل و نشانی‌های پستی) با رعایت اصل تفکیک داده‌ها (PII Isolation) ذخیره شده و در صفحه پیگیری عمومی سفارش نیز به صورت ماسک‌شده نمایش داده می‌شوند تا هیچ فرد غیرمجازی به اطلاعات شخصی مشتریان دسترسی نداشته باشد.
            </p>
          </>
        )}

        {page === 'terms' && (
          <>
            <h1 className="text-2xl sm:text-3xl font-bold text-[#292624]">
              قوانین و شرایط استفاده
            </h1>
            <p className="text-xs sm:text-sm text-[#292624]/85 leading-relaxed">
              {settings.demoModeNotice} تمامی قیمت‌ها به تومان (عدد صحیح) ذخیره و محاسبه می‌شوند و اعتبارسنجی موجودی، تخفیف‌ها و مبالغ پرداختی منحصراً در سمت سرور انجام می‌گیرد.
            </p>
          </>
        )}

        <div className="pt-4 border-t border-[#E4DCCF]">
          <button
            type="button"
            onClick={() => onNavigate('/shop')}
            className="inline-flex items-center gap-2 text-xs font-bold text-[#742E3A] hover:text-[#4C202B] cursor-pointer"
          >
            <span>مشاهده محصولات فروشگاه</span>
            <ArrowLeft className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
const PERSIAN_DIGIT_MAP: Record<string, string> = {
  '۰': '0',
  '۱': '1',
  '۲': '2',
  '۳': '3',
  '۴': '4',
  '۵': '5',
  '۶': '6',
  '۷': '7',
  '۸': '8',
  '۹': '9',
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
};

/**
 * Normalizes Persian (۰-۹) and Arabic (٠-٩) numerals to standard ASCII digits (0-9).
 */
export function normalizeDigits(input: string | number | null | undefined): string {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/[۰-۹٠-٩]/g, (char) => PERSIAN_DIGIT_MAP[char] ?? char)
    .trim();
}

/**
 * Converts ASCII digits (0-9) into Persian digits (۰-۹) for display.
 */
export function toPersianDigits(input: string | number | null | undefined): string {
  if (input === null || input === undefined) return '';
  return String(input).replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)] ?? d);
}

/**
 * Formats an integer amount in Toman with Persian thousand separators and «تومان» suffix.
 */
export function formatToman(amount: number, includeUnit = true): string {
  const safeInt = Math.max(0, Math.round(Number(amount) || 0));
  const withCommas = safeInt.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '٬');
  const persianNumber = toPersianDigits(withCommas);
  return includeUnit ? `${persianNumber} تومان` : persianNumber;
}

/**
 * Normalizes Persian and Arabic letter variants (ی/ي, ک/ك, ه/ة, half-spaces) for search.
 */
export function normalizePersianText(input: string | null | undefined): string {
  if (!input) return '';
  return normalizeDigits(input)
    .replace(/ي/g, 'ی')
    .replace(/ى/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/إ|أ|آ/g, 'ا')
    .replace(/\u200c/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Validates and normalizes an Iranian mobile number (e.g., ۰۹۱۲۳۴۵۶۷۸۹ or +989123456789 -> 09123456789).
 */
export function normalizeIranianMobile(raw: string): string {
  const digits = normalizeDigits(raw).replace(/[\s\-()]/g, '');
  if (digits.startsWith('+989') && digits.length === 13) {
    return '0' + digits.slice(3);
  }
  if (digits.startsWith('00989') && digits.length === 14) {
    return '0' + digits.slice(4);
  }
  if (digits.startsWith('989') && digits.length === 12) {
    return '0' + digits.slice(2);
  }
  if (digits.startsWith('9') && digits.length === 10) {
    return '0' + digits;
  }
  return digits;
}

export function isValidIranianMobile(raw: string): boolean {
  const normalized = normalizeIranianMobile(raw);
  return /^09\d{9}$/.test(normalized);
}

/**
 * Validates and normalizes a 10-digit Iranian postal code.
 */
export function normalizeIranianPostalCode(raw: string): string {
  return normalizeDigits(raw).replace(/[\s\-]/g, '');
}

export function isValidIranianPostalCode(raw: string): boolean {
  const normalized = normalizeIranianPostalCode(raw);
  return /^\d{10}$/.test(normalized);
}

/**
 * Formats an ISO UTC timestamp to Solar Hijri (Jalali) date in Persian.
 */
export function formatJalaliDate(isoDate: string | Date, includeTime = false): string {
  try {
    const date = typeof isoDate === 'string' ? new Date(isoDate) : isoDate;
    if (Number.isNaN(date.getTime())) return '—';
    const options: Intl.DateTimeFormatOptions = includeTime
      ? {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }
      : {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        };
    return new Intl.DateTimeFormat('fa-IR-u-ca-persian', options).format(date);
  } catch {
    return toPersianDigits(String(isoDate));
  }
}

export const IRAN_PROVINCES: { name: string; cities: string[] }[] = [
  { name: 'تهران', cities: ['تهران', 'شمیرانات', 'ری', 'شهریار', 'اسلام‌شهر', 'لواسان', 'دماوند'] },
  { name: 'اصفهان', cities: ['اصفهان', 'کاشان', 'نجف‌آباد', 'خمینی‌شهر', 'شاهین‌شهر', 'نطنز', 'خوانسار'] },
  { name: 'فارس', cities: ['شیراز', 'مرودشت', 'جهرم', 'فسا', 'کازرون', 'لار', 'آباده'] },
  { name: 'خراسان رضوی', cities: ['مشهد', 'نیشابور', 'سبزوار', 'تربت حیدریه', 'قوچان', 'کاشمر'] },
  { name: 'آذربایجان شرقی', cities: ['تبریز', 'مراغه', 'مرند', 'اهر', 'میانه', 'بناب', 'شبستر'] },
  { name: 'مازندران', cities: ['ساری', 'بابل', 'آمل', 'قائم‌شهر', 'نوشهر', 'چالوس', 'رامسر'] },
  { name: 'گیلان', cities: ['رشت', 'بندر انزلی', 'لاهیجان', 'لنگرود', 'تالش', 'آستارا', 'فومن'] },
  { name: 'کرمان', cities: ['کرمان', 'رفسنجان', 'سیرجان', 'جیرفت', 'بم', 'زرند'] },
  { name: 'یزد', cities: ['یزد', 'میبد', 'اردکان', 'مهریز', 'تفت', 'بافق'] },
  { name: 'البرز', cities: ['کرج', 'فردیس', 'هشتگرد', 'نظرآباد', 'طالقان'] },
  { name: 'قم', cities: ['قم'] },
  { name: 'قزوین', cities: ['قزوین', 'تاکستان', 'آبیک', 'بوئین‌زهرا'] },
  { name: 'همدان', cities: ['همدان', 'ملایر', 'نهاوند', 'تویسرکان', 'لالجین'] },
  { name: 'خوزستان', cities: ['اهواز', 'آبادان', 'خرمشهر', 'دزفول', 'بهبهان', 'شوشتر'] },
  { name: 'کرمانشاه', cities: ['کرمانشاه', 'اسلام‌آباد غرب', 'پاوه', 'کنگاور'] },
];

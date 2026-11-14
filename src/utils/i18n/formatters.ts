/**
 * ApplyVise AI — Locale-Aware Formatters
 * Uses standard Intl APIs with graceful fallbacks
 */

export function formatDate(
  dateInput: string | number | Date,
  locale: string = 'en-US',
  options?: Intl.DateTimeFormatOptions
): string {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);

    const defaultOptions: Intl.DateTimeFormatOptions = {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      ...options,
    };
    return new Intl.DateTimeFormat(locale, defaultOptions).format(d);
  } catch {
    return new Date(dateInput).toLocaleDateString('en-US');
  }
}

export function formatTime(
  dateInput: string | number | Date,
  locale: string = 'en-US',
  options?: Intl.DateTimeFormatOptions
): string {
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);

    const defaultOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      ...options,
    };
    return new Intl.DateTimeFormat(locale, defaultOptions).format(d);
  } catch {
    return new Date(dateInput).toLocaleTimeString('en-US');
  }
}

export function formatNumber(
  num: number,
  locale: string = 'en-US',
  options?: Intl.NumberFormatOptions
): string {
  try {
    return new Intl.NumberFormat(locale, options).format(num);
  } catch {
    return num.toLocaleString('en-US');
  }
}

export function formatPercent(
  val: number, // 0 to 1 or 0 to 100
  locale: string = 'en-US',
  isRatio: boolean = false
): string {
  try {
    const numericVal = isRatio ? val : val / 100;
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      maximumFractionDigits: 0,
    }).format(numericVal);
  } catch {
    return `${Math.round(val)}%`;
  }
}

/**
 * Locale-aware currency formatting.
 * Preserves exact numerical amount and currency code.
 */
export function formatCurrency(
  amount: number,
  currencyCode: string = 'USD',
  locale: string = 'en-US'
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode.toUpperCase(),
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currencyCode.toUpperCase()} ${amount.toLocaleString('en-US')}`;
  }
}

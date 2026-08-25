/**
 * Formatting Utilities
 * 
 * Currency, date, and month display formatting.
 * All currency uses Indian number system (₹1,25,000).
 */

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_NAMES_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Format a number as Indian currency (₹).
 * Uses Indian grouping: ₹1,25,000 instead of ₹125,000.
 * Omits decimals for whole numbers.
 */
function formatCurrency(amount) {
  if (amount == null || isNaN(amount)) return '₹0';

  const num = Number(amount);
  const isWholeNumber = num === Math.floor(num);

  // Use Indian locale for proper grouping (lakhs, crores)
  const formatted = num.toLocaleString('en-IN', {
    minimumFractionDigits: isWholeNumber ? 0 : 2,
    maximumFractionDigits: 2,
  });

  return `₹${formatted}`;
}

/**
 * Format a date string (YYYY-MM-DD) for display.
 * Returns: "25 Aug" format.
 */
function formatDateDisplay(dateStr) {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  const day = parseInt(parts[2], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  return `${day} ${MONTH_NAMES_SHORT[monthIdx]}`;
}

/**
 * Format a date for the date input (YYYY-MM-DD).
 */
function formatDateInput(date) {
  if (!date) return '';
  if (typeof date === 'string') return date;
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get today's date as YYYY-MM-DD.
 */
function getTodayStr() {
  return formatDateInput(new Date());
}

/**
 * Get month name from 0-indexed month number.
 */
function getMonthName(month) {
  return MONTH_NAMES[month] || '';
}

/**
 * Get "Month Year" string, e.g. "August 2026".
 */
function getMonthYear(year, month) {
  return `${MONTH_NAMES[month]} ${year}`;
}

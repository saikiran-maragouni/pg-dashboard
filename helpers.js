/**
 * helpers.js — Shared pure functions
 *
 * Reused across the dashboard (app.js), test page (test.js), and future stages.
 * No side effects, no DOM access, no imports.
 */

// ─── Floor labels ────────────────────────────────────────────────────────────

const FLOOR_NAMES = ['Ground', '1st', '2nd', '3rd', '4th', '5th'];

/**
 * Human-readable floor name.
 * @param {number} floorNum - 0 = Ground, 1 = 1st, etc.
 * @returns {string}
 */
export function floorLabel(floorNum) {
  return FLOOR_NAMES[floorNum] ?? `Floor ${floorNum}`;
}

// ─── Date helpers ────────────────────────────────────────────────────────────

/**
 * Today's date at local midnight (time stripped).
 * @returns {Date}
 */
function localToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Parse a YYYY-MM-DD string as a local-time Date (midnight).
 * Avoids UTC-shift bugs that new Date("2026-10-15") can cause.
 * @param {string} dateStr
 * @returns {Date}
 */
function parseLocalDate(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// ─── Row status helpers ─────────────────────────────────────────────────────

/**
 * Is this bed overdue?
 * True when occupied, PaymentStatus is "due", and DueDate is before today
 * (compared as calendar dates in local time, ignoring time of day).
 *
 * @param {Object} row - A bed row object
 * @returns {boolean}
 */
export function isOverdue(row) {
  if (row.Status !== 'occupied')    return false;
  if (row.PaymentStatus !== 'due')  return false;
  if (!row.DueDate)                 return false;
  return parseLocalDate(row.DueDate) < localToday();
}

/**
 * Is this bed "due soon" — due within `withinDays` but NOT yet overdue?
 * Useful for an amber/warning tint in the UI.
 *
 * @param {Object} row        - A bed row object
 * @param {number} withinDays - Threshold in days (default 5)
 * @returns {boolean}
 */
export function isDueSoon(row, withinDays = 5) {
  if (row.Status !== 'occupied')    return false;
  if (row.PaymentStatus !== 'due')  return false;
  if (!row.DueDate)                 return false;
  if (isOverdue(row))               return false;

  const due   = parseLocalDate(row.DueDate);
  const today = localToday();
  const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= withinDays;
}

// ─── Formatting ──────────────────────────────────────────────────────────────

/**
 * Difference in whole calendar days from today (local time).
 * Positive = future, Negative = past, 0 = today.
 * @param {string} dateStr - YYYY-MM-DD
 * @returns {number|null}
 */
export function daysDifferenceFromToday(dateStr) {
  if (!dateStr) return null;
  const d = parseLocalDate(dateStr);
  const today = localToday();
  return Math.round((d - today) / (1000 * 60 * 60 * 24));
}

/**
 * Small relative note for rent due date: "Nd overdue", "Due today", "Due in Nd".
 * @param {Object} row - bed row object
 * @returns {string}
 */
export function getDueRelativeText(row) {
  if (!row.DueDate) return '';
  const diff = daysDifferenceFromToday(row.DueDate);
  if (diff === null) return '';
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff === 0) return 'Due today';
  return `Due in ${diff}d`;
}

/**
 * Format an amount in Indian Rupees (e.g. "₹84,500").
 * @param {number} amount
 * @returns {string}
 */
export function formatINR(amount) {
  if (amount === '' || amount === null || amount === undefined) return '—';
  return '₹' + Number(amount).toLocaleString('en-IN');
}

/**
 * Return today's local date as YYYY-MM-DD.
 * @returns {string}
 */
export function getTodayStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Add days to today (local date) and return YYYY-MM-DD.
 * @param {number} offsetDays
 * @returns {string}
 */
export function addDaysToToday(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Add one calendar month to a YYYY-MM-DD date string, clamping to the last day of short months.
 * e.g. 2026-01-31 + 1 month -> 2026-02-28 (or 29)
 *      2026-03-31 + 1 month -> 2026-04-30
 * If dateStr is empty, defaults to today + 1 month.
 * @param {string} dateStr
 * @returns {string}
 */
export function addOneCalendarMonth(dateStr) {
  if (!dateStr) {
    dateStr = getTodayStr();
  }
  const [y, m, d] = dateStr.split('-').map(Number);
  const targetYear = m === 12 ? y + 1 : y;
  const targetMonth = m === 12 ? 1 : m + 1;
  const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
  const clampedDay = Math.min(d, daysInMonth);
  return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
}

/**
 * Subtract one calendar month from a YYYY-MM-DD date string, clamping to the last day of short months.
 * e.g. 2026-03-31 - 1 month -> 2026-02-28 (or 29)
 *      2026-05-31 - 1 month -> 2026-04-30
 * @param {string} dateStr
 * @returns {string}
 */
export function subtractOneCalendarMonth(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const targetYear = m === 1 ? y - 1 : y;
  const targetMonth = m === 1 ? 12 : m - 1;
  const daysInMonth = new Date(targetYear, targetMonth, 0).getDate();
  const clampedDay = Math.min(d, daysInMonth);
  return `${targetYear}-${String(targetMonth).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
}

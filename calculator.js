// UK working days: 52 × 5 = 260, minus 8 bank holidays = 252
const WORKING_DAYS_PER_YEAR  = 252;
const WORKING_DAYS_PER_MONTH = WORKING_DAYS_PER_YEAR / 12;

// England & Wales public holidays 2023–2028
const UK_PUBLIC_HOLIDAYS = new Set([
  // 2023
  '2023-01-02','2023-04-07','2023-04-10','2023-05-01','2023-05-08','2023-05-29','2023-08-28','2023-12-25','2023-12-26',
  // 2024
  '2024-01-01','2024-03-29','2024-04-01','2024-05-06','2024-05-27','2024-08-26','2024-12-25','2024-12-26',
  // 2025
  '2025-01-01','2025-04-18','2025-04-21','2025-05-05','2025-05-26','2025-08-25','2025-12-25','2025-12-26',
  // 2026
  '2026-01-01','2026-04-03','2026-04-06','2026-05-04','2026-05-25','2026-08-31','2026-12-25','2026-12-28',
  // 2027
  '2027-01-01','2027-03-26','2027-03-29','2027-05-03','2027-05-31','2027-08-30','2027-12-27','2027-12-28',
  // 2028
  '2028-01-03','2028-04-14','2028-04-17','2028-05-01','2028-05-29','2028-08-28','2028-12-25','2028-12-26',
]);

// Parses a YYYY-MM-DD string as local midnight to avoid UTC offset shifting the date
function parseLocalDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Formats a Date as YYYY-MM-DD using local time components (not UTC) for holiday lookups
function localISO(date) {
  const y  = date.getFullYear();
  const m  = String(date.getMonth() + 1).padStart(2, '0');
  const d  = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Returns the total number of Mon–Fri working days between two dates (inclusive),
// excluding UK bank holidays. Used to show the raw available days in a period.
function getWorkingDays(startStr, endStr) {
  if (!startStr || !endStr) return 0;
  const start = parseLocalDate(startStr);
  const end   = parseLocalDate(endStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const day = cur.getDay();
    if (day !== 0 && day !== 6 && !UK_PUBLIC_HOLIDAYS.has(localISO(cur))) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

// Returns the number of days a user actually works across a date range, accounting
// for their weekly working pattern (daysPerWeek).
//
// Exclusion order:
//   1. Weekends      — only Mon–Fri days are considered
//   2. Bank holidays — excluded from each week's available working days
//   3. Days per week — the user's pattern caps how many days they work in each week
//
// Each Mon–Fri week in the range contributes min(availableWorkingDays, daysPerWeek).
// This means bank holidays reduce the available days in a week but do not count
// as leave — the user simply cannot work those days regardless of their pattern.
//
// Leave is NOT applied here; it is subtracted separately in calculateEarnings(),
// representing additional days the user chooses not to work from their scheduled days.
function getBillableDays(startStr, endStr, daysPerWeek) {
  if (!startStr || !endStr) return 0;
  const start = parseLocalDate(startStr);
  const end   = parseLocalDate(endStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) return 0;

  // Rewind to the Monday of the week containing start, so we process whole weeks
  const startDow = start.getDay(); // 0=Sun, 1=Mon ... 6=Sat
  const monday = new Date(start);
  monday.setDate(monday.getDate() - (startDow === 0 ? 6 : startDow - 1));

  let total = 0;
  const cur = new Date(monday);
  while (cur <= end) {
    // Count available working days in this Mon–Fri week that fall within [start, end]
    let weekDays = 0;
    for (let d = 0; d < 5; d++) {
      const day = new Date(cur);
      day.setDate(day.getDate() + d);
      if (day >= start && day <= end && !UK_PUBLIC_HOLIDAYS.has(localISO(day))) weekDays++;
    }
    // The user works at most daysPerWeek days; if fewer are available they work all of them
    total += Math.min(weekDays, daysPerWeek);
    cur.setDate(cur.getDate() + 7);
  }
  return total;
}

// Converts a duration value to days based on the unit (months or years use working-day averages)
function toDays(value, unit) {
  if (unit === 'months') return value * WORKING_DAYS_PER_MONTH;
  if (unit === 'years')  return value * WORKING_DAYS_PER_YEAR;
  return value;
}

// Returns true if value is a whole or half-day increment (0, 0.5, 1, 1.5, ...)
// Used to reject arbitrary decimals in the duration field
function isValidDayIncrement(value) {
  return Math.abs((value * 2) % 1) < 0.001;
}

// Calculates gross earnings, VAT, and net pay.
// Leave is subtracted from duration before any earnings are computed — it represents
// days the user chooses not to work from their scheduled working days (on top of
// weekends, bank holidays, and any days not worked due to their weekly pattern).
function calculateEarnings(dayRate, duration, unit, leave, vatRate) {
  const durationDays = toDays(duration, unit);
  const billable     = Math.max(0, durationDays - leave);
  const vatAmt       = billable * dayRate * (vatRate / 100);
  const gross        = billable * dayRate + vatAmt;
  const net          = gross - vatAmt;
  return { billable, gross, vatAmt, net };
}

if (typeof module !== 'undefined') {
  module.exports = { calculateEarnings, getWorkingDays, getBillableDays, isValidDayIncrement };
}

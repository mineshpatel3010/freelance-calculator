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

function parseLocalDate(str) {
  // Parse YYYY-MM-DD as local midnight to avoid UTC offset issues
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function localISO(date) {
  // Format date as YYYY-MM-DD using local time components (not UTC)
  const y  = date.getFullYear();
  const m  = String(date.getMonth() + 1).padStart(2, '0');
  const d  = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

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

function toDays(value, unit) {
  if (unit === 'months') return value * WORKING_DAYS_PER_MONTH;
  if (unit === 'years')  return value * WORKING_DAYS_PER_YEAR;
  return value;
}

function calculateEarnings(dayRate, duration, unit, leave, vatRate) {
  const durationDays = toDays(duration, unit);
  const billable     = Math.max(0, durationDays - leave);
  const vatAmt       = billable * dayRate * (vatRate / 100);
  const gross        = billable * dayRate + vatAmt;
  const net          = gross - vatAmt;
  return { billable, gross, vatAmt, net };
}

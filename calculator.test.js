const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calculateEarnings, getWorkingDays, isValidDayIncrement } = require('./calculator');

function round(n, dp = 2) {
  return Math.round(n * Math.pow(10, dp)) / Math.pow(10, dp);
}

// ─── Basic Earnings ──────────────────────────────────────────────────────────

test('Gross earnings = day rate × billable days × (1 + VAT)', () => {
  const { gross } = calculateEarnings(500, 10, 'days', 0, 20);
  assert.strictEqual(round(gross), 6000);
});

test('Net earnings = day rate × billable days (excl. VAT)', () => {
  const { net } = calculateEarnings(500, 10, 'days', 0, 20);
  assert.strictEqual(round(net), 5000);
});

test('Billable days = contract duration − leave', () => {
  const { billable } = calculateEarnings(500, 20, 'days', 5, 20);
  assert.strictEqual(billable, 15);
});

// ─── VAT Calculation ─────────────────────────────────────────────────────────

test('VAT amount = day rate × billable days × VAT rate', () => {
  const { vatAmt } = calculateEarnings(400, 5, 'days', 0, 20);
  assert.strictEqual(round(vatAmt), 400);
});

test('Zero VAT rate produces no VAT amount', () => {
  const { vatAmt, gross, net } = calculateEarnings(500, 10, 'days', 0, 0);
  assert.strictEqual(round(vatAmt), 0);
  assert.strictEqual(round(gross), round(net));
});

test('Custom VAT rate (15%) applied correctly', () => {
  const { vatAmt } = calculateEarnings(1000, 1, 'days', 0, 15);
  assert.strictEqual(round(vatAmt), 150);
});

// ─── Zero Leave Days ─────────────────────────────────────────────────────────

test('All contract days are billable when leave is 0', () => {
  const { billable } = calculateEarnings(500, 30, 'days', 0, 20);
  assert.strictEqual(billable, 30);
});

test('Gross reflects full contract with no leave', () => {
  const { gross } = calculateEarnings(300, 5, 'days', 0, 20);
  assert.strictEqual(round(gross), 1800);
});

// ─── Leave = Contract Duration ───────────────────────────────────────────────

test('Zero billable days when leave equals duration', () => {
  const { billable } = calculateEarnings(500, 20, 'days', 20, 20);
  assert.strictEqual(billable, 0);
});

test('All earnings are zero when no billable days', () => {
  const { gross, vatAmt, net } = calculateEarnings(500, 20, 'days', 20, 20);
  assert.strictEqual(round(gross), 0);
  assert.strictEqual(round(vatAmt), 0);
  assert.strictEqual(round(net), 0);
});

test('Billable days never go negative when leave exceeds duration', () => {
  const { billable } = calculateEarnings(500, 10, 'days', 20, 20);
  assert.ok(billable >= 0, `Billable days should not be negative, got ${billable}`);
});

// ─── Decimal Day Rates ───────────────────────────────────────────────────────

test('Decimal day rate (£487.50) calculates correctly', () => {
  const { net } = calculateEarnings(487.50, 4, 'days', 0, 20);
  assert.strictEqual(round(net), 1950);
});

test('Gross with decimal rate is accurate to pence', () => {
  const { gross } = calculateEarnings(333.33, 3, 'days', 0, 20);
  assert.strictEqual(round(gross), 1199.99);
});

// ─── Unit Conversion (months / years) ────────────────────────────────────────

test('Months unit: billable days = months × working days per month', () => {
  // 1 month = 252/12 = 21 working days
  const { billable } = calculateEarnings(500, 1, 'months', 0, 0);
  assert.strictEqual(round(billable, 4), round(252 / 12, 4));
});

test('Months unit: gross calculated correctly', () => {
  const { gross } = calculateEarnings(500, 1, 'months', 0, 20);
  // 500 × 21 × 1.2 = 12600
  assert.strictEqual(round(gross), 12600);
});

test('Years unit: billable days = 252 when no leave', () => {
  const { billable } = calculateEarnings(500, 1, 'years', 0, 0);
  assert.strictEqual(billable, 252);
});

test('Years unit: gross calculated correctly', () => {
  const { gross } = calculateEarnings(500, 1, 'years', 0, 20);
  // 500 × 252 × 1.2 = 151200
  assert.strictEqual(round(gross), 151200);
});

// ─── Half Day Increments ─────────────────────────────────────────────────────

test('Whole number of days is a valid increment', () => {
  assert.ok(isValidDayIncrement(10));
});

test('Half day (0.5) is a valid increment', () => {
  assert.ok(isValidDayIncrement(0.5));
});

test('Whole days with half day (10.5) is a valid increment', () => {
  assert.ok(isValidDayIncrement(10.5));
});

test('Non-half-day decimal (11.22) is not a valid increment', () => {
  assert.ok(!isValidDayIncrement(11.22));
});

test('Non-half-day decimal (10.1) is not a valid increment', () => {
  assert.ok(!isValidDayIncrement(10.1));
});

test('Non-half-day decimal (10.9) is not a valid increment', () => {
  assert.ok(!isValidDayIncrement(10.9));
});

test('Half day duration calculates correct billable days', () => {
  const { billable } = calculateEarnings(500, 10.5, 'days', 0, 20);
  assert.strictEqual(billable, 10.5);
});

test('Half day duration with leave calculates correct billable days', () => {
  const { billable } = calculateEarnings(500, 10.5, 'days', 0.5, 20);
  assert.strictEqual(billable, 10);
});

test('Half day duration calculates correct gross earnings', () => {
  const { gross } = calculateEarnings(500, 10.5, 'days', 0, 20);
  assert.strictEqual(round(gross), 6300);
});

// ─── Working Days (Period) ───────────────────────────────────────────────────

test('Counts only weekdays between two dates', () => {
  const days = getWorkingDays('2025-01-06', '2025-01-10');
  assert.strictEqual(days, 5);
});

test('Excludes weekends', () => {
  const days = getWorkingDays('2025-01-06', '2025-01-12');
  assert.strictEqual(days, 5);
});

test('Excludes UK bank holidays', () => {
  const days = getWorkingDays('2024-12-23', '2025-01-03');
  assert.strictEqual(days, 7);
});

test('Returns 0 for end date before start date', () => {
  const days = getWorkingDays('2025-06-10', '2025-06-01');
  assert.strictEqual(days, 0);
});

test('Returns 0 for invalid dates', () => {
  const days = getWorkingDays('', '');
  assert.strictEqual(days, 0);
});

test('Same day returns 1 if it is a working day', () => {
  const days = getWorkingDays('2025-01-08', '2025-01-08');
  assert.strictEqual(days, 1);
});

test('Same day returns 0 if it is a weekend', () => {
  const days = getWorkingDays('2025-01-11', '2025-01-11');
  assert.strictEqual(days, 0);
});

test('Correctly counts across DST boundary (Oct–Apr)', () => {
  const days = getWorkingDays('2025-10-20', '2026-04-17');
  assert.strictEqual(days, 125);
});

test('Same day returns 0 if it is a bank holiday', () => {
  const days = getWorkingDays('2025-12-25', '2025-12-25');
  assert.strictEqual(days, 0);
});

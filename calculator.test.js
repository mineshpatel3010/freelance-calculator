const { test } = require('node:test');
const assert = require('node:assert/strict');
const { calculateEarnings, getWorkingDays } = require('./calculator');

function approx(a, b, tolerance = 0.01) {
  return Math.abs(a - b) <= tolerance;
}

// ─── Basic Earnings ──────────────────────────────────────────────────────────

test('Gross earnings = day rate × billable days × (1 + VAT)', () => {
  const { gross } = calculateEarnings(500, 10, 'days', 0, 20);
  assert.ok(approx(gross, 6000), `Expected £6,000, got £${gross}`);
});

test('Net earnings = day rate × billable days (excl. VAT)', () => {
  const { net } = calculateEarnings(500, 10, 'days', 0, 20);
  assert.ok(approx(net, 5000), `Expected £5,000, got £${net}`);
});

test('Billable days = contract duration − leave', () => {
  const { billable } = calculateEarnings(500, 20, 'days', 5, 20);
  assert.ok(approx(billable, 15), `Expected 15 days, got ${billable}`);
});

// ─── VAT Calculation ─────────────────────────────────────────────────────────

test('VAT amount = day rate × billable days × VAT rate', () => {
  const { vatAmt } = calculateEarnings(400, 5, 'days', 0, 20);
  assert.ok(approx(vatAmt, 400), `Expected £400, got £${vatAmt}`);
});

test('Zero VAT rate produces no VAT amount', () => {
  const { vatAmt, gross, net } = calculateEarnings(500, 10, 'days', 0, 0);
  assert.ok(approx(vatAmt, 0), `VAT should be 0, got £${vatAmt}`);
  assert.ok(approx(gross, net), `Gross and net should match when VAT is 0`);
});

test('Custom VAT rate (15%) applied correctly', () => {
  const { vatAmt } = calculateEarnings(1000, 1, 'days', 0, 15);
  assert.ok(approx(vatAmt, 150), `Expected £150, got £${vatAmt}`);
});

// ─── Zero Leave Days ─────────────────────────────────────────────────────────

test('All contract days are billable when leave is 0', () => {
  const { billable } = calculateEarnings(500, 30, 'days', 0, 20);
  assert.ok(approx(billable, 30), `Expected 30 billable days, got ${billable}`);
});

test('Gross reflects full contract with no leave', () => {
  const { gross } = calculateEarnings(300, 5, 'days', 0, 20);
  assert.ok(approx(gross, 1800), `Expected £1,800, got £${gross}`);
});

// ─── Leave = Contract Duration ───────────────────────────────────────────────

test('Zero billable days when leave equals duration', () => {
  const { billable } = calculateEarnings(500, 20, 'days', 20, 20);
  assert.ok(approx(billable, 0), `Expected 0 billable days, got ${billable}`);
});

test('All earnings are zero when no billable days', () => {
  const { gross, vatAmt, net } = calculateEarnings(500, 20, 'days', 20, 20);
  assert.ok(approx(gross, 0),  `Gross should be 0, got £${gross}`);
  assert.ok(approx(vatAmt, 0), `VAT should be 0, got £${vatAmt}`);
  assert.ok(approx(net, 0),    `Net should be 0, got £${net}`);
});

test('Billable days never go negative when leave exceeds duration', () => {
  const { billable } = calculateEarnings(500, 10, 'days', 20, 20);
  assert.ok(billable >= 0, `Billable days should not be negative, got ${billable}`);
});

// ─── Decimal Day Rates ───────────────────────────────────────────────────────

test('Decimal day rate (£487.50) calculates correctly', () => {
  const { net } = calculateEarnings(487.50, 4, 'days', 0, 20);
  assert.ok(approx(net, 1950), `Expected £1,950, got £${net}`);
});

test('Gross with decimal rate is accurate to pence', () => {
  const { gross } = calculateEarnings(333.33, 3, 'days', 0, 20);
  assert.ok(approx(gross, 1199.99, 0.02), `Expected ~£1,199.99, got £${gross}`);
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

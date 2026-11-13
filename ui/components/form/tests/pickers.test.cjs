const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseDate, dateValue, weekValue, weekStart, calendarDays, validPeriod } = require('../pickers.js');

test('ISO weeks use Monday and handle calendar-year boundaries', () => {
  for (const [date, week, monday] of [
    ['2021-01-01', '2020-W53', '2020-12-28'],
    ['2025-12-29', '2026-W01', '2025-12-29'],
    ['2026-11-13', '2026-W46', '2026-11-09'],
    ['2027-01-01', '2026-W53', '2026-12-28'],
  ]) {
    assert.equal(weekValue(parseDate(date)), week);
    assert.equal(dateValue(weekStart(week)), monday);
  }
});

test('month/week text fallbacks validate ISO format, bounds, required and native step bases', () => {
  assert(validPeriod('month', '2026-11'));
  assert(!validPeriod('month', '2026-13'));
  assert(!validPeriod('week', '2025-W53'));
  assert(validPeriod('week', '2026-W53'));
  assert(!validPeriod('week', '2026-W00'));
  assert(!validPeriod('month', '', { required: true }));
  assert(validPeriod('month', ''));
  assert(!validPeriod('month', '2026-11', { max: '2026-10' }));
  assert(validPeriod('month', '2026-11', { min: '2026-01', step: 2 }));
  assert(!validPeriod('month', '2026-12', { min: '2026-01', step: 2 }));
  assert(validPeriod('week', '2027-W01', { min: '2026-W53', step: 1 }));
  assert(!validPeriod('week', '2027-W01', { min: '2026-W53', step: 2 }));
  assert(validPeriod('week', '2027-W02', { min: '2026-W53', step: 2 }));
});

test('calendar rows are contiguous Monday–Sunday, include leap day and preserve early years', () => {
  const days = calendarDays(2024, 1);
  assert.equal(days.length, 42);
  assert.equal(days[0].getUTCDay(), 1);
  assert(days.some(date => dateValue(date) === '2024-02-29'));
  for (let i = 1; i < days.length; i++) assert.equal(days[i] - days[i - 1], 86400000);
  assert.equal(dateValue(parseDate('0001-01-01')), '0001-01-01');
});

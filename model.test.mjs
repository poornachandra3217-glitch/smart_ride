import assert from 'node:assert/strict';
import { test } from 'node:test';
import { addMonths, book, status } from './public/model.mjs';

const request = { routeId: 'omr', planId: 'monthly', start: '2026-11-09', id: 'demo', date: '2026-11-09' };
test('calendar terms clamp month ends and preserve leap days where valid', () => {
  assert.equal(addMonths('2024-01-31', 1), '2024-02-29');
  assert.equal(addMonths('2024-02-29', 12), '2025-02-28');
});
test('checkout validates dates and rejects overlapping terms', () => {
  const term = book([], request);
  assert.equal(term.amount, 2999);
  assert.throws(() => book([term], request), /already/);
  assert.throws(() => book([], { ...request, start: '2026-11-31' }), /Choose/);
  assert.doesNotThrow(() => book([term], { ...request, start: term.end }));
});
test('term state respects exclusive end and cancellation', () => {
  const term = book([], request);
  assert.equal(status(term, '2026-11-08'), 'Scheduled');
  assert.equal(status(term, term.start), 'Active');
  assert.equal(status(term, term.end), 'Expired');
  assert.equal(status({ ...term, cancelledOn: term.start }, term.start), 'Cancelled');
});

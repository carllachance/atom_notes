import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeRecencyLuminosity,
  computeSizeFactor,
  luminosityToOpacity,
  luminosityToFilter,
} from '../utils/luminosity';

const daysAgo = (days: number): string =>
  new Date(Date.now() - days * 86400000).toISOString();

test('computeRecencyLuminosity with today timestamp returns 1.0', () => {
  const result = computeRecencyLuminosity(null, daysAgo(0));
  assert.ok(result >= 0.99, `Expected ~1.0, got ${result}`);
});

test('computeRecencyLuminosity with 400-day-old timestamp returns 0.15', () => {
  const result = computeRecencyLuminosity(null, daysAgo(400));
  assert.equal(result, 0.15);
});

test('computeRecencyLuminosity with null lastViewedAt falls back to updatedAt', () => {
  const updatedAt = daysAgo(0);
  const result = computeRecencyLuminosity(null, updatedAt);
  assert.ok(result >= 0.99);
});

test('computeRecencyLuminosity uses most recent of lastViewedAt and updatedAt', () => {
  const recent = daysAgo(1);
  const old = daysAgo(200);
  const resultWithRecentView = computeRecencyLuminosity(recent, old);
  const resultWithOldView = computeRecencyLuminosity(old, old);
  assert.ok(resultWithRecentView > resultWithOldView);
});

test('computeSizeFactor(0) returns 0.85', () => {
  assert.equal(computeSizeFactor(0), 0.85);
});

test('computeSizeFactor(0.5) returns 1.0', () => {
  assert.equal(computeSizeFactor(0.5), 1.0);
});

test('computeSizeFactor(1.0) returns 1.15', () => {
  assert.equal(computeSizeFactor(1.0), 1.15);
});

test('luminosityToFilter(0.80) returns empty string', () => {
  assert.equal(luminosityToFilter(0.80), '');
});

test('luminosityToFilter(0.50) returns string containing brightness', () => {
  assert.ok(luminosityToFilter(0.50).includes('brightness'));
});

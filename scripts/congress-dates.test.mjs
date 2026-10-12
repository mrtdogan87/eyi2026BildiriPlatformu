import test from 'node:test';
import assert from 'node:assert/strict';
import { congressDateTimeIso, congressDateTimeValue, congressDateWithTime } from '../src/modules/congress/dates.ts';

test('a first event date starts at Istanbul midnight and ends at 23:59', () => {
  assert.equal(congressDateWithTime('2026-12-03', null, '00:00'), '2026-12-02T21:00:00.000Z');
  assert.equal(congressDateWithTime('2026-12-04', null, '23:59'), '2026-12-04T20:59:00.000Z');
  assert.equal(congressDateTimeValue(congressDateWithTime('2026-12-03', null, '00:00')), '2026-12-03T00:00');
});

test('changing a date retains the existing hour and explicit time edits remain possible', () => {
  const previous = '2026-12-03T06:45:00.000Z';
  assert.equal(congressDateWithTime('2026-12-04', previous, '23:59'), '2026-12-04T06:45:00.000Z');
  assert.equal(congressDateTimeIso('2026-12-04T17:30'), '2026-12-04T14:30:00.000Z');
  assert.equal(congressDateTimeValue(previous), '2026-12-03T09:45');
});

test('unchanged dates preserve the exact stored instant, including seconds', () => {
  const previous = '2026-12-04T23:59:59+03:00';
  assert.equal(congressDateTimeIso(congressDateTimeValue(previous), previous), previous);
  assert.equal(congressDateWithTime('2026-12-04', previous, '00:00'), previous);
});

test('empty or invalid calendar values do not invent a timestamp', () => {
  for (const value of ['', '2026-12-03', '2026-02-30T12:00', '2026-12-03T24:00', '2026-12-03T10:60', 'bad']) {
    assert.equal(congressDateTimeIso(value), null, value);
  }
  assert.equal(congressDateWithTime('', '2026-12-03T06:45:00Z', '00:00'), null);
  assert.equal(congressDateTimeValue(null), '');
});

test('conversion ignores device timezone and follows Istanbul historical offsets', () => {
  const original = process.env.TZ;
  try {
    for (const timeZone of ['UTC', 'America/Los_Angeles', 'Asia/Tokyo']) {
      process.env.TZ = timeZone;
      assert.equal(congressDateTimeIso('2026-12-03T00:00'), '2026-12-02T21:00:00.000Z');
      assert.equal(congressDateTimeValue('2026-12-02T21:00:00Z'), '2026-12-03T00:00');
      assert.equal(congressDateTimeIso('2010-01-10T09:00'), '2010-01-10T07:00:00.000Z');
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

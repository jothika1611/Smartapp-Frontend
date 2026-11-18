import { describe, expect, it } from 'vitest';
import { formatDate, formatMoney, idempotencyKey, riskClass } from '../utils/format';

describe('format utilities', () => {
  it('formats decimal-string money without floating point display errors', () => {
    expect(formatMoney('500.5', 'INR')).toContain('500.50');
    expect(formatMoney('500.5', 'INR')).toContain('INR');
  });

  it('formats dates and risk classes safely', () => {
    expect(formatDate(null)).toBe('—');
    expect(riskClass('HIGH')).toBe('risk-high');
  });

  it('produces a unique idempotency key', () => {
    expect(idempotencyKey()).not.toBe(idempotencyKey());
  });
});

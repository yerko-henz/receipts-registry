import { ENABLE_TRANSACTION_DATE_FILTER } from '../featureFlags';

describe('featureFlags', () => {
  it('ENABLE_TRANSACTION_DATE_FILTER is a boolean', () => {
    expect(typeof ENABLE_TRANSACTION_DATE_FILTER).toBe('boolean');
  });
});

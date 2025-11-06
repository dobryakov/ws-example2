/**
 * Unit tests for socket utilities
 */

import { isValidGUID } from '../../src/sockets';

describe('isValidGUID', () => {
  it('should validate correct GUID format', () => {
    expect(isValidGUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    expect(isValidGUID('00000000-0000-0000-0000-000000000000')).toBe(true);
    expect(isValidGUID('FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF')).toBe(true);
    expect(isValidGUID('ffffffff-ffff-ffff-ffff-ffffffffffff')).toBe(true);
  });

  it('should reject invalid GUID format', () => {
    expect(isValidGUID('')).toBe(false);
    expect(isValidGUID('not-a-guid')).toBe(false);
    expect(isValidGUID('123e4567-e89b-12d3-a456')).toBe(false);
    expect(isValidGUID('123e4567-e89b-12d3-a456-426614174000-extra')).toBe(false);
    expect(isValidGUID('123e4567e89b12d3a456426614174000')).toBe(false);
    expect(isValidGUID('123e4567-e89b-12d3-a456-42661417400g')).toBe(false); // invalid char
  });
});


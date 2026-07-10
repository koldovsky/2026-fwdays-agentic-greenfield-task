import { maskPhone, normalizePhone } from './phone';

describe('normalizePhone', () => {
  it.each([
    ['+380671234567', '+380671234567'],
    ['380671234567', '+380671234567'],
    ['0671234567', '+380671234567'],
    ['+38 (067) 123-45-67', '+380671234567'],
    ['067 123 45 67', '+380671234567'],
  ])('normalizes %s to %s', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each([
    [''],
    ['12345'],
    ['+38067123456'], // 8 digits after operator code
    ['+3806712345678'], // 10 digits
    ['+390671234567'], // not Ukraine
    ['067123456a'],
    ['not-a-phone'],
  ])('rejects %s', (input) => {
    expect(normalizePhone(input)).toBeNull();
  });
});

describe('maskPhone', () => {
  it('hides the middle of the number (NFR-SEC-01)', () => {
    const masked = maskPhone('+380671234567');
    expect(masked).toBe('+380*****67');
    expect(masked).not.toContain('67123456');
  });
});

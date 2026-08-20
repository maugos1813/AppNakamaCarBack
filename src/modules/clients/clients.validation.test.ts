import { describe, expect, it } from 'vitest';
import { createClientSchema } from './clients.validation';

describe('createClientSchema', () => {
  it('accepts a private individual without companyName/vatNumber', () => {
    const result = createClientSchema.safeParse({ fullName: 'Mario Rossi', phone: '3331234567' });
    expect(result.success).toBe(true);
  });

  it('rejects a company with no companyName or vatNumber', () => {
    const result = createClientSchema.safeParse({
      isCompany: true,
      fullName: 'Rappresentante',
      phone: '3331234567',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = result.error.issues.map((i) => i.path.join('.'));
      expect(fields).toContain('companyName');
      expect(fields).toContain('vatNumber');
    }
  });

  it('accepts a company with companyName and a valid vatNumber', () => {
    const result = createClientSchema.safeParse({
      isCompany: true,
      fullName: 'Rappresentante',
      companyName: 'Rossi Srl',
      vatNumber: '01234567890',
      phone: '3331234567',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a malformed vatNumber', () => {
    const result = createClientSchema.safeParse({
      isCompany: true,
      fullName: 'Rappresentante',
      companyName: 'Rossi Srl',
      vatNumber: '123', // not 11 digits
      phone: '3331234567',
    });
    expect(result.success).toBe(false);
  });
});

import { describe, it, expect } from 'vitest';
import { validatePassword } from './passwordValidation';

describe('validatePassword', () => {
  it('accepts a strong password', () => {
    const r = validatePassword('StrongP@ss1');
    expect(r.isValid).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it('rejects short passwords', () => {
    const r = validatePassword('Ab1!');
    expect(r.isValid).toBe(false);
    expect(r.errors).toContain('Mínimo 8 caracteres');
  });

  it('requires uppercase, lowercase, number and special', () => {
    expect(validatePassword('alllowercase').isValid).toBe(false);
    expect(validatePassword('ALLUPPER123!').errors).toContain('Pelo menos 1 letra minúscula');
    expect(validatePassword('NoDigits!!').errors).toContain('Pelo menos 1 número');
    expect(validatePassword('NoSpecial123').errors).toContain('Pelo menos 1 caractere especial (!@#$%...)');
  });

  it('rejects common weak passwords', () => {
    const r = validatePassword('password');
    expect(r.isValid).toBe(false);
    expect(r.errors).toContain('Senha muito comum, escolha outra');
  });
});

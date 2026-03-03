/**
 * Strong password validation for NAVANHULA POS
 */

export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Mínimo 8 caracteres');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Pelo menos 1 letra maiúscula');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Pelo menos 1 letra minúscula');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Pelo menos 1 número');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Pelo menos 1 caractere especial (!@#$%...)');
  }

  // Common weak passwords
  const commonPasswords = ['password', '12345678', 'qwerty123', 'admin123', 'navanhula'];
  if (commonPasswords.includes(password.toLowerCase())) {
    errors.push('Senha muito comum, escolha outra');
  }

  return { isValid: errors.length === 0, errors };
}

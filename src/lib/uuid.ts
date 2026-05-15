/**
 * Utility for UUID validation and sanitization
 */

export const isUuid = (id: any): id is string => {
  if (typeof id !== 'string') return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
};

export const isValidId = (id: any): boolean => {
  if (!id) return false;
  // Block known mock/fake IDs
  const blacklist = ['local-store', 'temp-id', 'mock-id', 'undefined', 'null', '[object Object]', 'none'];
  if (blacklist.includes(String(id).toLowerCase())) return false;
  
  return isUuid(id);
};

/**
 * Returns the ID if it's a valid UUID, otherwise returns undefined
 */
export const sanitizeId = (id: any): string | undefined => {
  return isValidId(id) ? String(id) : undefined;
};

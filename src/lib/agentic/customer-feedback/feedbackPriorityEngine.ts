export type Priority = 'P1' | 'P2' | 'P3';

export function priorityFor(count: number, avgRating: number): Priority {
  if (count >= 3 && avgRating <= 4) return 'P1';
  if (count >= 2 && avgRating <= 6) return 'P2';
  return 'P3';
}

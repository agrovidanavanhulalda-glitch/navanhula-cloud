export type MovementType = 'ENTRY' | 'SALE' | 'TRANSFER' | 'RETURN' | 'ADJUSTMENT';

export const MOVEMENT_TYPES: Record<MovementType, string> = {
  ENTRY: 'Entrada',
  SALE: 'Venda',
  TRANSFER: 'Transferência',
  RETURN: 'Devolução',
  ADJUSTMENT: 'Ajuste',
};

export const MOVEMENT_TYPE_LIST: MovementType[] = ['ENTRY', 'SALE', 'TRANSFER', 'RETURN', 'ADJUSTMENT'];

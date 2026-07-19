/**
 * Workspace Config — Sprint 10.1.3
 * UI-only configuration for the Enterprise WorkspaceShell.
 * Adding a new dashboard = adding a profile here, no Shell changes needed.
 */
export type WorkspaceType =
  | 'LOCAL'
  | 'MANAGER'
  | 'FOUNDER'
  | 'CEO'
  | 'COMMERCIAL'
  | 'HR'
  | 'BI'
  | 'DIRECTOR';

export interface WorkspaceProfile {
  title?: string;
  description?: string;
  showContinue: boolean;
  showQuickActions: boolean;
  showFavorites: boolean;
  /** Layout hint — currently only 'grid' is rendered, reserved for future variants. */
  layout: 'grid' | 'stacked';
  /** Grid width split for QuickActions when Favorites is shown. */
  quickActionsSpan: 1 | 2 | 3;
  /** Render order top → bottom. */
  order: Array<'continue' | 'quick' | 'favorites'>;
}

export const WORKSPACE_PROFILES: Record<WorkspaceType, WorkspaceProfile> = {
  LOCAL: {
    title: 'Workspace Local',
    description: 'Operação diária da loja',
    showContinue: true,
    showQuickActions: true,
    showFavorites: true,
    layout: 'grid',
    quickActionsSpan: 2,
    order: ['continue', 'quick', 'favorites'],
  },
  MANAGER: {
    title: 'Workspace do Gestor',
    description: 'Performance da equipa e metas',
    showContinue: true,
    showQuickActions: true,
    showFavorites: true,
    layout: 'grid',
    quickActionsSpan: 2,
    order: ['continue', 'quick', 'favorites'],
  },
  FOUNDER: {
    title: 'Workspace Founder',
    description: 'Visão consolidada da plataforma',
    showContinue: true,
    showQuickActions: true,
    showFavorites: true,
    layout: 'grid',
    quickActionsSpan: 2,
    order: ['continue', 'quick', 'favorites'],
  },
  CEO: {
    title: 'Workspace CEO',
    description: 'Controle multi-empresa',
    showContinue: true,
    showQuickActions: true,
    showFavorites: true,
    layout: 'grid',
    quickActionsSpan: 2,
    order: ['continue', 'quick', 'favorites'],
  },
  COMMERCIAL: {
    title: 'Workspace Comercial',
    description: 'Pipeline e receita',
    showContinue: true,
    showQuickActions: true,
    showFavorites: true,
    layout: 'grid',
    quickActionsSpan: 2,
    order: ['continue', 'quick', 'favorites'],
  },
  HR: {
    title: 'Workspace RH',
    description: 'Pessoas e folha de pagamento',
    showContinue: true,
    showQuickActions: true,
    showFavorites: true,
    layout: 'grid',
    quickActionsSpan: 2,
    order: ['continue', 'quick', 'favorites'],
  },
  BI: {
    title: 'Workspace BI',
    description: 'Analítica e indicadores',
    showContinue: true,
    showQuickActions: false,
    showFavorites: true,
    layout: 'grid',
    quickActionsSpan: 2,
    order: ['continue', 'favorites'],
  },
  DIRECTOR: {
    title: 'Workspace Director',
    description: 'Visão executiva',
    showContinue: true,
    showQuickActions: true,
    showFavorites: true,
    layout: 'grid',
    quickActionsSpan: 2,
    order: ['continue', 'quick', 'favorites'],
  },
};

export const getWorkspaceProfile = (type?: WorkspaceType): WorkspaceProfile =>
  (type && WORKSPACE_PROFILES[type]) || WORKSPACE_PROFILES.LOCAL;

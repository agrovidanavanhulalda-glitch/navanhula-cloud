import React from 'react';
import ContinueWorkingCard from './ContinueWorkingCard';
import WorkspaceQuickActions from './QuickActions';
import FavoritesPanel from './FavoritesPanel';
import {
  getWorkspaceProfile,
  type WorkspaceType,
  type WorkspaceProfile,
} from './workspace-config';

interface WorkspaceShellProps {
  /** Profile-driven configuration (Sprint 10.1.3). */
  workspaceType?: WorkspaceType;
  header?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
  /** Optional per-instance overrides (kept for backward compatibility). */
  showContinue?: boolean;
  showQuickActions?: boolean;
  showFavorites?: boolean;
}

/**
 * WorkspaceShell — Sprint 10.1.3
 * Configurable UI-only shell. Behavior is driven by workspace-config profiles.
 * Preserves NAVANHULA design tokens (blue/gold), glass, dark mode, WCAG AA.
 */
export const WorkspaceShell: React.FC<WorkspaceShellProps> = ({
  workspaceType,
  header,
  breadcrumbs,
  className,
  children,
  showContinue,
  showQuickActions,
  showFavorites,
}) => {
  const profile: WorkspaceProfile = getWorkspaceProfile(workspaceType);

  const cfg = {
    showContinue: showContinue ?? profile.showContinue,
    showQuickActions: showQuickActions ?? profile.showQuickActions,
    showFavorites: showFavorites ?? profile.showFavorites,
  };

  const spanMap: Record<1 | 2 | 3, string> = {
    1: 'lg:col-span-1',
    2: 'lg:col-span-2',
    3: 'lg:col-span-3',
  };
  const quickSpan = cfg.showFavorites ? spanMap[profile.quickActionsSpan] : 'lg:col-span-3';
  const favSpan = cfg.showQuickActions ? '' : 'lg:col-span-3';

  const nodes: Record<'continue' | 'quick' | 'favorites', React.ReactNode> = {
    continue: cfg.showContinue ? <ContinueWorkingCard key="continue" /> : null,
    quick:
      cfg.showQuickActions && !cfg.showFavorites ? (
        <WorkspaceQuickActions key="quick-only" />
      ) : null,
    favorites: null,
  };

  const gridBlock =
    cfg.showQuickActions && cfg.showFavorites ? (
      <div key="grid" className="grid gap-4 lg:grid-cols-3">
        <div className={quickSpan}>
          <WorkspaceQuickActions />
        </div>
        <div className={favSpan}>
          <FavoritesPanel />
        </div>
      </div>
    ) : cfg.showFavorites && !cfg.showQuickActions ? (
      <div key="fav" className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-3">
          <FavoritesPanel />
        </div>
      </div>
    ) : null;

  return (
    <div className={className ?? 'space-y-6'}>
      {breadcrumbs}
      {header}
      {profile.order.map((slot) => {
        if (slot === 'continue') return nodes.continue;
        if (slot === 'quick' || slot === 'favorites') {
          // Render the grid block once (on the first of quick/favorites we encounter).
          if (slot === profile.order.find((s) => s === 'quick' || s === 'favorites')) {
            return gridBlock;
          }
          return null;
        }
        return null;
      })}
      {children}
    </div>
  );
};

export default WorkspaceShell;

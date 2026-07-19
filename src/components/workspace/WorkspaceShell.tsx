import React from 'react';
import ContinueWorkingCard from './ContinueWorkingCard';
import WorkspaceQuickActions from './QuickActions';
import FavoritesPanel from './FavoritesPanel';

interface WorkspaceShellProps {
  header?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  showContinue?: boolean;
  showQuickActions?: boolean;
  showFavorites?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * WorkspaceShell — Sprint 10.1.2
 * UI-only reusable shell that unifies Smart Workspace across dashboards.
 * Preserves NAVANHULA design tokens (blue/gold), glass, dark mode, WCAG AA.
 */
export const WorkspaceShell: React.FC<WorkspaceShellProps> = ({
  header,
  breadcrumbs,
  showContinue = true,
  showQuickActions = true,
  showFavorites = true,
  className,
  children,
}) => {
  return (
    <div className={className ?? 'space-y-6'}>
      {breadcrumbs}
      {header}

      {showContinue && <ContinueWorkingCard />}

      {(showQuickActions || showFavorites) && (
        <div className="grid gap-4 lg:grid-cols-3">
          {showQuickActions && (
            <div className={showFavorites ? 'lg:col-span-2' : 'lg:col-span-3'}>
              <WorkspaceQuickActions />
            </div>
          )}
          {showFavorites && (
            <div className={showQuickActions ? '' : 'lg:col-span-3'}>
              <FavoritesPanel />
            </div>
          )}
        </div>
      )}

      {children}
    </div>
  );
};

export default WorkspaceShell;

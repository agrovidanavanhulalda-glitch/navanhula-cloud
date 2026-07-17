import React, { useEffect, useState, useCallback } from 'react';
import { Search } from 'lucide-react';
import CommandPalette from './CommandPalette';
import { cn } from '@/lib/utils';

interface WorkspaceSearchButtonProps {
  className?: string;
}

const WorkspaceSearchButton: React.FC<WorkspaceSearchButtonProps> = ({ className }) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const openPalette = useCallback(() => setOpen(true), []);

  return (
    <>
      <button
        type="button"
        onClick={openPalette}
        aria-label="Pesquisar (Ctrl+K)"
        className={cn(
          'group hidden md:inline-flex items-center gap-2 h-9 pl-3 pr-2 rounded-full',
          'border border-border/60 bg-secondary/40 hover:bg-secondary/70 hover:border-[hsl(var(--gold))]/40',
          'text-sm text-muted-foreground transition-all backdrop-blur-sm min-w-[240px]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--gold))]/40',
          className,
        )}
      >
        <Search className="h-4 w-4 text-primary shrink-0" />
        <span className="flex-1 text-left truncate">Pesquisar páginas, ações…</span>
        <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-border/60 bg-background/70 text-[10px] font-semibold text-muted-foreground">
          Ctrl K
        </kbd>
      </button>
      <button
        type="button"
        onClick={openPalette}
        aria-label="Pesquisar"
        className="md:hidden inline-flex items-center justify-center h-9 w-9 rounded-full border border-border/60 bg-secondary/40 hover:bg-secondary/70 text-muted-foreground"
      >
        <Search className="h-4 w-4" />
      </button>
      <CommandPalette open={open} onOpenChange={setOpen} />
    </>
  );
};

export default WorkspaceSearchButton;

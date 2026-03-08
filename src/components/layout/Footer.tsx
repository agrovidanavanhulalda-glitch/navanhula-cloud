import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer className="border-t border-border bg-card/50 py-4 px-4">
      <div className="flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">NAVANHULA ERP</span>
        <span>Sistema de Gestão Empresarial</span>
        <span className="mt-1">
          © 2026 Navanhula Group Lda —{' '}
          <a href="https://www.navanhula.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            www.navanhula.com
          </a>
        </span>
      </div>
    </footer>
  );
};

export default Footer;

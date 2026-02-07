import React from 'react';

/**
 * Professional footer with dynamic year
 */
const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card/50 py-3 px-4">
      <div className="flex items-center justify-center text-xs text-muted-foreground">
        <span>© {currentYear} NAVANHULA POS — Sistema de Ponto de Venda Profissional</span>
      </div>
    </footer>
  );
};

export default Footer;

import React from 'react';

const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card/50 py-3 px-4">
      <div className="flex items-center justify-center text-xs text-muted-foreground">
        <span>
          © {currentYear} <strong className="text-foreground">NAVANHULA POS</strong> — Plataforma comercial para operação privada.
        </span>
      </div>
    </footer>
  );
};

export default Footer;

import React from 'react';

import { ShieldCheck, CloudCheck, Lock } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="border-t border-border bg-card/50 py-6 px-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-muted-foreground">
        {/* Left - Branding */}
        <div className="flex flex-col items-center md:items-start gap-1">
          <span className="font-bold text-foreground tracking-tight">NAVANHULA CLOUD</span>
          <span>Gestão inteligente para empresas em crescimento</span>
          <span className="mt-1 opacity-70">
            © 2026 Navanhula Group Lda —{' '}
            <a href="https://www.navanhula.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              navanhula.com
            </a>
          </span>
        </div>

        {/* Center - Trust Signals */}
        <div className="flex items-center gap-6 px-6 py-2 bg-secondary/30 rounded-2xl border border-border/40">
          <div className="flex items-center gap-2 group">
            <CloudCheck className="w-4 h-4 text-success group-hover:scale-110 transition-transform" />
            <div className="flex flex-col">
              <span className="font-bold text-foreground leading-none">Backup Ativo</span>
              <span className="text-[10px] leading-tight">Dados protegidos em tempo real</span>
            </div>
          </div>
          <div className="w-px h-8 bg-border/60" />
          <div className="flex items-center gap-2 group">
            <ShieldCheck className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
            <div className="flex flex-col">
              <span className="font-bold text-foreground leading-none">Segurança SSL</span>
              <span className="text-[10px] leading-tight">Criptografia de nível bancário</span>
            </div>
          </div>
        </div>

        {/* Right - Certification/Status */}
        <div className="flex items-center gap-3 bg-background/50 px-4 py-2 rounded-xl border border-border/30">
          <Lock className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="font-medium tracking-wide">AMBIENTE 100% SEGURO</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

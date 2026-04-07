import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, ShoppingCart, UserPlus, Download, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FABConfig {
  icon: React.ElementType;
  label: string;
  path: string;
}

const fabMap: Record<string, FABConfig> = {
  '/app/dashboard': { icon: ShoppingCart, label: 'Nova Venda', path: '/app/pdv' },
  '/app/pdv': { icon: Plus, label: 'Nova Venda', path: '/app/pdv' },
  '/app/crm': { icon: UserPlus, label: 'Novo Cliente', path: '/app/crm' },
  '/app/relatorios': { icon: Download, label: 'Exportar', path: '/app/relatorios' },
};

function getFABConfig(pathname: string): FABConfig {
  // Exact match first
  if (fabMap[pathname]) return fabMap[pathname];
  // Prefix match
  for (const key of Object.keys(fabMap)) {
    if (pathname.startsWith(key + '/')) return fabMap[key];
  }
  // Default
  return { icon: Plus, label: 'Nova Venda', path: '/app/pdv' };
}

const FloatingActionButton: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [visible, setVisible] = useState(true);
  const lastScrollY = useRef(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY > lastScrollY.current && currentY > 60) {
        setVisible(false);
      } else {
        setVisible(true);
      }
      lastScrollY.current = currentY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const config = getFABConfig(location.pathname);
  const Icon = config.icon;

  return (
    <button
      onClick={() => navigate(config.path)}
      className={cn(
        "fixed bottom-[92px] left-4 z-50 w-[60px] h-[60px] rounded-full flex items-center justify-center text-primary-foreground transition-all duration-300",
        !visible && "translate-y-[200px] opacity-0"
      )}
      style={{
        background: 'var(--gradient-primary)',
        boxShadow: '0 8px 24px -4px hsl(217 91% 53% / 0.4), 0 4px 12px rgba(0,0,0,0.1)',
      }}
      aria-label={config.label}
    >
      <Icon className="w-6 h-6" strokeWidth={2.5} />
    </button>
  );
};

export default FloatingActionButton;

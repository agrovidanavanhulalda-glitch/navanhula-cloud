import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';

const FloatingActionButton: React.FC = () => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/app/pdv')}
      className="fixed bottom-[88px] left-4 z-50 w-14 h-14 rounded-full flex items-center justify-center text-primary-foreground transition-all duration-200 active:scale-90 hover:brightness-110"
      style={{
        background: 'var(--gradient-primary)',
        boxShadow: 'var(--shadow-glow), 0 4px 16px rgba(0,0,0,0.15)',
      }}
      aria-label="Nova Venda"
    >
      <Plus className="w-6 h-6" strokeWidth={2.5} />
    </button>
  );
};

export default FloatingActionButton;

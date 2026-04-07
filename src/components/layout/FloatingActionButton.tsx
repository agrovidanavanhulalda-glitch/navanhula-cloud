import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';

const FloatingActionButton: React.FC = () => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate('/app/pdv')}
      className="fixed bottom-[92px] left-4 z-50 w-[60px] h-[60px] rounded-full flex items-center justify-center text-primary-foreground transition-transform duration-200 active:scale-[0.92]"
      style={{
        background: 'var(--gradient-primary)',
        boxShadow: '0 8px 24px -4px hsl(217 91% 53% / 0.4), 0 4px 12px rgba(0,0,0,0.1)',
      }}
      aria-label="Nova Venda"
    >
      <Plus className="w-7 h-7" strokeWidth={2.5} />
    </button>
  );
};

export default FloatingActionButton;

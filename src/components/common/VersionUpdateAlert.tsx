import React from 'react';
import { useAppVersion } from '@/hooks/useAppVersion';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const VersionUpdateAlert = () => {
  const { hasUpdate, handleUpdate } = useAppVersion();

  return (
    <AnimatePresence>
      {hasUpdate && (
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 z-[9999] md:w-96"
        >
          <div className="bg-primary border border-gold/30 text-white p-4 rounded-xl shadow-2xl flex items-center gap-4">
            <div className="bg-gold/20 p-2 rounded-full">
              <AlertCircle className="w-5 h-5 text-gold" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm">Nova versão disponível</p>
              <p className="text-xs text-white/80">Atualize o sistema para acessar as melhorias mais recentes.</p>
            </div>
            <Button 
              size="sm" 
              onClick={handleUpdate}
              className="bg-gold hover:bg-gold/90 text-primary font-bold border-none h-9 whitespace-nowrap"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar agora
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default VersionUpdateAlert;

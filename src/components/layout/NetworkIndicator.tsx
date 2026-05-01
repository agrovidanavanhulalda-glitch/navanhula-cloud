import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { cn } from '@/lib/utils';

/**
 * Network status indicator - shows ONLINE/OFFLINE status
 */
const NetworkIndicator: React.FC = () => {
  const { isOnline } = useNetworkStatus();

  return (
    <div 
      className={cn(
        "flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold transition-all border shadow-sm",
        isOnline 
          ? "bg-success/10 text-success border-success/20" 
          : "bg-destructive/10 text-destructive border-destructive/20 animate-pulse"
      )}
    >
      <div className={cn(
        "w-2 h-2 rounded-full",
        isOnline ? "bg-success animate-pulse" : "bg-destructive"
      )} />
      {isOnline ? (
        <span>SISTEMA ONLINE</span>
      ) : (
        <span>SISTEMA OFFLINE</span>
      )}
    </div>
  );
};

export default NetworkIndicator;

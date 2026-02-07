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
        "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
        isOnline 
          ? "bg-success/20 text-success" 
          : "bg-destructive/20 text-destructive animate-pulse"
      )}
    >
      {isOnline ? (
        <>
          <Wifi className="w-3.5 h-3.5" />
          <span>ONLINE</span>
        </>
      ) : (
        <>
          <WifiOff className="w-3.5 h-3.5" />
          <span>OFFLINE</span>
        </>
      )}
    </div>
  );
};

export default NetworkIndicator;

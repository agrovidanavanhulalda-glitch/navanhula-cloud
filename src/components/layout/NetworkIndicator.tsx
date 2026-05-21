import React, { memo } from 'react';
import { Wifi, WifiOff, Activity } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Enterprise Network status indicator
 */
const NetworkIndicator: React.FC = () => {
  const { isOnline, latency } = useNetworkStatus();

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div 
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black transition-all border shadow-sm select-none cursor-help",
              isOnline 
                ? "bg-success/10 text-success border-success/20 hover:bg-success/20" 
                : "bg-destructive/10 text-destructive border-destructive/20 animate-pulse"
            )}
          >
            <div className={cn(
              "w-1.5 h-1.5 rounded-full",
              isOnline ? "bg-success animate-pulse" : "bg-destructive"
            )} />
            
            {isOnline ? (
              <span className="tracking-tighter uppercase">SISTEMA ONLINE</span>
            ) : (
              <span className="tracking-tighter uppercase">SEM CONEXÃO</span>
            )}

            {isOnline && latency !== null && (
              <div className="flex items-center gap-1 ml-1 pl-1 border-l border-success/30 opacity-60">
                <Activity className="w-3 h-3" />
                <span>{latency}ms</span>
              </div>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-[10px] font-medium p-2 bg-sidebar text-sidebar-foreground border-sidebar-border shadow-xl">
          <p className="flex items-center gap-2">
            {isOnline ? (
              <>
                <Wifi className="w-3 h-3 text-success" />
                <span>Ligação estável com o servidor Navanhula</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3 h-3 text-destructive" />
                <span>Verifique o seu acesso à internet</span>
              </>
            )}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default memo(NetworkIndicator);

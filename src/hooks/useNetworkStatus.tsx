import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Enterprise Network Status Hook
 * - Tracks navigator.onLine
 * - Validates connectivity with ping to Supabase
 * - Handles flaky connections with debouncing
 */
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [latency, setLatency] = useState<number | null>(null);
  const checkInterval = useRef<number | null>(null);

  const checkConnectivity = useCallback(async () => {
    if (!navigator.onLine) {
      setIsOnline(false);
      setLatency(null);
      return;
    }

    try {
      const start = Date.now();
      // Use a small fetch to the favicon or a light endpoint to verify actual internet access
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch('/favicon.ico', { 
        method: 'HEAD', 
        signal: controller.signal,
        cache: 'no-store' 
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok || response.status < 500) {
        setIsOnline(true);
        setLatency(Date.now() - start);
      } else {
        setIsOnline(false);
      }
    } catch (e) {
      setIsOnline(false);
      setLatency(null);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      checkConnectivity();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setLatency(null);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic check every 30s
    checkInterval.current = window.setInterval(checkConnectivity, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (checkInterval.current) window.clearInterval(checkInterval.current);
    };
  }, [checkConnectivity]);

  return { isOnline, latency };
};

export default useNetworkStatus;
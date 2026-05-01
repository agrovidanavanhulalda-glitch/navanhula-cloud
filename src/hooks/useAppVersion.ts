import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

interface VersionInfo {
  version: string;
  buildDate: string;
}

const APP_VERSION_KEY = 'navanhula-app-version';
const CHECK_INTERVAL = 1000 * 60 * 5; // Check every 5 minutes

export const useAppVersion = () => {
  const [currentVersion, setCurrentVersion] = useState<string | null>(localStorage.getItem(APP_VERSION_KEY));
  const [hasUpdate, setHasUpdate] = useState(false);

  const checkForUpdates = useCallback(async (force = false) => {
    try {
      // Add cache busting to the version check
      const response = await fetch(`/version.json?t=${Date.now()}`, {
        cache: 'no-store'
      });
      
      if (!response.ok) return;

      const data: VersionInfo = await response.json();
      const localVersion = localStorage.getItem(APP_VERSION_KEY);

      if (!localVersion) {
        localStorage.setItem(APP_VERSION_KEY, data.version);
        setCurrentVersion(data.version);
        return;
      }

      if (localVersion !== data.version) {
        console.log(`New version detected: ${data.version} (current: ${localVersion})`);
        setHasUpdate(true);
        
        if (force) {
          handleUpdate();
        }
      }
    } catch (error) {
      console.error('Failed to check for updates:', error);
    }
  }, []);

  const handleUpdate = useCallback(() => {
    // Clear caches
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const registration of registrations) {
          registration.unregister();
        }
      });
    }

    // Force clear internal caches if any (optional)
    caches.keys().then((names) => {
      for (const name of names) {
        caches.delete(name);
      }
    });

    // Update local storage and reload
    fetch('/version.json?t=' + Date.now())
      .then(res => res.json())
      .then(data => {
        localStorage.setItem(APP_VERSION_KEY, data.version);
        window.location.reload();
      });
  }, []);

  useEffect(() => {
    checkForUpdates();
    const interval = setInterval(() => checkForUpdates(), CHECK_INTERVAL);
    
    // Also check on visibility change (when user returns to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdates();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkForUpdates]);

  return { currentVersion, hasUpdate, handleUpdate, checkForUpdates };
};

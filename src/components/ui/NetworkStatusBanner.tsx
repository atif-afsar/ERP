import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, RefreshCw } from 'lucide-react';

export const NetworkStatusBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showRestored, setShowRestored] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowRestored(true);
      setTimeout(() => setShowRestored(false), 3500);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowRestored(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOnline) {
    return (
      <div className="bg-rose-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-lg sticky top-0 z-50 animate-slide-down">
        <div className="flex items-center gap-2">
          <WifiOff className="w-4 h-4 animate-pulse" />
          <span>You are currently offline. Operations requiring server persistence are temporarily queued.</span>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-2.5 py-1 bg-white/20 hover:bg-white/30 rounded text-[11px] font-bold transition-colors flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" />
          Reconnect
        </button>
      </div>
    );
  }

  if (showRestored) {
    return (
      <div className="bg-emerald-600 text-white px-4 py-2 text-xs font-semibold flex items-center gap-2 shadow-lg sticky top-0 z-50 animate-slide-down">
        <Wifi className="w-4 h-4" />
        <span>Internet connection restored. Synchronizing latest updates...</span>
      </div>
    );
  }

  return null;
};

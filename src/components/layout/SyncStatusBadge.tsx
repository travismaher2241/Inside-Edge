import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { SyncOutboxEngine } from '../../modules/cricket/syncOutboxEngine';

export const SyncStatusBadge: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [hasError, setHasError] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
    }

    const interval = setInterval(() => {
      const stats = SyncOutboxEngine.getOutboxStats();
      setPendingCount(stats.pendingCount);
      setIsSyncing(stats.syncingCount > 0);
      setHasError(stats.failedCount > 0);
    }, 2000);

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
      }
      clearInterval(interval);
    };
  }, []);

  // Normal synced online operation remains quiet (non-intrusive)
  if (isOnline && pendingCount === 0 && !isSyncing && !hasError) {
    return null;
  }

  if (!isOnline) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-950/80 border border-amber-800/80 text-amber-300 text-[11px] font-medium shadow-sm">
        <WifiOff className="w-3 h-3 text-amber-400" />
        <span>Offline · Saved locally</span>
      </div>
    );
  }

  if (hasError) {
    return (
      <button
        onClick={() => SyncOutboxEngine.triggerSyncNow()}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-950/80 border border-rose-800/80 text-rose-300 text-[11px] font-medium shadow-sm hover:bg-rose-900 transition-colors"
      >
        <AlertCircle className="w-3 h-3 text-rose-400" />
        <span>Sync problem · Retry</span>
      </button>
    );
  }

  if (isSyncing) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-[11px] font-medium shadow-sm">
        <RefreshCw className="w-3 h-3 text-emerald-400 motion-safe:animate-spin" />
        <span>Syncing…</span>
      </div>
    );
  }

  if (pendingCount > 0) {
    return (
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-[11px] font-medium shadow-sm">
        <span>{pendingCount} waiting to sync</span>
      </div>
    );
  }

  return null;
};

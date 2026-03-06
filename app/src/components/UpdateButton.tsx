import { useState, useEffect, useCallback } from 'react';
import { Download, RefreshCw, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface UpdateStatus {
  status: 'checking' | 'available' | 'not-available' | 'downloading' | 'downloaded' | 'error' | null;
  version?: string;
  percent?: number;
  message?: string;
}

export function UpdateButton() {
  const [isElectron, setIsElectron] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ status: null });
  const [currentVersion, setCurrentVersion] = useState('');
  const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null);

  // Check if running in Electron
  useEffect(() => {
    const checkElectron = async () => {
      if (typeof window !== 'undefined' && window.electronAPI) {
        setIsElectron(true);
        try {
          const versionInfo = await window.electronAPI.getAppVersion();
          setCurrentVersion(versionInfo.version);
        } catch (err) {
          console.error('Failed to get app version:', err);
        }
      }
    };
    checkElectron();
  }, []);

  // Subscribe to update status
  useEffect(() => {
    if (!isElectron || !window.electronAPI?.onUpdateStatus) return;

    const unsub = window.electronAPI.onUpdateStatus((data) => {
      console.log('[UpdateButton] Update status:', data);
      setUpdateStatus({
        status: data.status,
        version: data.version,
        percent: data.percent,
        message: data.message
      });
    });

    setUnsubscribe(() => unsub);

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isElectron]);

  // Handle click - must be defined before any early return (React Hooks rule)
  const handleClick = useCallback(async () => {
    if (!window.electronAPI) return;

    switch (updateStatus.status) {
      case 'available':
        // Start downloading update
        try {
          await window.electronAPI.downloadUpdate();
        } catch (err) {
          console.error('Failed to download update:', err);
        }
        break;

      case 'downloaded':
        // Install update
        window.electronAPI.installUpdate();
        break;

      case 'not-available':
      case 'error':
        // Check for updates again
        try {
          await window.electronAPI.checkForUpdates();
        } catch (err) {
          console.error('Failed to check for updates:', err);
        }
        break;

      default:
        break;
    }
  }, [updateStatus.status]);

  // Don't show button if not in Electron
  if (!isElectron) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <a
              href="https://github.com/your-repo/workgrid/releases"
              target="_blank"
              rel="noopener noreferrer"
              className="w-12 h-12 rounded-full bg-[#0d0d14] hover:bg-[#1a1a24] flex items-center justify-center transition-colors"
            >
              <Download className="w-5 h-5 text-[#a0a0b0]" />
            </a>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Download Aplikasi Desktop</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Get button state based on update status
  const getButtonState = () => {
    switch (updateStatus.status) {
      case 'checking':
        return {
          icon: <Loader2 className="w-5 h-5 text-[#00d4ff] animate-spin" />,
          tooltip: 'Mengecek update...',
          className: 'bg-[#0d0d14] cursor-wait'
        };
      
      case 'available':
        return {
          icon: <Download className="w-5 h-5 text-[#3ba55d]" />,
          tooltip: `Update tersedia (v${updateStatus.version}) - Klik untuk download`,
          className: 'bg-[#0d0d14] hover:bg-[#1a1a24] animate-pulse'
        };
      
      case 'downloading':
        return {
          icon: (
            <div className="relative">
              <RefreshCw className="w-5 h-5 text-[#00d4ff] animate-spin" />
              {updateStatus.percent !== undefined && (
                <span className="absolute -bottom-1 -right-1 text-[8px] font-bold text-[#00d4ff]">
                  {updateStatus.percent}%
                </span>
              )}
            </div>
          ),
          tooltip: `Mendownload update... ${updateStatus.percent || 0}%`,
          className: 'bg-[#0d0d14] cursor-wait'
        };
      
      case 'downloaded':
        return {
          icon: <CheckCircle className="w-5 h-5 text-[#3ba55d]" />,
          tooltip: 'Update siap diinstall - Klik untuk restart',
          className: 'bg-[#3ba55d] hover:bg-[#2d7d46] animate-pulse'
        };
      
      case 'error':
        return {
          icon: <AlertCircle className="w-5 h-5 text-[#ed4245]" />,
          tooltip: `Error: ${updateStatus.message || 'Gagal mengecek update'}`,
          className: 'bg-[#0d0d14] hover:bg-[#1a1a24]'
        };
      
      default:
        return {
          icon: <RefreshCw className="w-5 h-5 text-[#a0a0b0]" />,
          tooltip: `Cek Update (v${currentVersion || '1.0.0'})`,
          className: 'bg-[#0d0d14] hover:bg-[#1a1a24]'
        };
    }
  };

  const state = getButtonState();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleClick}
            disabled={updateStatus.status === 'checking' || updateStatus.status === 'downloading'}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${state.className}`}
          >
            {state.icon}
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{state.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}


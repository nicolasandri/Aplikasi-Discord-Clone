import React from 'react';
import { CheckCircle, AlertCircle, Timer, AlertTriangle, BarChart3, Clock, Calendar } from 'lucide-react';

interface BotMessageProps {
  content: string;
}

// Format date to Indonesian format
function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  } catch {
    return dateString;
  }
}

// Format audit report description with proper styling
function formatAuditDescription(description: string): React.ReactElement {
  if (!description) return <></>;
  
  const lines = description.split('\n');
  
  return (
    <div className="space-y-1">
      {lines.map((line, index) => {
        // Check if line is a numbered item
        const match = line.match(/^(\d+)\.\s+(.+)$/);
        if (match) {
          const [, number, content] = match;
          // Check for mentions (@username)
          const parts = content.split(/(@\w+)/g);
          return (
            <div key={index} className="flex items-start gap-2 text-sm">
              <span className="text-gray-500 min-w-[24px]">{number}.</span>
              <span className="text-gray-200">
                {parts.map((part, i) => 
                  part.startsWith('@') ? (
                    <span key={i} className="text-[#5865f2] hover:underline cursor-pointer">{part}</span>
                  ) : (
                    <span key={i}>{part}</span>
                  )
                )}
              </span>
            </div>
          );
        }
        return <div key={index} className="text-sm text-gray-300">{line}</div>;
      })}
    </div>
  );
}

export function BotMessage({ content }: BotMessageProps) {
  try {
    const data = JSON.parse(content);
    const { embed } = data;
    
    if (!embed) return null;

    const isLate = embed.title?.includes('TERLAMBAT');
    const isCompleted = embed.title?.includes('SELESAI');
    const isStarted = embed.title?.includes('DIMULAI');
    const isTimeoutAlert = embed.isTimeoutAlert || embed.title?.includes('HABIS');
    const isAuditReport = embed.isAuditReport || embed.title?.includes('DAILY REPORT') || embed.title?.includes('DETEKSI POLA');
    const isAuditNakal = embed.title?.includes('NAKAL');

    // Determine colors based on type
    const getBorderColor = () => {
      if (isAuditNakal) return 'border-l-orange-500';
      if (isAuditReport) return 'border-l-blue-500';
      if (isTimeoutAlert) return 'border-l-red-600';
      if (isLate) return 'border-l-red-500';
      if (isCompleted) return 'border-l-gray-500';
      return 'border-l-green-500';
    };

    const getTitleColor = () => {
      if (isAuditNakal) return 'text-orange-400';
      if (isAuditReport) return 'text-blue-400';
      if (isTimeoutAlert) return 'text-red-500';
      if (isLate) return 'text-red-400';
      if (isCompleted) return 'text-gray-300';
      return 'text-green-400';
    };
    
    const getBgColor = () => {
      if (isAuditNakal) return 'bg-orange-900/10';
      if (isAuditReport) return 'bg-blue-900/10';
      if (isTimeoutAlert) return 'bg-red-900/20';
      return 'bg-[#2f3136]';
    };
    
    const getIcon = () => {
      if (isAuditReport && embed.title?.includes('Si Paling')) return <span className="text-lg mr-1">🚽</span>;
      if (isAuditReport && embed.title?.includes('Durasi')) return <Clock className="w-4 h-4 inline mr-1" />;
      if (isAuditReport && embed.title?.includes('Total')) return <BarChart3 className="w-4 h-4 inline mr-1" />;
      if (isAuditNakal) return <AlertTriangle className="w-4 h-4 inline mr-1" />;
      if (isStarted) return <CheckCircle className="w-4 h-4 inline mr-1" />;
      if (isLate) return <AlertCircle className="w-4 h-4 inline mr-1" />;
      if (isTimeoutAlert) return <AlertTriangle className="w-4 h-4 inline mr-1" />;
      return null;
    };

    return (
      <div className="my-2">
        {/* Bot Header */}
        <div className="flex items-center gap-2 mb-1">
          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
            <span className="text-lg">🤖</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white font-medium text-sm hover:underline cursor-pointer">
              SECURITY BOT
            </span>
            <span className="px-1.5 py-0.5 bg-[#5865f2] text-white text-[10px] rounded font-medium">
              APP
            </span>
            <span className="text-gray-500 text-xs">
              {new Date().toLocaleTimeString('id-ID', { 
                hour: 'numeric', 
                minute: '2-digit',
                hour12: true 
              })}
            </span>
          </div>
        </div>

        {/* Embed Container */}
        <div className={`ml-12 rounded-r-lg border-l-4 ${getBorderColor()} ${getBgColor()} max-w-lg`}>
          {/* Title */}
          <div className={`px-4 py-2 font-bold text-sm ${getTitleColor()}`}>
            {getIcon()}
            {embed.title}
          </div>
          
          {/* Date for audit reports */}
          {isAuditReport && embed.date && (
            <div className="px-4 pb-2 text-xs text-gray-400 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Tanggal: {embed.date}
            </div>
          )}

          {/* Content */}
          <div className="px-4 pb-3 text-sm space-y-1">
            {/* Audit Report Description */}
            {isAuditReport && embed.description && (
              <div className="max-h-96 overflow-y-auto">
                {formatAuditDescription(embed.description)}
              </div>
            )}
            
            {/* Staff */}
            {!isAuditReport && (
              <div>
                <span className="text-gray-400 font-medium">Staff:</span>{' '}
                <span className="text-[#5865f2] hover:underline cursor-pointer">
                  {embed.staff}
                </span>
              </div>
            )}

            {/* Tipe */}
            {!isAuditReport && (
              <div>
                <span className="text-gray-400 font-medium">Tipe:</span>{' '}
                <span className="text-white">{embed.type}</span>
              </div>
            )}
            
            {/* Maks (for started) */}
            {embed.maxDuration && (
              <div>
                <span className="text-gray-400 font-medium">Maks:</span>{' '}
                <span className="text-white">{embed.maxDuration}</span>
              </div>
            )}
            
            {/* Mulai */}
            {embed.startedAt && (
              <div>
                <span className="text-gray-400 font-medium">Mulai:</span>{' '}
                <span className="text-white">{formatDate(embed.startedAt)}</span>
              </div>
            )}
            
            {/* Selesai (for completed) */}
            {embed.endedAt && isCompleted && (
              <div>
                <span className="text-gray-400 font-medium">Selesai:</span>{' '}
                <span className="text-white">{formatDate(embed.endedAt)}</span>
              </div>
            )}

            {/* Duration info for completed */}
            {isCompleted && (
              <>
                <div className="pt-2 mt-2 border-t border-gray-600">
                  <span className="text-gray-400 font-medium">Durasi Asli:</span>{' '}
                  <span className="text-white">{embed.actualDuration}</span>
                </div>
                <div>
                  <span className="text-gray-400 font-medium">Penalty:</span>{' '}
                  <span className={embed.penalty !== '0d' ? 'text-red-400 font-bold' : 'text-white'}>
                    {embed.penalty}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 font-medium">Total Tercatat:</span>{' '}
                  <span className="text-white">{embed.recordedDuration}</span>
                </div>
              </>
            )}

            {/* Ended with keyword */}
            {embed.endedWith && (
              <div className="pt-2 mt-2 border-t border-gray-600">
                <span className="text-green-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {embed.endedWith}
                </span>
              </div>
            )}

            {/* Note for started */}
            {embed.note && !isTimeoutAlert && (
              <div className="text-gray-500 text-xs pt-1">
                {embed.note}
              </div>
            )}
            
            {/* Timeout Alert Message - Highlighted */}
            {isTimeoutAlert && embed.note && (
              <div className="mt-3 pt-2 border-t border-red-600/50">
                <div className="text-red-400 font-bold text-sm flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{embed.note}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  } catch {
    return null;
  }
}

export default BotMessage;

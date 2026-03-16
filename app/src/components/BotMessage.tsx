import { CheckCircle, AlertCircle } from 'lucide-react';

interface BotMessageProps {
  content: string;
}

export function BotMessage({ content }: BotMessageProps) {
  try {
    const data = JSON.parse(content);
    const { embed } = data;
    
    if (!embed) return null;

    const isLate = embed.title?.includes('TERLAMBAT');
    const isCompleted = embed.title?.includes('SELESAI');
    const isStarted = embed.title?.includes('DIMULAI');

    // Determine colors based on type
    const getBorderColor = () => {
      if (isLate) return 'border-l-red-500';
      if (isCompleted) return 'border-l-gray-500';
      return 'border-l-green-500';
    };

    const getTitleColor = () => {
      if (isLate) return 'text-red-400';
      if (isCompleted) return 'text-gray-300';
      return 'text-green-400';
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
        <div className={`ml-12 rounded-r-lg border-l-4 ${getBorderColor()} bg-[#2f3136] max-w-lg`}>
          {/* Title */}
          <div className={`px-4 py-2 font-bold text-sm ${getTitleColor()}`}>
            {isStarted && <CheckCircle className="w-4 h-4 inline mr-1" />}
            {isLate && <AlertCircle className="w-4 h-4 inline mr-1" />}
            {embed.title}
          </div>

          {/* Content */}
          <div className="px-4 pb-3 text-sm space-y-1">
            {/* Staff */}
            <div>
              <span className="text-gray-400 font-medium">Staff:</span>{' '}
              <span className="text-[#5865f2] hover:underline cursor-pointer">
                {embed.staff}
              </span>
            </div>

            {/* Tipe */}
            <div>
              <span className="text-gray-400 font-medium">Tipe:</span>{' '}
              <span className="text-white">{embed.type}</span>
            </div>
            
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
                <span className="text-white">{embed.startedAt}</span>
              </div>
            )}
            
            {/* Selesai (for completed) */}
            {embed.endedAt && isCompleted && (
              <div>
                <span className="text-gray-400 font-medium">Selesai:</span>{' '}
                <span className="text-white">{embed.endedAt}</span>
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
            {embed.note && (
              <div className="text-gray-500 text-xs pt-1">
                {embed.note}
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

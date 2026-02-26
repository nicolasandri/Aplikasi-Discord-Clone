import { useMemo } from 'react';

interface MessageContentProps {
  content: string;
}

export function MessageContent({ content }: MessageContentProps) {
  const rendered = useMemo(() => {
    if (!content) return '';
    
    // Simple markdown parser for display
    let html = content
      // Escape HTML
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // Bold: **text** or __text__
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/__(.+?)__/g, '<strong>$1</strong>')
      // Italic: *text* or _text_
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/_(.+?)_/g, '<em>$1</em>')
      // Strikethrough: ~~text~~
      .replace(/~~(.+?)~~/g, '<s class="text-gray-400">$1</s>')
      // Inline code: `text`
      .replace(/`(.+?)`/g, '<code class="bg-[#2B2D31] px-1.5 py-0.5 rounded text-sm font-mono text-[#b9bbbe]">$1</code>')
      // Code block: ```text```
      .replace(/```([\s\S]*?)```/g, '<pre class="bg-[#2B2D31] p-3 rounded-lg my-2 overflow-x-auto"><code class="text-sm font-mono text-[#b9bbbe]">$1</code></pre>')
      // Mentions: @username
      .replace(/@(\w+)/g, '<span class="bg-[#5865F2]/20 text-[#5865F2] rounded px-1 font-medium cursor-pointer hover:bg-[#5865F2]/30 transition-colors">@$1</span>')
      // Links
      .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-[#00AFF4] hover:underline">$1</a>')
      // Newlines
      .replace(/\n/g, '<br />');
    
    return html;
  }, [content]);

  return (
    <div 
      className="message-content text-[#dcddde] leading-relaxed whitespace-pre-wrap"
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
}

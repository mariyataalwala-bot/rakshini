
import { useRef, useEffect } from 'react';
import { useStore } from '../../store/useStore';

interface AIAssistantProps {
  className?: string;
}

export function AIAssistant({ className = '' }: AIAssistantProps) {
  const messages = useStore(state => state.chatMessages);
  const isStreaming = useStore(state => state.chatIsStreaming);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change or streaming
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  return (
    <section className={`panel flex flex-col h-full ${className}`}>
      <div className="panel-header border-b border-white/5 pb-4 shrink-0">
        <h2 className="panel-title text-blue-400">AI Logic Core</h2>
        {isStreaming && (
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div>
            <span className="text-[0.65rem] text-emerald-500 uppercase tracking-widest font-mono">Processing</span>
          </div>
        )}
      </div>
      
      <div 
        ref={scrollRef} 
        className="flex-1 overflow-y-auto pt-4 custom-scrollbar pr-2 space-y-3 font-mono text-[0.8rem]"
      >
        {messages.length === 0 ? (
          <div className="p-3 bg-blue-500/5 rounded-lg border border-blue-500/20 text-blue-400/80 shadow-inner">
            <span className="text-blue-500 font-bold mr-2">›</span>
            SYSTEM INITIALIZED. WAITING FOR TELEMETRY INPUT...
          </div>
        ) : (
          messages.map((msg) => {
            const isAlert = msg.content.toLowerCase().includes('warning') || msg.content.toLowerCase().includes('threat');
            const timeStr = new Date(msg.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
            
            return (
              <div 
                key={msg.id} 
                className={`p-3 rounded-lg border-l-4 shadow-md transition-all duration-300 animate-fade-in ${
                  isAlert 
                    ? 'bg-rose-500/5 border-rose-500 text-white shadow-[0_4px_15px_rgba(244,63,94,0.05)]' 
                    : msg.role === 'user'
                      ? 'bg-blue-500/10 border-blue-500 text-blue-100 ml-6'
                      : 'bg-slate-800/40 border-slate-500/50 text-slate-300 mr-6'
                }`}
              >
                <div className="text-[0.65rem] text-slate-500 mb-1 tracking-widest">
                  [{timeStr}] {msg.role === 'assistant' ? 'Llama-3-Agent' : 'Operator'}
                </div>
                <div className="leading-relaxed">
                  {msg.content}
                  {msg.role === 'assistant' && isStreaming && msg.id === messages[messages.length - 1].id && (
                    <span className="inline-block w-2 h-3 ml-1 bg-blue-400 animate-pulse align-middle shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-white/5 relative">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            const input = (e.currentTarget.elements.namedItem('query') as HTMLInputElement);
            const text = input.value.trim();
            if (!text) return;
            
            useStore.getState().addChatMessage({
              id: Date.now().toString(),
              role: 'user',
              content: text,
              timestamp: Date.now()
            });
            input.value = '';
            
            // In a real app, this would be sent to the backend over WebSocket
            // wsService.ws?.send(JSON.stringify({ type: 'chat', content: text }));
          }}
          className="flex gap-2"
        >
          <input 
            type="text" 
            name="query"
            placeholder="Query AI Assistant..."
            className="flex-1 bg-slate-900/50 border border-white/10 text-white text-[0.8rem] rounded-lg py-2 pl-3 pr-3 focus:outline-none focus:border-blue-500/50 focus:bg-slate-800/80 transition-all font-mono shadow-inner"
          />
          <button 
            type="submit"
            className="bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 px-4 py-2 rounded-lg font-mono text-[0.7rem] uppercase tracking-wider transition-all duration-300"
          >
            Send
          </button>
        </form>
      </div>
    </section>
  );
}

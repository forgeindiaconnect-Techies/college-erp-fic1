import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Sparkles } from 'lucide-react';
import './FloatingChatbot.css';

const QUICK_REPLIES = [
  'Show low attendance students',
  'Fee collection today',
  'Upcoming exams',
  'Pending fee students',
];

const getBotResponse = (msg) => {
  const m = msg.toLowerCase();
  if (m.includes('attendance')) return '📊 3 students have attendance below 75%: David Lee (68%), Robert Johnson (68%), Neha Gupta (75%). Sending alerts to HODs.';
  if (m.includes('fee')) return '💰 Today\'s fee collection: ₹4,50,000. Pending: 3 students across CSE and ECE departments.';
  if (m.includes('exam')) return '📝 Upcoming exams: Data Structures (May 30), DBMS (June 2), Circuits (June 5). Timetables notified to all students.';
  if (m.includes('hostel')) return '🏨 Hostel occupancy: Boys Block A — 45/50 rooms. Girls Block A — 38/40 rooms. Maintenance pending in Room R-102.';
  if (m.includes('placement')) return '🎓 2 placement drives active: Microsoft (SDE, deadline June 10) and TCS (System Engineer, deadline June 15). Emily Davis has been shortlisted by Microsoft!';
  return `🤖 I've logged your query: "${msg}". Fetching ERP data... For best results, try asking about attendance, fees, exams, or placement.`;
};

const FloatingChatbot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { from: 'bot', text: '👋 Hi! I\'m your ERP AI Assistant. Ask me anything about students, attendance, fees, or placements!' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessage = (text) => {
    const userMsg = text || input.trim();
    if (!userMsg) return;
    setInput('');
    setMessages(prev => [...prev, { from: 'user', text: userMsg }]);
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, { from: 'bot', text: getBotResponse(userMsg) }]);
    }, 1200);
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <div className="floating-chatbot-container">
      {/* Chat Window */}
      {isOpen && (
        <div className="chat-window glass-card animate-fade-in">
          <div className="chat-header">
            <div className="chat-header-left">
              <div className="bot-avatar-small"><Bot size={18} /></div>
              <div>
                <p className="font-bold text-sm">ERP AI Assistant</p>
                <p className="text-xs text-muted flex items-center gap-1"><span className="online-dot"></span> Online</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="icon-btn"><X size={18} /></button>
          </div>

          <div className="chat-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`chat-bubble-wrapper ${msg.from === 'user' ? 'user' : 'bot'}`}>
                <div className={`chat-bubble ${msg.from}`}>{msg.text}</div>
              </div>
            ))}
            {isTyping && (
              <div className="chat-bubble-wrapper bot">
                <div className="chat-bubble bot typing-indicator">
                  <span></span><span></span><span></span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="quick-replies">
            {QUICK_REPLIES.map(q => (
              <button key={q} className="quick-reply-chip" onClick={() => sendMessage(q)}>{q}</button>
            ))}
          </div>

          <div className="chat-input-bar">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask ERP anything..."
              className="chat-text-input"
            />
            <button onClick={() => sendMessage()} className="chat-send-btn" disabled={!input.trim()}>
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {/* FAB Toggle Button */}
      <button
        className={`chat-fab ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(o => !o)}
        title="ERP AI Assistant"
      >
        {isOpen ? <X size={24} /> : <Bot size={24} />}
        {!isOpen && <Sparkles size={12} className="fab-sparkle" />}
      </button>
    </div>
  );
};

export default FloatingChatbot;

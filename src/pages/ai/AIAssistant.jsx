import React, { useState, useRef, useEffect } from 'react';
import {
  Bot, Send, User, Sparkles, FileText, Activity, AlertCircle, TrendingDown,
  Zap, Database, Server, ShieldCheck
} from 'lucide-react';
import './AIAssistant.css';

const QUICK_PROMPTS = [
  "Show CSE low attendance students",
  "Generate today attendance report",
  "Which department has pending fees?",
  "Show upcoming exams",
  "Create announcement for all students"
];

const MOCK_AI_RESPONSES = {
  "show cse low attendance students": "I found 3 students in CSE with attendance below 75%: \n\n1. Vikram Seth (62%)\n2. Priya Sharma (68%)\n3. Arjun Kumar (71%)\n\nWould you like me to send them a warning notification?",
  "generate today attendance report": "I have compiled the attendance report for today. Overall college attendance is at **88%**. \n\nHighest: IT Dept (95%)\nLowest: MECH Dept (78%)\n\nThe detailed PDF report is ready for download in the Reports module.",
  "which department has pending fees?": "The **Mechanical Engineering (MECH)** department currently has the highest pending fees, totaling ₹1,25,000 across 12 students. Would you like me to draft an automated fee reminder email to these students?",
  "show upcoming exams": "The next major examination is the **Even Semester Finals** starting on June 15th, 2026. \n\nI noticed the hall tickets haven't been generated yet. Should I initiate the batch generation process?",
  "create announcement for all students": "Okay, I'm ready to draft an announcement. What is the subject of the announcement? \n(e.g. Tomorrow is a declared holiday due to heavy rain)",
};

const AIAssistant = () => {
  const [messages, setMessages] = useState([
    { id: 1, sender: 'ai', text: "Hello! I am your FIC AI ERP Assistant. I can help you analyze data, generate reports, or automate tasks based on your current role permissions. What would you like to do today?" }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = (text) => {
    const query = text || inputValue;
    if (!query.trim()) return;

    // Add user message
    const newUserMsg = { id: Date.now(), sender: 'user', text: query };
    setMessages(prev => [...prev, newUserMsg]);
    setInputValue('');
    setIsTyping(true);

    // Simulate AI thinking and response
    setTimeout(() => {
      const lowerQuery = query.toLowerCase();
      let responseText = "I'm sorry, I couldn't find specific data for that query in the current ERP context. Could you try rephrasing or ask me about attendance, fees, or reports?";
      
      for (const [key, value] of Object.entries(MOCK_AI_RESPONSES)) {
        if (lowerQuery.includes(key) || key.includes(lowerQuery)) {
          responseText = value;
          break;
        }
      }

      const newAiMsg = { id: Date.now() + 1, sender: 'ai', text: responseText };
      setMessages(prev => [...prev, newAiMsg]);
      setIsTyping(false);
    }, 1500);
  };

  return (
    <div className="ai-page animate-fade-in">
      <div className="ai-header">
        <h1><Bot size={32} className="text-purple-500" /> FIC AI Copilot</h1>
        <p className="text-muted mt-2">Your intelligent companion for seamless College ERP management. Ask me anything.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Chat Area */}
        <div className="lg:col-span-2">
          <div className="chat-container glass-card">
            <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600">
                  <Sparkles size={20} />
                </div>
                <div>
                  <h2 className="font-bold">ERP AI Agent</h2>
                  <p className="text-xs text-success flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-success"></span> Online & Ready
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold flex items-center gap-1"><ShieldCheck size={12}/> Admin Access</span>
              </div>
            </div>

            <div className="chat-messages">
              {messages.map(msg => (
                <div key={msg.id} className={`chat-message ${msg.sender}`}>
                  <div className="avatar">
                    {msg.sender === 'ai' ? <Bot size={20}/> : <User size={20}/>}
                  </div>
                  <div className="bubble whitespace-pre-wrap">
                    {msg.text}
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="chat-message ai">
                  <div className="avatar"><Bot size={20}/></div>
                  <div className="typing-indicator">
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-area">
              <input 
                type="text" 
                className="chat-input"
                placeholder="Ask AI to generate a report, find a student, or explain data..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              />
              <button 
                className="send-btn" 
                onClick={() => handleSend()}
                disabled={!inputValue.trim() || isTyping}
              >
                <Send size={18} className="ml-1" />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Area */}
        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Zap size={18} className="text-yellow-500"/> Quick Prompts</h3>
            <div className="quick-prompts">
              {QUICK_PROMPTS.map((prompt, idx) => (
                <button 
                  key={idx} 
                  className="prompt-chip"
                  onClick={() => handleSend(prompt)}
                  disabled={isTyping}
                >
                  <Sparkles size={14} className="text-purple-500 flex-shrink-0" />
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="glass-card p-6 border-l-4 border-red-500">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-danger"><AlertCircle size={18}/> Smart Alerts</h3>
            <div className="space-y-3">
              <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded border border-red-100 dark:border-red-900/30">
                <p className="text-sm font-bold flex items-center gap-2"><TrendingDown size={14}/> Low Attendance Warning</p>
                <p className="text-xs text-muted mt-1">AI detected 15 students across 3 departments with attendance dropping below 75% this week.</p>
                <button className="text-xs text-primary font-bold mt-2" onClick={() => handleSend("Show low attendance students")}>Investigate</button>
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Activity size={18} className="text-blue-500"/> System Health</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted flex items-center gap-2"><Database size={14}/> DB Sync Status</span>
                <span className="text-success font-bold">Synced</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted flex items-center gap-2"><Server size={14}/> API Latency</span>
                <span className="font-mono">42ms</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AIAssistant;

"use client";

import React, { useState, useEffect, useRef } from 'react';
import socket from '../lib/socket';

export default function ChatPanel({ roomId, username, disabled }) {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll to the newest message whenever the messages array updates
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Listener for receiving messages broadcasted by the server
    const handleReceiveMessage = (messageData) => {
      setMessages((prevMessages) => [...prevMessages, messageData]);
    };

    socket.on('receive_message', handleReceiveMessage);

    // Cleanup listener to prevent duplicate messages when unmounting
    return () => {
      socket.off('receive_message', handleReceiveMessage);
    };
  }, []);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (disabled || !inputMessage.trim()) return;

    // Emit the message event to our server router
    socket.emit('send_message', {
      roomId,
      username,
      message: inputMessage.trim(),
    });

    setInputMessage(''); // Reset input
  };

  // Helper to neatly format the ISO timestamp
  const formatTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800">
      
      {/* Chat Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950 shrink-0">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <span className="text-xl">💬</span> Room Chat
        </h2>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-grow p-4 overflow-y-auto flex flex-col gap-3">
        {messages.length === 0 ? (
          <p className="text-slate-500 text-sm italic text-center mt-4">
            No messages yet. Start the conversation!
          </p>
        ) : (
          messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`flex flex-col max-w-[90%] ${msg.username === username ? 'self-end items-end' : 'self-start items-start'}`}
            >
              <span className="text-xs text-slate-400 mb-1 px-1">
                {msg.username === username ? 'You' : msg.username} • {formatTime(msg.timestamp)}
              </span>
              <div 
                className={`px-3 py-2 rounded-lg text-sm shadow-sm break-words ${
                  msg.username === username 
                    ? 'bg-indigo-600 text-white rounded-tr-none' 
                    : 'bg-slate-800 text-slate-100 rounded-tl-none'
                }`}
              >
                {msg.message}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Box */}
      <div className="p-4 bg-slate-950 border-t border-slate-850 shrink-0">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            className="flex-grow bg-slate-900 border border-slate-800 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder={disabled ? "Chat disabled (view only)" : "Type a message..."}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={disabled}
          />
          <button
            type="submit"
            disabled={disabled || !inputMessage.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md font-medium text-sm transition-colors"
          >
            Send
          </button>
        </form>
      </div>
      
    </div>
  );
}

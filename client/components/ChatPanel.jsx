"use client";

import React, { useState, useEffect, useRef } from 'react';
import socket from '../lib/socket';

export default function ChatPanel({ roomId, username }) {
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
    if (!inputMessage.trim()) return;

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
    <div className="flex flex-col h-full bg-gray-800 border-l border-gray-700">
      
      {/* Chat Header */}
      <div className="p-4 border-b border-gray-700 bg-gray-900 shrink-0">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <span className="text-xl">💬</span> Room Chat
        </h2>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-grow p-4 overflow-y-auto flex flex-col gap-3">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-sm italic text-center mt-4">
            No messages yet. Start the conversation!
          </p>
        ) : (
          messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`flex flex-col max-w-[90%] ${msg.username === username ? 'self-end items-end' : 'self-start items-start'}`}
            >
              <span className="text-xs text-gray-400 mb-1 px-1">
                {msg.username === username ? 'You' : msg.username} • {formatTime(msg.timestamp)}
              </span>
              <div 
                className={`px-3 py-2 rounded-lg text-sm shadow-sm break-words ${
                  msg.username === username 
                    ? 'bg-blue-600 text-white rounded-tr-none' 
                    : 'bg-gray-700 text-gray-100 rounded-tl-none'
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
      <div className="p-4 bg-gray-900 border-t border-gray-700 shrink-0">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            className="flex-grow bg-gray-800 border border-gray-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 transition-colors"
            placeholder="Type a message..."
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
          />
          <button
            type="submit"
            disabled={!inputMessage.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md font-medium text-sm transition-colors"
          >
            Send
          </button>
        </form>
      </div>
      
    </div>
  );
}

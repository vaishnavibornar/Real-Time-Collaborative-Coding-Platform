"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Editor from '@monaco-editor/react';
import ChatPanel from '../../../components/ChatPanel';
import LanguageSelector from '../../../components/Editor/LanguageSelector';
import FileExplorer from '../../../components/FileExplorer';
import useWorkspace from '../../../hooks/useWorkspace';

export default function RoomPage() {
  const { roomId } = useParams(); // Get dynamic roomId from the URL
  const router = useRouter();
  
  const [username, setUsername] = useState(''); // Empty initially to match server render safely
  const [isMounted, setIsMounted] = useState(false); // Tracks if component has hydrated

  // 1. Generate username only after component mounts (runs on client only)
  useEffect(() => {
    setIsMounted(true); // Signal that we are safely on the client
    const newName = `User_${Math.floor(Math.random() * 1000)}`;
    setUsername(newName);
  }, []);

  // 2. Initialize Workspace Hook
  const {
    files,
    activeFile,
    loading,
    error,
    createFile,
    renameFile,
    deleteFile,
    selectFile,
    handleCodeChange,
    handleLanguageChange
  } = useWorkspace(roomId, username);

  const handleLeaveRoom = () => {
    router.push('/'); // Navigate back to the home page
  };

  // Prevent rendering mismatched UI during SSR vs Client
  if (!isMounted) {
    return (
      <main className="h-screen w-screen bg-gray-900 flex items-center justify-center text-white">
        <p>Loading workspace...</p>
      </main>
    );
  }

  return (
    <main className="h-screen w-screen bg-gray-900 flex flex-col overflow-hidden">
      
      {/* Header section */}
      <header className="h-16 px-4 bg-gray-800 text-white flex justify-between items-center shadow-md z-10 shrink-0 border-b border-gray-700">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <span className="text-blue-500">{"</>"}</span> Collaborative Editor
        </h1>
        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-sm text-gray-400">
            Username: <span className="text-gray-200 font-medium">{username}</span>
          </div>
          <div className="text-sm bg-gray-700 px-3 py-1 rounded-full border border-gray-600 flex items-center gap-2">
            <span className="text-gray-400">Room:</span> 
            <span className="font-mono text-blue-400">{roomId}</span>
          </div>
          
          {/* Synchronized Language Selector for Active File */}
          <LanguageSelector 
            currentLanguage={activeFile?.language || 'javascript'} 
            onLanguageChange={handleLanguageChange} 
          />

          <button 
            onClick={handleLeaveRoom}
            className="text-sm bg-red-600 hover:bg-red-700 px-4 py-1.5 rounded-md font-medium transition duration-200"
          >
            Leave
          </button>
        </div>
      </header>
      
      {/* Workspace Area: Sidebar, Editor & Chat */}
      <div className="flex-grow flex w-full overflow-hidden">
        
        {/* File Explorer Sidebar */}
        <FileExplorer
          files={files}
          activeFile={activeFile}
          createFile={createFile}
          renameFile={renameFile}
          deleteFile={deleteFile}
          selectFile={selectFile}
        />

        {/* Monaco Editor section */}
        <div className="flex-grow relative bg-gray-900 flex flex-col">
          {loading && files.length === 0 ? (
            <div className="flex-grow flex items-center justify-center text-gray-400 text-sm">
              Loading workspace files...
            </div>
          ) : error ? (
            <div className="flex-grow flex items-center justify-center text-red-400 text-sm p-4">
              Error: {error}
            </div>
          ) : activeFile ? (
            <Editor
              height="100%"
              width="100%"
              theme="vs-dark"
              language={activeFile.language}
              value={activeFile.fileContent}
              onChange={handleCodeChange}
              options={{
                minimap: { enabled: false },
                fontSize: 16,
                wordWrap: "on",
                padding: { top: 20 },
                fontFamily: "'Fira Code', 'Monaco', monospace",
                formatOnPaste: true,
              }}
            />
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-gray-500 p-8 text-center select-none">
              <svg className="w-16 h-16 text-gray-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 13h6m-3-3v6m-9 1V4a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              <h3 className="text-lg font-bold text-gray-400 mb-1">No file open</h3>
              <p className="text-sm max-w-xs text-gray-600">
                Create a file or select an existing one in the explorer sidebar to begin coding.
              </p>
            </div>
          )}
        </div>

        {/* Real-Time Chat Panel area */}
        <div className="w-80 shrink-0 hidden md:block">
          <ChatPanel roomId={roomId} username={username} />
        </div>

      </div>
    </main>
  );
}

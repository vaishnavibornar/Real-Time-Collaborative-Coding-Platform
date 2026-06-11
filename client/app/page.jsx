"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const [roomId, setRoomId] = useState('');
  const router = useRouter();

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (roomId.trim()) {
      // Navigate to the dynamic room page
      router.push(`/room/${roomId.trim()}`);
    }
  };

  return (
    <main className="h-screen w-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-96 max-w-[90%] border border-gray-700">
        <h1 className="text-2xl font-bold text-white mb-6 text-center flex items-center justify-center gap-2">
          <span className="text-blue-500">{"</>"}</span> Join a Room
        </h1>
        
        <form onSubmit={handleJoinRoom} className="flex flex-col gap-4">
          <div>
            <label htmlFor="roomId" className="block text-sm font-medium text-gray-400 mb-1">
              Room ID
            </label>
            <input
              id="roomId"
              type="text"
              className="w-full bg-gray-900 border border-gray-600 rounded-md px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="e.g. project-x"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-200 mt-2"
          >
            Join Room
          </button>
        </form>
      </div>
    </main>
  );
}

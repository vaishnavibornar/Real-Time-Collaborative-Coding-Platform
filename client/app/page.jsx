'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '../context/AuthContext';
import CreateRoomModal from '../components/CreateRoomModal';
import { API_BASE_URL } from '../lib/api';

export default function Home() {
  const router = useRouter();
  const { user, logout, authFetch, loading } = useAuth();
  const [roomIdInput, setRoomIdInput] = useState('');
  const [rooms, setRooms] = useState([]);
  const [fetchingRooms, setFetchingRooms] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Fetch accessible rooms list
  useEffect(() => {
    if (user) {
      setFetchingRooms(true);
      authFetch(`${API_BASE_URL}/rooms`)
        .then((res) => {
          if (res.ok) return res.json();
          throw new Error('Failed to fetch rooms');
        })
        .then((data) => setRooms(data))
        .catch((err) => console.error('Error loading rooms:', err))
        .finally(() => setFetchingRooms(false));
    }
  }, [user]);

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (roomIdInput.trim()) {
      router.push(`/room/${roomIdInput.trim()}`);
    }
  };

  const handleCreateSuccess = (newRoom) => {
    setIsCreateModalOpen(false);
    router.push(`/room/${newRoom.roomId}`);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  // --- 1. LANDING PAGE FOR GUESTS ---
  if (!user) {
    return (
      <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-slate-950 px-4 text-center">
        {/* Glowing Accents */}
        <div className="absolute top-1/4 left-1/4 -z-10 h-96 w-96 rounded-full bg-indigo-500/10 blur-[150px]" />
        <div className="absolute bottom-1/4 right-1/4 -z-10 h-96 w-96 rounded-full bg-purple-500/10 blur-[150px]" />

        <div className="max-w-3xl space-y-6">
          <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Secure Collaborative IDE
          </h1>
          <p className="text-lg sm:text-xl text-slate-400 max-w-xl mx-auto">
            Experience real-time code synchronization, crystal clear live chat, and granular permission access controls in secure private workspaces.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
            <Link
              href="/login"
              className="rounded-lg bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg hover:bg-indigo-500 transition-all duration-200 hover:scale-105"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="rounded-lg border border-slate-800 bg-slate-900/40 px-6 py-3 text-sm font-semibold text-slate-200 hover:bg-slate-800 transition-all duration-200 hover:scale-105"
            >
              Create Free Account
            </Link>
          </div>

          <div className="mx-auto max-w-sm rounded-xl border border-slate-800/80 bg-slate-900/20 p-6 backdrop-blur-xl shadow-xl mt-12">
            <h2 className="text-lg font-bold text-white mb-4">Have a room code?</h2>
            <form onSubmit={handleJoinRoom} className="space-y-3">
              <input
                type="text"
                value={roomIdInput}
                onChange={(e) => setRoomIdInput(e.target.value)}
                placeholder="Enter Room ID"
                required
                className="w-full rounded border border-slate-850 bg-slate-950 px-3 py-2 text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none sm:text-sm"
              />
              <button
                type="submit"
                className="w-full rounded bg-indigo-600/80 hover:bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors"
              >
                Join Workspace
              </button>
            </form>
          </div>
        </div>
      </main>
    );
  }

  // --- 2. AUTHENTICATED DASHBOARD ---
  return (
    <main className="relative flex min-h-screen flex-col bg-slate-950 text-slate-100">
      {/* Decorative Glow */}
      <div className="absolute top-0 right-1/4 -z-10 h-[500px] w-[500px] rounded-full bg-indigo-500/5 blur-[120px]" />

      {/* Navigation Header */}
      <header className="border-b border-slate-900 bg-slate-900/20 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          CoSphere
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-400">
            Signed in as <strong className="text-slate-200">{user.name}</strong>
          </span>
          <button
            onClick={logout}
            className="rounded border border-slate-850 px-3 py-1.5 text-xs font-semibold text-slate-400 hover:bg-slate-900 hover:text-white transition-colors"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 max-w-5xl w-full mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Side: Create / Join Actions */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-900 bg-slate-900/40 p-6 backdrop-blur shadow">
            <h2 className="text-lg font-bold text-white mb-4">Start Collaborating</h2>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="w-full rounded bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:from-indigo-500 hover:to-purple-500 transition-all hover:scale-[1.01]"
            >
              + Create New Room
            </button>
          </div>

          <div className="rounded-xl border border-slate-900 bg-slate-900/40 p-6 backdrop-blur shadow">
            <h2 className="text-lg font-bold text-white mb-4">Join Room by ID</h2>
            <form onSubmit={handleJoinRoom} className="space-y-3">
              <input
                type="text"
                value={roomIdInput}
                onChange={(e) => setRoomIdInput(e.target.value)}
                placeholder="Enter Room ID (e.g. abc123)"
                required
                className="w-full rounded border border-slate-850 bg-slate-950 px-3 py-2 text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none sm:text-sm"
              />
              <button
                type="submit"
                className="w-full rounded bg-slate-800 hover:bg-slate-750 border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors"
              >
                Join Workspace
              </button>
            </form>
          </div>
        </div>

        {/* Right Side: Rooms List */}
        <div className="md:col-span-2 space-y-6">
          <div className="rounded-xl border border-slate-900 bg-slate-900/40 p-6 backdrop-blur shadow min-h-[400px] flex flex-col">
            <h2 className="text-lg font-bold text-white mb-6">Workspaces</h2>

            {fetchingRooms ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
              </div>
            ) : rooms.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-500">
                <svg className="h-12 w-12 mb-3 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <p>No active workspaces found.</p>
                <p className="text-xs mt-1">Create a new room or enter a code above to start coding.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {rooms.map((room) => (
                  <div
                    key={room.roomId}
                    className="flex items-center justify-between p-4 rounded-lg border border-slate-900 bg-slate-950/40 hover:border-slate-800 hover:bg-slate-950/80 transition-all group"
                  >
                    <div>
                      <h3 className="font-semibold text-white group-hover:text-indigo-400 transition-colors">
                        {room.roomName}
                      </h3>
                      <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400">
                        <span className={`px-2 py-0.5 rounded-full font-medium ${
                          room.visibility === 'private'
                            ? 'bg-purple-950/80 text-purple-300 border border-purple-800/40'
                            : 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/40'
                        }`}>
                          {room.visibility}
                        </span>
                        <span>Code: <code className="bg-slate-900 px-1 py-0.5 rounded text-slate-300">{room.roomId}</code></span>
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/room/${room.roomId}`)}
                      className="rounded bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white px-3 py-1.5 text-xs font-semibold border border-indigo-500/20 hover:border-transparent transition-all"
                    >
                      Enter Room
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <CreateRoomModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateSuccess={handleCreateSuccess}
      />
    </main>
  );
}

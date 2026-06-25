'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Editor from '@monaco-editor/react';
import ChatPanel from '../../../components/ChatPanel';
import LanguageSelector from '../../../components/Editor/LanguageSelector';
import FileExplorer from '../../../components/FileExplorer';
import ParticipantsPanel from '../../../components/ParticipantsPanel';
import InviteUserModal from '../../../components/InviteUserModal';
import RoomSettingsModal from '../../../components/RoomSettingsModal';
import useWorkspace from '../../../hooks/useWorkspace';
import { useAuth } from '../../../context/AuthContext';
import socket from '../../../lib/socket';
import { API_BASE_URL } from '../../../lib/api';

function RoomContent() {
  const { roomId } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const { user, token, authFetch, loading: authLoading } = useAuth();
  
  const [username, setUsername] = useState('');
  const [roomName, setRoomName] = useState('Workspace');
  const [role, setRole] = useState(null); // OWNER, EDITOR, VIEWER
  const [visibility, setVisibility] = useState('public');
  const [members, setMembers] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  
  // Dynamic UI States
  const [loadingRoom, setLoadingRoom] = useState(true);
  const [roomError, setRoomError] = useState(null);
  const [isPrivateGate, setIsPrivateGate] = useState(false);
  const [joinStatus, setJoinStatus] = useState('none'); // none, PENDING
  const [submittingJoinRequest, setSubmittingJoinRequest] = useState(false);
  const [activeTab, setActiveTab] = useState('files'); // files, chat, participants
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // 1. Initial Access Check & Invitation Acceptance
  const checkRoomAccess = async () => {
    setLoadingRoom(true);
    setRoomError(null);
    try {
      // If there's an inviteId query param, accept it first
      const inviteId = searchParams.get('inviteId');
      if (inviteId && token) {
        try {
          const acceptRes = await fetch(`${API_BASE_URL}/invitations/accept`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ invitationId: inviteId })
          });
          if (acceptRes.ok) {
            // Remove the query param to prevent loops
            router.replace(`/room/${roomId}`);
            return; // let router replacement re-trigger access check
          }
        } catch (err) {
          console.error('Error accepting invitation:', err);
        }
      }

      // Fetch room details
      const response = await fetch(`${API_BASE_URL}/rooms/${roomId}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      const data = await response.json();

      if (response.status === 403 && data.isPrivate) {
        setIsPrivateGate(true);
        setRoomName(data.roomName || 'Private Workspace');
        setJoinStatus(data.status || 'none');
      } else if (!response.ok) {
        throw new Error(data.error || 'Failed to load room workspace');
      } else {
        setIsPrivateGate(false);
        setRoomName(data.room.roomName);
        setRole(data.role || 'VIEWER');
        setVisibility(data.room.visibility);
        setMembers(data.members || []);
        setPendingRequests(data.pendingRequests || []);
      }
    } catch (err) {
      console.error('Room access error:', err);
      setRoomError(err.message || 'Failed to load room workspace');
      // If unauthorized, redirect to login page
      if (!token) {
        router.push(`/login?callbackUrl=${encodeURIComponent(`/room/${roomId}`)}`);
      }
    } finally {
      setLoadingRoom(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      checkRoomAccess();
    }
  }, [roomId, token, authLoading]);

  // Set Username
  useEffect(() => {
    if (user) {
      setUsername(user.name);
    } else {
      setUsername(`Guest_${Math.floor(Math.random() * 1000)}`);
    }
  }, [user]);

  // 2. Real-Time Socket Listeners for Membership & Role Changes
  useEffect(() => {
    if (isPrivateGate || loadingRoom) return;

    // Listen for participant updates
    socket.on('participants_update', ({ members: updatedMembers, pendingRequests: updatedPending }) => {
      setMembers(updatedMembers);
      setPendingRequests(updatedPending);
    });

    // Listen for user role updates
    socket.on('role_updated', ({ roomId: rId, role: newRole }) => {
      if (rId === roomId) {
        setRole(newRole);
      }
    });

    // Listen for room deletion
    socket.on('room_deleted', ({ roomId: rId }) => {
      if (rId === roomId) {
        alert('This room has been deleted by the owner.');
        router.push('/');
      }
    });

    // Listen for removal
    socket.on('user_removed', ({ roomId: rId }) => {
      if (rId === roomId) {
        alert('You have been removed from this room by the owner.');
        router.push('/');
      }
    });

    // Listen for owner responses to access requests
    socket.on('join_request_accepted', ({ roomId: rId }) => {
      if (rId === roomId) {
        checkRoomAccess();
      }
    });

    return () => {
      socket.off('participants_update');
      socket.off('role_updated');
      socket.off('room_deleted');
      socket.off('user_removed');
      socket.off('join_request_accepted');
    };
  }, [roomId, isPrivateGate, loadingRoom]);

  // 3. Initialize Workspace Sync Hook
  const {
    files,
    activeFile,
    loading: workspaceLoading,
    error: workspaceError,
    createFile,
    renameFile,
    deleteFile,
    selectFile,
    handleCodeChange,
    handleLanguageChange
  } = useWorkspace((loadingRoom || isPrivateGate || roomError) ? null : roomId, username, authFetch);

  // Request Access to Private Room
  const handleRequestAccess = async () => {
    if (!token) {
      router.push(`/login?callbackUrl=${encodeURIComponent(`/room/${roomId}`)}`);
      return;
    }

    setSubmittingJoinRequest(true);
    try {
      const response = await authFetch(`${API_BASE_URL}/rooms/${roomId}/requests/join`, {
        method: 'POST'
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to request access');
      }

      setJoinStatus('PENDING');

      // Emit join request over socket to trigger real-time notification
      socket.emit('join_request', { roomId });
    } catch (err) {
      alert(err.message);
    } finally {
      setSubmittingJoinRequest(false);
    }
  };

  // Owner action: respond to join request
  const handleRespondToRequest = async (requesterId, action) => {
    try {
      const res = await authFetch(`${API_BASE_URL}/rooms/${roomId}/requests/respond`, {
        method: 'POST',
        body: JSON.stringify({ requesterId, action })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update request');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Owner action: update user role
  const handleUpdateRole = async (targetUserId, newRole) => {
    try {
      const res = await authFetch(`${API_BASE_URL}/rooms/${roomId}/members/${targetUserId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role: newRole })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update role');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Owner action: remove member
  const handleRemoveMember = async (targetUserId) => {
    if (!confirm('Are you sure you want to remove this user from the room?')) return;
    try {
      const res = await authFetch(`${API_BASE_URL}/rooms/${roomId}/members/${targetUserId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to remove user');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  // Exit Room Workspace
  const handleLeaveRoom = () => {
    router.push('/');
  };

  // Loader screen
  if (authLoading || (loadingRoom && !isPrivateGate && !roomError)) {
    return (
      <main className="h-screen w-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          <p className="text-sm">Loading workspace secure layer...</p>
        </div>
      </main>
    );
  }

  // --- ERROR SCREEN (e.g. Room Not Found) ---
  if (roomError) {
    return (
      <main className="relative flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-center overflow-hidden">
        {/* Glow */}
        <div className="absolute top-1/4 left-1/4 -z-10 h-72 w-72 rounded-full bg-red-500/10 blur-[120px]" />
        
        <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-900 bg-slate-900/40 p-8 backdrop-blur shadow-2xl">
          <div className="h-12 w-12 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto text-red-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">Room Not Found</h1>
            <p className="text-sm text-slate-400">
              {roomError === 'Room not found' 
                ? "The workspace you are trying to access doesn't exist or may have been deleted."
                : roomError}
            </p>
          </div>

          <div className="pt-4 border-t border-slate-900 mt-6 flex justify-center items-center text-xs">
            <button
              onClick={handleLeaveRoom}
              className="text-slate-400 hover:text-white transition-colors"
            >
              ← Back to home
            </button>
          </div>
        </div>
      </main>
    );
  }

  // --- PRIVATE GATE SCREEN ---
  if (isPrivateGate) {
    return (
      <main className="relative flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-center overflow-hidden">
        {/* Glow */}
        <div className="absolute top-1/4 left-1/4 -z-10 h-72 w-72 rounded-full bg-indigo-500/10 blur-[120px]" />
        
        <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-900 bg-slate-900/40 p-8 backdrop-blur shadow-2xl">
          <div className="h-12 w-12 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center mx-auto text-purple-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-white">Private Workspace</h1>
            <p className="text-sm text-slate-400">
              Room <strong>"{roomName}"</strong> is private. You must be an approved member to enter.
            </p>
          </div>

          {joinStatus === 'PENDING' ? (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-400">
              ⏳ Your join request is pending owner approval. The owner has been notified.
            </div>
          ) : joinStatus === 'rejected' ? (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
              ❌ Your join request was declined.
            </div>
          ) : (
            <button
              onClick={handleRequestAccess}
              disabled={submittingJoinRequest}
              className="w-full rounded bg-indigo-600 hover:bg-indigo-500 py-2.5 text-sm font-semibold text-white transition-all disabled:opacity-50"
            >
              {submittingJoinRequest ? 'Requesting...' : 'Request Access to Join'}
            </button>
          )}

          <div className="pt-4 border-t border-slate-900 mt-6 flex justify-between items-center text-xs">
            <button
              onClick={handleLeaveRoom}
              className="text-slate-400 hover:text-white transition-colors"
            >
              ← Back to home
            </button>
            {!token && (
              <button
                onClick={() => router.push(`/login?callbackUrl=${encodeURIComponent(`/room/${roomId}`)}`)}
                className="text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                Sign In / Sign Up
              </button>
            )}
          </div>
        </div>
      </main>
    );
  }

  // --- WORKSPACE VIEW ---
  const isOwner = role === 'OWNER';
  const isViewer = role === 'VIEWER';

  return (
    <main className="h-screen w-screen bg-slate-950 flex flex-col overflow-hidden text-slate-200">
      
      {/* Header section */}
      <header className="h-16 px-6 bg-slate-900/60 text-slate-200 flex justify-between items-center border-b border-slate-900 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            {roomName}
          </h1>
          {isViewer && (
            <span className="text-[10px] bg-amber-950/60 text-amber-400 border border-amber-900/40 px-2 py-0.5 rounded-full font-medium">
              View Only
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Room Controls (Owner only) */}
          {isOwner && (
            <div className="flex gap-2">
              <button
                onClick={() => setIsInviteModalOpen(true)}
                className="rounded border border-indigo-500/30 hover:border-indigo-500 bg-indigo-500/10 hover:bg-indigo-600 text-indigo-300 hover:text-white px-3 py-1.5 text-xs font-semibold transition-all"
              >
                + Invite User
              </button>
              <button
                onClick={() => setIsSettingsModalOpen(true)}
                className="rounded border border-slate-800 hover:border-slate-700 bg-slate-900 hover:bg-slate-850 p-1.5 text-slate-400 hover:text-white transition-all"
                title="Room Settings"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>
            </div>
          )}

          <div className="hidden sm:block text-xs text-slate-400">
            Code: <code className="bg-slate-900 px-1 py-0.5 rounded text-slate-300 font-mono">{roomId}</code>
          </div>
          
          {/* Synchronized Language Selector */}
          <LanguageSelector 
            currentLanguage={activeFile?.language || 'javascript'} 
            onLanguageChange={handleLanguageChange} 
          />

          <button 
            onClick={handleLeaveRoom}
            className="text-xs bg-red-600/80 hover:bg-red-600 px-3.5 py-1.5 rounded font-semibold text-white transition-colors"
          >
            Leave
          </button>
        </div>
      </header>
      
      {/* Workspace Area: Sidebar, Editor, Chat & Participants Panels */}
      <div className="flex-grow flex w-full overflow-hidden">
        
        {/* Navigation Tabs (Tab bar on sidebar to keep workspace compact and premium) */}
        <div className="w-16 shrink-0 bg-slate-900 border-r border-slate-850 flex flex-col items-center py-4 gap-6">
          <button
            onClick={() => setActiveTab('files')}
            className={`p-2.5 rounded-lg transition-colors ${
              activeTab === 'files' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Files Explorer"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </button>
          
          <button
            onClick={() => setActiveTab('chat')}
            className={`p-2.5 rounded-lg transition-colors ${
              activeTab === 'chat' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Live Chat"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>

          <button
            onClick={() => setActiveTab('participants')}
            className={`p-2.5 rounded-lg transition-colors ${
              activeTab === 'participants' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Room Participants"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </button>
        </div>

        {/* Explorer Panel */}
        {activeTab === 'files' && (
          <FileExplorer
            files={files}
            activeFile={activeFile}
            createFile={isViewer ? null : createFile} // Hide creation inputs if viewer
            renameFile={isViewer ? null : renameFile}
            deleteFile={isViewer ? null : deleteFile}
            selectFile={selectFile}
          />
        )}

        {/* Participants Sidebar */}
        {activeTab === 'participants' && (
          <ParticipantsPanel
            roomId={roomId}
            members={members}
            pendingRequests={pendingRequests}
            currentUserRole={role}
            onRespondToRequest={handleRespondToRequest}
            onUpdateRole={handleUpdateRole}
            onRemoveMember={handleRemoveMember}
          />
        )}

        {/* Monaco Editor section */}
        <div className="flex-grow relative bg-slate-950 flex flex-col">
          {workspaceLoading && files.length === 0 ? (
            <div className="flex-grow flex items-center justify-center text-slate-500 text-sm">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent mr-2"></div>
              Loading workspace files...
            </div>
          ) : workspaceError ? (
            <div className="flex-grow flex items-center justify-center text-red-400 text-sm p-4">
              Error: {workspaceError}
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
                readOnly: isViewer // Enforce View Only Mode for Viewers!
              }}
            />
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-slate-600 p-8 text-center select-none">
              <svg className="w-12 h-12 text-slate-800 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 13h6m-3-3v6m-9 1V4a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              <h3 className="text-md font-bold text-slate-500 mb-1">No file open</h3>
              <p className="text-xs max-w-xs text-slate-700">
                {isViewer 
                  ? "Select an existing file in the explorer sidebar to view its content."
                  : "Create a file or select an existing one in the explorer sidebar to begin coding."}
              </p>
            </div>
          )}
        </div>

        {/* Real-Time Chat Panel area */}
        {activeTab === 'chat' && (
          <div className="w-80 shrink-0 border-l border-slate-900 bg-slate-900/40">
            <ChatPanel roomId={roomId} username={username} disabled={isViewer} />
          </div>
        )}

      </div>

      <InviteUserModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        roomId={roomId}
      />

      <RoomSettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        roomId={roomId}
        initialVisibility={visibility}
        onVisibilityUpdated={(newVis) => setVisibility(newVis)}
      />
    </main>
  );
}

export default function RoomPage() {
  return (
    <Suspense fallback={
      <main className="h-screen w-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          <p className="text-sm">Loading workspace secure layer...</p>
        </div>
      </main>
    }>
      <RoomContent />
    </Suspense>
  );
}

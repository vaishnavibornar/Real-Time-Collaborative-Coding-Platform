'use client';

import React from 'react';
import { useAuth } from '../context/AuthContext';

export default function ParticipantsPanel({
  roomId,
  members,
  pendingRequests,
  currentUserRole,
  onRespondToRequest,
  onUpdateRole,
  onRemoveMember
}) {
  const { user } = useAuth();
  const isOwner = currentUserRole === 'OWNER';

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 text-slate-200 w-80">
      <div className="p-4 border-b border-slate-850 flex items-center justify-between">
        <h3 className="font-bold text-white text-md">Room Participants</h3>
        <span className="bg-slate-850 text-slate-300 text-xs px-2 py-0.5 rounded-full font-medium">
          {members.length} total
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Pending Requests Section (Visible only to Room Owner) */}
        {isOwner && pendingRequests && pendingRequests.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider">
              Pending Join Requests ({pendingRequests.length})
            </h4>
            <div className="space-y-2">
              {pendingRequests.map((req) => (
                <div
                  key={req.userId}
                  className="p-3 rounded-lg border border-amber-900/30 bg-amber-950/15 flex flex-col gap-2"
                >
                  <div>
                    <p className="text-sm font-semibold text-white">{req.name}</p>
                    <p className="text-xs text-slate-400">{req.email}</p>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => onRespondToRequest(req.userId, 'reject')}
                      className="rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2 py-1 text-xs font-medium transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => onRespondToRequest(req.userId, 'accept')}
                      className="rounded bg-indigo-600 hover:bg-indigo-500 text-white px-2 py-1 text-xs font-medium transition-colors"
                    >
                      Accept
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Members Section */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Approved Members
          </h4>
          <div className="space-y-2.5">
            {members.map((member) => {
              const isCurrentUser = member.userId === user?.id;
              
              return (
                <div
                  key={member.userId}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-slate-850 bg-slate-950/20 group hover:border-slate-800 transition-all"
                >
                  <div className="flex items-center gap-3">
                    {/* Online / Offline status dot */}
                    <span
                      className={`h-2.5 w-2.5 rounded-full border border-slate-950 ${
                        member.online ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-700'
                      }`}
                      title={member.online ? 'Online' : 'Offline'}
                    />
                    <div>
                      <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                        {member.name}
                        {isCurrentUser && (
                          <span className="text-[10px] bg-slate-800 text-slate-400 px-1 py-0.2 rounded font-normal">
                            You
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-slate-400">
                        {member.role === 'OWNER' && (
                          <span className="text-[10px] bg-purple-950/80 text-purple-300 border border-purple-800/40 px-1.5 py-0.5 rounded-full font-medium">
                            Owner
                          </span>
                        )}
                        {member.role === 'EDITOR' && (
                          <span className="text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-800/40 px-1.5 py-0.5 rounded-full font-medium">
                            Editor
                          </span>
                        )}
                        {member.role === 'VIEWER' && (
                          <span className="text-[10px] bg-indigo-950/80 text-indigo-300 border border-indigo-800/40 px-1.5 py-0.5 rounded-full font-medium">
                            Viewer
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Owner Controls (Promote, Demote, Remove) */}
                  {isOwner && !isCurrentUser && member.role !== 'OWNER' && (
                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <select
                        value={member.role}
                        onChange={(e) => onUpdateRole(member.userId, e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded text-xs px-1 py-0.5 text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="EDITOR">Editor</option>
                        <option value="VIEWER">Viewer</option>
                      </select>

                      <button
                        onClick={() => onRemoveMember(member.userId)}
                        title="Remove member"
                        className="rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-red-400 transition-colors"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

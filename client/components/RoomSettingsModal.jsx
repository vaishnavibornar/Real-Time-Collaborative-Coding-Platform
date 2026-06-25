'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../lib/api';

export default function RoomSettingsModal({ isOpen, onClose, roomId, initialVisibility, onVisibilityUpdated }) {
  const { authFetch } = useAuth();
  const [visibility, setVisibility] = useState(initialVisibility || 'public');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVisibility(initialVisibility);
      setSuccess(false);
      setError(null);
    }
  }, [isOpen, initialVisibility]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmitting(true);

    try {
      const response = await authFetch(`${API_BASE_URL}/rooms/${roomId}/visibility`, {
        method: 'PATCH',
        body: JSON.stringify({ visibility })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update visibility settings');
      }

      setSuccess(true);
      onVisibilityUpdated(visibility);
    } catch (err) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h3 className="text-xl font-bold text-white">Room Settings</h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {success && (
            <div className="rounded bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-400">
              ⚙️ Room visibility updated successfully!
            </div>
          )}

          {error && (
            <div className="rounded bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-3">
              Room Access Visibility
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex flex-col items-center justify-center p-3 rounded border cursor-pointer transition-all ${
                visibility === 'public'
                  ? 'border-indigo-500 bg-indigo-500/10 text-white'
                  : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
              }`}>
                <input
                  type="radio"
                  name="modalVisibility"
                  value="public"
                  checked={visibility === 'public'}
                  onChange={() => {
                    setVisibility('public');
                    if (success) setSuccess(false);
                  }}
                  className="sr-only"
                />
                <span className="font-semibold text-sm">Public</span>
                <span className="text-xs mt-1 text-center opacity-85">Anyone with the link can join</span>
              </label>

              <label className={`flex flex-col items-center justify-center p-3 rounded border cursor-pointer transition-all ${
                visibility === 'private'
                  ? 'border-indigo-500 bg-indigo-500/10 text-white'
                  : 'border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700'
              }`}>
                <input
                  type="radio"
                  name="modalVisibility"
                  value="private"
                  checked={visibility === 'private'}
                  onChange={() => {
                    setVisibility('private');
                    if (success) setSuccess(false);
                  }}
                  className="sr-only"
                />
                <span className="font-semibold text-sm">Private</span>
                <span className="text-xs mt-1 text-center opacity-85">Only invited members can join</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded px-4 py-2 text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-medium text-white hover:from-indigo-500 hover:to-purple-500 transition-all"
            >
              {submitting ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

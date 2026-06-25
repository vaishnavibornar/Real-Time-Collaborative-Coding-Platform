'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../lib/api';

export default function InviteUserModal({ isOpen, onClose, roomId }) {
  const { authFetch } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setError(null);
    setSuccess(false);
    setSubmitting(true);

    try {
      const response = await authFetch(`${API_BASE_URL}/invitations/invite`, {
        method: 'POST',
        body: JSON.stringify({
          roomId,
          email: email.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send invitation');
      }

      setSuccess(true);
      setEmail('');
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
          <h3 className="text-xl font-bold text-white">Invite Collaborators</h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {success && (
            <div className="rounded bg-emerald-500/10 border border-emerald-500/20 p-3 text-sm text-emerald-400">
              📬 Invitation sent successfully! An email with instructions has been dispatched.
            </div>
          )}

          {error && (
            <div className="rounded bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <p className="text-sm text-slate-400">
            Invite another developer to collaborate on this room. They will be added as an <strong>Editor</strong> once they accept the email invitation.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4 pt-2">
            <div>
              <label htmlFor="inviteEmail" className="block text-sm font-medium text-slate-400 mb-1">
                Developer's Email Address
              </label>
              <input
                id="inviteEmail"
                type="email"
                required
                placeholder="e.g. dev@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (success) setSuccess(false);
                }}
                className="w-full rounded border border-slate-850 bg-slate-950 px-3 py-2 text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none sm:text-sm"
              />
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
                disabled={submitting || !email.trim()}
                className="rounded bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-sm font-medium text-white hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {submitting ? 'Sending...' : 'Send Invite'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

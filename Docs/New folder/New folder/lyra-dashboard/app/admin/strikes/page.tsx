'use client';

import { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Search,
  Plus,
  Check,
  X,
  Clock,
  Loader2,
  User,
  Bot,
  Ban,
  ChevronRight,
  Shield,
  MessageSquare,
} from 'lucide-react';
import { CreatorStrike } from '@/lib/creators/types';

interface StrikeWithDetails extends CreatorStrike {
  creator?: { legal_name?: string; business_name?: string; contact_email?: string };
  model?: { display_name?: string };
}

export default function StrikesPage() {
  const [strikes, setStrikes] = useState<StrikeWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewStrike, setShowNewStrike] = useState(false);
  const [filter, setFilter] = useState<'active' | 'all'>('active');

  useEffect(() => {
    fetchStrikes();
  }, [filter]);

  const fetchStrikes = async () => {
    setLoading(true);
    try {
      const params = filter === 'active' ? '?active=true' : '';
      const response = await fetch(`/api/admin/strikes${params}`);
      const data = await response.json();
      setStrikes(data.strikes || []);
    } catch (err) {
      console.error('Failed to fetch strikes');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveStrike = async (strikeId: string, reason: string) => {
    try {
      await fetch(`/api/admin/strikes/${strikeId}/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });
      fetchStrikes();
    } catch (err) {
      console.error('Failed to remove strike');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Strikes & Enforcement</h1>
          <p className="text-gray-400">Manage creator warnings, strikes, and bans</p>
        </div>
        <button
          onClick={() => setShowNewStrike(true)}
          className="px-4 py-2 bg-red-500 hover:bg-red-600 rounded-lg flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Issue Strike
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded-lg text-sm ${
            filter === 'active' ? 'bg-purple-500' : 'bg-zinc-800 hover:bg-zinc-700'
          }`}
        >
          Active Only
        </button>
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg text-sm ${
            filter === 'all' ? 'bg-purple-500' : 'bg-zinc-800 hover:bg-zinc-700'
          }`}
        >
          All Strikes
        </button>
      </div>

      {/* Strike Severity Legend */}
      <div className="bg-zinc-900 rounded-xl p-4">
        <h3 className="font-medium mb-3">Strike System</h3>
        <div className="grid grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Warning - First offense notice</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-500" />
            <span>Strike - Recorded violation</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500" />
            <span>Final Warning - 1 strike from ban</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span>Ban - Account suspended</span>
          </div>
        </div>
      </div>

      {/* Strikes List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : strikes.length === 0 ? (
        <div className="bg-zinc-900 rounded-xl p-12 text-center">
          <AlertTriangle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">No strikes</h2>
          <p className="text-gray-400">
            {filter === 'active' ? 'No active strikes on any creators.' : 'No strikes have been issued.'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {strikes.map((strike) => (
            <StrikeCard
              key={strike.id}
              strike={strike}
              onRemove={(reason) => handleRemoveStrike(strike.id, reason)}
            />
          ))}
        </div>
      )}

      {/* New Strike Modal */}
      {showNewStrike && (
        <NewStrikeModal
          onClose={() => setShowNewStrike(false)}
          onCreated={() => {
            setShowNewStrike(false);
            fetchStrikes();
          }}
        />
      )}
    </div>
  );
}

function StrikeCard({
  strike,
  onRemove,
}: {
  strike: StrikeWithDetails;
  onRemove: (reason: string) => void;
}) {
  const [showRemove, setShowRemove] = useState(false);
  const [removeReason, setRemoveReason] = useState('');

  const getSeverityColor = () => {
    switch (strike.severity) {
      case 'WARNING': return 'bg-blue-500';
      case 'STRIKE': return 'bg-yellow-500';
      case 'FINAL_WARNING': return 'bg-orange-500';
      case 'BAN': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getSeverityBg = () => {
    switch (strike.severity) {
      case 'WARNING': return 'bg-blue-500/10 border-blue-500/30';
      case 'STRIKE': return 'bg-yellow-500/10 border-yellow-500/30';
      case 'FINAL_WARNING': return 'bg-orange-500/10 border-orange-500/30';
      case 'BAN': return 'bg-red-500/10 border-red-500/30';
      default: return 'bg-gray-500/10 border-gray-500/30';
    }
  };

  return (
    <div className={`rounded-xl border p-4 ${getSeverityBg()}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className={`w-3 h-3 rounded-full mt-1.5 ${getSeverityColor()}`} />
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="font-medium">{strike.severity}</span>
              {!strike.is_active && (
                <span className="px-2 py-0.5 bg-gray-500/20 text-gray-400 rounded text-xs">Removed</span>
              )}
              {strike.appealed && !strike.appeal_resolved_at && (
                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">Appeal Pending</span>
              )}
            </div>
            <p className="text-sm text-gray-300 mb-2">{strike.reason}</p>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {strike.creator?.legal_name || strike.creator?.business_name || 'Unknown Creator'}
              </span>
              {strike.model && (
                <span className="flex items-center gap-1">
                  <Bot className="w-3 h-3" />
                  {strike.model.display_name}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(strike.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {strike.is_active && (
          <div>
            {!showRemove ? (
              <button
                onClick={() => setShowRemove(true)}
                className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded text-sm"
              >
                Remove
              </button>
            ) : (
              <div className="flex flex-col gap-2 w-64">
                <input
                  type="text"
                  value={removeReason}
                  onChange={(e) => setRemoveReason(e.target.value)}
                  placeholder="Reason for removal..."
                  className="px-3 py-1 bg-zinc-800 border border-white/10 rounded text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowRemove(false)}
                    className="flex-1 py-1 bg-zinc-700 rounded text-sm"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => onRemove(removeReason)}
                    disabled={!removeReason}
                    className="flex-1 py-1 bg-green-500 rounded text-sm disabled:opacity-50"
                  >
                    Confirm
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Appeal */}
      {strike.appealed && (
        <div className="mt-4 p-3 bg-zinc-800/50 rounded-lg">
          <p className="text-sm font-medium mb-1">Appeal</p>
          <p className="text-sm text-gray-400">{strike.appeal_text}</p>
          {strike.appeal_resolved_at && (
            <p className="text-xs text-gray-500 mt-2">
              Resolved: {strike.appeal_outcome}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function NewStrikeModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [creatorSearch, setCreatorSearch] = useState('');
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | null>(null);
  const [severity, setSeverity] = useState<'WARNING' | 'STRIKE' | 'FINAL_WARNING' | 'BAN'>('WARNING');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!selectedCreatorId || !reason) return;
    setLoading(true);
    try {
      await fetch('/api/admin/strikes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creator_id: selectedCreatorId,
          severity,
          reason,
        }),
      });
      onCreated();
    } catch (err) {
      console.error('Failed to create strike');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-2xl w-full max-w-md">
        <div className="p-6 border-b border-white/10">
          <h2 className="text-xl font-bold">Issue Strike</h2>
        </div>

        <div className="p-6 space-y-4">
          {/* Creator Search */}
          <div>
            <label className="block text-sm font-medium mb-2">Creator</label>
            <input
              type="text"
              value={creatorSearch}
              onChange={(e) => setCreatorSearch(e.target.value)}
              placeholder="Search by email or name..."
              className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
            />
            {/* Would show search results here */}
          </div>

          {/* Severity */}
          <div>
            <label className="block text-sm font-medium mb-2">Severity</label>
            <div className="grid grid-cols-2 gap-2">
              {(['WARNING', 'STRIKE', 'FINAL_WARNING', 'BAN'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSeverity(s)}
                  className={`py-2 px-3 rounded-lg text-sm ${
                    severity === s
                      ? s === 'WARNING' ? 'bg-blue-500' :
                        s === 'STRIKE' ? 'bg-yellow-500 text-black' :
                        s === 'FINAL_WARNING' ? 'bg-orange-500' :
                        'bg-red-500'
                      : 'bg-zinc-800 hover:bg-zinc-700'
                  }`}
                >
                  {s.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium mb-2">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe the violation..."
              rows={4}
              className="w-full px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg resize-none focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        <div className="p-6 border-t border-white/10 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !reason}
            className="flex-1 py-2 bg-red-500 hover:bg-red-600 rounded-lg disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Issue Strike'}
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import {
  Flag,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
  ToggleRight,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface FeatureFlag {
  flag_name: string;
  is_enabled: boolean;
  rollout_percentage: number;
  description: string | null;
  updated_at?: string;
}

export default function FeatureFlagsSettings() {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedFlags, setExpandedFlags] = useState<Set<string>>(new Set());
  const [updating, setUpdating] = useState<string | null>(null);

  const fetchFlags = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/feature-flags');
      if (!res.ok) {
        throw new Error('Failed to fetch feature flags');
      }
      const data = await res.json();
      setFlags(data.flags || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load flags');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, []);

  const toggleFlag = async (flagName: string, currentEnabled: boolean) => {
    setUpdating(flagName);
    try {
      const res = await fetch('/api/admin/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flag_name: flagName,
          is_enabled: !currentEnabled,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update flag');
      }

      const data = await res.json();
      setFlags(flags.map(f =>
        f.flag_name === flagName ? data.flag : f
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update flag');
    } finally {
      setUpdating(null);
    }
  };

  const updateRollout = async (flagName: string, percentage: number) => {
    setUpdating(flagName);
    try {
      const res = await fetch('/api/admin/feature-flags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flag_name: flagName,
          rollout_percentage: percentage,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to update rollout');
      }

      const data = await res.json();
      setFlags(flags.map(f =>
        f.flag_name === flagName ? data.flag : f
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update rollout');
    } finally {
      setUpdating(null);
    }
  };

  const toggleExpanded = (flagName: string) => {
    const newExpanded = new Set(expandedFlags);
    if (newExpanded.has(flagName)) {
      newExpanded.delete(flagName);
    } else {
      newExpanded.add(flagName);
    }
    setExpandedFlags(newExpanded);
  };

  const formatFlagName = (name: string) => {
    return name
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  if (loading) {
    return (
      <div className="bg-zinc-900 rounded-xl p-6">
        <h2 className="font-semibold flex items-center gap-2 mb-6">
          <Flag size={18} className="text-zinc-400" />
          Feature Flags
        </h2>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-purple-400" size={24} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 rounded-xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-semibold flex items-center gap-2">
          <Flag size={18} className="text-zinc-400" />
          Feature Flags
        </h2>
        <button
          onClick={fetchFlags}
          className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          title="Refresh flags"
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400">
          <AlertCircle size={16} />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {flags.length === 0 ? (
        <p className="text-zinc-500 text-sm py-4">No feature flags configured.</p>
      ) : (
        <div className="space-y-3">
          {flags.map((flag) => (
            <div
              key={flag.flag_name}
              className="border border-zinc-800 rounded-lg overflow-hidden"
            >
              {/* Flag Header */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    onClick={() => toggleExpanded(flag.flag_name)}
                    className="p-1 text-zinc-500 hover:text-white transition-colors"
                  >
                    {expandedFlags.has(flag.flag_name) ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </button>
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {formatFlagName(flag.flag_name)}
                    </p>
                    {flag.description && (
                      <p className="text-sm text-zinc-500 truncate">
                        {flag.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-xs px-2 py-1 rounded ${
                    flag.is_enabled
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-zinc-700 text-zinc-400'
                  }`}>
                    {flag.rollout_percentage}%
                  </span>
                  <button
                    onClick={() => toggleFlag(flag.flag_name, flag.is_enabled)}
                    disabled={updating === flag.flag_name}
                    className="text-purple-400 disabled:opacity-50"
                  >
                    {updating === flag.flag_name ? (
                      <Loader2 className="animate-spin" size={28} />
                    ) : flag.is_enabled ? (
                      <ToggleRight size={28} />
                    ) : (
                      <ToggleLeft size={28} className="text-zinc-500" />
                    )}
                  </button>
                </div>
              </div>

              {/* Expanded Settings */}
              {expandedFlags.has(flag.flag_name) && (
                <div className="px-4 pb-4 pt-2 border-t border-zinc-800 bg-zinc-800/30">
                  <div className="space-y-4">
                    {/* Rollout Percentage */}
                    <div>
                      <label className="block text-sm text-zinc-400 mb-2">
                        Rollout Percentage
                      </label>
                      <div className="flex items-center gap-4">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={flag.rollout_percentage}
                          onChange={(e) => {
                            const newValue = parseInt(e.target.value);
                            setFlags(flags.map(f =>
                              f.flag_name === flag.flag_name
                                ? { ...f, rollout_percentage: newValue }
                                : f
                            ));
                          }}
                          onMouseUp={(e) => {
                            const target = e.target as HTMLInputElement;
                            updateRollout(flag.flag_name, parseInt(target.value));
                          }}
                          onTouchEnd={(e) => {
                            const target = e.target as HTMLInputElement;
                            updateRollout(flag.flag_name, parseInt(target.value));
                          }}
                          className="flex-1 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer
                            [&::-webkit-slider-thumb]:appearance-none
                            [&::-webkit-slider-thumb]:w-4
                            [&::-webkit-slider-thumb]:h-4
                            [&::-webkit-slider-thumb]:rounded-full
                            [&::-webkit-slider-thumb]:bg-purple-500
                            [&::-webkit-slider-thumb]:cursor-pointer
                            [&::-moz-range-thumb]:w-4
                            [&::-moz-range-thumb]:h-4
                            [&::-moz-range-thumb]:rounded-full
                            [&::-moz-range-thumb]:bg-purple-500
                            [&::-moz-range-thumb]:border-0
                            [&::-moz-range-thumb]:cursor-pointer"
                        />
                        <span className="w-12 text-right text-sm font-mono">
                          {flag.rollout_percentage}%
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-2">
                        {flag.rollout_percentage === 0 && 'No users will see this feature'}
                        {flag.rollout_percentage > 0 && flag.rollout_percentage < 100 &&
                          `~${flag.rollout_percentage}% of users will see this feature`}
                        {flag.rollout_percentage === 100 && 'All users will see this feature'}
                      </p>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateRollout(flag.flag_name, 0)}
                        className="px-3 py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 rounded transition-colors"
                      >
                        0%
                      </button>
                      <button
                        onClick={() => updateRollout(flag.flag_name, 25)}
                        className="px-3 py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 rounded transition-colors"
                      >
                        25%
                      </button>
                      <button
                        onClick={() => updateRollout(flag.flag_name, 50)}
                        className="px-3 py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 rounded transition-colors"
                      >
                        50%
                      </button>
                      <button
                        onClick={() => updateRollout(flag.flag_name, 100)}
                        className="px-3 py-1.5 text-xs bg-zinc-700 hover:bg-zinc-600 rounded transition-colors"
                      >
                        100%
                      </button>
                    </div>

                    {/* Last Updated */}
                    {flag.updated_at && (
                      <p className="text-xs text-zinc-600">
                        Last updated: {new Date(flag.updated_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

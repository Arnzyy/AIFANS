'use client';

import { useState, useEffect } from 'react';
import {
  UserCheck,
  Check,
  X,
  Clock,
  Loader2,
  ChevronRight,
  ExternalLink,
  AlertCircle,
  Shield,
} from 'lucide-react';
import { Creator, getStatusColor, getStatusLabel } from '@/lib/creators/types';

export default function PendingCreatorsPage() {
  const [creators, setCreators] = useState<Creator[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCreator, setSelectedCreator] = useState<Creator | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    fetchCreators();
  }, []);

  const fetchCreators = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/creators?status=PENDING_REVIEW');
      const data = await response.json();
      setCreators(data.creators || []);
    } catch (err) {
      console.error('Failed to fetch creators');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (creatorId: string) => {
    setProcessing(creatorId);
    try {
      await fetch(`/api/admin/creators/${creatorId}/approve`, { method: 'POST' });
      setCreators((prev) => prev.filter((c) => c.id !== creatorId));
      setSelectedCreator(null);
    } catch (err) {
      console.error('Failed to approve');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (creatorId: string) => {
    if (!rejectReason) return;
    setProcessing(creatorId);
    try {
      await fetch(`/api/admin/creators/${creatorId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      setCreators((prev) => prev.filter((c) => c.id !== creatorId));
      setSelectedCreator(null);
      setShowRejectForm(false);
      setRejectReason('');
    } catch (err) {
      console.error('Failed to reject');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pending Creator Approvals</h1>
        <p className="text-gray-400">Review and approve new creator applications</p>
      </div>

      {creators.length === 0 ? (
        <div className="bg-zinc-900 rounded-xl p-12 text-center">
          <UserCheck className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">All caught up!</h2>
          <p className="text-gray-400">No pending creator applications to review.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* List */}
          <div className="space-y-3">
            <p className="text-sm text-gray-500">{creators.length} pending application{creators.length !== 1 ? 's' : ''}</p>
            {creators.map((creator) => (
              <button
                key={creator.id}
                onClick={() => {
                  setSelectedCreator(creator);
                  setShowRejectForm(false);
                  setRejectReason('');
                }}
                className={`w-full p-4 bg-zinc-900 rounded-xl text-left transition ${
                  selectedCreator?.id === creator.id
                    ? 'ring-2 ring-purple-500'
                    : 'hover:bg-zinc-800'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{creator.legal_name || creator.business_name || 'Unnamed'}</p>
                    <p className="text-sm text-gray-400">{creator.contact_email}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-500" />
                </div>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(creator.onboarding_completed_at || creator.created_at).toLocaleDateString()}
                  </span>
                  <span className="px-2 py-0.5 bg-zinc-800 rounded">{creator.account_type}</span>
                  <span>{creator.country_code}</span>
                  {creator.stripe_connect_onboarding_complete && (
                    <span className="text-green-400">Stripe ✓</span>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Detail Panel */}
          {selectedCreator ? (
            <div className="bg-zinc-900 rounded-xl p-6 h-fit sticky top-6">
              <h2 className="text-lg font-bold mb-4">Application Review</h2>

              {/* Creator Info */}
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Account Type</p>
                    <p className="font-medium">{selectedCreator.account_type}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Country</p>
                    <p className="font-medium">{selectedCreator.country_code}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Name</p>
                    <p className="font-medium">{selectedCreator.legal_name || selectedCreator.business_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Email</p>
                    <p className="font-medium">{selectedCreator.contact_email}</p>
                  </div>
                </div>

                {/* Address */}
                <div className="text-sm">
                  <p className="text-gray-500">Address</p>
                  <p className="font-medium">
                    {[
                      selectedCreator.address_line1,
                      selectedCreator.address_line2,
                      selectedCreator.city,
                      selectedCreator.postal_code,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                </div>
              </div>

              {/* Verification Checklist */}
              <div className="bg-zinc-800 rounded-lg p-4 mb-6">
                <h3 className="font-medium mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  Verification Checklist
                </h3>
                <div className="space-y-2">
                  <CheckItem
                    label="Stripe Connect onboarding complete"
                    checked={selectedCreator.stripe_connect_onboarding_complete}
                  />
                  <CheckItem
                    label="Payouts enabled"
                    checked={selectedCreator.stripe_payouts_enabled}
                  />
                  <CheckItem
                    label="Declarations accepted"
                    checked={!!selectedCreator.declarations_accepted_at}
                  />
                  <CheckItem
                    label="Contact email provided"
                    checked={!!selectedCreator.contact_email}
                  />
                  <CheckItem
                    label="Address provided"
                    checked={!!selectedCreator.address_line1}
                  />
                </div>
              </div>

              {/* Stripe Requirements */}
              {selectedCreator.stripe_requirements_due && selectedCreator.stripe_requirements_due.length > 0 && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                  <p className="text-sm font-medium text-yellow-400 mb-2">Stripe Requirements Due</p>
                  <ul className="text-xs text-gray-400 list-disc list-inside">
                    {selectedCreator.stripe_requirements_due.map((req, i) => (
                      <li key={i}>{req}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              {!showRejectForm ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowRejectForm(true)}
                    disabled={processing === selectedCreator.id}
                    className="flex-1 py-3 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <X className="w-5 h-5" />
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(selectedCreator.id)}
                    disabled={processing === selectedCreator.id || !selectedCreator.stripe_payouts_enabled}
                    className="flex-1 py-3 bg-green-500 hover:bg-green-600 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {processing === selectedCreator.id ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-5 h-5" />
                        Approve
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Reason for rejection (will be sent to creator)..."
                    className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg resize-none focus:outline-none focus:border-red-500"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowRejectForm(false);
                        setRejectReason('');
                      }}
                      className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleReject(selectedCreator.id)}
                      disabled={!rejectReason || processing === selectedCreator.id}
                      className="flex-1 py-2 bg-red-500 hover:bg-red-600 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {processing === selectedCreator.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        'Confirm Rejection'
                      )}
                    </button>
                  </div>
                </div>
              )}

              {!selectedCreator.stripe_payouts_enabled && (
                <p className="text-xs text-yellow-400 mt-3 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Cannot approve: Stripe payouts not enabled
                </p>
              )}
            </div>
          ) : (
            <div className="bg-zinc-900 rounded-xl p-12 text-center">
              <p className="text-gray-500">Select a creator to review</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CheckItem({ label, checked }: { label: string; checked: boolean }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <div
        className={`w-5 h-5 rounded flex items-center justify-center ${
          checked ? 'bg-green-500' : 'bg-red-500/50'
        }`}
      >
        {checked ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
      </div>
      <span className={checked ? 'text-gray-300' : 'text-red-400'}>{label}</span>
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  X,
  User,
  Building,
  CreditCard,
  FileCheck,
  Sparkles,
  Clock,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface Creator {
  id: string;
  user_id: string;
  display_name: string;
  bio?: string;
  business_type: string;
  business_name?: string;
  country: string;
  status: string;
  kyc_status: string;
  id_verified: boolean;
  stripe_account_id?: string;
  stripe_onboarding_complete: boolean;
  stripe_charges_enabled: boolean;
  stripe_payouts_enabled: boolean;
  onboarding_step: string;
  onboarding_complete: boolean;
  max_models: number;
  created_at: string;
  approved_at?: string;
}

interface Declaration {
  id: string;
  declaration_type: string;
  declared_at: string;
}

interface Model {
  id: string;
  name: string;
  status: string;
  created_at: string;
}

interface Profile {
  username: string;
  email: string;
  display_name?: string;
  avatar_url?: string;
}

const declarationLabels: Record<string, string> = {
  age_verification: 'Age Verification (18+)',
  content_ownership: 'Content Ownership',
  no_real_person: 'No Real Person Impersonation',
  terms_acceptance: 'Terms of Service',
  payout_terms: 'Payout Terms',
  compliance_agreement: 'Content Guidelines',
};

export default function AdminCreatorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const creatorId = params.id as string;

  const [creator, setCreator] = useState<Creator | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [declarations, setDeclarations] = useState<Declaration[]>([]);
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/admin/creators/${creatorId}`);
        const data = await res.json();

        if (data.error) {
          console.error(data.error);
          router.push('/admin/creators');
          return;
        }

        setCreator(data.creator);
        setProfile(data.profile);
        setDeclarations(data.declarations || []);
        setModels(data.models || []);
      } catch (error) {
        console.error('Error fetching creator:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [creatorId, router]);

  const handleApprove = async () => {
    if (!confirm('Approve this creator application?')) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/creators/${creatorId}/approve`, {
        method: 'POST',
      });

      if (res.ok) {
        const data = await res.json();
        setCreator(data.creator);
      }
    } catch (error) {
      console.error('Error approving creator:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/creators/${creatorId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      });

      if (res.ok) {
        const data = await res.json();
        setCreator(data.creator);
      }
    } catch (error) {
      console.error('Error rejecting creator:', error);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-zinc-800 rounded w-48 animate-pulse" />
        <div className="h-64 bg-zinc-800 rounded animate-pulse" />
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="text-center py-12">
        <p className="text-zinc-400">Creator not found</p>
        <Link href="/admin/creators" className="text-purple-400 hover:underline mt-2 block">
          Back to creators
        </Link>
      </div>
    );
  }

  const requiredDeclarations = Object.keys(declarationLabels);
  const completedDeclarations = declarations.map(d => d.declaration_type);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/creators"
            className="p-2 hover:bg-zinc-800 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{creator.display_name}</h1>
            <p className="text-zinc-400">{profile?.email}</p>
          </div>
        </div>

        {creator.status === 'pending' && (
          <div className="flex gap-3">
            <button
              onClick={handleReject}
              disabled={actionLoading}
              className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <X size={18} />
              Reject
            </button>
            <button
              onClick={handleApprove}
              disabled={actionLoading}
              className="px-4 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Check size={18} />
              Approve
            </button>
          </div>
        )}
      </div>

      {/* Status Banner */}
      <div className={`
        p-4 rounded-xl flex items-center gap-3
        ${creator.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' : ''}
        ${creator.status === 'approved' ? 'bg-green-500/20 text-green-400' : ''}
        ${creator.status === 'rejected' ? 'bg-red-500/20 text-red-400' : ''}
        ${creator.status === 'suspended' ? 'bg-orange-500/20 text-orange-400' : ''}
      `}>
        {creator.status === 'pending' && <Clock size={20} />}
        {creator.status === 'approved' && <CheckCircle size={20} />}
        {creator.status === 'rejected' && <XCircle size={20} />}
        <span className="font-medium capitalize">{creator.status}</span>
        {creator.approved_at && (
          <span className="text-sm opacity-75">
            - Approved {new Date(creator.approved_at).toLocaleDateString()}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Info */}
        <div className="bg-zinc-900 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <User size={18} className="text-zinc-400" />
            Account Information
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Username</span>
              <span>{profile?.username}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Email</span>
              <span>{profile?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Applied</span>
              <span>{new Date(creator.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Onboarding Step</span>
              <span className="capitalize">{creator.onboarding_step.replace('_', ' ')}</span>
            </div>
          </div>
        </div>

        {/* Business Info */}
        <div className="bg-zinc-900 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <Building size={18} className="text-zinc-400" />
            Business Information
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-400">Type</span>
              <span className="capitalize">{creator.business_type}</span>
            </div>
            {creator.business_name && (
              <div className="flex justify-between">
                <span className="text-zinc-400">Business Name</span>
                <span>{creator.business_name}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-zinc-400">Country</span>
              <span>{creator.country}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-400">Max Models</span>
              <span>{creator.max_models}</span>
            </div>
          </div>
        </div>

        {/* Stripe Status */}
        <div className="bg-zinc-900 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <CreditCard size={18} className="text-zinc-400" />
            Stripe Connect
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Onboarding</span>
              <span className={creator.stripe_onboarding_complete ? 'text-green-400' : 'text-zinc-500'}>
                {creator.stripe_onboarding_complete ? 'Complete' : 'Incomplete'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Charges Enabled</span>
              <span className={creator.stripe_charges_enabled ? 'text-green-400' : 'text-zinc-500'}>
                {creator.stripe_charges_enabled ? 'Yes' : 'No'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Payouts Enabled</span>
              <span className={creator.stripe_payouts_enabled ? 'text-green-400' : 'text-zinc-500'}>
                {creator.stripe_payouts_enabled ? 'Yes' : 'No'}
              </span>
            </div>
            {creator.stripe_account_id && (
              <div className="flex justify-between">
                <span className="text-zinc-400">Account ID</span>
                <span className="font-mono text-xs">{creator.stripe_account_id}</span>
              </div>
            )}
          </div>
        </div>

        {/* Declarations */}
        <div className="bg-zinc-900 rounded-xl p-6 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <FileCheck size={18} className="text-zinc-400" />
            Declarations
          </h2>
          <div className="space-y-2">
            {requiredDeclarations.map((type) => {
              const completed = completedDeclarations.includes(type);
              const declaration = declarations.find(d => d.declaration_type === type);

              return (
                <div key={type} className="flex items-center justify-between text-sm">
                  <span className={completed ? 'text-white' : 'text-zinc-500'}>
                    {declarationLabels[type]}
                  </span>
                  <div className="flex items-center gap-2">
                    {completed ? (
                      <>
                        <span className="text-xs text-zinc-500">
                          {new Date(declaration!.declared_at).toLocaleDateString()}
                        </span>
                        <CheckCircle size={16} className="text-green-400" />
                      </>
                    ) : (
                      <XCircle size={16} className="text-zinc-500" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Models */}
      <div className="bg-zinc-900 rounded-xl p-6">
        <h2 className="font-semibold flex items-center gap-2 mb-4">
          <Sparkles size={18} className="text-zinc-400" />
          Models ({models.length})
        </h2>

        {models.length === 0 ? (
          <p className="text-zinc-400 text-sm">No models created yet</p>
        ) : (
          <div className="space-y-2">
            {models.map((model) => (
              <div
                key={model.id}
                className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg"
              >
                <div>
                  <p className="font-medium">{model.name}</p>
                  <p className="text-sm text-zinc-400">
                    Created {new Date(model.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`
                    px-2 py-1 rounded text-xs
                    ${model.status === 'approved' ? 'bg-green-500/20 text-green-400' : ''}
                    ${model.status === 'pending_review' ? 'bg-yellow-500/20 text-yellow-400' : ''}
                    ${model.status === 'rejected' ? 'bg-red-500/20 text-red-400' : ''}
                    ${model.status === 'draft' ? 'bg-zinc-500/20 text-zinc-400' : ''}
                  `}>
                    {model.status.replace('_', ' ')}
                  </span>
                  <Link
                    href={`/admin/models/${model.id}`}
                    className="text-purple-400 hover:underline text-sm"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  User,
  Building2,
  CreditCard,
  FileCheck,
  Send,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  AlertCircle,
  ExternalLink,
  Globe,
} from 'lucide-react';
import {
  Creator,
  OnboardingStep1Data,
  OnboardingStep2Data,
  OnboardingStep4Data,
  DECLARATION_TEXTS,
  getStatusColor,
  getStatusLabel,
} from '@/lib/creators/types';

// ===========================================
// COUNTRY LIST
// ===========================================

const COUNTRIES = [
  { code: 'GB', name: 'United Kingdom' },
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'AU', name: 'Australia' },
  { code: 'DE', name: 'Germany' },
  { code: 'FR', name: 'France' },
  { code: 'ES', name: 'Spain' },
  { code: 'IT', name: 'Italy' },
  { code: 'NL', name: 'Netherlands' },
  { code: 'IE', name: 'Ireland' },
  // Add more as needed
];

// ===========================================
// MAIN WIZARD COMPONENT
// ===========================================

export function CreatorOnboardingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [creator, setCreator] = useState<Creator | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load creator data
  useEffect(() => {
    fetchCreator();
  }, []);

  // Handle Stripe return
  useEffect(() => {
    if (searchParams.get('return') === 'true') {
      syncStripeStatus();
    }
  }, [searchParams]);

  const fetchCreator = async () => {
    try {
      const response = await fetch('/api/creator/onboarding');
      const data = await response.json();
      
      if (data.creator) {
        setCreator(data.creator);
        setCurrentStep(data.creator.onboarding_step || 1);
      }
    } catch (err) {
      setError('Failed to load creator data');
    } finally {
      setLoading(false);
    }
  };

  const syncStripeStatus = async () => {
    try {
      const response = await fetch('/api/creator/stripe-connect');
      const data = await response.json();
      
      if (data.creator) {
        setCreator(data.creator);
        setCurrentStep(data.creator.onboarding_step || 3);
      }
    } catch (err) {
      console.error('Failed to sync Stripe status');
    }
  };

  const saveStep = async (step: number, data: any) => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/creator/onboarding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step, data }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      setCreator(result.creator);
      setCurrentStep(step + 1);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const submitForReview = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/creator/onboarding', {
        method: 'POST',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error);
      }

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  // Already submitted
  if (creator?.status === 'PENDING_REVIEW') {
    return <PendingReviewScreen />;
  }

  if (creator?.status === 'APPROVED') {
    router.push('/dashboard');
    return null;
  }

  if (creator?.status === 'REJECTED') {
    return <RejectedScreen reason={creator.rejection_reason} />;
  }

  return (
    <div className="min-h-screen bg-black py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Creator Onboarding</h1>
          <p className="text-gray-400">Complete your profile to start earning</p>
        </div>

        {/* Progress Steps */}
        <ProgressSteps currentStep={currentStep} totalSteps={5} />

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3 text-red-400">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}

        {/* Step Content */}
        <div className="bg-zinc-900 rounded-2xl p-6">
          {currentStep === 1 && (
            <Step1AccountType
              creator={creator}
              onSave={(data) => saveStep(1, data)}
              saving={saving}
            />
          )}
          {currentStep === 2 && (
            <Step2Identity
              creator={creator}
              onSave={(data) => saveStep(2, data)}
              onBack={() => setCurrentStep(1)}
              saving={saving}
            />
          )}
          {currentStep === 3 && (
            <Step3Stripe
              creator={creator}
              onContinue={() => setCurrentStep(4)}
              onBack={() => setCurrentStep(2)}
            />
          )}
          {currentStep === 4 && (
            <Step4Declarations
              creator={creator}
              onSave={(data) => saveStep(4, data)}
              onBack={() => setCurrentStep(3)}
              saving={saving}
            />
          )}
          {currentStep === 5 && (
            <Step5Submit
              creator={creator}
              onSubmit={submitForReview}
              onBack={() => setCurrentStep(4)}
              saving={saving}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ===========================================
// PROGRESS STEPS
// ===========================================

function ProgressSteps({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) {
  const steps = [
    { num: 1, label: 'Account', icon: User },
    { num: 2, label: 'Identity', icon: Building2 },
    { num: 3, label: 'Payouts', icon: CreditCard },
    { num: 4, label: 'Terms', icon: FileCheck },
    { num: 5, label: 'Submit', icon: Send },
  ];

  return (
    <div className="flex justify-between mb-8">
      {steps.map((step, index) => {
        const Icon = step.icon;
        const isComplete = currentStep > step.num;
        const isCurrent = currentStep === step.num;

        return (
          <div key={step.num} className="flex-1 flex items-center">
            <div className="flex flex-col items-center flex-1">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
                  isComplete
                    ? 'bg-green-500 text-white'
                    : isCurrent
                    ? 'bg-purple-500 text-white'
                    : 'bg-zinc-800 text-gray-500'
                }`}
              >
                {isComplete ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </div>
              <span
                className={`text-xs mt-2 ${
                  isCurrent ? 'text-white' : 'text-gray-500'
                }`}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`h-0.5 flex-1 mx-2 ${
                  isComplete ? 'bg-green-500' : 'bg-zinc-800'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ===========================================
// STEP 1: ACCOUNT TYPE
// ===========================================

function Step1AccountType({
  creator,
  onSave,
  saving,
}: {
  creator: Creator | null;
  onSave: (data: OnboardingStep1Data) => void;
  saving: boolean;
}) {
  const [accountType, setAccountType] = useState<'INDIVIDUAL' | 'BUSINESS'>(
    creator?.account_type || 'INDIVIDUAL'
  );
  const [countryCode, setCountryCode] = useState(creator?.country_code || 'GB');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ account_type: accountType, country_code: countryCode });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-xl font-bold mb-6">Account Type</h2>

      {/* Account Type Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-3">I am registering as</label>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setAccountType('INDIVIDUAL')}
            className={`p-4 rounded-xl border-2 transition text-left ${
              accountType === 'INDIVIDUAL'
                ? 'border-purple-500 bg-purple-500/20'
                : 'border-white/10 bg-zinc-800 hover:border-white/20'
            }`}
          >
            <User className="w-6 h-6 mb-2" />
            <p className="font-medium">Individual</p>
            <p className="text-sm text-gray-400">Personal creator account</p>
          </button>
          <button
            type="button"
            onClick={() => setAccountType('BUSINESS')}
            className={`p-4 rounded-xl border-2 transition text-left ${
              accountType === 'BUSINESS'
                ? 'border-purple-500 bg-purple-500/20'
                : 'border-white/10 bg-zinc-800 hover:border-white/20'
            }`}
          >
            <Building2 className="w-6 h-6 mb-2" />
            <p className="font-medium">Business</p>
            <p className="text-sm text-gray-400">Company or agency</p>
          </button>
        </div>
      </div>

      {/* Country Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">Country of Residence</label>
        <div className="relative">
          <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <select
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500 appearance-none"
          >
            {COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full py-3 bg-purple-500 hover:bg-purple-600 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {saving ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <>
            Continue
            <ChevronRight className="w-5 h-5" />
          </>
        )}
      </button>
    </form>
  );
}

// ===========================================
// STEP 2: IDENTITY
// ===========================================

function Step2Identity({
  creator,
  onSave,
  onBack,
  saving,
}: {
  creator: Creator | null;
  onSave: (data: OnboardingStep2Data) => void;
  onBack: () => void;
  saving: boolean;
}) {
  const [formData, setFormData] = useState<OnboardingStep2Data>({
    legal_name: creator?.legal_name || '',
    business_name: creator?.business_name || '',
    date_of_birth: creator?.date_of_birth || '',
    contact_email: creator?.contact_email || '',
    contact_phone: creator?.contact_phone || '',
    address_line1: creator?.address_line1 || '',
    address_line2: creator?.address_line2 || '',
    city: creator?.city || '',
    state: creator?.state || '',
    postal_code: creator?.postal_code || '',
  });

  const isIndividual = creator?.account_type === 'INDIVIDUAL';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const updateField = (field: keyof OnboardingStep2Data, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-xl font-bold mb-6">
        {isIndividual ? 'Personal Details' : 'Business Details'}
      </h2>

      {/* Name */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">
          {isIndividual ? 'Full Legal Name' : 'Business Legal Name'}
        </label>
        <input
          type="text"
          value={isIndividual ? formData.legal_name : formData.business_name}
          onChange={(e) => updateField(isIndividual ? 'legal_name' : 'business_name', e.target.value)}
          required
          className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
        />
      </div>

      {/* DOB for individuals */}
      {isIndividual && (
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Date of Birth</label>
          <input
            type="date"
            value={formData.date_of_birth}
            onChange={(e) => updateField('date_of_birth', e.target.value)}
            required
            className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
          />
        </div>
      )}

      {/* Contact */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium mb-2">Email</label>
          <input
            type="email"
            value={formData.contact_email}
            onChange={(e) => updateField('contact_email', e.target.value)}
            required
            className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Phone</label>
          <input
            type="tel"
            value={formData.contact_phone}
            onChange={(e) => updateField('contact_phone', e.target.value)}
            className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Address */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Address Line 1</label>
        <input
          type="text"
          value={formData.address_line1}
          onChange={(e) => updateField('address_line1', e.target.value)}
          required
          className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
        />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Address Line 2 (Optional)</label>
        <input
          type="text"
          value={formData.address_line2}
          onChange={(e) => updateField('address_line2', e.target.value)}
          className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
        />
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-2">City</label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => updateField('city', e.target.value)}
            required
            className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">State/County</label>
          <input
            type="text"
            value={formData.state}
            onChange={(e) => updateField('state', e.target.value)}
            className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">Postcode</label>
          <input
            type="text"
            value={formData.postal_code}
            onChange={(e) => updateField('postal_code', e.target.value)}
            required
            className="w-full px-4 py-3 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium flex items-center justify-center gap-2"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-3 bg-purple-500 hover:bg-purple-600 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Continue
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}

// ===========================================
// STEP 3: STRIPE CONNECT
// ===========================================

function Step3Stripe({
  creator,
  onContinue,
  onBack,
}: {
  creator: Creator | null;
  onContinue: () => void;
  onBack: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const startStripeOnboarding = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/creator/stripe-connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Failed to start Stripe onboarding');
    } finally {
      setLoading(false);
    }
  };

  const isComplete = creator?.stripe_connect_onboarding_complete;

  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Payout Setup</h2>

      <div className="mb-6 p-4 bg-zinc-800 rounded-lg">
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              isComplete ? 'bg-green-500/20' : 'bg-purple-500/20'
            }`}
          >
            <CreditCard
              className={`w-6 h-6 ${isComplete ? 'text-green-400' : 'text-purple-400'}`}
            />
          </div>
          <div className="flex-1">
            <h3 className="font-medium mb-1">Stripe Connect</h3>
            <p className="text-sm text-gray-400 mb-3">
              Connect your Stripe account to receive payouts. Stripe handles all payment processing and compliance.
            </p>

            {isComplete ? (
              <div className="flex items-center gap-2 text-green-400">
                <Check className="w-5 h-5" />
                <span>Connected successfully</span>
              </div>
            ) : (
              <button
                onClick={startStripeOnboarding}
                disabled={loading}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-600 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Connect with Stripe
                    <ExternalLink className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {creator?.stripe_requirements_due && creator.stripe_requirements_due.length > 0 && (
        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-sm text-yellow-400">
            Stripe requires additional information. Please complete the onboarding.
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium flex items-center justify-center gap-2"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>
        <button
          onClick={onContinue}
          disabled={!isComplete}
          className="flex-1 py-3 bg-purple-500 hover:bg-purple-600 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// ===========================================
// STEP 4: DECLARATIONS
// ===========================================

function Step4Declarations({
  creator,
  onSave,
  onBack,
  saving,
}: {
  creator: Creator | null;
  onSave: (data: OnboardingStep4Data) => void;
  onBack: () => void;
  saving: boolean;
}) {
  const [declarations, setDeclarations] = useState({
    is_18_plus: false,
    personas_fictional: false,
    no_real_person_likeness: false,
    no_minors: false,
    no_celebrity_impersonation: false,
    owns_content_rights: false,
    agrees_to_terms: false,
  });

  const allChecked = Object.values(declarations).every((v) => v);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (allChecked) {
      onSave({ declarations });
    }
  };

  const toggleDeclaration = (key: keyof typeof declarations) => {
    setDeclarations((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className="text-xl font-bold mb-6">Creator Agreement</h2>

      <p className="text-gray-400 mb-6">
        Please read and accept the following declarations to continue.
      </p>

      <div className="space-y-3 mb-6">
        {Object.entries(DECLARATION_TEXTS).map(([key, text]) => (
          <label
            key={key}
            className={`flex items-start gap-3 p-4 rounded-lg cursor-pointer transition ${
              declarations[key as keyof typeof declarations]
                ? 'bg-purple-500/20 border border-purple-500/30'
                : 'bg-zinc-800 border border-transparent hover:border-white/10'
            }`}
          >
            <input
              type="checkbox"
              checked={declarations[key as keyof typeof declarations]}
              onChange={() => toggleDeclaration(key as keyof typeof declarations)}
              className="mt-1 w-5 h-5 rounded border-white/20 bg-zinc-700 text-purple-500 focus:ring-purple-500"
            />
            <span className="text-sm">{text}</span>
          </label>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium flex items-center justify-center gap-2"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>
        <button
          type="submit"
          disabled={!allChecked || saving}
          className="flex-1 py-3 bg-purple-500 hover:bg-purple-600 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              I Accept
              <ChevronRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </form>
  );
}

// ===========================================
// STEP 5: SUBMIT
// ===========================================

function Step5Submit({
  creator,
  onSubmit,
  onBack,
  saving,
}: {
  creator: Creator | null;
  onSubmit: () => void;
  onBack: () => void;
  saving: boolean;
}) {
  return (
    <div>
      <h2 className="text-xl font-bold mb-6">Submit for Review</h2>

      <div className="mb-6 p-4 bg-zinc-800 rounded-lg">
        <h3 className="font-medium mb-3">Application Summary</h3>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Account Type</span>
            <span>{creator?.account_type}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Name</span>
            <span>{creator?.legal_name || creator?.business_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Country</span>
            <span>{creator?.country_code}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Stripe Connected</span>
            <span className={creator?.stripe_connect_onboarding_complete ? 'text-green-400' : 'text-yellow-400'}>
              {creator?.stripe_connect_onboarding_complete ? 'Yes' : 'No'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Declarations</span>
            <span className={creator?.declarations_accepted_at ? 'text-green-400' : 'text-yellow-400'}>
              {creator?.declarations_accepted_at ? 'Accepted' : 'Not accepted'}
            </span>
          </div>
        </div>
      </div>

      <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <p className="text-sm text-blue-300">
          Your application will be reviewed by our team within 24-48 hours. You'll receive an email once approved.
        </p>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium flex items-center justify-center gap-2"
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>
        <button
          onClick={onSubmit}
          disabled={saving}
          className="flex-1 py-3 bg-green-500 hover:bg-green-600 rounded-lg font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              Submit Application
              <Send className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ===========================================
// STATUS SCREENS
// ===========================================

function PendingReviewScreen() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md text-center">
        <div className="w-20 h-20 mx-auto mb-6 bg-yellow-500/20 rounded-full flex items-center justify-center">
          <Loader2 className="w-10 h-10 text-yellow-400 animate-spin" />
        </div>
        <h1 className="text-2xl font-bold mb-3">Application Under Review</h1>
        <p className="text-gray-400 mb-6">
          Your creator application is being reviewed by our team. This usually takes 24-48 hours.
          We'll email you once approved.
        </p>
        <a
          href="/"
          className="inline-block px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-medium"
        >
          Return Home
        </a>
      </div>
    </div>
  );
}

function RejectedScreen({ reason }: { reason?: string }) {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="max-w-md text-center">
        <div className="w-20 h-20 mx-auto mb-6 bg-red-500/20 rounded-full flex items-center justify-center">
          <AlertCircle className="w-10 h-10 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold mb-3">Application Rejected</h1>
        <p className="text-gray-400 mb-4">
          Unfortunately, your creator application was not approved.
        </p>
        {reason && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-left">
            <p className="text-sm font-medium text-red-400 mb-1">Reason:</p>
            <p className="text-sm text-gray-300">{reason}</p>
          </div>
        )}
        <p className="text-sm text-gray-500">
          If you believe this is an error, please contact support.
        </p>
      </div>
    </div>
  );
}

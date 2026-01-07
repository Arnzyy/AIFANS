'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Building,
  CreditCard,
  FileCheck,
  Send,
  Check,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Upload,
  Camera,
  Shield,
  AlertCircle,
  X,
  FileImage,
  Smartphone,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

type OnboardingStep = 'account_type' | 'identity' | 'stripe_connect' | 'declarations' | 'submit';

interface Creator {
  id: string;
  display_name: string;
  bio?: string;
  business_type: string;
  business_name?: string;
  country: string;
  status: string;
  onboarding_step: OnboardingStep;
  onboarding_complete: boolean;
  stripe_onboarding_complete: boolean;
  kyc_status?: 'pending' | 'submitted' | 'verified' | 'rejected';
  id_document_url?: string;
  selfie_url?: string;
  date_of_birth?: string;
}

interface OnboardingStatus {
  creator: Creator | null;
  currentStep: OnboardingStep;
  stepsCompleted: OnboardingStep[];
  canSubmit: boolean;
}

const steps = [
  { id: 'account_type' as OnboardingStep, label: 'Account Type', icon: Building },
  { id: 'identity' as OnboardingStep, label: 'Identity', icon: User },
  { id: 'stripe_connect' as OnboardingStep, label: 'Payments', icon: CreditCard },
  { id: 'declarations' as OnboardingStep, label: 'Declarations', icon: FileCheck },
  { id: 'submit' as OnboardingStep, label: 'Submit', icon: Send },
] as const;

export default function OnboardingPage() {
  const router = useRouter();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('account_type');

  // Form data
  const [formData, setFormData] = useState({
    business_type: 'individual' as 'individual' | 'company',
    business_name: '',
    country: 'GB',
    display_name: '',
    bio: '',
    date_of_birth: '',
    id_document_url: '',
    selfie_url: '',
    declarations: {
      age_verification: false,
      content_ownership: false,
      no_real_person: false,
      terms_acceptance: false,
      payout_terms: false,
      compliance_agreement: false,
    },
  });

  // KYC upload states
  const [uploadingId, setUploadingId] = useState(false);
  const [uploadingSelfie, setUploadingSelfie] = useState(false);
  const [kycError, setKycError] = useState<string | null>(null);
  const idInputRef = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/creator/onboarding');
      const data: OnboardingStatus = await res.json();

      setStatus(data);

      if (data.creator) {
        setCurrentStep(data.creator.onboarding_step);
        setFormData(prev => ({
          ...prev,
          business_type: (data.creator?.business_type as 'individual' | 'company') || 'individual',
          business_name: data.creator?.business_name || '',
          country: data.creator?.country || 'GB',
          display_name: data.creator?.display_name || '',
          bio: data.creator?.bio || '',
          date_of_birth: data.creator?.date_of_birth || '',
          id_document_url: data.creator?.id_document_url || '',
          selfie_url: data.creator?.selfie_url || '',
        }));
      }

      // Redirect if already approved
      if (data.creator?.status === 'approved') {
        router.push('/dashboard');
      }
    } catch (error) {
      console.error('Error fetching status:', error);
    } finally {
      setLoading(false);
    }
  };

  const startOnboarding = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/creator/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        await fetchStatus();
      }
    } catch (error) {
      console.error('Error starting onboarding:', error);
    } finally {
      setSaving(false);
    }
  };

  const saveStep = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/creator/onboarding', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          step: currentStep,
          data: formData,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentStep(data.nextStep);
        await fetchStatus();
      }
    } catch (error) {
      console.error('Error saving step:', error);
    } finally {
      setSaving(false);
    }
  };

  // KYC document upload handler
  const handleKycUpload = async (file: File, type: 'id' | 'selfie') => {
    setKycError(null);

    // Validate file
    if (!file.type.startsWith('image/')) {
      setKycError('Please upload an image file (JPG, PNG)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setKycError('File size must be less than 10MB');
      return;
    }

    const setUploading = type === 'id' ? setUploadingId : setUploadingSelfie;
    setUploading(true);

    try {
      const supabase = createClient();

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `kyc/${Date.now()}-${type}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload to Supabase Storage (private bucket)
      const { data, error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        // If bucket doesn't exist, try content bucket with kyc folder
        const { data: fallbackData, error: fallbackError } = await supabase.storage
          .from('content')
          .upload(`kyc/${fileName}`, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (fallbackError) {
          throw fallbackError;
        }

        const { data: urlData } = supabase.storage
          .from('content')
          .getPublicUrl(`kyc/${fileName}`);

        setFormData(prev => ({
          ...prev,
          [type === 'id' ? 'id_document_url' : 'selfie_url']: urlData.publicUrl,
        }));
      } else {
        // Get signed URL for private bucket
        const { data: urlData } = await supabase.storage
          .from('kyc-documents')
          .createSignedUrl(data.path, 60 * 60 * 24 * 365); // 1 year expiry

        if (urlData) {
          setFormData(prev => ({
            ...prev,
            [type === 'id' ? 'id_document_url' : 'selfie_url']: urlData.signedUrl,
          }));
        }
      }
    } catch (err) {
      console.error('KYC upload error:', err);
      setKycError('Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Calculate age from date of birth
  const calculateAge = (dob: string): number => {
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const isOver18 = formData.date_of_birth ? calculateAge(formData.date_of_birth) >= 18 : false;

  const goToStep = (step: OnboardingStep) => {
    const stepIndex = steps.findIndex(s => s.id === step);
    const currentIndex = steps.findIndex(s => s.id === currentStep);

    // Can only go back or to completed steps
    if (stepIndex < currentIndex || status?.stepsCompleted.includes(step)) {
      setCurrentStep(step);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-purple-500" size={32} />
      </div>
    );
  }

  // Show start page if not started
  if (!status?.creator) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Become a Creator</h1>
          <p className="text-zinc-400">
            Start earning by creating AI personas on LYRA
          </p>
        </div>

        <div className="bg-zinc-900 rounded-xl p-8 mb-8">
          <h2 className="text-xl font-semibold mb-4">What you'll need:</h2>
          <ul className="space-y-3 text-zinc-300">
            <li className="flex items-center gap-3">
              <Check size={18} className="text-green-400" />
              Valid ID for verification (18+)
            </li>
            <li className="flex items-center gap-3">
              <Check size={18} className="text-green-400" />
              Bank account for payouts (via Stripe)
            </li>
            <li className="flex items-center gap-3">
              <Check size={18} className="text-green-400" />
              Original content (no copyrighted material)
            </li>
          </ul>
        </div>

        <div className="bg-zinc-900 rounded-xl p-8 mb-8">
          <h2 className="text-xl font-semibold mb-4">Creator Benefits:</h2>
          <ul className="space-y-3 text-zinc-300">
            <li className="flex items-center gap-3">
              <span className="text-purple-400">70%</span> revenue share
            </li>
            <li className="flex items-center gap-3">
              <span className="text-purple-400">Unlimited</span> AI personas (up to 3 free)
            </li>
            <li className="flex items-center gap-3">
              <span className="text-purple-400">Weekly</span> payouts via Stripe
            </li>
          </ul>
        </div>

        <button
          onClick={startOnboarding}
          disabled={saving}
          className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <>
              Get Started
              <ChevronRight size={20} />
            </>
          )}
        </button>
      </div>
    );
  }

  // Show pending status if submitted
  if (status.creator.status === 'pending' && status.creator.onboarding_complete) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="w-20 h-20 mx-auto bg-yellow-500/20 rounded-full flex items-center justify-center mb-6">
          <FileCheck size={40} className="text-yellow-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Application Submitted</h1>
        <p className="text-zinc-400 mb-8">
          Your creator application is being reviewed. We'll notify you once it's approved.
        </p>
        <div className="bg-zinc-900 rounded-xl p-6 text-left">
          <h3 className="font-medium mb-3">What happens next?</h3>
          <ol className="space-y-2 text-sm text-zinc-400 list-decimal list-inside">
            <li>Our team reviews your application (usually within 24-48 hours)</li>
            <li>We verify your Stripe Connect account</li>
            <li>Once approved, you can start creating AI models</li>
          </ol>
        </div>
      </div>
    );
  }

  // Show rejected status
  if (status.creator.status === 'rejected') {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="w-20 h-20 mx-auto bg-red-500/20 rounded-full flex items-center justify-center mb-6">
          <FileCheck size={40} className="text-red-400" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Application Not Approved</h1>
        <p className="text-zinc-400 mb-8">
          Unfortunately, your application was not approved at this time.
        </p>
        <p className="text-sm text-zinc-500">
          If you believe this was an error, please contact support.
        </p>
      </div>
    );
  }

  const stepIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-12">
        {steps.map((step, index) => {
          const isCompleted = status.stepsCompleted.includes(step.id);
          const isCurrent = step.id === currentStep;

          return (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => goToStep(step.id)}
                disabled={!isCompleted && !isCurrent}
                className={`
                  flex flex-col items-center
                  ${isCurrent ? 'text-purple-400' : isCompleted ? 'text-green-400' : 'text-zinc-600'}
                `}
              >
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center mb-2
                  ${isCurrent ? 'bg-purple-600' : isCompleted ? 'bg-green-600' : 'bg-zinc-800'}
                `}>
                  {isCompleted ? (
                    <Check size={20} />
                  ) : (
                    <step.icon size={20} />
                  )}
                </div>
                <span className="text-xs hidden sm:block">{step.label}</span>
              </button>

              {index < steps.length - 1 && (
                <div className={`
                  w-12 sm:w-24 h-0.5 mx-2
                  ${index < stepIndex ? 'bg-green-600' : 'bg-zinc-800'}
                `} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="bg-zinc-900 rounded-xl p-8">
        {currentStep === 'account_type' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Account Type</h2>
            <p className="text-zinc-400">Choose how you'll operate on LYRA</p>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setFormData(prev => ({ ...prev, business_type: 'individual' }))}
                className={`
                  p-6 rounded-xl text-left transition-colors
                  ${formData.business_type === 'individual'
                    ? 'bg-purple-600/20 border-2 border-purple-500'
                    : 'bg-zinc-800 border-2 border-transparent hover:border-zinc-700'
                  }
                `}
              >
                <User size={24} className="mb-3" />
                <h3 className="font-medium">Individual</h3>
                <p className="text-sm text-zinc-400 mt-1">Personal creator account</p>
              </button>

              <button
                onClick={() => setFormData(prev => ({ ...prev, business_type: 'company' }))}
                className={`
                  p-6 rounded-xl text-left transition-colors
                  ${formData.business_type === 'company'
                    ? 'bg-purple-600/20 border-2 border-purple-500'
                    : 'bg-zinc-800 border-2 border-transparent hover:border-zinc-700'
                  }
                `}
              >
                <Building size={24} className="mb-3" />
                <h3 className="font-medium">Company</h3>
                <p className="text-sm text-zinc-400 mt-1">Business or agency</p>
              </button>
            </div>

            {formData.business_type === 'company' && (
              <div>
                <label className="block text-sm text-zinc-400 mb-2">Business Name</label>
                <input
                  type="text"
                  value={formData.business_name}
                  onChange={(e) => setFormData(prev => ({ ...prev, business_name: e.target.value }))}
                  className="w-full px-4 py-3 bg-zinc-800 rounded-lg border border-zinc-700 focus:border-purple-500 focus:outline-none"
                  placeholder="Your company name"
                />
              </div>
            )}

            <div>
              <label className="block text-sm text-zinc-400 mb-2">Country</label>
              <select
                value={formData.country}
                onChange={(e) => setFormData(prev => ({ ...prev, country: e.target.value }))}
                className="w-full px-4 py-3 bg-zinc-800 rounded-lg border border-zinc-700 focus:border-purple-500 focus:outline-none"
              >
                <option value="GB">United Kingdom</option>
                <option value="US">United States</option>
                <option value="CA">Canada</option>
                <option value="AU">Australia</option>
                <option value="DE">Germany</option>
                <option value="FR">France</option>
              </select>
            </div>
          </div>
        )}

        {currentStep === 'identity' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold">Identity Verification</h2>
              <p className="text-zinc-400">We need to verify your identity to comply with regulations</p>
            </div>

            {/* KYC Info Banner */}
            <div className="p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg flex gap-3">
              <Shield className="text-purple-400 flex-shrink-0" size={24} />
              <div className="text-sm">
                <p className="font-medium text-purple-300">Your documents are secure</p>
                <p className="text-zinc-400 mt-1">
                  We use bank-level encryption. Documents are only used for verification and stored securely.
                </p>
              </div>
            </div>

            {kycError && (
              <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-3 text-red-400">
                <AlertCircle size={20} />
                <span>{kycError}</span>
                <button onClick={() => setKycError(null)} className="ml-auto">
                  <X size={18} />
                </button>
              </div>
            )}

            {/* Display Name */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Display Name *</label>
              <input
                type="text"
                value={formData.display_name}
                onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                className="w-full px-4 py-3 bg-zinc-800 rounded-lg border border-zinc-700 focus:border-purple-500 focus:outline-none"
                placeholder="Your creator name"
              />
            </div>

            {/* Date of Birth */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Date of Birth *</label>
              <input
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData(prev => ({ ...prev, date_of_birth: e.target.value }))}
                max={new Date(new Date().setFullYear(new Date().getFullYear() - 18)).toISOString().split('T')[0]}
                className="w-full px-4 py-3 bg-zinc-800 rounded-lg border border-zinc-700 focus:border-purple-500 focus:outline-none"
              />
              {formData.date_of_birth && !isOver18 && (
                <p className="text-red-400 text-sm mt-2 flex items-center gap-2">
                  <AlertCircle size={16} />
                  You must be 18 or older to become a creator
                </p>
              )}
              {formData.date_of_birth && isOver18 && (
                <p className="text-green-400 text-sm mt-2 flex items-center gap-2">
                  <Check size={16} />
                  Age verified: {calculateAge(formData.date_of_birth)} years old
                </p>
              )}
            </div>

            {/* ID Document Upload */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Government-Issued ID *</label>
              <p className="text-xs text-zinc-500 mb-3">
                Upload a clear photo of your passport, driver's license, or national ID card
              </p>

              {formData.id_document_url ? (
                <div className="relative rounded-lg overflow-hidden border border-zinc-700">
                  <img
                    src={formData.id_document_url}
                    alt="ID Document"
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, id_document_url: '' }))}
                      className="px-4 py-2 bg-red-500 rounded-lg text-sm font-medium flex items-center gap-2"
                    >
                      <X size={16} />
                      Remove
                    </button>
                  </div>
                  <div className="absolute top-2 right-2 px-2 py-1 bg-green-500 rounded text-xs font-medium flex items-center gap-1">
                    <Check size={12} />
                    Uploaded
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => idInputRef.current?.click()}
                  disabled={uploadingId}
                  className="w-full p-8 border-2 border-dashed border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors flex flex-col items-center gap-3"
                >
                  {uploadingId ? (
                    <>
                      <Loader2 className="animate-spin text-purple-400" size={32} />
                      <span className="text-sm text-zinc-400">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center">
                        <FileImage className="text-zinc-400" size={28} />
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-zinc-300">Click to upload ID document</p>
                        <p className="text-xs text-zinc-500 mt-1">JPG or PNG, max 10MB</p>
                      </div>
                    </>
                  )}
                </button>
              )}

              <input
                ref={idInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleKycUpload(e.target.files[0], 'id')}
                className="hidden"
              />
            </div>

            {/* Selfie Upload */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Selfie with ID *</label>
              <p className="text-xs text-zinc-500 mb-3">
                Take a photo of yourself holding your ID next to your face
              </p>

              {formData.selfie_url ? (
                <div className="relative rounded-lg overflow-hidden border border-zinc-700">
                  <img
                    src={formData.selfie_url}
                    alt="Selfie"
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setFormData(prev => ({ ...prev, selfie_url: '' }))}
                      className="px-4 py-2 bg-red-500 rounded-lg text-sm font-medium flex items-center gap-2"
                    >
                      <X size={16} />
                      Remove
                    </button>
                  </div>
                  <div className="absolute top-2 right-2 px-2 py-1 bg-green-500 rounded text-xs font-medium flex items-center gap-1">
                    <Check size={12} />
                    Uploaded
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => selfieInputRef.current?.click()}
                  disabled={uploadingSelfie}
                  className="w-full p-8 border-2 border-dashed border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors flex flex-col items-center gap-3"
                >
                  {uploadingSelfie ? (
                    <>
                      <Loader2 className="animate-spin text-purple-400" size={32} />
                      <span className="text-sm text-zinc-400">Uploading...</span>
                    </>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center">
                        <Camera className="text-zinc-400" size={28} />
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-zinc-300">Click to upload selfie</p>
                        <p className="text-xs text-zinc-500 mt-1">Hold your ID next to your face</p>
                      </div>
                    </>
                  )}
                </button>
              )}

              <input
                ref={selfieInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && handleKycUpload(e.target.files[0], 'selfie')}
                className="hidden"
              />
            </div>

            {/* Selfie Tips */}
            <div className="p-4 bg-zinc-800/50 rounded-lg">
              <p className="text-sm font-medium mb-2">Tips for a good selfie:</p>
              <ul className="text-xs text-zinc-400 space-y-1">
                <li className="flex items-center gap-2">
                  <Check size={12} className="text-green-400" />
                  Good lighting, face clearly visible
                </li>
                <li className="flex items-center gap-2">
                  <Check size={12} className="text-green-400" />
                  ID photo and your face both in frame
                </li>
                <li className="flex items-center gap-2">
                  <Check size={12} className="text-green-400" />
                  ID details readable (not blurry)
                </li>
                <li className="flex items-center gap-2">
                  <X size={12} className="text-red-400" />
                  No filters, masks, or sunglasses
                </li>
              </ul>
            </div>

            {/* Bio (Optional) */}
            <div>
              <label className="block text-sm text-zinc-400 mb-2">Bio (Optional)</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                className="w-full px-4 py-3 bg-zinc-800 rounded-lg border border-zinc-700 focus:border-purple-500 focus:outline-none resize-none"
                rows={3}
                placeholder="Tell fans about yourself..."
              />
            </div>
          </div>
        )}

        {currentStep === 'stripe_connect' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Payment Setup</h2>
            <p className="text-zinc-400">Connect with Stripe to receive payouts</p>

            {status.creator.stripe_onboarding_complete ? (
              <div className="p-4 bg-green-500/20 rounded-lg flex items-center gap-3">
                <Check className="text-green-400" />
                <span className="text-green-400">Stripe account connected</span>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-zinc-400">
                  You'll be redirected to Stripe to complete your account setup.
                  This includes identity verification and bank account details.
                </p>
                <button
                  onClick={() => {
                    // TODO: Implement Stripe Connect redirect
                    alert('Stripe Connect integration coming soon');
                  }}
                  className="w-full py-3 bg-[#635BFF] rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                >
                  <CreditCard size={20} />
                  Connect with Stripe
                </button>
              </div>
            )}
          </div>
        )}

        {currentStep === 'declarations' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Declarations</h2>
            <p className="text-zinc-400">Please confirm the following</p>

            <div className="space-y-4">
              {[
                { key: 'age_verification', label: 'I confirm I am 18 years or older' },
                { key: 'content_ownership', label: 'I own or have rights to all content I will upload' },
                { key: 'no_real_person', label: 'My AI personas will not impersonate real people' },
                { key: 'terms_acceptance', label: 'I accept the Terms of Service' },
                { key: 'payout_terms', label: 'I accept the Payout Terms (14-day hold period)' },
                { key: 'compliance_agreement', label: 'I agree to follow Content Guidelines' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.declarations[key as keyof typeof formData.declarations]}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      declarations: {
                        ...prev.declarations,
                        [key]: e.target.checked,
                      },
                    }))}
                    className="mt-1 w-5 h-5 rounded border-zinc-600 bg-zinc-800 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-sm">{label}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {currentStep === 'submit' && (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 mx-auto bg-purple-500/20 rounded-full flex items-center justify-center">
              <Send size={32} className="text-purple-400" />
            </div>
            <h2 className="text-xl font-semibold">Ready to Submit</h2>
            <p className="text-zinc-400">
              Review your application and submit for approval
            </p>

            <div className="bg-zinc-800 rounded-lg p-4 text-left space-y-2">
              <div className="flex justify-between">
                <span className="text-zinc-400">Account Type</span>
                <span className="capitalize">{formData.business_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Display Name</span>
                <span>{formData.display_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Country</span>
                <span>{formData.country}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Date of Birth</span>
                <span>{formData.date_of_birth}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">ID Verification</span>
                <span className={formData.id_document_url && formData.selfie_url ? 'text-green-400' : 'text-yellow-400'}>
                  {formData.id_document_url && formData.selfie_url ? 'Documents Uploaded' : 'Pending'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-400">Stripe</span>
                <span className={status.creator.stripe_onboarding_complete ? 'text-green-400' : 'text-yellow-400'}>
                  {status.creator.stripe_onboarding_complete ? 'Connected' : 'Pending'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-6 border-t border-zinc-800">
          <button
            onClick={() => {
              const prevIndex = stepIndex - 1;
              if (prevIndex >= 0) {
                setCurrentStep(steps[prevIndex].id);
              }
            }}
            disabled={stepIndex === 0}
            className="px-4 py-2 text-zinc-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ChevronLeft size={18} />
            Back
          </button>

          <button
            onClick={saveStep}
            disabled={
              saving ||
              (currentStep === 'identity' && (
                !formData.display_name ||
                !formData.date_of_birth ||
                !isOver18 ||
                !formData.id_document_url ||
                !formData.selfie_url
              ))
            }
            className="px-6 py-2 bg-purple-600 rounded-lg font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {saving ? (
              <Loader2 className="animate-spin" size={18} />
            ) : currentStep === 'submit' ? (
              <>
                Submit Application
                <Send size={18} />
              </>
            ) : (
              <>
                Continue
                <ChevronRight size={18} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

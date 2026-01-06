'use client';

import { useState } from 'react';
import { AIPersonalityFull, WIZARD_STEPS } from '@/lib/ai/personality/types';
import { Step1Identity } from './steps/Step1Identity';
import { Step2Personality } from './steps/Step2Personality';
import { Step3Background } from './steps/Step3Background';
import { Step4Romantic } from './steps/Step4Romantic';
import { Step5Voice } from './steps/Step5Voice';
import { Step6Behavior } from './steps/Step6Behavior';
import { Step7Preview } from './steps/Step7Preview';

interface AIPersonalityWizardProps {
  creatorId: string;
  existingPersonality?: AIPersonalityFull;
  onComplete: (personality: AIPersonalityFull) => void;
}

const defaultPersonality: Omit<AIPersonalityFull, 'creator_id'> = {
  persona_name: '',
  age: 24,
  height_cm: 165,
  body_type: 'slim',
  hair_color: 'Brown',
  hair_style: 'Long & wavy',
  eye_color: 'Brown',
  skin_tone: 'olive',
  style_vibes: [],
  personality_traits: [],
  energy_level: 5,
  humor_style: 'witty',
  intelligence_vibe: 'street_smart',
  mood: 'happy',
  occupation: '',
  interests: [],
  music_taste: [],
  flirting_style: [],
  dynamic: 'switch',
  attracted_to: [],
  love_language: 'words',
  pace: 5,
  vibe_creates: 'playful_fun',
  turn_ons: [],
  vocabulary_level: 5,
  emoji_usage: 'moderate',
  response_length: 'medium',
  speech_patterns: [],
  accent_flavor: 'neutral',
  topics_loves: [],
  topics_avoids: [],
  when_complimented: 'flirts_back',
  when_heated: 'leans_in',
  is_active: true,
};

export function AIPersonalityWizard({
  creatorId,
  existingPersonality,
  onComplete
}: AIPersonalityWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [personality, setPersonality] = useState<AIPersonalityFull>(
    existingPersonality || { ...defaultPersonality, creator_id: creatorId }
  );
  const [isSaving, setIsSaving] = useState(false);

  const updatePersonality = (updates: Partial<AIPersonalityFull>) => {
    setPersonality(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (currentStep < WIZARD_STEPS.length) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const goToStep = (step: number) => {
    setCurrentStep(step);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/creator/ai-personality', {
        method: existingPersonality ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(personality),
      });

      if (!response.ok) throw new Error('Failed to save');

      const saved = await response.json();
      onComplete(saved);
    } catch (error) {
      console.error('Error saving personality:', error);
      alert('Failed to save. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1Identity personality={personality} onChange={updatePersonality} />;
      case 2:
        return <Step2Personality personality={personality} onChange={updatePersonality} />;
      case 3:
        return <Step3Background personality={personality} onChange={updatePersonality} />;
      case 4:
        return <Step4Romantic personality={personality} onChange={updatePersonality} />;
      case 5:
        return <Step5Voice personality={personality} onChange={updatePersonality} />;
      case 6:
        return <Step6Behavior personality={personality} onChange={updatePersonality} />;
      case 7:
        return <Step7Preview personality={personality} onEdit={goToStep} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="border-b border-white/10 bg-zinc-950">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold mb-2">
            AI Personality Creator
          </h1>
          <p className="text-gray-400">
            Build your unique AI persona - make her one of a kind
          </p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="border-b border-white/10 bg-zinc-950/50 overflow-x-auto">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex gap-2 min-w-max">
            {WIZARD_STEPS.map((step) => (
              <button
                key={step.id}
                onClick={() => goToStep(step.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  currentStep === step.id
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                    : currentStep > step.id
                    ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                    : 'bg-white/5 text-gray-400 hover:bg-white/10'
                }`}
              >
                <span>{step.icon}</span>
                <span className="hidden sm:inline">{step.title}</span>
                <span className="sm:hidden">{step.id}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Current Step Header */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-3xl">{WIZARD_STEPS[currentStep - 1].icon}</span>
          <div>
            <h2 className="text-xl font-semibold">
              {WIZARD_STEPS[currentStep - 1].title}
            </h2>
            <p className="text-gray-400">
              {WIZARD_STEPS[currentStep - 1].subtitle}
            </p>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-zinc-900 border border-white/10 rounded-xl p-6">
          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center mt-6">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className={`px-6 py-3 rounded-full font-medium transition-all ${
              currentStep === 1
                ? 'bg-white/5 text-gray-600 cursor-not-allowed'
                : 'bg-white/10 text-white hover:bg-white/20'
            }`}
          >
            Back
          </button>

          <span className="text-gray-500">
            Step {currentStep} of {WIZARD_STEPS.length}
          </span>

          {currentStep < WIZARD_STEPS.length ? (
            <button
              onClick={nextStep}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full font-medium hover:opacity-90 transition-opacity"
            >
              Next
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save & Activate'}
            </button>
          )}
        </div>

        {/* Subtle disclaimer */}
        <div className="mt-6 pt-4 border-t border-white/10 text-center">
          <p className="text-xs text-gray-500">
            Your AI follows platform guidelines and won't engage in prohibited content. She's designed for entertainment and connection.
          </p>
        </div>
      </div>
    </div>
  );
}

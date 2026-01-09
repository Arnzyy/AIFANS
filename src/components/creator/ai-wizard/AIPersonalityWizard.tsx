'use client';

import { useState, useEffect } from 'react';
import { AIPersonalityFull, WIZARD_STEPS } from '@/lib/ai/personality/types';
import { Step1Identity } from './steps/Step1Identity';
import { Step2Personality } from './steps/Step2Personality';
import { Step3Background } from './steps/Step3Background';
import { Step4Romantic } from './steps/Step4Romantic';
import { Step5Voice } from './steps/Step5Voice';
import { Step6Behavior } from './steps/Step6Behavior';
import { Step7Preview } from './steps/Step7Preview';

interface LinkedModel {
  id: string;
  name: string;
  age: number | null;
  bio: string | null;
  backstory: string | null;
  speaking_style: string | null;
  personality_traits: string[] | null;
  emoji_usage: string | null;
  response_length: string | null;
  interests: string[] | null;
  turn_ons: string[] | null;
  avatar_url: string | null;
  physical_traits: {
    hair_color?: string;
    eye_color?: string;
    body_type?: string;
    ethnicity?: string;
    style?: string;
    height?: string;
  } | null;
}

interface AIPersonalityWizardProps {
  creatorId: string;
  existingPersonality?: AIPersonalityFull;
  linkedModel?: LinkedModel | null;
  modelId?: string | null;
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
  linkedModel,
  modelId,
  onComplete
}: AIPersonalityWizardProps) {
  const [currentStep, setCurrentStep] = useState(1);

  // Build initial personality - pre-fill from linked model if available
  const getInitialPersonality = (): AIPersonalityFull => {
    if (existingPersonality) {
      return existingPersonality;
    }

    // Pre-fill from linked model data
    const prefilled: AIPersonalityFull = {
      ...defaultPersonality,
      creator_id: creatorId,
    };

    if (linkedModel) {
      // Basic info
      if (linkedModel.name) {
        prefilled.persona_name = linkedModel.name;
      }
      if (linkedModel.age) {
        prefilled.age = linkedModel.age;
      }

      // Personality - normalize to lowercase IDs to match wizard options
      if (linkedModel.personality_traits && linkedModel.personality_traits.length > 0) {
        // Convert to lowercase and limit to 5
        prefilled.personality_traits = linkedModel.personality_traits
          .map(t => t.toLowerCase())
          .slice(0, 5);
      }
      if (linkedModel.interests && linkedModel.interests.length > 0) {
        prefilled.interests = linkedModel.interests;
      }
      if (linkedModel.turn_ons && linkedModel.turn_ons.length > 0) {
        prefilled.turn_ons = linkedModel.turn_ons;
      }

      // Voice settings
      if (linkedModel.emoji_usage) {
        prefilled.emoji_usage = linkedModel.emoji_usage as typeof prefilled.emoji_usage;
      }
      if (linkedModel.response_length) {
        prefilled.response_length = linkedModel.response_length as typeof prefilled.response_length;
      }

      // Background
      if (linkedModel.bio) {
        prefilled.occupation = linkedModel.bio.slice(0, 100);
      }
      if (linkedModel.backstory) {
        prefilled.backstory = linkedModel.backstory;
      }

      // Physical traits from JSONB
      const traits = linkedModel.physical_traits;
      if (traits) {
        if (traits.hair_color) {
          prefilled.hair_color = traits.hair_color;
        }
        if (traits.eye_color) {
          prefilled.eye_color = traits.eye_color;
        }
        if (traits.body_type) {
          // Map body type values to wizard options
          const bodyTypeMap: Record<string, typeof prefilled.body_type> = {
            'petite': 'petite',
            'slim': 'slim',
            'athletic': 'athletic',
            'curvy': 'curvy',
            'tall': 'tall',
          };
          prefilled.body_type = bodyTypeMap[traits.body_type.toLowerCase()] || 'slim';
        }
        if (traits.height) {
          // Parse height string like "5'1" to cm
          const heightMatch = traits.height.match(/(\d+)'(\d+)/);
          if (heightMatch) {
            const feet = parseInt(heightMatch[1]);
            const inches = parseInt(heightMatch[2]);
            prefilled.height_cm = Math.round((feet * 30.48) + (inches * 2.54));
          }
        }
        if (traits.style) {
          // Add style to style_vibes
          prefilled.style_vibes = [traits.style];
        }
        if (traits.ethnicity) {
          // Map ethnicity to skin tone
          const skinToneMap: Record<string, typeof prefilled.skin_tone> = {
            'caucasian': 'fair',
            'white': 'fair',
            'latina': 'olive',
            'hispanic': 'olive',
            'mediterranean': 'olive',
            'asian': 'fair',
            'middle eastern': 'tan',
            'black': 'deep',
            'african': 'deep',
          };
          prefilled.skin_tone = skinToneMap[traits.ethnicity.toLowerCase()] || 'olive';
        }
      }
    }

    return prefilled;
  };

  const [personality, setPersonality] = useState<AIPersonalityFull>(getInitialPersonality);
  const [isSaving, setIsSaving] = useState(false);

  // Update personality when linkedModel data arrives (async timing fix)
  useEffect(() => {
    if (linkedModel && !existingPersonality && !personality.persona_name) {
      const traits = linkedModel.physical_traits;

      // Parse height from string like "5'1"
      let heightCm: number | null = null;
      if (traits?.height) {
        const heightMatch = traits.height.match(/(\d+)'(\d+)/);
        if (heightMatch) {
          const feet = parseInt(heightMatch[1]);
          const inches = parseInt(heightMatch[2]);
          heightCm = Math.round((feet * 30.48) + (inches * 2.54));
        }
      }

      // Map body type
      const bodyTypeMap: Record<string, AIPersonalityFull['body_type']> = {
        'petite': 'petite', 'slim': 'slim', 'athletic': 'athletic', 'curvy': 'curvy', 'tall': 'tall',
      };

      // Map skin tone from ethnicity
      const skinToneMap: Record<string, AIPersonalityFull['skin_tone']> = {
        'caucasian': 'fair', 'white': 'fair', 'latina': 'olive', 'hispanic': 'olive',
        'mediterranean': 'olive', 'asian': 'fair', 'middle eastern': 'tan', 'black': 'deep', 'african': 'deep',
      };

      setPersonality(prev => ({
        ...prev,
        persona_name: linkedModel.name || prev.persona_name,
        age: linkedModel.age || prev.age,
        personality_traits: linkedModel.personality_traits?.length
          ? linkedModel.personality_traits.map(t => t.toLowerCase()).slice(0, 5)
          : prev.personality_traits,
        interests: linkedModel.interests?.length ? linkedModel.interests : prev.interests,
        turn_ons: linkedModel.turn_ons?.length ? linkedModel.turn_ons : prev.turn_ons,
        emoji_usage: (linkedModel.emoji_usage as typeof prev.emoji_usage) || prev.emoji_usage,
        response_length: (linkedModel.response_length as typeof prev.response_length) || prev.response_length,
        occupation: linkedModel.bio ? linkedModel.bio.slice(0, 100) : prev.occupation,
        backstory: linkedModel.backstory || prev.backstory,
        hair_color: traits?.hair_color || prev.hair_color,
        eye_color: traits?.eye_color || prev.eye_color,
        body_type: traits?.body_type ? (bodyTypeMap[traits.body_type.toLowerCase()] || prev.body_type) : prev.body_type,
        height_cm: heightCm ?? prev.height_cm,
        style_vibes: traits?.style ? [traits.style] : prev.style_vibes,
        skin_tone: traits?.ethnicity ? (skinToneMap[traits.ethnicity.toLowerCase()] || prev.skin_tone) : prev.skin_tone,
      }));
    }
  }, [linkedModel, existingPersonality]);

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
      // Include model_id if linked to a model
      const payload = {
        ...personality,
        model_id: modelId || linkedModel?.id || null,
      };

      const response = await fetch('/api/creator/ai-personality', {
        method: existingPersonality ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

          {/* Linked Model Indicator */}
          {linkedModel && (
            <div className="mt-4 flex items-center gap-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              {linkedModel.avatar_url && (
                <img
                  src={linkedModel.avatar_url}
                  alt={linkedModel.name}
                  className="w-10 h-10 rounded-lg object-cover"
                />
              )}
              <div>
                <p className="text-sm text-purple-300">Linked to model:</p>
                <p className="font-medium text-purple-400">{linkedModel.name}</p>
              </div>
            </div>
          )}
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

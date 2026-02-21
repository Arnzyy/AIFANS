// ===========================================
// VOICE MODULE EXPORTS
// ===========================================

// Types
export * from './types';

// Voice Library Service
export {
  getAvailableVoices,
  getVoiceById,
  getVoiceByProviderId,
  generateVoicePreview,
  addVoice,
  updateVoice,
  deactivateVoice,
  clearVoiceCache,
  getAvailableAccents,
  groupVoicesByGender,
} from './voice-library-service';

// Voice Settings Service
export {
  getVoiceSettings,
  getVoiceSettingsWithVoice,
  getCreatorVoiceSettings,
  saveVoiceSettings,
  setVoiceEnabled,
  setRealtimeEnabled,
  deleteVoiceSettings,
  isVoiceEnabled,
  isRealtimeEnabled,
  getElevenLabsVoiceId,
  getVoiceParameters,
  validateVoiceSettingsInput,
} from './voice-settings-service';

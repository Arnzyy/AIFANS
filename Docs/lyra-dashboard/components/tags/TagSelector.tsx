'use client';

import { useState, useEffect, useMemo } from 'react';
import { Check, X, AlertTriangle, Search, Sparkles, Info } from 'lucide-react';
import { Tag, TagSelection, MAX_SECONDARY_TAGS, filterTagsForMode } from '@/lib/tags/types';

// ===========================================
// TAG SELECTOR COMPONENT
// For creators to select tags during model creation
// ===========================================

interface TagSelectorProps {
  isNsfw: boolean;
  initialPrimaryTagId?: string;
  initialSecondaryTagIds?: string[];
  maxSecondaryTags?: number;
  onChange: (selection: TagSelection | null) => void;
  disabled?: boolean;
  error?: string;
}

export function TagSelector({
  isNsfw,
  initialPrimaryTagId,
  initialSecondaryTagIds = [],
  maxSecondaryTags = MAX_SECONDARY_TAGS,
  onChange,
  disabled = false,
  error,
}: TagSelectorProps) {
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedPrimary, setSelectedPrimary] = useState<string | null>(initialPrimaryTagId || null);
  const [selectedSecondary, setSelectedSecondary] = useState<string[]>(initialSecondaryTagIds);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedSection, setExpandedSection] = useState<'primary' | 'secondary'>('primary');

  // Fetch tags on mount and when NSFW mode changes
  useEffect(() => {
    fetchTags();
  }, [isNsfw]);

  // Reset selection if NSFW mode changes and current selection is invalid
  useEffect(() => {
    if (selectedPrimary) {
      const primaryTag = allTags.find((t) => t.id === selectedPrimary);
      if (primaryTag?.nsfw_only && !isNsfw) {
        setSelectedPrimary(null);
      }
    }
    
    // Filter out NSFW-only secondary tags if switching to SFW
    if (!isNsfw) {
      const validSecondary = selectedSecondary.filter((id) => {
        const tag = allTags.find((t) => t.id === id);
        return tag && !tag.nsfw_only;
      });
      if (validSecondary.length !== selectedSecondary.length) {
        setSelectedSecondary(validSecondary);
      }
    }
  }, [isNsfw, allTags]);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tags?nsfw=${isNsfw}`);
      const data = await response.json();
      setAllTags(data.tags || []);
    } catch (err) {
      console.error('Failed to fetch tags:', err);
    } finally {
      setLoading(false);
    }
  };

  // Split tags by type
  const { primaryCategories, secondaryTags } = useMemo(() => {
    const filtered = filterTagsForMode(allTags, isNsfw);
    return {
      primaryCategories: filtered.filter((t) => t.type === 'PRIMARY').sort((a, b) => a.sort_order - b.sort_order),
      secondaryTags: filtered.filter((t) => t.type === 'SECONDARY'),
    };
  }, [allTags, isNsfw]);

  // Filter secondary tags by search
  const filteredSecondaryTags = useMemo(() => {
    if (!searchTerm) return secondaryTags;
    const term = searchTerm.toLowerCase();
    return secondaryTags.filter(
      (tag) =>
        tag.name.toLowerCase().includes(term) ||
        tag.description?.toLowerCase().includes(term)
    );
  }, [secondaryTags, searchTerm]);

  // Handle primary selection
  const handlePrimarySelect = (tagId: string) => {
    if (disabled) return;
    const newPrimary = selectedPrimary === tagId ? null : tagId;
    setSelectedPrimary(newPrimary);
    
    // Move to secondary section after selecting primary
    if (newPrimary) {
      setExpandedSection('secondary');
    }
    
    emitChange(newPrimary, selectedSecondary);
  };

  // Handle secondary toggle
  const handleSecondaryToggle = (tagId: string) => {
    if (disabled) return;
    
    let newSelection: string[];
    if (selectedSecondary.includes(tagId)) {
      newSelection = selectedSecondary.filter((id) => id !== tagId);
    } else {
      if (selectedSecondary.length >= maxSecondaryTags) {
        return; // Max reached
      }
      newSelection = [...selectedSecondary, tagId];
    }
    
    setSelectedSecondary(newSelection);
    emitChange(selectedPrimary, newSelection);
  };

  // Emit changes to parent
  const emitChange = (primary: string | null, secondary: string[]) => {
    if (!primary) {
      onChange(null);
    } else {
      onChange({
        primary_tag_id: primary,
        secondary_tag_ids: secondary,
      });
    }
  };

  // Get selected primary tag object
  const selectedPrimaryTag = primaryCategories.find((t) => t.id === selectedPrimary);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-32 bg-zinc-800 rounded-xl" />
        <div className="h-48 bg-zinc-800 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Primary Category Selection */}
      <div className="bg-zinc-900 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setExpandedSection(expandedSection === 'primary' ? 'secondary' : 'primary')}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition"
        >
          <div className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
              selectedPrimary ? 'bg-green-500' : 'bg-zinc-700'
            }`}>
              {selectedPrimary ? <Check className="w-4 h-4" /> : '1'}
            </div>
            <div className="text-left">
              <p className="font-medium">Primary Category</p>
              {selectedPrimaryTag ? (
                <p className="text-sm text-purple-400">
                  {selectedPrimaryTag.emoji} {selectedPrimaryTag.name}
                </p>
              ) : (
                <p className="text-sm text-gray-500">Select main category</p>
              )}
            </div>
          </div>
          <span className="text-red-400 text-sm">Required</span>
        </button>

        {expandedSection === 'primary' && (
          <div className="p-4 pt-0 border-t border-white/10">
            <p className="text-xs text-gray-400 mb-3">
              Choose the category that best describes your model's aesthetic and style
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
              {primaryCategories.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handlePrimarySelect(tag.id)}
                  disabled={disabled}
                  className={`relative p-3 rounded-xl border-2 transition-all text-left ${
                    selectedPrimary === tag.id
                      ? 'border-purple-500 bg-purple-500/20 scale-105'
                      : 'border-white/10 bg-zinc-800 hover:border-white/20 hover:scale-[1.02]'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {tag.nsfw_only && (
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.5 text-[9px] font-bold bg-pink-500 text-white rounded-full">
                      18+
                    </span>
                  )}
                  <div className="text-2xl mb-1">{tag.emoji}</div>
                  <p className="font-medium text-sm">{tag.name}</p>
                  {tag.description && (
                    <p className="text-[10px] text-gray-500 line-clamp-1 mt-0.5">
                      {tag.description}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Secondary Tags Selection */}
      <div className="bg-zinc-900 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() => setExpandedSection(expandedSection === 'secondary' ? 'primary' : 'secondary')}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition"
        >
          <div className="flex items-center gap-3">
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-sm ${
              selectedSecondary.length > 0 ? 'bg-green-500' : 'bg-zinc-700'
            }`}>
              {selectedSecondary.length > 0 ? <Check className="w-4 h-4" /> : '2'}
            </div>
            <div className="text-left">
              <p className="font-medium">Additional Tags</p>
              <p className="text-sm text-gray-500">
                {selectedSecondary.length} of {maxSecondaryTags} selected
              </p>
            </div>
          </div>
          <span className="text-gray-500 text-sm">Optional</span>
        </button>

        {expandedSection === 'secondary' && (
          <div className="p-4 pt-0 border-t border-white/10">
            <p className="text-xs text-gray-400 mb-3">
              Add personality traits, interests, and style tags to help users discover your model
            </p>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                placeholder="Search tags..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-800 border border-white/10 rounded-lg focus:outline-none focus:border-purple-500"
              />
            </div>

            {/* Selected Tags */}
            {selectedSecondary.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3 p-3 bg-purple-500/10 rounded-lg border border-purple-500/20">
                {selectedSecondary.map((tagId) => {
                  const tag = secondaryTags.find((t) => t.id === tagId);
                  if (!tag) return null;
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleSecondaryToggle(tag.id)}
                      disabled={disabled}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-purple-500/20 border border-purple-500/30 rounded-full text-sm hover:bg-purple-500/30 transition"
                    >
                      {tag.emoji && <span>{tag.emoji}</span>}
                      <span>{tag.name}</span>
                      <X className="w-3 h-3 ml-1" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Limit Warning */}
            {selectedSecondary.length >= maxSecondaryTags && (
              <div className="flex items-center gap-2 mb-3 text-xs text-yellow-400">
                <Info className="w-4 h-4" />
                Maximum {maxSecondaryTags} tags reached. Remove a tag to add more.
              </div>
            )}

            {/* Available Tags */}
            <div className="flex flex-wrap gap-2 max-h-60 overflow-y-auto p-3 bg-zinc-800/50 rounded-lg">
              {filteredSecondaryTags.length === 0 ? (
                <p className="text-gray-500 text-sm">No tags found matching "{searchTerm}"</p>
              ) : (
                filteredSecondaryTags.map((tag) => {
                  const isSelected = selectedSecondary.includes(tag.id);
                  const isDisabled =
                    disabled ||
                    (!isSelected && selectedSecondary.length >= maxSecondaryTags);

                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleSecondaryToggle(tag.id)}
                      disabled={isDisabled}
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm transition ${
                        isSelected
                          ? 'bg-purple-500 text-white'
                          : isDisabled
                          ? 'bg-zinc-800 text-gray-600 cursor-not-allowed'
                          : 'bg-zinc-700 hover:bg-zinc-600'
                      }`}
                    >
                      {tag.emoji && <span>{tag.emoji}</span>}
                      <span>{tag.name}</span>
                      {isSelected && <Check className="w-3 h-3 ml-1" />}
                      {tag.nsfw_only && !isSelected && (
                        <span className="text-[10px] text-pink-400 ml-1">18+</span>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Summary */}
      {selectedPrimary && (
        <div className="p-4 bg-zinc-800 rounded-xl">
          <h4 className="text-sm font-medium mb-2">Selection Summary</h4>
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-purple-500/20 border border-purple-500 rounded-full text-sm">
              {selectedPrimaryTag?.emoji} {selectedPrimaryTag?.name}
            </span>
            {selectedSecondary.map((tagId) => {
              const tag = secondaryTags.find((t) => t.id === tagId);
              if (!tag) return null;
              return (
                <span
                  key={tag.id}
                  className="px-3 py-1 bg-zinc-700 rounded-full text-sm"
                >
                  {tag.emoji} {tag.name}
                </span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ===========================================
// TAG DISPLAY COMPONENT
// For showing tags on model cards/profiles
// ===========================================

interface TagDisplayProps {
  primaryTag?: Tag;
  secondaryTags?: Tag[];
  showAll?: boolean;
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function TagDisplay({
  primaryTag,
  secondaryTags = [],
  showAll = false,
  maxVisible = 3,
  size = 'md',
}: TagDisplayProps) {
  const visibleTags = showAll ? secondaryTags : secondaryTags.slice(0, maxVisible);
  const hiddenCount = showAll ? 0 : Math.max(0, secondaryTags.length - maxVisible);

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {/* Primary Tag (highlighted) */}
      {primaryTag && (
        <span
          className={`inline-flex items-center gap-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-full ${sizeClasses[size]}`}
        >
          {primaryTag.emoji && <span>{primaryTag.emoji}</span>}
          {primaryTag.name}
        </span>
      )}

      {/* Secondary Tags */}
      {visibleTags.map((tag) => (
        <span
          key={tag.id}
          className={`inline-flex items-center gap-1 bg-zinc-800 text-gray-300 rounded-full ${sizeClasses[size]}`}
        >
          {tag.emoji && <span>{tag.emoji}</span>}
          {tag.name}
        </span>
      ))}

      {/* Hidden count */}
      {hiddenCount > 0 && (
        <span
          className={`inline-flex items-center bg-zinc-700 text-gray-400 rounded-full ${sizeClasses[size]}`}
        >
          +{hiddenCount}
        </span>
      )}
    </div>
  );
}

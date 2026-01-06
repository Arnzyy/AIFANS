'use client';

import { ContentLibrary } from '@/components/creators/ContentLibrary';
import { useEffect, useState } from 'react';

export default function ContentPage() {
  const [modelId, setModelId] = useState<string | null>(null);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [models, setModels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/creator/models');
      const data = await response.json();
      
      if (data.models && data.models.length > 0) {
        setModels(data.models);
        setModelId(data.models[0].id);
        setCreatorId(data.models[0].creator_id);
      }
    } catch (err) {
      console.error('Failed to fetch models');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!modelId || !creatorId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400">No models found. Create a model first to upload content.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Model Selector */}
      {models.length > 1 && (
        <div className="mb-6">
          <label className="block text-sm font-medium mb-2">Select Model</label>
          <select
            value={modelId}
            onChange={(e) => {
              const model = models.find((m) => m.id === e.target.value);
              setModelId(model.id);
              setCreatorId(model.creator_id);
            }}
            className="px-4 py-2 bg-zinc-800 border border-white/10 rounded-lg"
          >
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.display_name}
              </option>
            ))}
          </select>
        </div>
      )}

      <ContentLibrary modelId={modelId} creatorId={creatorId} />
    </div>
  );
}

'use client';

import { PPVManager } from '@/components/creators/PPVManager';
import { useEffect, useState } from 'react';

export default function PPVPage() {
  const [modelId, setModelId] = useState<string | null>(null);
  const [creatorId, setCreatorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch creator's first model for now
    // In production, let user select which model
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const response = await fetch('/api/creator/models');
      const data = await response.json();
      
      if (data.models && data.models.length > 0) {
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
        <p className="text-gray-400">No models found. Create a model first to manage PPV content.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <PPVManager modelId={modelId} creatorId={creatorId} />
    </div>
  );
}

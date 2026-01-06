import { ModelCreationWizard } from '@/components/creators';

export default function NewModelPage() {
  return (
    <div className="py-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Create New Model</h1>
        <p className="text-gray-400">Set up your AI persona in a few steps</p>
      </div>
      
      <ModelCreationWizard />
    </div>
  );
}

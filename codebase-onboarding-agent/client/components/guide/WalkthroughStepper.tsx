'use client';

import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, FileText, Loader2, AlertCircle, Eye, Lightbulb } from 'lucide-react';
import { WalkthroughStep } from '@/types/graph';

interface WalkthroughStepperProps {
  owner: string;
  repoName: string;
  onFileSelect?: (path: string) => void;
}

export default function WalkthroughStepper({ owner, repoName, onFileSelect }: WalkthroughStepperProps) {
  const apiBase = process.env.NEXT_PUBLIC_API_URL;

  const [steps, setSteps] = useState<WalkthroughStep[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchWalkthrough = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`${apiBase}/api/graph/${owner}/${repoName}/walkthrough`);
        const data = await res.json() as { steps?: WalkthroughStep[]; error?: string };
        if (!res.ok) throw new Error(data.error || 'Failed to generate walkthrough');
        setSteps(data.steps ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    };

    fetchWalkthrough();
  }, [apiBase, owner, repoName]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
        <Loader2 size={28} className="animate-spin text-blue-500" />
        <p className="text-sm">Building your guided walkthrough...</p>
      </div>
    );
  }

  if (error || steps.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
        <AlertCircle size={28} />
        <p className="text-sm">{error || 'No walkthrough available'}</p>
      </div>
    );
  }

  const step = steps[currentIndex];
  const isFirst = currentIndex === 0;
  const isLast = currentIndex === steps.length - 1;

  return (
    <div className="flex flex-col h-full p-6 gap-6">
      <div className="flex items-center gap-2 justify-center">
        {steps.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrentIndex(i)}
            className={`h-1.5 rounded-full transition-all duration-300
                        ${i === currentIndex ? 'w-8 bg-blue-500' : 'w-1.5 bg-gray-700 hover:bg-gray-600'}`}
            aria-label={`Go to step ${i + 1}`}
          />
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center gap-5 max-w-lg mx-auto text-center">
        <span className="text-xs font-medium text-blue-400 uppercase tracking-wider">
          Step {step.stepNumber} of {steps.length}
        </span>

        <h2 className="text-xl font-semibold text-white">{step.title}</h2>

        <button
          onClick={() => onFileSelect?.(step.filePath)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700
                     rounded-lg text-sm text-blue-300 font-mono transition-colors"
        >
          <FileText size={14} />
          {step.filePath}
        </button>

        <div className="flex flex-col gap-4 w-full text-left">
          <div className="bg-gray-800/50 rounded-xl p-4 flex gap-3">
            <Eye size={18} className="text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                What to look for
              </p>
              <p className="text-sm text-gray-200 leading-relaxed">{step.whatToLookFor}</p>
            </div>
          </div>

          <div className="bg-gray-800/50 rounded-xl p-4 flex gap-3">
            <Lightbulb size={18} className="text-yellow-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
                Why it matters
              </p>
              <p className="text-sm text-gray-200 leading-relaxed">{step.whyItMatters}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between shrink-0">
        <button
          onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
          disabled={isFirst}
          className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-400
                     hover:text-white disabled:opacity-30 disabled:cursor-not-allowed
                     transition-colors"
        >
          <ChevronLeft size={16} /> Previous
        </button>

        <button
          onClick={() => onFileSelect?.(step.filePath)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm
                     text-white font-medium transition-colors"
        >
          Open this file
        </button>

        <button
          onClick={() => setCurrentIndex(i => Math.min(steps.length - 1, i + 1))}
          disabled={isLast}
          className="flex items-center gap-1.5 px-4 py-2 text-sm text-gray-400
                     hover:text-white disabled:opacity-30 disabled:cursor-not-allowed
                     transition-colors"
        >
          Next <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
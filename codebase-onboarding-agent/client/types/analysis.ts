export interface ArchitectureAnalysis {
  summary: string;
  techStack: Array<{
    name: string;
    role: string;
    category: 'frontend' | 'backend' | 'database' | 'devtools' | 'testing' | 'other';
  }>;
  architecturePattern: {
    name: string;
    description: string;
  };
  entryPoints: Array<{ path: string; description: string }>;
  keyDirectories: Array<{ path: string; purpose: string }>;
  dataFlow: string;
  gotchas: string[];
  setupSteps: string[];
  firstFilesToRead: Array<{ path: string; reason: string }>;
}
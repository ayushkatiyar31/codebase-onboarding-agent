export interface DependencyEdge {
  source: string;
  target: string;
  importedNames: string[];
}

export interface GraphStats {
  entryPoints: string[];
  mostImported: Array<{ filePath: string; importedByCount: number }>;
  leafNodes: string[];
}

export interface WalkthroughStep {
  stepNumber: number;
  filePath: string;
  title: string;
  whatToLookFor: string;
  whyItMatters: string;
}
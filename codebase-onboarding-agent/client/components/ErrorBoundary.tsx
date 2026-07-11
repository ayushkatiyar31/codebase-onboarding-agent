'use client';
import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
interface Props {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}
interface State {
    hasError: boolean;
    error: Error | null;
}
export class ErrorBoundary extends React.Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }
    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error('ErrorBoundary caught:', error, info.componentStack);
    }
    render() {
        if (this.state.hasError) {
            if (this.props.fallback)
                return this.props.fallback;
            return (<div className="flex flex-col items-center justify-center h-full gap-4 p-8">
          <AlertCircle size={32} className="text-red-400"/>
          <div className="text-center">
            <p className="text-white font-medium mb-1">Something went wrong</p>
            <p className="text-sm text-gray-500 mb-4 max-w-sm">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button onClick={() => this.setState({ hasError: false, error: null })} className="flex items-center gap-2 mx-auto px-4 py-2 bg-gray-800
                         hover:bg-gray-700 rounded-lg text-sm transition-colors">
              <RefreshCw size={14}/> Try again
            </button>
          </div>
        </div>);
        }
        return this.props.children;
    }
}

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RefreshCw, AlertTriangle, Smartphone, Monitor } from 'lucide-react';
import { getStorageInfo } from '@/lib/storage-utils';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  showDetails?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isMobile: boolean;
  storageInfo: any;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isMobile: false,
      storageInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error Boundary caught an error:', error, errorInfo);
    
    // Detect mobile environment and storage info
    const isMobile = typeof window !== 'undefined' && 
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    const storageInfo = getStorageInfo();
    
    this.setState({
      error,
      errorInfo,
      isMobile,
      storageInfo
    });

    // Log error details for debugging
    this.logErrorDetails(error, errorInfo, isMobile, storageInfo);
  }

  private logErrorDetails(error: Error, errorInfo: ErrorInfo, isMobile: boolean, storageInfo: any) {
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      isMobile,
      storageInfo,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
      timestamp: new Date().toISOString()
    };

    console.error('Detailed Error Report:', errorDetails);
    
    // You could send this to an error reporting service here
    // Example: sendErrorReport(errorDetails);
  }

  private handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  private handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };



  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, isMobile, storageInfo } = this.state;

      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="w-full max-w-2xl">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-6 w-6 text-destructive" />
                <CardTitle>Something went wrong</CardTitle>
              </div>
              <CardDescription>
                An unexpected error occurred while loading the application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">


              {/* Storage info alert */}
              {storageInfo && !storageInfo.available && (
                <Alert variant="destructive">
                  <Monitor className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Storage Issue:</strong> Browser storage is not available. 
                    This may be due to private browsing mode or browser restrictions.
                  </AlertDescription>
                </Alert>
              )}

              {/* Error details (only in development or if showDetails is true) */}
              {(this.props.showDetails || process.env.NODE_ENV === 'development') && error && (
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Error Details:</h4>
                  <div className="bg-muted p-3 rounded-md text-sm font-mono overflow-auto max-h-40">
                    <div className="text-destructive font-semibold">{error.message}</div>
                    {error.stack && (
                      <pre className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">
                        {error.stack}
                      </pre>
                    )}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button onClick={this.handleRetry} className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
                <Button onClick={this.handleReload} variant="outline" className="flex-1">
                  Reload Page
                </Button>
              </div>

              {/* Additional help text */}
              <div className="text-sm text-muted-foreground space-y-1">
                <p>If this problem persists:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Try clearing your browser cache and cookies</li>
                  <li>Check your internet connection</li>
                  <li>Try using a different browser</li>
                  <li>Try refreshing the page</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
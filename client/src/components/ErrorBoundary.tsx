import React, { Component, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RotateCcw, Home, Mail, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackComponent?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Log error to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // Add your error reporting service here
      console.error('Production error logged:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
      });
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleStartOver = () => {
    // Clear any stored state and go to home
    localStorage.removeItem('flow_state');
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallbackComponent) {
        return this.props.fallbackComponent;
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-2xl bg-white shadow-lg border-red-200">
            <CardHeader className="text-center border-b border-red-100 bg-red-50">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center">
                  <AlertTriangle className="text-white text-2xl" />
                </div>
              </div>
              <CardTitle className="text-2xl text-red-700">
                Oops! Something went wrong
              </CardTitle>
              <p className="text-red-600 mt-2">
                We encountered an unexpected error while processing your request.
              </p>
            </CardHeader>
            
            <CardContent className="p-8">
              <div className="space-y-6">
                {/* Error Details (for development) */}
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <div className="bg-slate-100 border border-slate-200 rounded-lg p-4">
                    <h4 className="font-semibold text-slate-800 mb-2">Error Details:</h4>
                    <p className="text-sm text-slate-700 font-mono mb-2">
                      {this.state.error.message}
                    </p>
                    {this.state.error.stack && (
                      <details className="mt-2">
                        <summary className="text-sm text-slate-600 cursor-pointer hover:text-slate-800">
                          Stack Trace
                        </summary>
                        <pre className="text-xs text-slate-600 mt-2 overflow-auto">
                          {this.state.error.stack}
                        </pre>
                      </details>
                    )}
                  </div>
                )}

                {/* User-Friendly Explanation */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                  <h4 className="font-semibold text-blue-800 mb-3">What happened?</h4>
                  <p className="text-blue-700 mb-4">
                    The application encountered an unexpected error that prevented it from continuing normally. 
                    This is likely a temporary issue that can be resolved by trying again.
                  </p>
                  
                  <h4 className="font-semibold text-blue-800 mb-3">What can you do?</h4>
                  <ul className="text-blue-700 space-y-2 text-sm">
                    <li>• Try refreshing the page to see if the issue resolves</li>
                    <li>• Start over with a fresh session</li>
                    <li>• Check your internet connection</li>
                    <li>• If the problem persists, please contact support with the time this occurred</li>
                  </ul>
                </div>

                {/* Recovery Actions */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    onClick={this.handleReset}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                    size="lg"
                  >
                    <RotateCcw className="mr-2 h-5 w-5" />
                    Try Again
                  </Button>
                  
                  <Button
                    onClick={this.handleReload}
                    variant="outline"
                    className="flex-1 border-slate-300 hover:bg-slate-50"
                    size="lg"
                  >
                    <RefreshCw className="mr-2 h-5 w-5" />
                    Reload Page
                  </Button>
                  
                  <Button
                    onClick={this.handleStartOver}
                    variant="outline"
                    className="flex-1 border-green-300 text-green-700 hover:bg-green-50"
                    size="lg"
                  >
                    <Home className="mr-2 h-5 w-5" />
                    Start Over
                  </Button>
                </div>

                {/* Contact Support */}
                <div className="border-t pt-6 text-center">
                  <p className="text-slate-600 mb-4">
                    Still having trouble? We're here to help!
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => window.open('mailto:support@llmtxtmastery.com?subject=Application Error&body=I encountered an error at ' + new Date().toISOString(), '_blank')}
                    className="border-slate-300 hover:bg-slate-50"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Contact Support
                  </Button>
                </div>
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
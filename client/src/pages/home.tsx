import { useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, User, Settings, Coffee, HelpCircle } from "lucide-react";
import { AuthNav } from "@/components/AuthNav";
import UrlInput from "@/components/url-input";
import EmailCapture from "@/components/email-capture";
import ContentAnalysis from "@/components/content-analysis";
import ContentReview from "@/components/content-review";
import FileGeneration from "@/components/file-generation";
import TierLimitsDisplay from "@/components/tier-limits-display";
import UsageDisplay from "@/components/usage-display";
import { AuthModal } from "@/components/auth/AuthModal";
import { ProgressBreadcrumb, FLOW_STEPS } from "@/components/ui/progress-breadcrumb";
import { EnhancedLoading, LOADING_STATES } from "@/components/ui/enhanced-loading";
import { useFlowStateMachine } from "@/hooks/useFlowStateMachine";
import { DiscoveredPage } from "@shared/schema";
import { Link } from "wouter";
import ErrorBoundary from "@/components/ErrorBoundary";
import ErrorDisplay from "@/components/ErrorDisplay";
import ResetButton from "@/components/ResetButton";
import { QuickHelp } from "@/components/HelpSystem";

export default function Home() {
  // Import auth hook to get email recognition capability
  const { recognizeEmailUser } = useAuth();

  // Replace all complex state management with the state machine
  const {
    // State
    currentState,
    websiteUrl,
    userEmail,
    userTier,
    analysisId,
    discoveredPages,
    generatedFileId,
    user,
    authLoading,
    showAuthModal,
    progress,
    error,
    retryCount,
    
    // Computed properties
    effectiveEmail,
    effectiveTier,
    
    // Component visibility
    visibility,
    
    // Actions
    actions
  } = useFlowStateMachine();

  // Stable function reference to prevent infinite loops
  // Uses stable dispatch pattern to avoid dependency on actions object
  const handleAnalysisComplete = useCallback((id: number, pages: DiscoveredPage[]) => {
    console.log(`🎯 ANALYSIS_COMPLETE triggered: id=${id}, pagesCount=${pages.length}`);
    actions.completeAnalysis(id, pages);
  }, [actions.completeAnalysis]);

  const handleFileGenerated = useCallback((fileId: number) => {
    actions.generateFile(fileId);
  }, [actions.generateFile]);

  const resetWorkflow = () => {
    actions.resetWorkflow();
  };

  const handleViewAnalysisDetails = () => {
    actions.viewAnalysisDetails();
  };

  return (
    <ErrorBoundary onReset={resetWorkflow}>
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-mastery-blue rounded-lg flex items-center justify-center">
                  <Brain className="text-white text-lg" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-mastery-blue">LLM.txt Mastery</h1>
                  <p className="text-sm text-ai-silver">Expert-Crafted AI Content Accessibility</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                {/* Help & Reset Actions */}
                {(currentState !== 'URL_INPUT' && currentState !== 'INITIALIZING') && (
                  <div className="flex items-center space-x-2">
                    <QuickHelp context={
                      currentState === 'EMAIL_CAPTURE' ? 'email-capture' :
                      currentState === 'ANALYSIS' ? 'analysis' :
                      currentState === 'REVIEW' ? 'review' :
                      currentState === 'GENERATION' ? 'generation' :
                      currentState === 'ERROR' ? 'error' : 'url-input'
                    } />
                    <ResetButton
                      onReset={resetWorkflow}
                      variant="header"
                      showConfirmation={true}
                    />
                  </div>
                )}
                <AuthNav />
                <div className="text-right hidden md:block">
                  <p className="text-sm text-ai-silver">Created by AI Search Mastery</p>
                  <p className="text-xs text-ai-silver">MASTERY-AI Framework Developer</p>
                </div>
              </div>
            </div>
          </div>
        </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <section className="text-center mb-12">
          <h2 className="text-4xl font-bold text-framework-black mb-4">
            Transform Your Website's AI Accessibility
          </h2>
          <p className="text-lg text-ai-silver mb-6 max-w-2xl mx-auto">
            Apply the systematic precision of the MASTERY-AI Framework to create professional-grade 
            LLM.txt files that optimize your content for AI systems.
          </p>
          <div className="flex items-center justify-center space-x-2 text-sm text-ai-silver">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-innovation-teal rounded-full"></div>
              <span>Specification Compliant</span>
            </div>
            <span className="text-slate-300">•</span>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-innovation-teal rounded-full"></div>
              <span>Expert Methodology</span>
            </div>
            <span className="text-slate-300">•</span>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-innovation-teal rounded-full"></div>
              <span>Quality Assured</span>
            </div>
          </div>
        </section>

        {/* Welcome Back Message for Authenticated Users */}
        {user && (
          <section className="mb-8">
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
              <div className="flex items-center justify-center mb-2">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                  <User className="h-4 w-4 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-green-800">
                  Welcome back, {user.email.split('@')[0]}! 👋
                </h3>
              </div>
              <p className="text-green-600 mb-4">
                {user.tier === 'coffee' 
                  ? `Your Coffee tier is active! ${user.creditsRemaining > 0 
                      ? `${user.creditsRemaining} premium analyses remaining.` 
                      : 'Ready for unlimited premium analysis!'}`
                  : user.tier === 'starter'
                  ? 'Ready for your next analysis?'
                  : `Your ${user.tier} tier gives you unlimited access to premium features.`
                }
              </p>
              <div className="flex items-center justify-center space-x-4">
                <Link href="/dashboard">
                  <a>
                    <Button variant="outline" size="sm" className="text-green-700 border-green-300 hover:bg-green-100">
                      <Settings className="h-4 w-4 mr-2" />
                      Go to Dashboard
                    </Button>
                  </a>
                </Link>
                {user.tier === 'coffee' && (
                  <Button 
                    size="sm" 
                    className="bg-orange-600 hover:bg-orange-700"
                    onClick={() => {
                      console.log('☕ Coffee user starting new analysis - should bypass tier limits');
                      actions.resetWorkflow();
                    }}
                  >
                    <Coffee className="h-4 w-4 mr-2" />
                    Start New Analysis
                  </Button>
                )}
                {user.tier === 'starter' && (
                  <Button 
                    size="sm" 
                    className="bg-orange-600 hover:bg-orange-700"
                    onClick={() => actions.resetWorkflow()}
                  >
                    <Coffee className="h-4 w-4 mr-2" />
                    Upgrade to Coffee
                  </Button>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Progress Breadcrumb - Show when user has started the flow */}
        {currentState !== 'URL_INPUT' && currentState !== 'INITIALIZING' && (
          <ProgressBreadcrumb
            steps={FLOW_STEPS}
            currentStep={progress.currentStep}
            completedSteps={progress.completedSteps}
            className="mb-8"
          />
        )}

        {/* Progressive Steps */}
        <div className="space-y-8">
          {/* Error State Display */}
          {visibility.error && error && (
            <ErrorDisplay
              error={error}
              onRetry={() => actions.retryCurrentOperation()}
              onRecover={(targetState) => actions.recoverFromError(targetState)}
              onReset={resetWorkflow}
              retryCount={retryCount}
              maxRetries={3}
            />
          )}

          {/* Usage Display for logged in users */}
          {effectiveEmail && !visibility.error && (
            <UsageDisplay userEmail={effectiveEmail} />
          )}
          
          {/* Step 1: URL Input */}
          <UrlInput
            onAnalysisStart={(url) => {
              console.log('🌐 Analysis started for URL:', url);
              actions.submitUrl(url);
            }}
            isVisible={visibility.urlInput}
            prefilledUrl={websiteUrl}
          />

          {/* Loading state during auth check */}
          {visibility.authLoading && (
            <EnhancedLoading 
              state={LOADING_STATES.AUTH_CHECK}
            />
          )}

          {/* Step 2: Email Capture (only for non-authenticated users) */}
          {visibility.emailCapture && (
            <EmailCapture
              websiteUrl={websiteUrl}
              onEmailCaptured={async (email, tier) => {
                console.log(`📧 Email captured: ${email} with tier ${tier}`);
                
                // First, try to recognize if this is a returning user
                try {
                  const recognizedUser = await recognizeEmailUser(email);
                  if (recognizedUser) {
                    console.log(`🔍 Recognized returning user: ${email} with tier ${recognizedUser.tier}`);
                    actions.recognizeEmail(recognizedUser);
                    return;
                  }
                } catch (error) {
                  console.warn(`⚠️ Email recognition failed for ${email}:`, error);
                }
                
                // Fallback to normal email capture flow
                actions.captureEmail(email, tier);
              }}
              onLoginRequested={() => {
                actions.openAuthModal();
              }}
              onReset={resetWorkflow}
              prefilledEmail={user?.email || userEmail}
              isVisible={visibility.emailCapture}
            />
          )}

          {/* Step 3: Tier Limits Check */}
          {visibility.tierLimits && (
            <TierLimitsDisplay
              url={websiteUrl}
              email={effectiveEmail}
              onProceed={() => actions.proceedToAnalysis()}
              isVisible={visibility.tierLimits}
            />
          )}

          {/* Step 4: Content Analysis */}
          {visibility.analysis && (
            <ContentAnalysis
              websiteUrl={websiteUrl}
              userEmail={effectiveEmail}
              onAnalysisComplete={handleAnalysisComplete}
              onReset={resetWorkflow}
              useAI={effectiveTier !== 'starter'}
              onProgressUpdate={(stage, totalPages, processedPages) => {
                actions.updateAnalysisProgress(stage, totalPages, processedPages);
              }}
            />
          )}

          {/* Step 5: Content Review */}
          {visibility.review && (
            <ContentReview
              analysisId={analysisId!}
              discoveredPages={discoveredPages}
              onFileGenerated={handleFileGenerated}
              onStartOver={resetWorkflow}
            />
          )}

          {/* Step 6: File Generation */}
          {visibility.generation && (
            <FileGeneration
              fileId={generatedFileId!}
              analysisId={analysisId || undefined}
              onStartOver={resetWorkflow}
              onViewAnalysis={handleViewAnalysisDetails}
            />
          )}
        </div>

        {/* Implementation Guide */}
        <section className="mt-16">
          <Card className="bg-slate-50 border-slate-200">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold text-framework-black mb-4">
                Implementation Guide
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-framework-black mb-2">Installation</h4>
                  <ol className="text-sm text-ai-silver space-y-1">
                    <li>1. Download the generated llms.txt file</li>
                    <li>2. Upload to your website's root directory</li>
                    <li>3. Ensure the file is accessible at yourdomain.com/llms.txt</li>
                    <li>4. Test accessibility and validate format</li>
                  </ol>
                </div>
                <div>
                  <h4 className="font-medium text-framework-black mb-2">Best Practices</h4>
                  <ul className="text-sm text-ai-silver space-y-1">
                    <li>• Update regularly when adding new content</li>
                    <li>• Keep descriptions concise and accurate</li>
                    <li>• Include only high-quality, relevant pages</li>
                    <li>• Monitor AI system crawling behavior</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
        </main>

        {/* Footer */}
        <footer className="bg-framework-black text-white py-12 mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div>
                <h5 className="font-semibold mb-4">LLM.txt Mastery</h5>
                <p className="text-sm text-slate-300">
                  Expert-crafted AI content accessibility tools built by the creator of the MASTERY-AI Framework.
                </p>
              </div>
              <div>
                <h5 className="font-semibold mb-4">Resources</h5>
                <ul className="text-sm text-slate-300 space-y-2">
                  <li><a href="#" className="hover:text-innovation-teal transition-colors">Documentation</a></li>
                  <li><a href="#" className="hover:text-innovation-teal transition-colors">Best Practices</a></li>
                  <li><a href="#" className="hover:text-innovation-teal transition-colors">API Reference</a></li>
                  <li><a href="#" className="hover:text-innovation-teal transition-colors">Support</a></li>
                </ul>
              </div>
              <div>
                <h5 className="font-semibold mb-4">AI Search Mastery</h5>
                <ul className="text-sm text-slate-300 space-y-2">
                  <li><a href="#" className="hover:text-innovation-teal transition-colors">Main Website</a></li>
                  <li><a href="#" className="hover:text-innovation-teal transition-colors">MASTERY-AI Framework</a></li>
                  <li><a href="#" className="hover:text-innovation-teal transition-colors">Blog</a></li>
                  <li><a href="#" className="hover:text-innovation-teal transition-colors">Contact</a></li>
                </ul>
              </div>
            </div>
            <div className="border-t border-slate-700 mt-8 pt-8 text-center text-sm text-slate-400">
              <p>&copy; 2024 AI Search Mastery. All rights reserved. Built with systematic precision.</p>
            </div>
          </div>
        </footer>

        {/* Authentication Modal */}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => actions.closeAuthModal()}
          defaultMode="login"
        />
      </div>
    </ErrorBoundary>
  );
}

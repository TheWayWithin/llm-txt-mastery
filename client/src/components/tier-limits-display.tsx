import { useState, useEffect } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, XCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface TierLimitsDisplayProps {
  url: string;
  email: string;
  onProceed: () => void;
  isVisible: boolean;
}

export default function TierLimitsDisplay({ url, email, onProceed, isVisible }: TierLimitsDisplayProps) {
  const [limitsData, setLimitsData] = useState<any>(null);

  const checkLimitsMutation = useMutation({
    mutationFn: async () => {
      console.log('🔍 TierLimitsDisplay: Checking limits for', { email, url });
      const response = await apiRequest("POST", "/api/check-limits", { email, url });
      return response.json();
    },
    onSuccess: (data) => {
      console.log('✅ TierLimitsDisplay: Limits check successful', data);
      setLimitsData(data);
      if (data.allowed) {
        // Coffee+ tier users proceed faster for premium experience
        if (data.tier === 'coffee') {
          console.log('☕ Coffee tier detected - proceeding with premium experience (250ms delay)');
          setTimeout(() => {
            onProceed();
          }, 250);
        } else if (data.tier === 'growth' || data.tier === 'scale') {
          console.log('🚀 Premium tier detected - proceeding quickly (500ms delay)');
          setTimeout(() => {
            onProceed();
          }, 500);
        } else {
          console.log('📊 Starter tier - showing limits info (2s delay)');
          setTimeout(() => {
            onProceed();
          }, 2000);
        }
      }
    },
    onError: (error) => {
      console.error('❌ TierLimitsDisplay: API call failed, auto-proceeding to prevent user getting stuck', error);
      // CRITICAL FIX: Auto-proceed after API failure to prevent blocking users
      setTimeout(() => {
        console.log('🚨 TierLimitsDisplay: Auto-proceeding after error (1s delay)');
        onProceed();
      }, 1000);
    },
  });

  useEffect(() => {
    if (isVisible && url && email) {
      console.log('🎯 TierLimitsDisplay: Starting limits check...');
      checkLimitsMutation.mutate();
      
      // CRITICAL FALLBACK: If component stays null for too long, auto-proceed
      const fallbackTimeout = setTimeout(() => {
        if (!limitsData && isVisible) {
          console.warn('🚨 TierLimitsDisplay: Fallback timeout triggered - auto-proceeding after 5s');
          onProceed();
        }
      }, 5000);
      
      return () => clearTimeout(fallbackTimeout);
    }
  }, [isVisible, url, email, limitsData]);

  // CRITICAL: Show loading state instead of null to avoid blocking users
  if (!isVisible) return null;
  
  if (!limitsData) {
    // Show minimal loading UI while API call is in progress
    return (
      <Alert className="border-blue-200">
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <div>
            <AlertTitle className="text-blue-900">Checking Usage Limits...</AlertTitle>
            <AlertDescription className="text-sm text-blue-700">
              Verifying your tier and daily usage limits
            </AlertDescription>
          </div>
        </div>
      </Alert>
    );
  }

  const { allowed, reason, pageCount, tier, limits, currentUsage, estimatedCost, suggestedUpgrade } = limitsData;

  return (
    <Alert className={allowed ? "border-green-200" : "border-red-200"}>
      <div className="flex items-start space-x-3">
        {allowed ? (
          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
        ) : (
          <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
        )}
        <div className="flex-1">
          <AlertTitle className={allowed ? "text-green-900" : "text-red-900"}>
            {allowed ? "🎯 Ready to Analyze" : "⏰ Daily Limit Reached"}
          </AlertTitle>
          <AlertDescription className="mt-2 space-y-2">
            {allowed ? (
              <>
                <p>Found {pageCount} pages to analyze.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex justify-between sm:block">
                    <span className="text-ai-silver">Your tier:</span>
                    <span className="ml-1 font-medium">{tier.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between sm:block">
                    <span className="text-ai-silver">Pages to analyze:</span>
                    <span className="ml-1 font-medium">{Math.min(pageCount, limits.maxPagesPerAnalysis)}</span>
                  </div>
                  <div className="flex justify-between sm:block">
                    <span className="text-ai-silver">Analyses today:</span>
                    <span className="ml-1 font-medium">{currentUsage.analysesToday} / {limits.dailyAnalyses}</span>
                  </div>
                  <div className="flex justify-between sm:block">
                    <span className="text-ai-silver">Est. cost:</span>
                    <span className="ml-1 font-medium">${estimatedCost.toFixed(3)}</span>
                  </div>
                </div>
                <p className="text-sm text-green-700 pt-1">
                  {tier === 'coffee' 
                    ? '☕ Premium AI analysis launching - your investment at work!' 
                    : tier === 'growth' || tier === 'scale'
                    ? '🚀 Unlimited power engaged - full speed ahead!'
                    : '✨ Free analysis starting - experience our quality!'}
                </p>
              </>
            ) : (
              <>
                <p>{reason}</p>
                <div className="text-sm space-y-1">
                  <p>
                    <span className="text-ai-silver">Current usage:</span>
                    <span className="ml-1">{currentUsage.analysesToday} analyses today</span>
                  </p>
                  <p>
                    <span className="text-ai-silver">Your limit:</span>
                    <span className="ml-1">{limits.dailyAnalyses} analyses per day</span>
                  </p>
                </div>
                {suggestedUpgrade && (
                  <div className="pt-2">
                    <Button 
                      size="default" 
                      variant="outline" 
                      className="text-mastery-blue border-mastery-blue min-h-[48px] px-6 py-3 w-full sm:w-auto"
                      onClick={async () => {
                        if (suggestedUpgrade === 'coffee') {
                          // Trigger coffee tier purchase via API
                          try {
                            const response = await apiRequest("POST", "/api/stripe/create-coffee-checkout", {
                              email,
                              websiteUrl: url
                            });
                            const data = await response.json();
                            if (data.url) {
                              window.location.href = data.url;
                            }
                          } catch (error) {
                            console.error('Coffee checkout error:', error);
                          }
                        } else {
                          // For growth/scale tiers, show subscription management
                          window.location.href = '/subscription';
                        }
                      }}
                    >
                      {suggestedUpgrade === 'coffee' ? '☕ Buy Me Coffee ($4.95)' : `🚀 Upgrade to ${suggestedUpgrade.charAt(0).toUpperCase() + suggestedUpgrade.slice(1)}`}
                    </Button>
                  </div>
                )}
              </>
            )}
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}
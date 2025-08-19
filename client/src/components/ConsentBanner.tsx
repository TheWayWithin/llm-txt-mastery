import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Settings, Shield, BarChart3 } from 'lucide-react';
import { 
  isConsentPending, 
  acceptAllCookies, 
  rejectOptionalCookies, 
  acceptAnalyticsOnly,
  type ConsentState 
} from '@/lib/consent';

interface ConsentBannerProps {
  onConsentChange?: (consent: ConsentState) => void;
}

export const ConsentBanner: React.FC<ConsentBannerProps> = ({ onConsentChange }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Show banner if consent is pending
    setIsVisible(isConsentPending());
  }, []);

  const handleAcceptAll = () => {
    const consent = acceptAllCookies();
    onConsentChange?.(consent);
    setIsVisible(false);
  };

  const handleRejectOptional = () => {
    const consent = rejectOptionalCookies();
    onConsentChange?.(consent);
    setIsVisible(false);
  };

  const handleAnalyticsOnly = () => {
    const consent = acceptAnalyticsOnly();
    onConsentChange?.(consent);
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-black/50 backdrop-blur-sm">
      <Card className="mx-auto max-w-4xl border-slate-200 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <Shield className="h-6 w-6 text-innovation-teal" />
            </div>
            
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-framework-black mb-2">
                Your Privacy Matters
              </h3>
              
              {!showDetails ? (
                <>
                  <p className="text-sm text-ai-silver mb-4">
                    We use cookies to improve your experience and analyze usage patterns. 
                    We respect your privacy and won't track you without permission.
                  </p>
                  
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={handleAcceptAll}
                      className="bg-innovation-teal hover:bg-innovation-teal/90 text-white"
                    >
                      Accept All
                    </Button>
                    
                    <Button
                      onClick={handleAnalyticsOnly}
                      variant="outline"
                      className="border-innovation-teal text-innovation-teal hover:bg-innovation-teal/10"
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Analytics Only
                    </Button>
                    
                    <Button
                      onClick={handleRejectOptional}
                      variant="outline"
                      className="text-gray-600 hover:bg-gray-100"
                    >
                      Essential Only
                    </Button>
                    
                    <Button
                      onClick={() => setShowDetails(!showDetails)}
                      variant="ghost"
                      size="sm"
                      className="text-gray-500"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Customize
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-4 mb-4">
                    <div className="p-3 bg-green-50 rounded-lg">
                      <h4 className="font-semibold text-green-800 mb-1">
                        🍪 Essential Cookies (Always Active)
                      </h4>
                      <p className="text-sm text-green-700">
                        Required for login, security, and basic site functionality. Cannot be disabled.
                      </p>
                    </div>
                    
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <h4 className="font-semibold text-blue-800 mb-1">
                        📊 Analytics Cookies (Recommended)
                      </h4>
                      <p className="text-sm text-blue-700">
                        Help us understand how you use our tool so we can improve it. 
                        No personal data shared with third parties.
                      </p>
                    </div>
                    
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <h4 className="font-semibold text-purple-800 mb-1">
                        🎯 Marketing Cookies (Optional)
                      </h4>
                      <p className="text-sm text-purple-700">
                        Used to show you relevant updates and improvements. 
                        You can always opt out later.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={handleAcceptAll}
                      className="bg-innovation-teal hover:bg-innovation-teal/90 text-white"
                    >
                      Accept All
                    </Button>
                    
                    <Button
                      onClick={handleAnalyticsOnly}
                      variant="outline"
                      className="border-innovation-teal text-innovation-teal hover:bg-innovation-teal/10"
                    >
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Analytics Only
                    </Button>
                    
                    <Button
                      onClick={handleRejectOptional}
                      variant="outline"
                      className="text-gray-600 hover:bg-gray-100"
                    >
                      Essential Only
                    </Button>
                    
                    <Button
                      onClick={() => setShowDetails(false)}
                      variant="ghost"
                      size="sm"
                      className="text-gray-500"
                    >
                      Back to Simple
                    </Button>
                  </div>
                </>
              )}
              
              <p className="text-xs text-gray-500 mt-3">
                Learn more in our{' '}
                <a href="/privacy" className="text-innovation-teal hover:underline">
                  Privacy Policy
                </a>
                {' '}and{' '}
                <a href="/terms" className="text-innovation-teal hover:underline">
                  Terms of Service
                </a>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
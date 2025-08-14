import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
// Input import removed - no longer using email input
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Mail, RotateCcw, Home, LogIn, UserPlus } from "lucide-react";
// Form-related imports removed - using direct tier selection now
// useToast import removed - no longer using toast notifications
import { QuickHelp } from "./HelpSystem";
import { useLocation } from "wouter";

interface EmailCaptureProps {
  websiteUrl?: string;
  onEmailCaptured: (email: string, tier: "starter" | "coffee" | "growth" | "scale") => void;
  onLoginRequested?: () => void;
  onReset?: () => void;
  isVisible: boolean;
}

// Quick Start schema removed - using direct tier selection now

export default function EmailCapture({ websiteUrl, onEmailCaptured, onLoginRequested, onReset, isVisible }: EmailCaptureProps) {
  // useToast hook removed - no longer using toast notifications
  const [selectedTier, setSelectedTier] = useState<"starter" | "coffee" | "growth" | "scale" | null>("coffee");
  const [lastError, setLastError] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  // Navigation functions
  const handleSignIn = () => {
    if (selectedTier) {
      setLocation(`/login?tier=${selectedTier}&website=${encodeURIComponent(websiteUrl || '')}`);
    }
  };

  const handleSignUp = () => {
    if (selectedTier) {
      setLocation(`/signup?tier=${selectedTier}&website=${encodeURIComponent(websiteUrl || '')}`);
    }
  };

  // Form logic removed - using direct tier selection now

  // Form update effects removed - using direct tier selection now

  // Mutation logic removed - using direct navigation to auth pages now

  // Error handling function removed - using direct navigation to auth pages now

  // onSubmit logic removed - using direct navigation to auth pages now

  if (!isVisible) return null;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center space-x-2">
          <Mail className="text-mastery-blue" />
          <span>Choose Your Analysis Type</span>
        </CardTitle>
        <p className="text-sm text-ai-silver">
          {websiteUrl ? (
            <>Generate professional LLM.txt files for <strong>{websiteUrl}</strong> in seconds</>
          ) : (
            <>Select your tier, enter your email, and we'll help you create a professional LLM.txt file</>
          )}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Error Display */}
        {lastError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-red-800 mb-2">
                  Unable to proceed
                </h4>
                <p className="text-sm text-red-700 mb-3">{lastError}</p>
                <div className="flex items-center space-x-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setLastError(null)}
                    className="border-red-300 text-red-700 hover:bg-red-100"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Try Again
                  </Button>
                  {onReset && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onReset}
                      className="border-green-300 text-green-700 hover:bg-green-100"
                    >
                      <Home className="h-4 w-4 mr-1" />
                      Start Over
                    </Button>
                  )}
                </div>
              </div>
              <div className="ml-4">
                <QuickHelp context="email-capture" />
              </div>
            </div>
          </div>
        )}

        {/* Tier Selection - Grid Layout */}
        <div className="space-y-4">
          <RadioGroup 
            value={selectedTier || ""} 
            onValueChange={(value: any) => setSelectedTier(value)}
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
          >
            {/* Starter Tier */}
            <div className="relative border rounded-lg hover:bg-slate-50 transition-colors p-4 cursor-pointer" onClick={() => setSelectedTier('starter')}>
              <RadioGroupItem value="starter" id="starter" className="absolute top-4 right-4" />
              <div className="pr-8">
                <Label htmlFor="starter" className="flex items-center space-x-2 cursor-pointer">
                  <img 
                    src="/images/tier-free.png" 
                    alt="Free Tier" 
                    className="w-6 h-6" 
                  />
                  <span className="font-medium text-lg">Test Drive</span>
                </Label>
                <p className="text-sm text-ai-silver mt-2">
                  • 3 analyses per day<br/>
                  • 20 pages with AI analysis<br/>
                  • Smart categorization<br/>
                  • Full feature preview
                </p>
              </div>
            </div>

            {/* Coffee Tier */}
            <div className="relative border-2 border-orange-400 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors p-4 cursor-pointer" onClick={() => setSelectedTier('coffee')}>
              <RadioGroupItem value="coffee" id="coffee" className="absolute top-4 right-4" />
              <div className="absolute -top-3 left-4 bg-orange-600 text-white text-xs px-2 py-1 rounded">MOST POPULAR</div>
              <div className="pr-8">
                <Label htmlFor="coffee" className="flex items-center space-x-2 cursor-pointer mt-2">
                  <img 
                    src="/images/tier-coffee.png" 
                    alt="Coffee Tier" 
                    className="w-6 h-6" 
                  />
                  <span className="font-medium text-lg">Solopreneur Special ($4.95)</span>
                </Label>
                <p className="text-sm text-orange-700 mt-2">
                  • Buy once, use forever<br/>
                  • Unlimited daily analyses<br/>
                  • 200 pages per analysis<br/>
                  • AI-enhanced quality
                </p>
              </div>
            </div>

            {/* Growth Tier */}
            <div className="relative border rounded-lg hover:bg-slate-50 transition-colors p-4 cursor-pointer" onClick={() => setSelectedTier('growth')}>
              <RadioGroupItem value="growth" id="growth" className="absolute top-4 right-4" />
              <div className="pr-8">
                <Label htmlFor="growth" className="flex items-center space-x-2 cursor-pointer">
                  <img 
                    src="/images/tier-growth.png" 
                    alt="Growth Tier" 
                    className="w-6 h-6" 
                  />
                  <span className="font-medium text-lg">Growing Business ($25/mo)</span>
                </Label>
                <p className="text-sm text-ai-silver mt-2">
                  • Unlimited analyses<br/>
                  • 1,000 pages per analysis<br/>
                  • Team collaboration<br/>
                  • Priority support
                </p>
              </div>
            </div>

            {/* Scale Tier */}
            <div className="relative border rounded-lg hover:bg-slate-50 transition-colors p-4 cursor-pointer" onClick={() => setSelectedTier('scale')}>
              <RadioGroupItem value="scale" id="scale" className="absolute top-4 right-4" />
              <div className="pr-8">
                <Label htmlFor="scale" className="flex items-center space-x-2 cursor-pointer">
                  <img 
                    src="/images/tier-scale.png" 
                    alt="Scale Tier" 
                    className="w-6 h-6" 
                  />
                  <span className="font-medium text-lg">Agency & API ($99/mo)</span>
                </Label>
                <p className="text-sm text-ai-silver mt-2">
                  • Full API access<br/>
                  • Unlimited everything<br/>
                  • White-label options<br/>
                  • Dedicated account
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Authentication Buttons - Show after tier selection */}
        {selectedTier && (
          <div className="space-y-6">
            {/* Help Section */}
            <div className="flex items-center justify-between border-t pt-4">
              <div className="text-sm text-slate-600">
                Need help choosing? <span className="font-medium">Coffee tier</span> is perfect for most users.
              </div>
              <QuickHelp context="email-capture" />
            </div>

            {/* Authentication Options */}
            <div className="space-y-4">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  Ready to get started?
                </h3>
                <p className="text-sm text-slate-600 mb-6">
                  Choose how you'd like to continue with your{" "}
                  <span className="font-medium capitalize">{selectedTier}</span> tier analysis.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Sign In Button */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSignIn}
                  className="min-h-[56px] px-6 py-4 flex items-center justify-center space-x-2 text-slate-700 border-slate-300 hover:bg-slate-50"
                  size="default"
                >
                  <LogIn className="w-5 h-5" />
                  <span>Sign In</span>
                </Button>

                {/* Sign Up Button */}
                <Button
                  type="button"
                  onClick={handleSignUp}
                  className={`min-h-[56px] px-6 py-4 flex items-center justify-center space-x-2 ${
                    selectedTier === 'coffee' 
                      ? "bg-orange-600 hover:bg-orange-700" 
                      : "bg-mastery-blue hover:bg-mastery-blue/90"
                  }`}
                  size="default"
                >
                  <UserPlus className="w-5 h-5" />
                  <span>Sign Up</span>
                </Button>
              </div>

              {/* Already have account notice */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <p className="text-sm text-blue-700 mb-2">
                  <strong>Returning user?</strong> Click "Sign In" above.
                </p>
                <p className="text-xs text-blue-600">
                  <strong>New to LLM.txt Mastery?</strong> Click "Sign Up" to create your account.
                </p>
              </div>

              {/* Tier benefits reminder */}
              <div className="text-center text-xs text-ai-silver border-t pt-4">
                {selectedTier === "starter" ? (
                  <span>✓ Instant access • No payment required</span>
                ) : selectedTier === "coffee" ? (
                  <span>✓ One-time payment • No subscription</span>
                ) : selectedTier === "growth" ? (
                  <span>✓ Professional features • Smart caching</span>
                ) : (
                  <span>✓ Enterprise features • Priority support</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Show tier selection prompt when no tier is selected */}
        {!selectedTier && (
          <div className="text-center py-8">
            <p className="text-slate-600 text-lg">
              Please select a tier above to continue
            </p>
            <p className="text-sm text-slate-500 mt-2">
              Choose the analysis type that best fits your needs
            </p>
          </div>
        )}

        {/* Trust Indicators */}
        <div className="border-t pt-4">
          <div className="flex items-center justify-center space-x-6 text-xs text-ai-silver">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Secure & Private</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>No Spam</span>
            </div>
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span>Expert Quality</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
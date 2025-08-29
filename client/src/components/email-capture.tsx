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
import { trackEvent } from "@/lib/analytics";

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

  const handleTierSelection = (tier: "starter" | "coffee" | "growth" | "scale") => {
    trackEvent('tier_selected', {
      tier_selected: tier,
      previous_tier: selectedTier,
      website_url: websiteUrl,
      event_category: 'engagement'
    });
    setSelectedTier(tier);
  };
  const [lastError, setLastError] = useState<string | null>(null);
  const [, setLocation] = useLocation();

  // Navigation functions
  const handleSignIn = () => {
    if (selectedTier) {
      trackEvent('login_click', {
        tier_selected: selectedTier,
        website_url: websiteUrl,
        event_category: 'auth'
      });
      setLocation(`/login?tier=${selectedTier}&website=${encodeURIComponent(websiteUrl || '')}`);
    }
  };

  const handleSignUp = () => {
    if (selectedTier) {
      trackEvent('signup_click', {
        tier_selected: selectedTier,
        website_url: websiteUrl,
        event_category: 'auth'
      });
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
            <>Generate professional llms.txt files for <strong>{websiteUrl}</strong> in seconds</>
          ) : (
            <>Select your tier, enter your email, and we'll help you create a professional llms.txt file</>
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
            onValueChange={(value: any) => handleTierSelection(value)}
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
          >
            {/* Starter Tier */}
            <div className="relative border-2 border-red-300 rounded-lg bg-red-50 hover:bg-red-100 transition-colors p-4 cursor-pointer" onClick={() => handleTierSelection('starter')}>
              <RadioGroupItem value="starter" id="starter" className="absolute top-4 right-4" />
              <div className="absolute -top-3 left-4 bg-red-600 text-white text-xs px-2 py-1 rounded">⚠️ SEVERELY LIMITED</div>
              <div className="pr-8">
                <Label htmlFor="starter" className="flex items-center space-x-2 cursor-pointer mt-2">
                  <img 
                    src="/images/tier-free.png" 
                    alt="Free Tier" 
                    className="w-6 h-6 opacity-60" 
                  />
                  <span className="font-medium text-lg text-red-700">Free (But Crippled)</span>
                </Label>
                <p className="text-sm text-red-600 mt-2">
                  ❌ Only 3 analyses per day (then locked out)<br/>
                  ❌ Severely limited to 20 pages only<br/>
                  ❌ No AI quality scoring (missing critical content)<br/>
                  ❌ Basic HTML extraction only<br/>
                  <span className="text-xs font-medium text-red-700 mt-1 block">
                    ⚠️ WARNING: AI sees only 20 pages - missing your pricing, features, case studies & what makes you unique!
                  </span>
                </p>
              </div>
            </div>

            {/* Coffee Tier */}
            <div className="relative border-4 border-green-500 rounded-lg bg-gradient-to-br from-green-50 to-orange-50 hover:from-green-100 hover:to-orange-100 transition-colors p-4 cursor-pointer shadow-lg" onClick={() => handleTierSelection('coffee')}>
              <RadioGroupItem value="coffee" id="coffee" className="absolute top-4 right-4" />
              <div className="absolute -top-3 left-4 bg-green-600 text-white text-xs px-3 py-1 rounded-full font-bold">🏆 CRUSH YOUR COMPETITION</div>
              <div className="pr-8">
                <Label htmlFor="coffee" className="flex items-center space-x-2 cursor-pointer mt-2">
                  <img 
                    src="/images/tier-coffee.png" 
                    alt="Coffee Tier" 
                    className="w-8 h-8" 
                  />
                  <span className="font-bold text-xl text-green-800">Coffee Power ($4.95/month)</span>
                </Label>
                <p className="text-sm font-medium text-green-700 mt-2">
                  ✅ Go from INVISIBLE to Gen AI → INDEXED & REFERENCED instantly<br/>
                  ✅ UNLIMITED daily analyses (destroy daily limits)<br/>
                  ✅ Keep your LLM.txt file CURRENT - update it as your site evolves<br/>
                  ✅ 200 pages per analysis (10x more than free)<br/>
                  ✅ AI-powered content scoring (find hidden gems)<br/>
                  ✅ Beat competitors who use broken tools<br/>
                  <span className="text-xs font-bold text-green-800 mt-2 block bg-green-100 p-2 rounded">
                    🚀 All guarantees included - see below for details
                  </span>
                </p>
              </div>
            </div>

            {/* Growth Tier */}
            <div className="relative border rounded-lg hover:bg-slate-50 transition-colors p-4 cursor-pointer" onClick={() => handleTierSelection('growth')}>
              <RadioGroupItem value="growth" id="growth" className="absolute top-4 right-4" />
              <div className="pr-8">
                <Label htmlFor="growth" className="flex items-center space-x-2 cursor-pointer">
                  <img 
                    src="/images/tier-growth.png" 
                    alt="Growth Tier" 
                    className="w-6 h-6" 
                  />
                  <span className="font-medium text-lg">Professional Power ($9.95/mo)</span>
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
            <div className="relative border rounded-lg hover:bg-slate-50 transition-colors p-4 cursor-pointer" onClick={() => handleTierSelection('scale')}>
              <RadioGroupItem value="scale" id="scale" className="absolute top-4 right-4" />
              <div className="pr-8">
                <Label htmlFor="scale" className="flex items-center space-x-2 cursor-pointer">
                  <img 
                    src="/images/tier-scale.png" 
                    alt="Scale Tier" 
                    className="w-6 h-6" 
                  />
                  <span className="font-medium text-lg">Agency & API ($19.95/mo)</span>
                </Label>
                <p className="text-sm text-ai-silver mt-2">
                  • Full API access<br/>
                  • Unlimited pages<br/>
                  • Multi-site management<br/>
                  • Direct email support
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
              <div className="text-center text-sm border-t pt-4">
                {selectedTier === "starter" ? (
                  <div className="bg-red-50 border border-red-200 p-3 rounded">
                    <span className="text-red-700 font-medium">⚠️ WARNING: Severely limited • Will miss critical pages • Competitors will outrank you</span>
                  </div>
                ) : selectedTier === "coffee" ? (
                  <div className="bg-green-50 border border-green-200 p-3 rounded">
                    <span className="text-green-700 font-bold">🚀 SMART CHOICE: Full power • 30-day guarantee • Cancel instantly • Risk-FREE</span>
                  </div>
                ) : selectedTier === "growth" ? (
                  <span className="text-teal-700">✓ Professional power • Advanced features • Team collaboration</span>
                ) : (
                  <span className="text-blue-700">✓ Enterprise control • White-label options • Dedicated support</span>
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

        {/* Dramatic Risk Reversal Section */}
        <div className="border-t pt-6">
          <div className="bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-center text-blue-900 mb-4">
              🛡️ ZERO RISK GUARANTEE - We Remove ALL Your Fears
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-white p-3 rounded border">
                <div className="font-bold text-green-700 mb-2">💰 30-Day Money Back Guarantee</div>
                <div className="text-gray-700">Don't like the results? Get every penny back. No questions asked. No hoops to jump through.</div>
              </div>
              <div className="bg-white p-3 rounded border">
                <div className="font-bold text-blue-700 mb-2">⚡ Cancel Instantly Anytime</div>
                <div className="text-gray-700">One click cancellation. No phone calls. No retention tactics. Cancel in 10 seconds.</div>
              </div>
              <div className="bg-white p-3 rounded border">
                <div className="font-bold text-purple-700 mb-2">🏆 Results in 24 Hours or Refund</div>
                <div className="text-gray-700">See dramatic improvements within 24 hours or get a full refund immediately.</div>
              </div>
              <div className="bg-white p-3 rounded border">
                <div className="font-bold text-orange-700 mb-2">🚀 Outperform Competitors or Refund</div>
                <div className="text-gray-700">We find 3x more pages than competitors or you get your money back.</div>
              </div>
            </div>
            <div className="text-center mt-4 text-xs text-blue-600 font-medium">
              ✅ Secure & Private • ✅ No Spam Ever • ✅ Built by Expert Solopreneur • ✅ Not VC-Funded BS
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Mail, ArrowRight, RotateCcw, Home } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { emailCaptureSchema, userRegistrationSchema } from "@shared/schema";
import { z } from "zod";
import { QuickHelp, InlineHelp } from "./HelpSystem";

interface EmailCaptureProps {
  websiteUrl: string;
  onEmailCaptured: (email: string, tier: "starter" | "coffee" | "growth" | "scale") => void;
  onLoginRequested?: () => void;
  onReset?: () => void;
  prefilledEmail?: string;
  isVisible: boolean;
}

// Quick Start schema for simplified flow
const quickStartSchema = emailCaptureSchema;
type QuickFormData = z.infer<typeof quickStartSchema>;

export default function EmailCapture({ websiteUrl, onEmailCaptured, onLoginRequested, onReset, prefilledEmail, isVisible }: EmailCaptureProps) {
  const { toast } = useToast();
  const [selectedTier, setSelectedTier] = useState<"starter" | "coffee" | "growth" | "scale">("starter");
  const [lastError, setLastError] = useState<string | null>(null);

  const form = useForm<QuickFormData>({
    resolver: zodResolver(quickStartSchema),
    defaultValues: {
      email: prefilledEmail || "",
      websiteUrl: websiteUrl,
      tier: "starter",
    },
  });

  // Update form when prefilledEmail changes
  useEffect(() => {
    if (prefilledEmail && prefilledEmail !== form.getValues("email")) {
      form.setValue("email", prefilledEmail);
    }
  }, [prefilledEmail, form]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      setLastError(null);
      await apiRequest("POST", "/api/email-capture", data);
    },
    onSuccess: () => {
      setLastError(null);
      // No toast notification - proceed directly to analysis
      onEmailCaptured(form.getValues("email"), selectedTier);
    },
    onError: (error: any) => {
      const errorMessage = getDetailedErrorMessage(error);
      setLastError(errorMessage);
      
      toast({
        title: "Unable to Continue",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  function getDetailedErrorMessage(error: any): string {
    if (error.message?.includes('email already exists')) {
      return "This email is already registered. Please use the Login button or try a different email address.";
    }
    if (error.message?.includes('validation')) {
      return "Please check your email format and try again. Make sure to use a valid email address.";
    }
    if (error.message?.includes('network') || error.message?.includes('fetch')) {
      return "Connection problem detected. Please check your internet connection and try again.";
    }
    if (error.message?.includes('rate limit')) {
      return "Too many attempts. Please wait a moment before trying again.";
    }
    return error.message || "Something went wrong. Please try again or contact support if the problem persists.";
  }

  const onSubmit = async (data: QuickFormData) => {
    // Quick start mode - simplified flow
    const quickData = data;
    
    // For Coffee tier, redirect to Stripe checkout instead of proceeding to analysis
    if (selectedTier === 'coffee') {
      try {
        // First capture the email
        await apiRequest("POST", "/api/email-capture", { ...quickData, tier: 'starter' }); // Keep as starter until payment
        
        // Then redirect to Stripe checkout
        const response = await apiRequest("POST", "/api/stripe/create-coffee-checkout", {
          email: quickData.email,
          websiteUrl: quickData.websiteUrl
        });
        const checkoutData = await response.json();
        
        if (checkoutData.url) {
          // Redirect to Stripe checkout
          window.location.href = checkoutData.url;
        } else {
          throw new Error('Failed to create checkout session');
        }
      } catch (error) {
        const errorMessage = getDetailedErrorMessage(error);
        setLastError(errorMessage);
        
        toast({
          title: "Payment Setup Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } else {
      // For other tiers, proceed with normal flow
      mutation.mutate({ ...quickData, tier: selectedTier });
    }
  };

  if (!isVisible) return null;

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center space-x-2">
          <Mail className="text-mastery-blue" />
          <span>Choose Your Analysis Type</span>
        </CardTitle>
        <p className="text-sm text-ai-silver">
          Generate professional LLM.txt files for <strong>{websiteUrl}</strong> in seconds
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
            value={selectedTier} 
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
                  <span className="font-medium text-lg">Free</span>
                </Label>
                <p className="text-sm text-ai-silver mt-2">
                  • 3 analyses per day<br/>
                  • 20 pages per analysis<br/>
                  • Smart categorization
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
                  <span className="font-medium text-lg">Coffee ($4.95)</span>
                </Label>
                <p className="text-sm text-orange-700 mt-2">
                  • Unlimited daily analyses<br/>
                  • 200 pages per analysis<br/>
                  • AI-enhanced quality<br/>
                  • One-time payment
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
                  <span className="font-medium text-lg">Growth ($25/mo)</span>
                </Label>
                <p className="text-sm text-ai-silver mt-2">
                  • Unlimited analyses<br/>
                  • 1,000 pages per analysis<br/>
                  • Smart caching<br/>
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
                  <span className="font-medium text-lg">Scale ($99/mo)</span>
                </Label>
                <p className="text-sm text-ai-silver mt-2">
                  • Unlimited everything<br/>
                  • API access<br/>
                  • White-label support<br/>
                  • Dedicated account
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Simplified flow - Quick Start is the default mode */}

        {/* Login Option */}
        {onLoginRequested && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
            <p className="text-sm text-blue-700 mb-3">
              Already have an account?
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={onLoginRequested}
              className="text-blue-700 border-blue-300 hover:bg-blue-100 min-h-[48px] px-6 py-3"
              size="default"
            >
              Login Instead
            </Button>
          </div>
        )}

        {/* Help Section */}
        <div className="flex items-center justify-between border-t pt-4">
          <div className="text-sm text-slate-600">
            Need help choosing? <span className="font-medium">Coffee tier</span> is perfect for most users.
          </div>
          <QuickHelp context="email-capture" />
        </div>

        {/* Email Form */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address</FormLabel>
                  <FormControl>
                    <Input 
                      {...field}
                      type="email"
                      placeholder="your@email.com"
                      className="w-full"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Simplified - no password fields needed for Quick Start */}

            <div className="flex flex-col space-y-4 pt-4 sm:flex-row sm:items-center sm:justify-between sm:space-y-0">
              <div className="text-xs text-ai-silver text-center sm:text-left">
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
              <Button 
                type="submit" 
                disabled={mutation.isPending}
                className={`min-h-[48px] px-6 py-3 w-full sm:w-auto ${selectedTier === 'coffee' ? "bg-orange-600 hover:bg-orange-700" : "bg-mastery-blue hover:bg-mastery-blue/90"}`}
                size="default"
              >
                {mutation.isPending ? (
                  "Processing..."
                ) : selectedTier === 'coffee' ? (
                  <>
                    <span className="hidden sm:inline">Continue to Payment ($4.95)</span>
                    <span className="sm:hidden">Pay $4.95</span>
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                ) : (
                  <>
                    Start Analysis
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>

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
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Mail, ArrowRight, Check, Zap, Crown } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { emailCaptureSchema, userRegistrationSchema } from "@shared/schema";
import { z } from "zod";

interface EmailCaptureProps {
  websiteUrl: string;
  onEmailCaptured: (email: string, tier: "starter" | "coffee" | "growth" | "scale") => void;
  onLoginRequested?: () => void;
  prefilledEmail?: string;
  isVisible: boolean;
}

// Create combined schema for both modes
const quickStartSchema = emailCaptureSchema;
const createAccountSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
  websiteUrl: z.string().url("Please enter a valid URL"),
  tier: z.enum(["starter", "coffee", "growth", "scale"]).default("starter"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type QuickFormData = z.infer<typeof quickStartSchema>;
type CreateFormData = z.infer<typeof createAccountSchema>;

export default function EmailCapture({ websiteUrl, onEmailCaptured, onLoginRequested, prefilledEmail, isVisible }: EmailCaptureProps) {
  const { toast } = useToast();
  const [selectedTier, setSelectedTier] = useState<"starter" | "coffee" | "growth" | "scale">("starter");
  const [accountMode, setAccountMode] = useState<"quick" | "create">("quick");

  const quickForm = useForm<QuickFormData>({
    resolver: zodResolver(quickStartSchema),
    defaultValues: {
      email: prefilledEmail || "",
      websiteUrl: websiteUrl,
      tier: "starter",
    },
  });

  const createForm = useForm<CreateFormData>({
    resolver: zodResolver(createAccountSchema),
    defaultValues: {
      email: prefilledEmail || "",
      password: "",
      confirmPassword: "",
      websiteUrl: websiteUrl,
      tier: "starter",
    },
  });

  const form = accountMode === "quick" ? quickForm : createForm;

  // Update form when prefilledEmail changes
  useEffect(() => {
    if (prefilledEmail && prefilledEmail !== form.getValues("email")) {
      form.setValue("email", prefilledEmail);
    }
  }, [prefilledEmail, form]);

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      await apiRequest("POST", "/api/email-capture", data);
    },
    onSuccess: () => {
      // No toast notification - proceed directly to analysis
      onEmailCaptured(form.getValues("email"), selectedTier);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to capture email",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: QuickFormData | CreateFormData) => {
    if (accountMode === "create") {
      // Create account mode - register user with password
      try {
        const registrationData = data as CreateFormData;
        const response = await apiRequest("POST", "/api/auth/register", {
          email: registrationData.email,
          password: registrationData.password,
          confirmPassword: registrationData.confirmPassword
        });
        
        if (response.ok) {
          const authData = await response.json();
          
          // Store authentication tokens
          localStorage.setItem('auth_access_token', authData.accessToken);
          localStorage.setItem('auth_refresh_token', authData.refreshToken);
          localStorage.setItem('auth_user', JSON.stringify(authData.user));
          
          toast({
            title: "Account Created!",
            description: "Welcome! Your account is ready.",
          });
          
          // Proceed with selected tier analysis
          onEmailCaptured(registrationData.email, selectedTier);
        }
      } catch (error) {
        toast({
          title: "Registration Error",
          description: error instanceof Error ? error.message : "Failed to create account",
          variant: "destructive",
        });
      }
    } else {
      // Quick start mode - existing flow
      const quickData = data as QuickFormData;
      
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
          toast({
            title: "Payment Error",
            description: error instanceof Error ? error.message : "Failed to start Coffee tier checkout",
            variant: "destructive",
          });
        }
      } else {
        // For other tiers, proceed with normal flow
        mutation.mutate({ ...quickData, tier: selectedTier });
      }
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
          Get instant access to your LLM.txt analysis for <strong>{websiteUrl}</strong>
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Returning Customer Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">
            ☕ Already purchased Coffee tier?
          </h4>
          <p className="text-xs text-blue-700 mb-3">
            If you recently purchased the $4.95 Coffee tier, just enter your email below and select "Coffee" - 
            we'll recognize your purchase and proceed directly to premium analysis.
          </p>
        </div>

        {/* Tier Selection */}
        <div className="space-y-4">
          <RadioGroup 
            value={selectedTier} 
            onValueChange={(value: any) => setSelectedTier(value)}
            className="space-y-3"
          >
            {/* Starter Tier */}
            <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-slate-50 transition-colors">
              <RadioGroupItem value="starter" id="starter" />
              <div className="flex-1">
                <Label htmlFor="starter" className="flex items-center space-x-2 cursor-pointer">
                  <Check className="text-green-600 w-4 h-4" />
                  <span className="font-medium">Free</span>
                </Label>
                <p className="text-sm text-ai-silver mt-1">
                  1 analysis per day • 20 pages max • HTML extraction • Smart categorization
                </p>
              </div>
            </div>

            {/* Coffee Tier */}
            <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-slate-50 transition-colors border-orange-200 bg-orange-50">
              <RadioGroupItem value="coffee" id="coffee" />
              <div className="flex-1">
                <Label htmlFor="coffee" className="flex items-center space-x-2 cursor-pointer">
                  <span className="text-orange-600">☕</span>
                  <span className="font-medium">Coffee Analysis ($4.95)</span>
                  <span className="text-xs bg-orange-600 text-white px-2 py-1 rounded">ONE-TIME</span>
                </Label>
                <p className="text-sm text-orange-700 mt-1">
                  1 premium analysis • 200 pages • Full AI-enhanced • No subscription
                </p>
              </div>
            </div>

            {/* Growth Tier */}
            <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-slate-50 transition-colors">
              <RadioGroupItem value="growth" id="growth" />
              <div className="flex-1">
                <Label htmlFor="growth" className="flex items-center space-x-2 cursor-pointer">
                  <Zap className="text-innovation-teal w-4 h-4" />
                  <span className="font-medium">Growth ($25/mo)</span>
                  <span className="text-xs bg-innovation-teal text-white px-2 py-1 rounded">POPULAR</span>
                </Label>
                <p className="text-sm text-ai-silver mt-1">
                  Unlimited analyses • 1,000 pages • AI-enhanced (first 200) • Smart caching
                </p>
              </div>
            </div>

            {/* Scale Tier */}
            <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-slate-50 transition-colors">
              <RadioGroupItem value="scale" id="scale" />
              <div className="flex-1">
                <Label htmlFor="scale" className="flex items-center space-x-2 cursor-pointer">
                  <Crown className="text-mastery-blue w-4 h-4" />
                  <span className="font-medium">Scale ($99/mo)</span>
                  <span className="text-xs bg-mastery-blue text-white px-2 py-1 rounded">ENTERPRISE</span>
                </Label>
                <p className="text-sm text-ai-silver mt-1">
                  Unlimited everything • Full AI analysis • API access • White-label options
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>

        {/* Account Mode Selection */}
        <div className="space-y-4">
          <div className="flex items-center justify-center space-x-4">
            <Button
              type="button"
              variant={accountMode === "quick" ? "default" : "outline"}
              size="sm"
              onClick={() => setAccountMode("quick")}
              className="flex-1"
            >
              Quick Start
            </Button>
            <Button
              type="button"
              variant={accountMode === "create" ? "default" : "outline"}
              size="sm"
              onClick={() => setAccountMode("create")}
              className="flex-1"
            >
              Create Account
            </Button>
          </div>
          
          <div className="text-center text-xs text-ai-silver">
            {accountMode === "quick" ? (
              <span>Email only • Account created automatically after payment</span>
            ) : (
              <span>Full account • Dashboard access • Password required</span>
            )}
          </div>
        </div>

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
              className="text-blue-700 border-blue-300 hover:bg-blue-100"
            >
              Login Instead
            </Button>
          </div>
        )}

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

            {/* Password Fields - Only show in Create Account mode */}
            {accountMode === "create" && (
              <>
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input 
                          {...field}
                          type="password"
                          placeholder="••••••••"
                          className="w-full"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password</FormLabel>
                      <FormControl>
                        <Input 
                          {...field}
                          type="password"
                          placeholder="••••••••"
                          className="w-full"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            <div className="flex items-center justify-between pt-4">
              <div className="text-xs text-ai-silver">
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
                className={selectedTier === 'coffee' ? "bg-orange-600 hover:bg-orange-700" : "bg-mastery-blue hover:bg-mastery-blue/90"}
              >
                {mutation.isPending ? (
                  "Processing..."
                ) : accountMode === "create" ? (
                  <>
                    Create Account & Continue
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </>
                ) : selectedTier === 'coffee' ? (
                  <>
                    Continue to Payment ($4.95)
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
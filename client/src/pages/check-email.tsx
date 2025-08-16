import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, ArrowLeft, RefreshCw } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function CheckEmailPage() {
  const [isResending, setIsResending] = useState(false);
  const { toast } = useToast();
  const email = localStorage.getItem('pendingVerificationEmail');

  const handleResendEmail = async () => {
    if (!email) {
      toast({
        title: "Error",
        description: "No email address found. Please sign up again.",
        variant: "destructive"
      });
      return;
    }

    setIsResending(true);
    try {
      const response = await apiRequest('POST', '/api/auth/resend-verification', { email });
      
      if (response.ok) {
        toast({
          title: "Email sent!",
          description: "We've sent another verification email. Please check your inbox.",
        });
      } else {
        const error = await response.json();
        toast({
          title: "Failed to resend email",
          description: error.message || "Please try again later.",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resend verification email. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-ai-blue via-innovation-teal to-wisdom-purple flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="bg-white/95 backdrop-blur shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 bg-innovation-teal/10 rounded-full flex items-center justify-center">
              <Mail className="h-8 w-8 text-innovation-teal" />
            </div>
            <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-2">
              <p className="text-ai-silver">
                We've sent a verification link to:
              </p>
              <p className="font-semibold text-framework-black">
                {email || 'your email address'}
              </p>
            </div>

            <div className="bg-innovation-teal/5 rounded-lg p-4 space-y-2">
              <p className="text-sm text-framework-black font-medium">
                To complete your registration:
              </p>
              <ol className="text-sm text-ai-silver space-y-1 ml-4">
                <li>1. Check your email inbox</li>
                <li>2. Click the verification link</li>
                <li>3. You'll be automatically logged in</li>
              </ol>
            </div>

            <div className="text-center text-sm text-ai-silver">
              <p>Can't find the email? Check your spam folder.</p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleResendEmail}
                disabled={isResending}
                className="w-full bg-innovation-teal hover:bg-innovation-teal/90"
              >
                {isResending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Resending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Resend Verification Email
                  </>
                )}
              </Button>

              <Link href="/login">
                <a className="block">
                  <Button variant="outline" className="w-full">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Login
                  </Button>
                </a>
              </Link>
            </div>

            <div className="text-center text-xs text-ai-silver pt-2 border-t">
              <p>
                Already verified?{' '}
                <Link href="/login">
                  <a className="text-innovation-teal hover:underline">
                    Sign in here
                  </a>
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-white/70 mt-4">
          Tip: Keep this tab open - clicking the email link will bring you back here
        </p>
      </div>
    </div>
  );
}
import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react';

export default function ResetPasswordPage() {
  const [, navigate] = useLocation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [resetComplete, setResetComplete] = useState(false);
  const [token, setToken] = useState('');
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Extract token from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const resetToken = urlParams.get('token');
    
    if (!resetToken) {
      setError('Invalid or missing reset token. Please request a new password reset.');
      return;
    }
    
    setToken(resetToken);
  }, []);

  // Password validation
  useEffect(() => {
    if (!password) {
      setValidationErrors([]);
      return;
    }

    const errors: string[] = [];
    if (password.length < 8) {
      errors.push('At least 8 characters long');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('Contains at least one lowercase letter');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Contains at least one uppercase letter');
    }
    if (!/\d/.test(password)) {
      errors.push('Contains at least one number');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Contains at least one special character');
    }
    
    setValidationErrors(errors);
  }, [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!token) {
      setError('Invalid reset token. Please request a new password reset.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (validationErrors.length > 0) {
      setError('Please fix password requirements before continuing');
      return;
    }

    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://llm-txt-mastery-production.up.railway.app'}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          newPassword: password
        })
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || 'Password reset successfully');
        setResetComplete(true);
      } else {
        setError(data.error || 'Failed to reset password');
        
        // Handle specific error cases
        if (data.code === 'INVALID_TOKEN' || data.code === 'EXPIRED_TOKEN') {
          setError('Reset link has expired or is invalid. Please request a new password reset.');
        }
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (resetComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-xl font-bold text-framework-black">
              Password reset successfully
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-ai-silver">
              Your password has been updated. You can now log in with your new password.
            </p>

            <Link href="/login">
              <Button className="w-full bg-mastery-blue hover:bg-mastery-blue/90">
                Continue to login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-framework-black">
            Set new password
          </CardTitle>
          <p className="text-center text-ai-silver mt-2">
            Enter your new password below.
          </p>
        </CardHeader>
        <CardContent>
          {message && (
            <Alert className="mb-4 border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">
                {message}
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert className="mb-4 border-red-200 bg-red-50">
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {!token ? (
            <div className="text-center space-y-4">
              <p className="text-red-600">Invalid or missing reset token.</p>
              <Link href="/forgot-password">
                <Button variant="outline" className="w-full">
                  Request new password reset
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">New Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your new password"
                    required
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-ai-silver hover:text-framework-black"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                
                {validationErrors.length > 0 && (
                  <div className="text-sm text-red-600 space-y-1">
                    <p>Password must have:</p>
                    <ul className="list-disc list-inside space-y-0.5">
                      {validationErrors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your new password"
                    required
                    disabled={isLoading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-ai-silver hover:text-framework-black"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-sm text-red-600">Passwords do not match</p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full bg-mastery-blue hover:bg-mastery-blue/90"
                disabled={isLoading || !password || !confirmPassword || password !== confirmPassword || validationErrors.length > 0}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating password...
                  </>
                ) : (
                  'Update password'
                )}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-ai-silver">
            Remember your password?{' '}
            <Link href="/login" className="text-mastery-blue hover:underline">
              Back to login
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
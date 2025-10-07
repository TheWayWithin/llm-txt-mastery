import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/auth-api';
import { validatePasswordClient } from '@/lib/auth-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Mail, Lock, User, Check, X, Loader2 } from 'lucide-react';

interface SignupFormProps {
  onSwitchToLogin: () => void;
  onSuccess?: () => void;
  defaultEmail?: string;
  defaultTier?: 'starter' | 'coffee' | 'growth' | 'scale';
}

export function SignupForm({
  onSwitchToLogin,
  onSuccess,
  defaultEmail = '',
  defaultTier = 'starter',
}: SignupFormProps) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<{
    valid: boolean;
    errors: string[];
    requirements: string[];
  } | null>(null);
  const [emailChecking, setEmailChecking] = useState(false);
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);

  // Validate password strength as user types
  useEffect(() => {
    if (password.length > 0) {
      // Use client-side validation immediately for instant feedback
      const clientValidation = validatePasswordClient(password);
      setPasswordValidation(clientValidation);

      // Also try API validation for consistency, but don't rely on it
      authApi
        .validatePassword(password)
        .then((apiValidation) => {
          // Only update if API returns a different result
          if (apiValidation.valid !== clientValidation.valid) {
            setPasswordValidation(apiValidation);
          }
        })
        .catch(() => {
          // If API fails, we already have client-side validation
          // No need to do anything
        });
    } else {
      setPasswordValidation(null);
    }
  }, [password]);

  // Check email availability as user types
  useEffect(() => {
    if (email.includes('@') && email.includes('.')) {
      setEmailChecking(true);
      const timeoutId = setTimeout(() => {
        authApi
          .checkEmailAvailability(email)
          .then(setEmailAvailable)
          .catch(() => setEmailAvailable(null))
          .finally(() => setEmailChecking(false));
      }, 500); // Debounce for 500ms

      return () => clearTimeout(timeoutId);
    } else {
      setEmailAvailable(null);
      setEmailChecking(false);
    }
  }, [email]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Enhanced validation
    if (emailAvailable === false) {
      setError('Email address is already registered');
      setLoading(false);
      return;
    }

    // Use client-side validation as fallback if passwordValidation is not set
    const validation = passwordValidation || validatePasswordClient(password);
    if (!validation.valid) {
      setError('Password does not meet requirements');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    try {
      await signUp(email, password, confirmPassword, defaultTier);
      // Successfully registered and logged in
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('SignupForm: Registration error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Signup failed';

      // Handle rate limiting specifically
      if (errorMessage.includes('Too many registration attempts')) {
        setError('Too many registration attempts. Please wait a few minutes and try again.');
      } else if (errorMessage.includes('429')) {
        setError('Registration temporarily limited. Please try again in a few minutes.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Create Account</CardTitle>
        <CardDescription className="text-center">
          Sign up to start analyzing websites with LLM.txt Mastery
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className={`pl-10 pr-10 ${
                  emailAvailable === false
                    ? 'border-red-500'
                    : emailAvailable === true
                      ? 'border-green-500'
                      : ''
                }`}
                required
              />
              <div className="absolute right-3 top-3 h-4 w-4">
                {emailChecking ? (
                  <Loader2 className="animate-spin text-gray-400" />
                ) : emailAvailable === true ? (
                  <Check className="text-green-500" />
                ) : emailAvailable === false ? (
                  <X className="text-red-500" />
                ) : null}
              </div>
            </div>
            {emailAvailable === false && (
              <p className="text-sm text-red-600">This email is already registered</p>
            )}
            {emailAvailable === true && (
              <p className="text-sm text-green-600">Email is available</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                className={`pl-10 pr-10 ${
                  passwordValidation && !passwordValidation.valid
                    ? 'border-red-500'
                    : passwordValidation?.valid
                      ? 'border-green-500'
                      : ''
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 h-5 w-5 text-gray-400 hover:text-gray-600 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {passwordValidation && passwordValidation.errors.length > 0 && (
              <div className="text-sm text-red-600 space-y-1">
                {passwordValidation.errors.map((error, index) => (
                  <p key={index}>• {error}</p>
                ))}
              </div>
            )}
            {passwordValidation?.valid && (
              <p className="text-sm text-green-600">Password meets all requirements</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className={`pl-10 pr-10 ${
                  confirmPassword && password !== confirmPassword
                    ? 'border-red-500'
                    : confirmPassword && password === confirmPassword && password.length > 0
                      ? 'border-green-500'
                      : ''
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 h-5 w-5 text-gray-400 hover:text-gray-600 p-1 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-sm text-red-600">Passwords do not match</p>
            )}
            {confirmPassword && password === confirmPassword && password.length > 0 && (
              <p className="text-sm text-green-600">Passwords match</p>
            )}
          </div>

          <div className="text-xs text-gray-500">
            By creating an account, you agree to our Terms of Service and Privacy Policy
          </div>

          <Button
            type="submit"
            className="w-full min-h-[48px] px-6 py-3"
            size="default"
            disabled={
              loading ||
              emailAvailable === false ||
              (passwordValidation && !passwordValidation.valid) ||
              password !== confirmPassword ||
              !email ||
              !password ||
              !confirmPassword
            }
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <button
              onClick={onSwitchToLogin}
              className="text-blue-600 hover:text-blue-800 font-medium min-h-[44px] px-2 py-2"
            >
              Sign in
            </button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

import { useState, useEffect } from "react"
import { useAuth } from "@/contexts/AuthContext"
import { authApi } from "@/lib/auth-api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Eye, EyeOff, Mail, Lock, User, Check, X, Loader2 } from "lucide-react"

interface SignupFormProps {
  onSwitchToLogin: () => void
  defaultEmail?: string
  defaultTier?: 'starter' | 'coffee' | 'growth' | 'scale'
}

export function SignupForm({ onSwitchToLogin, defaultEmail = "", defaultTier = 'starter' }: SignupFormProps) {
  const { signUp } = useAuth()
  const [email, setEmail] = useState(defaultEmail)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [passwordValidation, setPasswordValidation] = useState<{
    valid: boolean;
    errors: string[];
    requirements: string[];
  } | null>(null)
  const [emailChecking, setEmailChecking] = useState(false)
  const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null)

  // Validate password strength as user types
  useEffect(() => {
    if (password.length > 0) {
      authApi.validatePassword(password)
        .then(setPasswordValidation)
        .catch(() => {
          // Fallback validation if API fails
          setPasswordValidation({
            valid: password.length >= 8,
            errors: password.length < 8 ? ['Password must be at least 8 characters long'] : [],
            requirements: [
              'At least 8 characters long',
              'Contains at least one lowercase letter',
              'Contains at least one uppercase letter',
              'Contains at least one number',
              'Contains at least one special character'
            ]
          });
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
        authApi.checkEmailAvailability(email)
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
    e.preventDefault()
    setError("")
    setLoading(true)

    // Enhanced validation
    if (emailAvailable === false) {
      setError("Email address is already registered")
      setLoading(false)
      return
    }

    if (!passwordValidation?.valid) {
      setError("Password does not meet requirements")
      setLoading(false)
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      setLoading(false)
      return
    }

    try {
      await signUp(email, password, confirmPassword, defaultTier)
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed")
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl text-center text-green-600">Check Your Email!</CardTitle>
          <CardDescription className="text-center">
            We've sent you a confirmation link at <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <AlertDescription>
                Please check your email and click the confirmation link to activate your account.
              </AlertDescription>
            </Alert>
            
            <Button
              onClick={onSwitchToLogin}
              variant="outline"
              className="w-full"
            >
              Back to Sign In
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

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
                  emailAvailable === false ? 'border-red-500' : 
                  emailAvailable === true ? 'border-green-500' : ''
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
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a password"
                className={`pl-10 pr-10 ${
                  passwordValidation && !passwordValidation.valid ? 'border-red-500' : 
                  passwordValidation?.valid ? 'border-green-500' : ''
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff /> : <Eye />}
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
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className={`pl-10 pr-10 ${
                  confirmPassword && password !== confirmPassword ? 'border-red-500' : 
                  confirmPassword && password === confirmPassword && password.length > 0 ? 'border-green-500' : ''
                }`}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-3 h-4 w-4 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff /> : <Eye />}
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
            className="w-full"
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
            {loading ? "Creating account..." : "Create Account"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <button
              onClick={onSwitchToLogin}
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Sign in
            </button>
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
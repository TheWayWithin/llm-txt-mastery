import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface ForgotPasswordFormProps {
  onBack: () => void;
}

export default function ForgotPasswordForm({ onBack }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      const response = await apiRequest('POST', '/api/auth/forgot-password', {
        email: email.trim(),
      });

      if (response.ok) {
        const data = await response.json();
        setMessage(data.message || 'Password reset email sent successfully');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to send password reset email');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h2 className="text-2xl font-bold text-ink">Reset your password</h2>
        <p className="text-slate-brand">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      {message && (
        <Alert className="border-mist bg-success/10">
          <AlertDescription className="text-ink">{message}</AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert className="border-mist bg-error/10">
          <AlertDescription className="text-error">{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email address</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email address"
            required
            disabled={isLoading}
          />
        </div>

        <Button
          type="submit"
          className="w-full bg-mastery-blue hover:bg-mastery-blue/90"
          disabled={isLoading || !email.trim()}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending reset email...
            </>
          ) : (
            'Send reset email'
          )}
        </Button>
      </form>

      <Button
        variant="ghost"
        onClick={onBack}
        className="w-full text-slate-brand hover:text-ink"
        disabled={isLoading}
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to login
      </Button>
    </div>
  );
}

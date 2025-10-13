import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LoginForm } from './LoginForm';
import { SignupForm } from './SignupForm';
import ForgotPasswordForm from './ForgotPasswordForm';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'signup' | 'forgot-password';
  defaultEmail?: string;
  defaultTier?: 'starter' | 'solo' | 'growth' | 'scale';
}

export function AuthModal({
  isOpen,
  onClose,
  defaultMode = 'login',
  defaultEmail = '',
  defaultTier = 'starter',
}: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot-password'>(defaultMode);

  const handleSwitchToSignup = () => {
    setMode('signup');
  };

  const handleSwitchToLogin = () => {
    setMode('login');
  };

  const handleSwitchToForgotPassword = () => {
    setMode('forgot-password');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md w-[95vw] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">
            {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Sign Up' : 'Reset Password'}
          </DialogTitle>
        </DialogHeader>

        {mode === 'login' ? (
          <LoginForm
            onSwitchToSignup={handleSwitchToSignup}
            onSwitchToForgotPassword={handleSwitchToForgotPassword}
            onSuccess={onClose}
          />
        ) : mode === 'signup' ? (
          <SignupForm
            onSwitchToLogin={handleSwitchToLogin}
            onSuccess={onClose}
            defaultEmail={defaultEmail}
            defaultTier={defaultTier}
          />
        ) : (
          <ForgotPasswordForm onBack={handleSwitchToLogin} />
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * AuthOptionsPanel - Extracted authentication options component
 *
 * Displays Sign In/Sign Up buttons and related messaging.
 * Focused on presentation only - business logic handled by parent.
 */

import { Button } from '@/components/ui/button';
import { LogIn, UserPlus } from 'lucide-react';
import { UserTier } from '@shared/schema';

export interface AuthOptionsPanelProps {
  selectedTier: UserTier;
  onSignIn: () => void;
  onSignUp: () => void;
  loading?: boolean;
  disabled?: boolean;
}

export function AuthOptionsPanel({
  selectedTier,
  onSignIn,
  onSignUp,
  loading = false,
  disabled = false,
}: AuthOptionsPanelProps) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-ink mb-2">Ready to get started?</h3>
        <p className="text-sm text-slate-brand mb-6">
          Choose how you'd like to continue with your{' '}
          <span className="font-medium capitalize">{selectedTier}</span> tier analysis.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Sign In Button */}
        <Button
          type="button"
          variant="outline"
          onClick={onSignIn}
          disabled={disabled || loading}
          className="min-h-[56px] px-6 py-4 flex items-center justify-center space-x-2 text-ink border-mist hover:bg-cloud disabled:opacity-50"
          size="default"
        >
          <LogIn className="w-5 h-5" />
          <span>{loading ? 'Loading...' : 'Sign In'}</span>
        </Button>

        {/* Sign Up Button */}
        <Button
          type="button"
          onClick={onSignUp}
          disabled={disabled || loading}
          className={`min-h-[56px] px-6 py-4 flex items-center justify-center space-x-2 disabled:opacity-50 ${
            selectedTier === 'solo'
              ? 'bg-action-amber hover:bg-action-amber/90'
              : 'bg-mastery-blue hover:bg-mastery-blue/90'
          }`}
          size="default"
        >
          <UserPlus className="w-5 h-5" />
          <span>{loading ? 'Loading...' : 'Sign Up'}</span>
        </Button>
      </div>

      {/* Already have account notice */}
      <div className="bg-signal-blue/10 border border-mist rounded-lg p-4 text-center">
        <p className="text-sm text-mastery-blue mb-2">
          <strong>Returning user?</strong> Click "Sign In" above.
        </p>
        <p className="text-xs text-signal-blue">
          <strong>New to LLM.txt Mastery?</strong> Click "Sign Up" to create your account.
        </p>
      </div>
    </div>
  );
}

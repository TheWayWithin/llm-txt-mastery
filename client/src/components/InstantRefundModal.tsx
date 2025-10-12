import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, Loader2, AlertTriangle, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface RefundEligibility {
  eligible: boolean;
  amount: number;
  amountFormatted: string;
  reason: string;
  guaranteeApplies: boolean;
  tier: string;
}

interface InstantRefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  eligibility: RefundEligibility;
}

/**
 * InstantRefundModal Component
 *
 * Confirmation dialog for processing instant refunds.
 * Displays refund amount, warnings, and handles the refund flow.
 *
 * Flow:
 * 1. Confirm refund with warnings
 * 2. Process refund via API
 * 3. Show success message
 * 4. Refresh user context
 * 5. Auto-close and reload dashboard
 */
export function InstantRefundModal({ isOpen, onClose, eligibility }: InstantRefundModalProps) {
  const { user, getAccessToken, refreshUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getTierBenefits = () => {
    switch (eligibility.tier) {
      case 'coffee':
        return [
          'AI-enhanced analysis',
          'Remaining analysis credits',
          '200-page analysis capability',
        ];
      case 'growth':
        return [
          '100 monthly analyses (5x Coffee capacity)',
          '1,000-page analysis capability',
          'Priority processing',
          'Advanced analytics',
        ];
      case 'scale':
        return [
          'Unlimited analyses',
          'Unlimited page processing',
          'API access',
          'Priority support',
        ];
      default:
        return [];
    }
  };

  const handleConfirmRefund = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = getAccessToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const apiUrl =
        import.meta.env.VITE_API_URL || 'https://llm-txt-mastery-production.up.railway.app';
      const response = await fetch(`${apiUrl}/api/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          processRefund: true,
          reason: 'Instant refund via 30-day money-back guarantee',
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Failed to process refund');
      }

      // Success - show success state
      setSuccess(true);

      // Refresh user context to reflect tier downgrade
      await refreshUser();

      // Auto-close modal after 3 seconds and reload dashboard
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 3000);
    } catch (err) {
      console.error('Refund processing failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to process refund');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      // Reset state when closing
      setSuccess(false);
      setError(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        {!success ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
                Confirm Instant Refund
              </DialogTitle>
              <DialogDescription>
                You're about to receive a full refund of {eligibility.amountFormatted}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Refund Amount */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-800 mb-1">Refund Amount</h4>
                <p className="text-2xl font-bold text-green-700">{eligibility.amountFormatted}</p>
                <p className="text-sm text-green-600 mt-1">
                  Refunded to your original payment method within 5-7 business days
                </p>
              </div>

              {/* Warning - What user will lose */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-800 mb-2 flex items-center">
                  <XCircle className="h-4 w-4 mr-2" />
                  You will lose access to:
                </h4>
                <ul className="space-y-1">
                  {getTierBenefits().map((benefit, index) => (
                    <li key={index} className="text-sm text-red-700 flex items-start">
                      <span className="mr-2">•</span>
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Important warning */}
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <strong>This action cannot be undone.</strong> Your account will be downgraded to
                  the Starter tier immediately.
                </AlertDescription>
              </Alert>

              {/* Error display */}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter className="flex justify-between">
              <Button variant="outline" onClick={handleClose} disabled={loading}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleConfirmRefund} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Confirm Refund'
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center text-green-600">
                <CheckCircle className="h-5 w-5 mr-2" />
                Refund Processing
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Your refund of {eligibility.amountFormatted} is being processed.
                </AlertDescription>
              </Alert>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-1">What happens next?</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Refund will appear in your account within 5-7 business days</li>
                  <li>• Your account has been downgraded to Starter tier</li>
                  <li>• You can upgrade again anytime</li>
                </ul>
              </div>

              <p className="text-sm text-gray-600 text-center">
                This window will close automatically in 3 seconds...
              </p>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Close</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

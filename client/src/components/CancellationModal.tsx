import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, CheckCircle, XCircle, DollarSign } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getApiBaseUrl } from '@/lib/api-config';

interface RefundEligibility {
  eligible: boolean;
  amount: number;
  amountFormatted: string;
  reason: string;
  guaranteeApplies: boolean;
  tier: string;
}

interface CancellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function CancellationModal({ isOpen, onClose, onSuccess }: CancellationModalProps) {
  const { user, getAccessToken, refreshUser } = useAuth();
  const [step, setStep] = useState<'confirm' | 'reason' | 'processing' | 'complete'>('confirm');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refundInfo, setRefundInfo] = useState<RefundEligibility | null>(null);
  const [cancellationResult, setCancellationResult] = useState<any>(null);

  useEffect(() => {
    if (isOpen && user) {
      setStep('confirm');
      setError(null);
      setReason('');
      checkRefundEligibility();
    }
  }, [isOpen]);

  const checkRefundEligibility = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;

      const response = await fetch(`${getApiBaseUrl()}/api/refund/eligibility`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setRefundInfo(data);
      }
    } catch (error) {
      console.error('Failed to check refund eligibility:', error);
    }
  };

  const handleCancel = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = getAccessToken();
      if (!token) throw new Error('Authentication required');

      const response = await fetch(`${getApiBaseUrl()}/api/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          reason: reason || undefined,
          processRefund: true,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setCancellationResult(data);
        setStep('complete');
        // Refresh user data to reflect new tier
        await refreshUser();
        if (onSuccess) {
          setTimeout(onSuccess, 3000);
        }
      } else {
        setError(data.message || 'Cancellation failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process cancellation');
    } finally {
      setLoading(false);
    }
  };

  const getTierLosses = () => {
    switch (user?.tier) {
      case 'solo':
        return [
          'AI-enhanced website analysis',
          'Remaining analysis credits',
          '200-page analysis capability',
        ];
      case 'growth':
        return [
          '35 monthly analyses',
          '500-page analysis capability',
          'Priority processing',
        ];
      case 'scale':
        return [
          '100 monthly analyses',
          '1,000-page processing',
          'API access',
          'Priority support',
        ];
      default:
        return [];
    }
  };

  if (!user || user.tier === 'starter' || user.tier === 'cancelled') {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        {step === 'confirm' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <AlertTriangle className="h-5 w-5 text-action-amber mr-2" />
                Cancel Subscription
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel your {user.tier} subscription?
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Refund / Cancel-at-period-end Information */}
              {refundInfo && (
                <div
                  className={`p-4 rounded-lg border ${
                    refundInfo.guaranteeApplies
                      ? 'bg-success/10 border-mist'
                      : 'bg-signal-blue/5 border-mist'
                  }`}
                >
                  {refundInfo.guaranteeApplies ? (
                    <>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium flex items-center">
                          <DollarSign className="h-4 w-4 mr-1" />
                          30-Day Money-Back Guarantee
                        </h4>
                        <Badge variant="default" className="bg-success">
                          {refundInfo.amountFormatted}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-brand">
                        You'll receive a full refund and your access will end immediately.
                      </p>
                    </>
                  ) : (
                    <>
                      <h4 className="font-medium mb-2">Cancel at End of Billing Period</h4>
                      <p className="text-sm text-slate-brand">
                        {refundInfo.reason}
                      </p>
                    </>
                  )}
                </div>
              )}

              {/* What You'll Lose */}
              <div className="p-4 bg-error/10 border border-mist rounded-lg">
                <h4 className="font-medium text-error mb-2">You will lose access to:</h4>
                <ul className="space-y-1">
                  {getTierLosses().map((loss, index) => (
                    <li key={index} className="text-sm text-error flex items-start">
                      <XCircle className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0" />
                      {loss}
                    </li>
                  ))}
                </ul>
              </div>

              <Alert>
                <AlertDescription>
                  Need help? Contact support@llmtxtmastery.com before cancelling.
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter className="flex justify-between">
              <Button variant="outline" onClick={onClose}>
                Keep Subscription
              </Button>
              <Button variant="destructive" onClick={() => setStep('reason')}>
                Continue Cancellation
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'reason' && (
          <>
            <DialogHeader>
              <DialogTitle>Help us improve</DialogTitle>
              <DialogDescription>
                Your feedback helps us build a better product (optional)
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="reason">Why are you cancelling?</Label>
                <Textarea
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Too expensive, not using it enough, missing features..."
                  className="mt-2"
                  rows={4}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('confirm')} disabled={loading}>
                Back
              </Button>
              <Button variant="destructive" onClick={handleCancel} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Cancel Subscription'
                )}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'complete' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center text-success">
                <CheckCircle className="h-5 w-5 mr-2" />
                Cancellation Complete
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <Alert className="border-mist bg-success/10">
                <CheckCircle className="h-4 w-4 text-success" />
                <AlertDescription className="text-ink">
                  {cancellationResult?.message ||
                    'Your subscription has been cancelled successfully.'}
                </AlertDescription>
              </Alert>

              {refundInfo?.eligible && refundInfo?.guaranteeApplies && (
                <div className="p-4 bg-signal-blue/10 border border-mist rounded-lg">
                  <h4 className="font-medium text-mastery-blue mb-1">Refund Processing</h4>
                  <p className="text-sm text-mastery-blue">
                    Your refund of {refundInfo.amountFormatted} will be processed within 5-7
                    business days.
                  </p>
                </div>
              )}

              {cancellationResult?.subscriptionEndsAt && (
                <div className="p-4 bg-signal-blue/10 border border-mist rounded-lg">
                  <h4 className="font-medium text-mastery-blue mb-1">Access Until Period End</h4>
                  <p className="text-sm text-mastery-blue">
                    You'll have full access until{' '}
                    {new Date(cancellationResult.subscriptionEndsAt).toLocaleDateString('en-US', {
                      month: 'long',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                    .
                  </p>
                </div>
              )}

              <div className="text-sm text-slate-brand">
                <p>Thank you for using LLM.txt Mastery.</p>
                <p className="mt-2">
                  You can re-subscribe at any time from your dashboard.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={onClose}>Close</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

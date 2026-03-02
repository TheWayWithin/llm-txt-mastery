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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, CheckCircle, XCircle, DollarSign } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

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
  const { user, getAccessToken } = useAuth();
  const [step, setStep] = useState<'confirm' | 'reason' | 'processing' | 'complete'>('confirm');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refundInfo, setRefundInfo] = useState<RefundEligibility | null>(null);
  const [cancellationResult, setCancellationResult] = useState<any>(null);

  // Check refund eligibility when modal opens
  useState(() => {
    if (isOpen && user) {
      checkRefundEligibility();
    }
  });

  const checkRefundEligibility = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;

      const response = await fetch('/api/refund/eligibility', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
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
      if (!token) {
        throw new Error('Authentication required');
      }

      const response = await fetch('/api/cancel', {
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
          'Access to AI-enhanced analysis',
          'Remaining analysis credits',
          '200-page analysis capability',
          'Premium support',
        ];
      case 'growth':
        return [
          '100 monthly analyses (5x more than Coffee)',
          '1,000-page analysis capability',
          'Priority processing',
          'Advanced features',
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

  if (!user || user.tier === 'starter') {
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
              {/* Refund Information */}
              {refundInfo && (
                <div
                  className={`p-4 rounded-lg border ${
                    refundInfo.eligible
                      ? 'bg-success/10 border-mist'
                      : 'bg-cloud border-mist'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium flex items-center">
                      <DollarSign className="h-4 w-4 mr-1" />
                      Refund Eligibility
                    </h4>
                    {refundInfo.eligible && (
                      <Badge variant="default" className="bg-success">
                        {refundInfo.amountFormatted}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-slate-brand">{refundInfo.reason}</p>
                  {refundInfo.guaranteeApplies && (
                    <p className="text-sm text-success mt-1 font-medium">
                      ✅ 30-day money-back guarantee applies
                    </p>
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

              {/* Alternative Actions */}
              <Alert>
                <AlertDescription>
                  Need help? Contact support@llmtxtmastery.com before cancelling. We're here to help
                  resolve any issues.
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

              {refundInfo?.eligible && (
                <div className="p-4 bg-signal-blue/10 border border-mist rounded-lg">
                  <h4 className="font-medium text-mastery-blue mb-1">Refund Processing</h4>
                  <p className="text-sm text-mastery-blue">
                    Your refund of {refundInfo.amountFormatted} will be processed within 5-7
                    business days.
                  </p>
                </div>
              )}

              <div className="text-sm text-slate-brand">
                <p>Thank you for trying LLM.txt Mastery!</p>
                <p className="mt-2">
                  If you change your mind, you can always sign up again at any time.
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

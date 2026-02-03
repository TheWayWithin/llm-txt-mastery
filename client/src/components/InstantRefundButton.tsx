import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Shield, Loader2 } from 'lucide-react';
import { getApiBaseUrl } from '@/lib/api-config';
import { useAuth } from '@/contexts/AuthContext';
import { InstantRefundModal } from './InstantRefundModal';

interface RefundEligibility {
  eligible: boolean;
  amount: number;
  amountFormatted: string;
  reason: string;
  guaranteeApplies: boolean;
  tier: string;
}

/**
 * InstantRefundButton Component
 *
 * Displays a prominent refund button for users within the 30-day money-back guarantee window.
 * Only shows when user is eligible and the guarantee applies.
 *
 * Features:
 * - Automatic eligibility check on mount
 * - Conditional rendering based on guarantee status
 * - Opens confirmation modal on click
 * - Error handling for API failures
 */
export function InstantRefundButton() {
  const { user, getAccessToken } = useAuth();
  const [eligibility, setEligibility] = useState<RefundEligibility | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (user && user.tier !== 'starter') {
      checkEligibility();
    } else {
      setLoading(false);
    }
  }, [user]);

  const checkEligibility = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = getAccessToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const apiUrl =
        getApiBaseUrl();
      const response = await fetch(`${apiUrl}/api/refund/eligibility`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to check eligibility');
      }

      const data = await response.json();
      setEligibility(data);
    } catch (err) {
      console.error('Failed to check refund eligibility:', err);
      setError(err instanceof Error ? err.message : 'Failed to check eligibility');
    } finally {
      setLoading(false);
    }
  };

  // Don't render anything if loading
  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  // Don't render if there's an error or user is not eligible
  if (error || !eligibility || !eligibility.eligible || !eligibility.guaranteeApplies) {
    return null;
  }

  return (
    <>
      <Alert className="border-green-200 bg-green-50">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center mb-2">
              <Shield className="h-5 w-5 text-green-600 mr-2" />
              <h3 className="font-semibold text-green-800 text-lg">30-Day Money-Back Guarantee</h3>
              <Badge
                variant="secondary"
                className="ml-2 bg-green-100 text-green-700 border-green-300"
              >
                Active
              </Badge>
            </div>
            <AlertDescription className="text-green-700">
              Not satisfied? Get your <strong>{eligibility.amountFormatted}</strong> back instantly.
              No questions asked, no hoops to jump through.
            </AlertDescription>
          </div>
          <div className="ml-4">
            <Button
              onClick={() => setModalOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white font-medium"
            >
              <DollarSign className="h-4 w-4 mr-2" />
              Get Instant Refund
            </Button>
          </div>
        </div>
      </Alert>

      <InstantRefundModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        eligibility={eligibility}
      />
    </>
  );
}
// Cache bust $(date +%s)

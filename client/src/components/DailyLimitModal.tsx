import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Coffee, Zap, Crown, AlertCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface DailyLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  currentUsage: number;
  dailyLimit: number;
  websiteUrl?: string;
}

export default function DailyLimitModal({
  isOpen,
  onClose,
  userEmail,
  currentUsage,
  dailyLimit,
  websiteUrl,
}: DailyLimitModalProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const handleCoffeeCheckout = async () => {
    if (!userEmail) {
      toast({
        title: 'Email Required',
        description: 'Please provide your email to continue.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiRequest('POST', '/api/stripe/create-coffee-checkout', {
        email: userEmail,
        websiteUrl: websiteUrl || 'https://example.com', // Fallback URL if none provided
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('Failed to create checkout session');
      }
    } catch (error) {
      console.error('Coffee checkout error:', error);
      toast({
        title: 'Payment Setup Failed',
        description: 'Unable to create checkout session. Please try again.',
        variant: 'destructive',
      });
      setIsLoading(false);
    }
  };

  const handleViewAllOptions = () => {
    window.location.href = '/pricing';
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <div className="flex items-center space-x-2 mb-2">
            <AlertCircle className="h-6 w-6 text-red-500" />
            <DialogTitle className="text-xl">Daily Limit Reached</DialogTitle>
          </div>
          <DialogDescription className="space-y-4 pt-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-700 font-medium">
                You've used all {dailyLimit} of your free daily analyses.
              </p>
              <p className="text-xs text-red-600 mt-2">
                Your limit will reset tomorrow, or upgrade now to continue analyzing websites.
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-sm text-gray-600 font-medium">
                Ready to unlock unlimited analyses?
              </p>

              {/* Coffee Tier Highlight */}
              <div className="border-2 border-orange-400 bg-orange-50 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Coffee className="h-6 w-6 text-orange-600 mt-1" />
                  <div className="flex-1">
                    <h4 className="font-semibold text-orange-800">Coffee Tier - $4.95/month</h4>
                    <p className="text-sm text-orange-700 mt-1">
                      Get 100 monthly analyses with AI-enhanced results for a simple monthly
                      subscription.
                      <br />
                      <br />
                      • 100 analyses per month
                      <br />
                      • 200 pages per analysis
                      <br />
                      • AI-enhanced quality scoring
                      <br />• Monthly subscription, cancel anytime
                    </p>
                    <Button
                      onClick={handleCoffeeCheckout}
                      className="bg-orange-600 hover:bg-orange-700 text-white mt-3 w-full"
                      disabled={isLoading}
                    >
                      {isLoading ? 'Processing...' : '☕ Start Coffee Plan ($4.95/month)'}
                    </Button>
                  </div>
                </div>
              </div>

              {/* Other Options */}
              <div className="border-t pt-3">
                <button
                  onClick={handleViewAllOptions}
                  className="text-sm text-mastery-blue hover:underline w-full text-center py-2"
                >
                  View all upgrade options →
                </button>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}

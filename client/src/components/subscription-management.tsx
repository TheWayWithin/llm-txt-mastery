import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Loader2, CreditCard, ExternalLink, XCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { CancellationModal } from './CancellationModal';
import { 
  createCheckoutSession,
  createUpgradeSession,
  createCoffeeCheckoutSession, 
  createPortalSession, 
  getSubscriptionStatus, 
  TIER_PRICING,
  type SubscriptionStatus 
} from '@/lib/stripe';

interface SubscriptionManagementProps {
  onUpgradeSuccess?: () => void;
}

export default function SubscriptionManagement({ onUpgradeSuccess }: SubscriptionManagementProps) {
  const { user, getAccessToken } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [selectedTier, setSelectedTier] = useState<'coffee' | 'growth' | 'scale' | null>(null);
  const [showCancellation, setShowCancellation] = useState(false);

  useEffect(() => {
    if (user) {
      loadSubscriptionStatus();
    }
  }, [user]);

  const loadSubscriptionStatus = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;

      const status = await getSubscriptionStatus(token);
      setSubscriptionStatus(status);
    } catch (error) {
      console.error('Failed to load subscription status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (tier: 'growth' | 'scale') => {
    try {
      setUpgrading(true);
      setSelectedTier(tier);

      const token = getAccessToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      // Use upgrade session if user has an active subscription (handles proration)
      // Otherwise use regular checkout
      const hasActiveSubscription = subscriptionStatus?.hasActiveSubscription || false;
      
      if (hasActiveSubscription) {
        // Use upgrade endpoint which handles proration
        const result = await createUpgradeSession(tier, token);
        
        if (result.url) {
          // Redirect to Stripe for payment if needed
          window.location.href = result.url;
        } else if (result.success) {
          // Upgrade completed without additional payment
          alert('Subscription upgraded successfully!');
          loadSubscriptionStatus(); // Refresh the status
        }
      } else {
        // No existing subscription - use regular checkout
        const { url } = await createCheckoutSession(tier, token);
        
        if (url) {
          window.location.href = url;
        }
      }
    } catch (error) {
      console.error('Upgrade failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to start upgrade process');
    } finally {
      setUpgrading(false);
      setSelectedTier(null);
    }
  };

  const handleCoffeePurchase = async () => {
    try {
      setUpgrading(true);
      setSelectedTier('coffee');

      const token = getAccessToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const { url } = await createCoffeeCheckoutSession(token);
      
      if (url) {
        // Redirect to Stripe Checkout
        window.location.href = url;
      }
    } catch (error) {
      console.error('Coffee purchase failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to start purchase process');
    } finally {
      setUpgrading(false);
      setSelectedTier(null);
    }
  };

  const handleManageSubscription = async () => {
    try {
      setLoading(true);

      const token = getAccessToken();
      if (!token) {
        throw new Error('Authentication required');
      }

      const { url } = await createPortalSession(token);
      
      if (url) {
        // Open customer portal in new tab
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Failed to open customer portal:', error);
      alert(error instanceof Error ? error.message : 'Failed to open billing portal');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-slate-600">Please sign in to manage your subscription.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          <p className="text-slate-600">Loading subscription details...</p>
        </CardContent>
      </Card>
    );
  }

  const currentTier = subscriptionStatus?.tier || 'starter';
  const hasActiveSubscription = subscriptionStatus?.hasActiveSubscription || false;
  const creditsRemaining = subscriptionStatus?.creditsRemaining || 0;

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Current Plan</span>
            <Badge variant={currentTier === 'starter' ? 'secondary' : 'default'}>
              {currentTier.charAt(0).toUpperCase() + currentTier.slice(1)}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Coffee Tier Credits Display */}
          {currentTier === 'coffee' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center text-orange-600">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  <span>Coffee Credits</span>
                </div>
                <Badge variant="outline" className="text-orange-600 border-orange-200">
                  {creditsRemaining} credit{creditsRemaining !== 1 ? 's' : ''} remaining
                </Badge>
              </div>
              <div className="text-sm text-slate-600">
                <p>Each credit allows one full website analysis (up to 200 pages)</p>
                <p>Credits never expire • AI-enhanced analysis included</p>
              </div>
              {creditsRemaining > 0 && (
                <Button 
                  onClick={() => setShowCancellation(true)}
                  variant="ghost"
                  className="w-full min-h-[44px] text-sm text-gray-500 hover:text-red-600 hover:bg-red-50"
                  size="sm"
                >
                  Request Refund (30-day guarantee)
                </Button>
              )}
            </div>
          )}

          {/* Active Subscription Display */}
          {hasActiveSubscription && currentTier !== 'coffee' ? (
            <div className="space-y-4">
              <div className="flex items-center text-green-600">
                <CheckCircle className="h-5 w-5 mr-2" />
                <span>Active subscription</span>
              </div>
              {subscriptionStatus?.subscriptions && subscriptionStatus.subscriptions.length > 0 && (
                <div className="text-sm text-slate-600">
                  <p>Next billing: {new Date(subscriptionStatus.subscriptions[0].currentPeriodEnd * 1000).toLocaleDateString()}</p>
                  <p>Status: {subscriptionStatus.subscriptions[0].status}</p>
                </div>
              )}
              <div className="space-y-2">
                <Button 
                  onClick={handleManageSubscription}
                  variant="outline"
                  className="w-full min-h-[48px] px-6 py-3"
                  size="default"
                >
                  <CreditCard className="h-5 w-5 mr-2" />
                  Manage Billing
                  <ExternalLink className="h-5 w-5 ml-2" />
                </Button>
                <Button 
                  onClick={() => setShowCancellation(true)}
                  variant="ghost"
                  className="w-full min-h-[48px] px-6 py-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                  size="default"
                >
                  <XCircle className="h-5 w-5 mr-2" />
                  Cancel Subscription
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-slate-600">
                {currentTier === 'starter' 
                  ? 'You are currently on the free Starter plan (20 pages).' 
                  : currentTier === 'coffee'
                  ? `You have coffee credits for premium analysis.`
                  : 'No active subscription found.'}
              </p>
              {currentTier === 'starter' && (
                <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-orange-800">☕ Unlock Premium Analysis</h4>
                    <span className="text-lg font-bold text-orange-600">$4.95</span>
                  </div>
                  <p className="text-sm text-orange-700 mb-3">
                    Get professional-grade AI analysis • 200 pages • No subscription, just one coffee!
                  </p>
                  <Button 
                    onClick={handleCoffeePurchase}
                    disabled={upgrading}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white min-h-[48px] px-6 py-3"
                    size="default"
                  >
                    {upgrading && selectedTier === 'coffee' ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      '☕ Buy Me Coffee'
                    )}
                  </Button>
                </div>
              )}
              {currentTier === 'coffee' && creditsRemaining === 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-medium text-orange-800 mb-2">☕ Want Another Analysis?</h4>
                  <p className="text-sm text-orange-700 mb-3">
                    Each coffee gets you one premium analysis, or go unlimited for continuous access
                  </p>
                  <Button 
                    onClick={handleCoffeePurchase}
                    disabled={upgrading}
                    variant="outline"
                    className="w-full border-orange-200 text-orange-600 hover:bg-orange-50 min-h-[48px] px-6 py-3"
                    size="default"
                  >
                    {upgrading && selectedTier === 'coffee' ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      '☕ Another Coffee Please ($4.95)'
                    )}
                  </Button>
                </div>
              )}
              {currentTier !== 'scale' && currentTier !== 'coffee' && (
                <p className="text-sm text-slate-500">
                  🚀 Upgrade to unlock unlimited analyses and advanced AI features.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upgrade Options */}
      {currentTier !== 'scale' && (
        <div className="grid gap-6 md:grid-cols-2">
          {(currentTier === 'starter' || currentTier === 'growth') && currentTier !== 'growth' && (
            <Card className="border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{TIER_PRICING.growth.name}</span>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{TIER_PRICING.growth.price}</div>
                    <div className="text-sm text-slate-500">per {TIER_PRICING.growth.interval}</div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-4">
                  {TIER_PRICING.growth.features.map((feature, index) => (
                    <li key={index} className="flex items-start text-sm py-1">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  onClick={() => handleUpgrade('growth')}
                  disabled={upgrading}
                  className="w-full min-h-[48px] px-6 py-3"
                  size="default"
                >
                  {upgrading && selectedTier === 'growth' ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    'Upgrade to Growth'
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {(currentTier === 'starter' || currentTier === 'coffee' || currentTier === 'growth') && (
            <Card className="border-purple-200">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{TIER_PRICING.scale.name}</span>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{TIER_PRICING.scale.price}</div>
                    <div className="text-sm text-slate-500">per {TIER_PRICING.scale.interval}</div>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-4">
                  {TIER_PRICING.scale.features.map((feature, index) => (
                    <li key={index} className="flex items-start text-sm py-1">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button 
                  onClick={() => handleUpgrade('scale')}
                  disabled={upgrading}
                  className="w-full bg-purple-600 hover:bg-purple-700 min-h-[48px] px-6 py-3"
                  size="default"
                >
                  {upgrading && selectedTier === 'scale' ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Processing...
                    </>
                  ) : (
                    'Upgrade to Scale'
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Success Message for Scale Users */}
      {currentTier === 'scale' && hasActiveSubscription && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-green-800 mb-2">
              You're on our highest tier!
            </h3>
            <p className="text-green-700">
              You have access to all features including unlimited analysis and API access.
            </p>
          </CardContent>
        </Card>
      )}
      
      {/* Cancellation Modal */}
      <CancellationModal 
        isOpen={showCancellation}
        onClose={() => setShowCancellation(false)}
        onSuccess={() => {
          setShowCancellation(false);
          loadSubscriptionStatus();
        }}
      />
    </div>
  );
}
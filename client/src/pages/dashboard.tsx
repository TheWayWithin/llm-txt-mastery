import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { useAuth } from '@/contexts/AuthContext';
import { getApiBaseUrl } from '@/lib/api-config';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSEO } from '@/hooks/useSEO';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AnalysisHistory } from '@/components/AnalysisHistory';
import { InstantRefundButton } from '@/components/InstantRefundButton';
import {
  User,
  CreditCard,
  Activity,
  Settings,
  LogOut,
  Coffee,
  Crown,
  Zap,
  Calendar,
  Mail,
  Shield,
  ExternalLink,
  CheckCircle,
  FileText,
  ArrowRight,
} from 'lucide-react';
import {
  getSubscriptionStatus,
  createPortalSession,
  TIER_PRICING,
  type SubscriptionStatus,
} from '@/lib/stripe';
import { getTierDisplayName } from '@/lib/tier-utils';

const getTierIcon = (tier: string) => {
  switch (tier) {
    case 'solo':
      return <Coffee className="h-4 w-4" />;
    case 'growth':
      return <Zap className="h-4 w-4" />;
    case 'scale':
      return <Crown className="h-4 w-4" />;
    default:
      return <User className="h-4 w-4" />;
  }
};

const getTierColor = (tier: string) => {
  switch (tier) {
    case 'solo':
      return 'bg-cloud text-ink border-mist';
    case 'growth':
      return 'bg-signal-blue/10 text-mastery-blue border-mist';
    case 'scale':
      return 'bg-cloud text-ink border-mist';
    default:
      return 'bg-cloud text-ink border-mist';
  }
};

function AccountOverview() {
  const { user, refreshUser } = useAuth();

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* User Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="h-5 w-5" />
            <span>Account Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-brand">Email Address</label>
              <div className="flex items-center space-x-2 mt-1">
                <Mail className="h-4 w-4 text-stone-brand" />
                <span className="text-sm">{user.email}</span>
                {user.emailVerified ? (
                  <Badge variant="secondary" className="text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-slate-brand">
                    Pending verification
                  </Badge>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-brand">Member Since</label>
              <div className="flex items-center space-x-2 mt-1">
                <Calendar className="h-4 w-4 text-stone-brand" />
                <span className="text-sm">
                  {new Date(user.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5" />
              <span>Current Plan</span>
            </div>
            <Badge className={getTierColor(user.tier)}>
              <div className="flex items-center space-x-1">
                {getTierIcon(user.tier)}
                <span>{getTierDisplayName(user.tier)}</span>
              </div>
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Coffee Tier Status */}
            {(user.tier === 'solo' || user.tier === 'coffee') && (
              <div className="bg-cloud border border-mist rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-ink">Monthly Analyses</h4>
                  <Badge variant="outline" className="text-signal-blue border-mist">
                    {user.creditsRemaining} of 20 remaining
                  </Badge>
                </div>
                <p className="text-sm text-slate-brand mb-3">
                  Your Solo subscription includes 20 analyses per month, up to 200 pages each with AI enhancement.
                </p>
                {user.creditsRemaining === 0 && (
                  <div className="text-sm text-ink">
                    <p className="mb-2">
                      Your monthly analyses reset on your next billing cycle.
                    </p>
                    <p>
                      Need more? Upgrade to Growth ($9.95/mo) for 35 analyses per month.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Starter Tier Status */}
            {user.tier === 'starter' && (
              <div className="bg-cloud border border-mist rounded-lg p-4">
                <h4 className="font-medium text-ink mb-2">Free Starter Plan</h4>
                <p className="text-sm text-slate-brand mb-3">
                  You're currently on the free plan with basic website analysis (up to 20 pages).
                </p>
                <p className="text-sm text-ink">
                  <strong>Upgrade benefits:</strong> More pages, AI-enhanced analysis, priority
                  support, and more.
                </p>
              </div>
            )}

            {/* Growth/Scale Tier Status */}
            {['growth', 'scale'].includes(user.tier) && (
              <div
                className={`border rounded-lg p-4 ${
                  user.tier === 'growth'
                    ? 'bg-signal-blue/10 border-mist'
                    : 'bg-cloud border-mist'
                }`}
              >
                <h4
                  className={`font-medium mb-2 ${
                    user.tier === 'growth' ? 'text-mastery-blue' : 'text-ink'
                  }`}
                >
                  {user.tier === 'growth' ? 'Growth Plan' : 'Scale Plan'}
                </h4>
                <p
                  className={`text-sm mb-3 ${
                    user.tier === 'growth' ? 'text-mastery-blue' : 'text-slate-brand'
                  }`}
                >
                  You have access to premium website analysis and advanced features.
                </p>
                <div className="text-sm">
                  <strong>Active features:</strong>
                  <ul
                    className={`list-disc list-inside mt-1 space-y-1 ${
                      user.tier === 'growth' ? 'text-signal-blue' : 'text-slate-brand'
                    }`}
                  >
                    <li>{user.tier === 'growth' ? '35 monthly analyses, 500 pages each' : user.tier === 'scale' ? '100 monthly analyses, 1,000 pages each' : '20 Monthly Analyses'}</li>
                    <li>AI-enhanced analysis</li>
                    <li>Priority support</li>
                    {user.tier === 'scale' && (
                      <>
                        <li>API access</li>
                        <li>Custom integrations</li>
                        <li>Dedicated support</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BillingSection() {
  const { user, getAccessToken } = useAuth();
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState<string | null>(null);
  const [upgradeBilling, setUpgradeBilling] = useState<'monthly' | 'annual'>('annual');

  useEffect(() => {
    loadSubscriptionStatus();
  }, []);

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

  const handleManageBilling = async () => {
    try {
      setPortalLoading(true);
      const token = getAccessToken();
      if (!token) throw new Error('Authentication required');

      const { url } = await createPortalSession(token);
      if (url) {
        window.open(url, '_blank');
      }
    } catch (error) {
      console.error('Failed to open billing portal:', error);
    } finally {
      setPortalLoading(false);
    }
  };

  const handleUpgrade = async (tier: 'solo' | 'growth' | 'scale') => {
    try {
      setUpgradeLoading(tier);
      const token = getAccessToken();
      if (!token) throw new Error('Authentication required');

      // Determine the endpoint based on tier
      let endpoint = '';
      if (tier === 'solo') {
        endpoint = '/api/stripe/create-solo-checkout';
      } else if (tier === 'growth') {
        endpoint = '/api/stripe/create-growth-checkout';
      } else if (tier === 'scale') {
        endpoint = '/api/stripe/create-scale-checkout';
      }

      // Create checkout session
      const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: user?.email || '',
          billing: upgradeBilling,
        }),
      });

      const data = await response.json();

      if (data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        throw new Error(data.message || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error(`Failed to upgrade to ${tier}:`, error);
      alert(`Failed to upgrade. Please try again later.`);
    } finally {
      setUpgradeLoading(null);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      {/* Billing Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5" />
            <span>Billing & Subscriptions</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-signal-blue"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {subscriptionStatus?.hasActiveSubscription ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-success/10 border border-mist rounded-lg">
                    <div>
                      <h4 className="font-medium text-ink">Active Subscription</h4>
                      <p className="text-sm text-success">
                        {user.tier === 'growth'
                          ? 'Growth Plan'
                          : user.tier === 'scale'
                            ? 'Scale Plan'
                            : 'Active Plan'}
                      </p>
                    </div>
                    <Badge className="bg-success/10 text-ink border-mist">Active</Badge>
                  </div>

                  <div className="space-y-3">
                    <Button
                      onClick={handleManageBilling}
                      disabled={portalLoading}
                      className="w-full bg-signal-blue hover:bg-[#1D4ED8]"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      {portalLoading ? 'Opening...' : 'View Billing Details & Invoices'}
                    </Button>

                    <Button
                      onClick={handleManageBilling}
                      disabled={portalLoading}
                      variant="outline"
                      className="w-full border-mist text-action-amber hover:bg-cloud"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Update Payment Method
                    </Button>

                    <Button
                      onClick={handleManageBilling}
                      disabled={portalLoading}
                      variant="outline"
                      className="w-full border-mist text-error hover:bg-error/10"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Cancel Subscription (Instant)
                    </Button>

                    <div className="text-xs text-stone-brand text-center mt-2">
                      All billing changes are processed securely through Stripe.
                      <br />
                      Cancellations take effect immediately - no hoops to jump through.
                    </div>
                  </div>
                </div>
              ) : user.tier === 'solo' ? (
                <div className="space-y-4">
                  <div className="p-4 bg-cloud border border-mist rounded-lg">
                    <h4 className="font-medium text-ink">Solo Subscription</h4>
                    <p className="text-sm text-signal-blue mt-1">
                      You have {user.creditsRemaining} of 20 analyses remaining this month.
                    </p>
                    <p className="text-xs text-slate-brand mt-2">
                      Solo subscription includes 20 analyses per month, resetting each billing cycle.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-stone-brand">
                  <p>No active subscriptions</p>
                  <p className="text-sm mt-2">
                    Upgrade to Growth or Scale for subscription management
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dramatic Upgrade Options - Show ALL tiers for comparison */}
      <Card data-upgrade-section>
        <CardHeader>
          <CardTitle className="text-xl">🚀 Unlock Your Website's Full Potential</CardTitle>
          <p className="text-slate-brand">
            Choose the plan that matches your ambition. Compare what you're missing:
          </p>
          {/* Billing Toggle */}
          <div className="flex items-center justify-center mt-4">
            <div className="inline-flex items-center bg-mist rounded-lg p-1 gap-1">
              <button
                onClick={() => setUpgradeBilling('monthly')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  upgradeBilling === 'monthly'
                    ? 'bg-white text-ink shadow-sm'
                    : 'text-slate-brand hover:text-ink'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setUpgradeBilling('annual')}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
                  upgradeBilling === 'annual'
                    ? 'bg-white text-ink shadow-sm'
                    : 'text-slate-brand hover:text-ink'
                }`}
              >
                Annual
                <span className="bg-success text-white text-xs px-1.5 py-0.5 rounded-full font-semibold">
                  Save 20%
                </span>
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            {/* Solo Tier */}
            <div
              className={`relative border-2 rounded-lg p-5 ${user.tier === 'solo' ? 'border-signal-blue bg-cloud' : user.tier === 'starter' ? 'border-mist hover:border-signal-blue hover:bg-cloud' : 'border-mist opacity-60'} transition-all`}
            >
              {user.tier === 'solo' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-action-amber text-white text-xs px-3 py-1 rounded-full font-bold">
                  YOUR CURRENT PLAN
                </div>
              )}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Coffee className="h-6 w-6 text-action-amber" />
                  <h3 className="font-bold text-lg">Solo</h3>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-action-amber">{upgradeBilling === 'annual' ? '$3.95' : '$4.95'}</div>
                  <div className="text-xs text-stone-brand">{upgradeBilling === 'annual' ? '/mo (billed yearly)' : 'per month'}</div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="bg-white border border-mist rounded-md p-3">
                  <div className="text-sm font-semibold text-ink mb-1">
                    ✅ 20 Monthly Analyses
                  </div>
                  <div className="text-xs text-slate-brand">
                    vs FREE: Only 3 per day (90 per month max) - Solo gives you 20
                  </div>
                </div>

                <div className="bg-white border border-mist rounded-md p-3">
                  <div className="text-sm font-semibold text-ink mb-1">
                    🔄 Keep Your LLM.txt Current
                  </div>
                  <div className="text-xs text-slate-brand">
                    Update your file as your site changes - new pages, fresh content
                  </div>
                </div>

                <div className="bg-white border border-mist rounded-md p-3">
                  <div className="text-sm font-semibold text-ink mb-1">
                    📄 200 Pages per Analysis
                  </div>
                  <div className="text-xs text-slate-brand">
                    vs FREE: Only 20 pages (miss critical content)
                  </div>
                </div>

                <div className="bg-white border border-mist rounded-md p-3">
                  <div className="text-sm font-semibold text-ink mb-1">
                    🤖 AI Quality Scoring
                  </div>
                  <div className="text-xs text-slate-brand">
                    vs FREE: No AI analysis (basic HTML only)
                  </div>
                </div>

                <div className="bg-white border border-mist rounded-md p-3">
                  <div className="text-sm font-semibold text-ink mb-1">
                    💰 Incredible Value
                  </div>
                  <div className="text-xs text-slate-brand">
                    20 analyses for just $4.95/month - perfect for solo founders!
                  </div>
                </div>
              </div>

              {user.tier === 'starter' ? (
                <Button
                  data-testid="upgrade-to-coffee"
                  className="w-full bg-action-amber hover:bg-action-amber/90 font-bold"
                  onClick={() => handleUpgrade('solo')}
                  disabled={upgradeLoading === 'solo'}
                >
                  {upgradeLoading === 'solo'
                    ? 'Processing...'
                    : '🚀 UPGRADE TO SOLO - Beat Competitors Now'}
                </Button>
              ) : user.tier === 'solo' ? (
                <div className="text-center py-2 text-action-amber font-medium">
                  ✅ You're Using Solo Plan
                </div>
              ) : (
                <div className="text-center py-2 text-stone-brand text-sm">
                  You've upgraded past this plan
                </div>
              )}
            </div>

            {/* Growth Tier */}
            <div
              className={`relative border-2 rounded-lg p-5 ${user.tier === 'growth' ? 'border-signal-blue bg-signal-blue/10' : 'border-mist hover:border-signal-blue hover:bg-signal-blue/10'} transition-all transform hover:scale-105`}
            >
              {user.tier === 'growth' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-signal-blue text-white text-xs px-3 py-1 rounded-full font-bold">
                  YOUR CURRENT PLAN
                </div>
              )}
              {user.tier !== 'growth' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-success text-white text-xs px-3 py-1 rounded-full font-bold">
                  🔥 POPULAR CHOICE
                </div>
              )}

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Zap className="h-6 w-6 text-signal-blue" />
                  <h3 className="font-bold text-lg">Growth</h3>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-signal-blue">{upgradeBilling === 'annual' ? '$7.95' : '$9.95'}</div>
                  <div className="text-xs text-stone-brand">{upgradeBilling === 'annual' ? '/mo (billed yearly)' : 'per month'}</div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="bg-white border border-mist rounded-md p-3">
                  <div className="text-sm font-semibold text-mastery-blue mb-1">
                    🚀 EVERYTHING in Solo +
                  </div>
                  <div className="text-xs text-signal-blue">All Solo benefits included</div>
                </div>

                <div className="bg-white border border-mist rounded-md p-3">
                  <div className="text-sm font-semibold text-mastery-blue mb-1">
                    📊 35 Monthly Analyses
                  </div>
                  <div className="text-xs text-signal-blue">vs Solo: 75% more analyses per month</div>
                </div>

                <div className="bg-white border border-mist rounded-md p-3">
                  <div className="text-sm font-semibold text-mastery-blue mb-1">
                    📄 500 Pages per Analysis
                  </div>
                  <div className="text-xs text-signal-blue">vs Solo: 2.5x more content discovery</div>
                </div>

                <div className="bg-white border border-mist rounded-md p-3">
                  <div className="text-sm font-semibold text-mastery-blue mb-1">
                    📦 Bulk Website Processing
                  </div>
                  <div className="text-xs text-signal-blue">Analyze multiple sites at once</div>
                </div>

                <div className="bg-white border border-mist rounded-md p-3">
                  <div className="text-sm font-semibold text-mastery-blue mb-1">
                    📥 Export to CSV/JSON
                  </div>
                  <div className="text-xs text-signal-blue">
                    Share reports with clients and teams
                  </div>
                </div>
              </div>

              {user.tier === 'growth' ? (
                <div className="text-center py-2 text-signal-blue font-medium">
                  ✅ You're Using Growth Plan
                </div>
              ) : user.tier === 'scale' ? (
                <div className="text-center py-2 text-stone-brand text-sm">
                  You've upgraded past this plan
                </div>
              ) : (
                <Button
                  data-testid="upgrade-to-growth"
                  className="w-full bg-signal-blue hover:bg-[#1D4ED8] font-bold"
                  onClick={() => handleUpgrade('growth')}
                  disabled={upgradeLoading === 'growth'}
                >
                  {upgradeLoading === 'growth'
                    ? 'Processing...'
                    : user.tier === 'starter'
                      ? '🚀 SKIP AHEAD TO GROWTH'
                      : '⬆️ UPGRADE TO GROWTH'}
                </Button>
              )}
            </div>

            {/* Scale Tier */}
            <div
              className={`relative border-2 rounded-lg p-5 ${user.tier === 'scale' ? 'border-mastery-blue bg-cloud' : 'border-mastery-blue/70 hover:border-mastery-blue hover:bg-cloud'} transition-all transform hover:scale-105`}
            >
              {user.tier === 'scale' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-slate-brand text-white text-xs px-3 py-1 rounded-full font-bold">
                  YOUR CURRENT PLAN
                </div>
              )}
              {user.tier !== 'scale' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-slate-brand text-white text-xs px-3 py-1 rounded-full font-bold">
                  👑 ULTIMATE POWER
                </div>
              )}

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Crown className="h-6 w-6 text-slate-brand" />
                  <h3 className="font-bold text-lg">Scale</h3>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-slate-brand">{upgradeBilling === 'annual' ? '$15.95' : '$19.95'}</div>
                  <div className="text-xs text-stone-brand">{upgradeBilling === 'annual' ? '/mo (billed yearly)' : 'per month'}</div>
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <div className="bg-white border border-mist rounded-md p-3">
                  <div className="text-sm font-semibold text-ink mb-1">
                    🚀 EVERYTHING in Growth +
                  </div>
                  <div className="text-xs text-slate-brand">All Growth benefits included</div>
                </div>

                <div className="bg-white border border-mist rounded-md p-3">
                  <div className="text-sm font-semibold text-ink mb-1">
                    📊 100 Monthly Analyses
                  </div>
                  <div className="text-xs text-slate-brand">
                    vs Growth: ~3x more analyses per month
                  </div>
                </div>

                <div className="bg-white border border-mist rounded-md p-3">
                  <div className="text-sm font-semibold text-ink mb-1">
                    📄 1,000 Pages per Analysis
                  </div>
                  <div className="text-xs text-slate-brand">
                    vs Growth: 2x more pages per scan
                  </div>
                </div>

                <div className="bg-white border border-mist rounded-md p-3">
                  <div className="text-sm font-semibold text-ink mb-1">
                    ⚛️ JavaScript Rendering
                  </div>
                  <div className="text-xs text-slate-brand">
                    React, Angular, Vue & SPA sites fully supported
                  </div>
                </div>

                <div className="bg-white border border-mist rounded-md p-3">
                  <div className="text-sm font-semibold text-ink mb-1">🔗 API Access</div>
                  <div className="text-xs text-slate-brand">
                    Integrate with your tools & workflows
                  </div>
                </div>

                <div className="bg-white border border-mist rounded-md p-3">
                  <div className="text-sm font-semibold text-ink mb-1">
                    📞 Priority Support
                  </div>
                  <div className="text-xs text-slate-brand">
                    Email support@llmtxtmastery.com for priority help
                  </div>
                </div>
              </div>

              {user.tier === 'scale' ? (
                <div className="text-center py-2 text-slate-brand font-medium">
                  ✅ You're Using Scale Plan
                </div>
              ) : (
                <Button
                  data-testid="upgrade-to-scale"
                  className="w-full bg-slate-brand hover:bg-mastery-blue/90 font-bold"
                  onClick={() => handleUpgrade('scale')}
                  disabled={upgradeLoading === 'scale'}
                >
                  {upgradeLoading === 'scale'
                    ? 'Processing...'
                    : user.tier === 'starter'
                      ? '🚀 GO ENTERPRISE WITH SCALE'
                      : user.tier === 'solo'
                        ? '⬆️ UPGRADE TO SCALE'
                        : '⬆️ UPGRADE TO SCALE'}
                </Button>
              )}
            </div>
          </div>

          {/* Guarantee Section */}
          <div className="mt-8 bg-success/10 border-2 border-mist rounded-lg p-6 text-center">
            <h4 className="font-bold text-ink text-lg mb-2">🛡️ ZERO RISK GUARANTEE</h4>
            <p className="text-success text-sm mb-3">
              Try any plan for 30 days. Not satisfied? Get every penny back, no questions asked.
            </p>
            <div className="flex justify-center space-x-6 text-xs text-success">
              <span>✅ 30-Day Money Back</span>
              <span>✅ Cancel Anytime</span>
              <span>✅ No Contracts</span>
              <span>✅ Instant Activation</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Sprint 5: File type options for validator
type LlmsTxtFileType = 'auto' | 'llms.txt' | 'llms-full.txt' | '.well-known' | 'llms.md';

const FILE_TYPE_OPTIONS: { value: LlmsTxtFileType; label: string; path: string }[] = [
  { value: 'auto', label: 'Auto-detect (check all)', path: 'all locations' },
  { value: 'llms.txt', label: 'llms.txt', path: '/llms.txt' },
  { value: 'llms-full.txt', label: 'llms-full.txt', path: '/llms-full.txt' },
  { value: '.well-known', label: '.well-known/llms.txt', path: '/.well-known/llms.txt' },
  { value: 'llms.md', label: 'llms.md', path: '/llms.md' },
];

function ValidatorSection() {
  const { getAccessToken } = useAuth();
  const [url, setUrl] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [includeRobotsTxt, setIncludeRobotsTxt] = useState(true);
  const [fileType, setFileType] = useState<LlmsTxtFileType>('auto');

  const normalizeUrl = (value: string) => {
    if (!value.trim()) return value;
    if (/^https?:\/\//.test(value)) {
      return value;
    }
    return `https://${value}`;
  };

  const validateUrl = (value: string) => {
    const normalizedUrl = normalizeUrl(value);
    const urlPattern = /^https?:\/\/.+\..+/;
    const valid = urlPattern.test(normalizedUrl);
    setIsValid(valid);
    return valid;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrl(value);
    validateUrl(value);
    setError(null);
    setValidationResult(null);
  };

  const handleValidate = async () => {
    if (!isValid || !url) return;

    setIsValidating(true);
    setError(null);
    setValidationResult(null);

    try {
      const normalizedUrl = normalizeUrl(url);
      const API_URL = getApiBaseUrl();
      const token = getAccessToken();
      const response = await fetch(`${API_URL}/api/validate-llms-txt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          url: normalizedUrl,
          fileType,
          includeRobotsTxt,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          setError(
            `Rate limit exceeded. ${
              data.resetAt
                ? `Try again after ${new Date(data.resetAt).toLocaleTimeString()}`
                : 'Please try again later.'
            }`
          );
        } else {
          setError(data.error || 'Validation failed. Please try again.');
        }
        return;
      }

      setValidationResult(data.validation || data);
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
      console.error('Validation error:', err);
    } finally {
      setIsValidating(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-success';
    if (score >= 75) return 'text-action-amber';
    return 'text-error';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 90) return 'bg-success/10 border-mist';
    if (score >= 75) return 'bg-action-amber/10 border-action-amber/40';
    return 'bg-error/10 border-mist';
  };

  return (
    <div className="space-y-6">
      {/* Validator Input */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Validate llms.txt File</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-brand mb-4">
            Enter your website URL to validate your llms.txt file against the official specification.
          </p>
          <div className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="www.example.com or https://example.com"
                value={url}
                onChange={handleInputChange}
                className="flex-1 px-3 py-2 border border-mist rounded-md focus:outline-none focus:ring-2 focus:ring-signal-blue"
              />
              <Button
                onClick={handleValidate}
                disabled={!isValid || isValidating}
                className="bg-signal-blue hover:bg-signal-blue/90"
              >
                {isValidating ? 'Validating...' : 'Validate'}
              </Button>
            </div>

            {/* Sprint 5: File type selector */}
            <div className="space-y-2">
              <Label htmlFor="file-type-dashboard" className="text-sm font-medium text-ink">
                File Location
              </Label>
              <Select value={fileType} onValueChange={(value) => setFileType(value as LlmsTxtFileType)}>
                <SelectTrigger className="border-mist focus:ring-signal-blue">
                  <SelectValue placeholder="Select file type" />
                </SelectTrigger>
                <SelectContent>
                  {FILE_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {url && (
              <p className="text-xs text-stone-brand">
                Will check: {normalizeUrl(url)}{fileType === 'auto'
                  ? ' at all standard locations'
                  : FILE_TYPE_OPTIONS.find((o) => o.value === fileType)?.path}
              </p>
            )}
            <div className="flex items-center space-x-2">
              <Switch
                id="robots-check-dashboard"
                checked={includeRobotsTxt}
                onCheckedChange={setIncludeRobotsTxt}
              />
              <Label htmlFor="robots-check-dashboard" className="text-sm text-ink cursor-pointer">
                Check for robots.txt conflicts
              </Label>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="border-mist bg-error/10">
          <CardContent className="p-4">
            <p className="text-sm text-error">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Validation Results */}
      {validationResult && (
        <>
          {/* Score Card */}
          <Card className={`border-2 ${getScoreBgColor(validationResult.score)}`}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-ink mb-1">
                    Validation Score
                  </h3>
                  <p className="text-sm text-slate-brand">
                    {validationResult.valid ? (
                      <span className="flex items-center text-success">
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Valid llms.txt file
                      </span>
                    ) : (
                      <span className="flex items-center text-error">
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Issues found
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-5xl font-bold ${getScoreColor(validationResult.score)}`}>
                    {validationResult.score}
                  </div>
                  <div className="text-sm text-stone-brand">out of 100</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Issues */}
          {validationResult.issues && validationResult.issues.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Issues Found ({validationResult.issues.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {validationResult.issues.map((issue: any, index: number) => (
                    <div
                      key={index}
                      className="p-3 bg-cloud rounded-md border border-mist"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-ink">{issue.message}</p>
                          {issue.suggestion && (
                            <p className="text-xs text-slate-brand mt-1">💡 {issue.suggestion}</p>
                          )}
                        </div>
                        <Badge
                          variant={
                            issue.severity === 'error'
                              ? 'destructive'
                              : issue.severity === 'warning'
                                ? 'outline'
                                : 'secondary'
                          }
                          className="ml-2 uppercase text-xs"
                        >
                          {issue.severity}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          {validationResult.recommendations && validationResult.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recommendations ({validationResult.recommendations.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {validationResult.recommendations.map((rec: any, index: number) => (
                    <div
                      key={index}
                      className="p-3 bg-signal-blue/10 rounded-md border border-mist"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-ink">{rec.title}</p>
                          <p className="text-xs text-mastery-blue mt-1">{rec.description}</p>
                        </div>
                        <Badge variant="outline" className="ml-2">
                          {rec.priority}
                        </Badge>
                      </div>
                      {rec.actionUrl && rec.actionLabel && (
                        <Link
                          href={`${rec.actionUrl}?url=${encodeURIComponent(url)}`}
                          className="inline-flex items-center px-3 py-1.5 bg-mastery-blue text-white text-sm font-medium rounded-md hover:bg-mastery-blue/90 transition-colors"
                        >
                          {rec.actionLabel}
                          <ArrowRight className="ml-2 h-3 w-3" />
                        </Link>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Perfect Score */}
          {validationResult.score === 100 &&
            validationResult.issues.length === 0 &&
            validationResult.recommendations.length === 0 && (
              <Card className="bg-success/10 border-mist">
                <CardContent className="p-6 text-center">
                  <CheckCircle className="h-12 w-12 text-success mx-auto mb-3" />
                  <h3 className="text-xl font-bold text-ink mb-2">Perfect Score!</h3>
                  <p className="text-success">
                    Your llms.txt file follows all best practices.
                  </p>
                </CardContent>
              </Card>
            )}
        </>
      )}
    </div>
  );
}

function SettingsSection() {
  const { user, signOut } = useAuth();

  const handleSignOut = async () => {
    if (confirm('Are you sure you want to sign out?')) {
      await signOut();
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Account Settings</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Security</h4>
              <div className="space-y-2">
                <Button variant="outline" size="sm">
                  Change Password
                </Button>
                <Button variant="outline" size="sm">
                  Two-Factor Authentication
                </Button>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-medium mb-2">Preferences</h4>
              <div className="space-y-2">
                <Button variant="outline" size="sm">
                  Email Notifications
                </Button>
                <Button variant="outline" size="sm">
                  Export Data
                </Button>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-medium mb-2 text-error">Danger Zone</h4>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="text-error border-mist hover:bg-error/10"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-error border-mist hover:bg-error/10"
                >
                  Delete Account
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Dashboard() {
  const { user } = useAuth();

  useSEO({
    title: 'Dashboard - Manage Your Analyses',
    description: 'View your analysis history, manage subscriptions, and track your llms.txt file generation usage.',
  });

  // Check for tab parameter in URL
  const getDefaultTab = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    return ['overview', 'analyses', 'validator', 'billing', 'settings'].includes(tab || '')
      ? tab || 'overview'
      : 'overview';
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-cloud">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <img
                  src="/images/logo-primary.png"
                  alt="LLM.txt Mastery"
                  className="h-16 md:h-20 w-auto"
                />
                <div>
                  <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
                  <p className="text-sm text-slate-brand">Welcome back, {user?.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <Badge className={getTierColor(user?.tier || 'starter')}>
                  <div className="flex items-center space-x-1">
                    {getTierIcon(user?.tier || 'starter')}
                    <span>{getTierDisplayName(user?.tier || 'starter')}</span>
                  </div>
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => (window.location.href = '/analyze')}
                >
                  Back to App
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    sessionStorage.removeItem('auth_access_token');
                    sessionStorage.removeItem('auth_refresh_token');
                    sessionStorage.removeItem('auth_user');
                    window.location.href = '/';
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Tabs defaultValue={getDefaultTab()} className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="overview" className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Overview</span>
              </TabsTrigger>
              <TabsTrigger value="analyses" className="flex items-center space-x-2">
                <Activity className="h-4 w-4" />
                <span>My Analyses</span>
              </TabsTrigger>
              <TabsTrigger value="validator" className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Validator</span>
              </TabsTrigger>
              <TabsTrigger value="billing" className="flex items-center space-x-2">
                <CreditCard className="h-4 w-4" />
                <span>Billing</span>
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              {/* Instant Refund Button - Only shows if eligible */}
              <div className="mb-6">
                <InstantRefundButton />
              </div>
              <AccountOverview />
            </TabsContent>

            <TabsContent value="analyses">
              <AnalysisHistory />
            </TabsContent>

            <TabsContent value="validator">
              <ValidatorSection />
            </TabsContent>

            <TabsContent value="billing">
              <BillingSection />
            </TabsContent>

            <TabsContent value="settings">
              <SettingsSection />
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </ProtectedRoute>
  );
}

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AnalysisHistory } from '@/components/AnalysisHistory';
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
  ExternalLink
} from 'lucide-react';
import { getSubscriptionStatus, createPortalSession, TIER_PRICING, type SubscriptionStatus } from '@/lib/stripe';
import { getTierDisplayName } from '@/lib/tier-utils';

const getTierIcon = (tier: string) => {
  switch (tier) {
    case 'coffee': return <Coffee className="h-4 w-4" />;
    case 'growth': return <Zap className="h-4 w-4" />;
    case 'scale': return <Crown className="h-4 w-4" />;
    default: return <User className="h-4 w-4" />;
  }
};

const getTierColor = (tier: string) => {
  switch (tier) {
    case 'coffee': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'growth': return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'scale': return 'bg-purple-100 text-purple-800 border-purple-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
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
              <label className="text-sm font-medium text-gray-600">Email Address</label>
              <div className="flex items-center space-x-2 mt-1">
                <Mail className="h-4 w-4 text-gray-400" />
                <span className="text-sm">{user.email}</span>
                {user.emailVerified ? (
                  <Badge variant="secondary" className="text-xs">
                    <Shield className="h-3 w-3 mr-1" />
                    Verified
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-yellow-600">
                    Pending verification
                  </Badge>
                )}
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium text-gray-600">Member Since</label>
              <div className="flex items-center space-x-2 mt-1">
                <Calendar className="h-4 w-4 text-gray-400" />
                <span className="text-sm">
                  {new Date(user.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
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
            {user.tier === 'coffee' && (
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-orange-800">Coffee Credits</h4>
                  <Badge variant="outline" className="text-orange-600 border-orange-300">
                    {user.creditsRemaining} credit{user.creditsRemaining !== 1 ? 's' : ''} remaining
                  </Badge>
                </div>
                <p className="text-sm text-orange-700 mb-3">
                  Each credit allows one full website analysis (up to 200 pages) with AI enhancement.
                </p>
                {user.creditsRemaining === 0 && (
                  <div className="text-sm text-orange-800">
                    <p className="mb-2">🎯 <strong>Ready for more analysis?</strong></p>
                    <p>Purchase another Coffee credit or upgrade to unlimited access with Growth or Scale plans.</p>
                  </div>
                )}
              </div>
            )}

            {/* Starter Tier Status */}
            {user.tier === 'starter' && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-2">Free Starter Plan</h4>
                <p className="text-sm text-gray-600 mb-3">
                  You're currently on the free plan with basic website analysis (up to 20 pages).
                </p>
                <p className="text-sm text-gray-700">
                  <strong>Upgrade benefits:</strong> More pages, AI-enhanced analysis, priority support, and more.
                </p>
              </div>
            )}

            {/* Growth/Scale Tier Status */}
            {(['growth', 'scale'].includes(user.tier)) && (
              <div className={`border rounded-lg p-4 ${
                user.tier === 'growth' ? 'bg-blue-50 border-blue-200' : 'bg-purple-50 border-purple-200'
              }`}>
                <h4 className={`font-medium mb-2 ${
                  user.tier === 'growth' ? 'text-blue-800' : 'text-purple-800'
                }`}>
                  {user.tier === 'growth' ? 'Growth Plan' : 'Scale Plan'}
                </h4>
                <p className={`text-sm mb-3 ${
                  user.tier === 'growth' ? 'text-blue-700' : 'text-purple-700'
                }`}>
                  You have access to unlimited website analysis and premium features.
                </p>
                <div className="text-sm">
                  <strong>Active features:</strong>
                  <ul className={`list-disc list-inside mt-1 space-y-1 ${
                    user.tier === 'growth' ? 'text-blue-600' : 'text-purple-600'
                  }`}>
                    <li>100 monthly analyses</li>
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
  
  const handleUpgrade = async (tier: 'coffee' | 'growth' | 'scale') => {
    try {
      setUpgradeLoading(tier);
      const token = getAccessToken();
      if (!token) throw new Error('Authentication required');
      
      // Determine the endpoint based on tier
      let endpoint = '';
      if (tier === 'coffee') {
        endpoint = '/api/stripe/create-coffee-checkout';
      } else if (tier === 'growth') {
        endpoint = '/api/stripe/create-growth-checkout';
      } else if (tier === 'scale') {
        endpoint = '/api/stripe/create-scale-checkout';
      }
      
      // Create checkout session
      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          email: user?.email || ''
        })
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {subscriptionStatus?.hasActiveSubscription ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div>
                      <h4 className="font-medium text-green-800">Active Subscription</h4>
                      <p className="text-sm text-green-600">
                        {user.tier === 'growth' ? 'Growth Plan' : user.tier === 'scale' ? 'Scale Plan' : 'Active Plan'}
                      </p>
                    </div>
                    <Badge className="bg-green-100 text-green-800 border-green-200">
                      Active
                    </Badge>
                  </div>
                  
                  <div className="space-y-3">
                    <Button 
                      onClick={handleManageBilling}
                      disabled={portalLoading}
                      className="w-full bg-blue-600 hover:bg-blue-700"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      {portalLoading ? 'Opening...' : 'View Billing Details & Invoices'}
                    </Button>
                    
                    <Button 
                      onClick={handleManageBilling}
                      disabled={portalLoading}
                      variant="outline"
                      className="w-full border-orange-300 text-orange-600 hover:bg-orange-50"
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Update Payment Method
                    </Button>
                    
                    <Button 
                      onClick={handleManageBilling}
                      disabled={portalLoading}
                      variant="outline"
                      className="w-full border-red-300 text-red-600 hover:bg-red-50"
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Cancel Subscription (Instant)
                    </Button>
                    
                    <div className="text-xs text-gray-500 text-center mt-2">
                      All billing changes are processed securely through Stripe.
                      <br />Cancellations take effect immediately - no hoops to jump through.
                    </div>
                  </div>
                </div>
              ) : user.tier === 'coffee' ? (
                <div className="space-y-4">
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <h4 className="font-medium text-orange-800">Coffee Credits</h4>
                    <p className="text-sm text-orange-600 mt-1">
                      You have {user.creditsRemaining} analysis credit{user.creditsRemaining !== 1 ? 's' : ''} remaining.
                    </p>
                    <p className="text-xs text-orange-500 mt-2">
                      Coffee tier is a monthly subscription for 100 analyses per month.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No active subscriptions</p>
                  <p className="text-sm mt-2">Upgrade to Growth or Scale for subscription management</p>
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
          <p className="text-gray-600">Choose the plan that matches your ambition. Compare what you're missing:</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            
            {/* Coffee Tier */}
            <div className={`relative border-2 rounded-lg p-5 ${user.tier === 'coffee' ? 'border-orange-400 bg-orange-50' : user.tier === 'starter' ? 'border-orange-300 hover:border-orange-400 hover:bg-orange-50' : 'border-gray-200 opacity-60'} transition-all`}>
              {user.tier === 'coffee' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-orange-600 text-white text-xs px-3 py-1 rounded-full font-bold">
                  YOUR CURRENT PLAN
                </div>
              )}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Coffee className="h-6 w-6 text-orange-600" />
                  <h3 className="font-bold text-lg">Coffee</h3>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-orange-600">$100</div>
                  <div className="text-xs text-gray-500">per month</div>
                </div>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="bg-white border border-orange-200 rounded-md p-3">
                  <div className="text-sm font-semibold text-orange-800 mb-1">✅ 100 Monthly Analyses</div>
                  <div className="text-xs text-orange-600">vs FREE: Only 3 per day (90 per month max)</div>
                </div>
                
                <div className="bg-white border border-orange-200 rounded-md p-3">
                  <div className="text-sm font-semibold text-orange-800 mb-1">🔄 Keep Your LLM.txt Current</div>
                  <div className="text-xs text-orange-600">Update your file as your site changes - new pages, fresh content</div>
                </div>
                
                <div className="bg-white border border-orange-200 rounded-md p-3">
                  <div className="text-sm font-semibold text-orange-800 mb-1">📄 200 Pages per Analysis</div>
                  <div className="text-xs text-orange-600">vs FREE: Only 20 pages (miss critical content)</div>
                </div>
                
                <div className="bg-white border border-orange-200 rounded-md p-3">
                  <div className="text-sm font-semibold text-orange-800 mb-1">🤖 AI Quality Scoring</div>
                  <div className="text-xs text-orange-600">vs FREE: No AI analysis (basic HTML only)</div>
                </div>
                
                <div className="bg-white border border-orange-200 rounded-md p-3">
                  <div className="text-sm font-semibold text-orange-800 mb-1">💰 100 Analyses Monthly</div>
                  <div className="text-xs text-orange-600">$100/month for the cost of a coffee</div>
                </div>
              </div>
              
              {user.tier === 'starter' ? (
                <Button 
                  data-testid="upgrade-to-coffee"
                  className="w-full bg-orange-600 hover:bg-orange-700 font-bold"
                  onClick={() => handleUpgrade('coffee')}
                  disabled={upgradeLoading === 'coffee'}
                >
                  {upgradeLoading === 'coffee' ? 'Processing...' : '🚀 UPGRADE TO COFFEE - Beat Competitors Now'}
                </Button>
              ) : user.tier === 'coffee' ? (
                <div className="text-center py-2 text-orange-600 font-medium">
                  ✅ You're Using Coffee Plan
                </div>
              ) : (
                <div className="text-center py-2 text-gray-400 text-sm">
                  You've upgraded past this plan
                </div>
              )}
            </div>

            {/* Growth Tier */}
            <div className={`relative border-2 rounded-lg p-5 ${user.tier === 'growth' ? 'border-blue-400 bg-blue-50' : 'border-blue-300 hover:border-blue-400 hover:bg-blue-50'} transition-all transform hover:scale-105`}>
              {user.tier === 'growth' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white text-xs px-3 py-1 rounded-full font-bold">
                  YOUR CURRENT PLAN
                </div>
              )}
              {user.tier !== 'growth' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-green-600 text-white text-xs px-3 py-1 rounded-full font-bold">
                  🔥 POPULAR CHOICE
                </div>
              )}
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Zap className="h-6 w-6 text-blue-600" />
                  <h3 className="font-bold text-lg">Growth</h3>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-blue-600">$9.95</div>
                  <div className="text-xs text-gray-500">per month</div>
                </div>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="bg-white border border-blue-200 rounded-md p-3">
                  <div className="text-sm font-semibold text-blue-800 mb-1">🚀 EVERYTHING in Coffee +</div>
                  <div className="text-xs text-blue-600">All Coffee benefits included</div>
                </div>
                
                <div className="bg-white border border-blue-200 rounded-md p-3">
                  <div className="text-sm font-semibold text-blue-800 mb-1">📄 1,000 Pages per Analysis</div>
                  <div className="text-xs text-blue-600">vs Coffee: 5x more content discovery</div>
                </div>
                
                <div className="bg-white border border-blue-200 rounded-md p-3">
                  <div className="text-sm font-semibold text-blue-800 mb-1">⚡ Priority Processing</div>
                  <div className="text-xs text-blue-600">Skip the queue, get results faster</div>
                </div>
                
                <div className="bg-white border border-blue-200 rounded-md p-3">
                  <div className="text-sm font-semibold text-blue-800 mb-1">🎯 Advanced Analytics</div>
                  <div className="text-xs text-blue-600">Content quality insights & optimization tips</div>
                </div>
                
                <div className="bg-white border border-blue-200 rounded-md p-3">
                  <div className="text-sm font-semibold text-blue-800 mb-1">📂 Analysis History</div>
                  <div className="text-xs text-blue-600">Track your progress over time</div>
                </div>
              </div>
              
              {user.tier === 'growth' ? (
                <div className="text-center py-2 text-blue-600 font-medium">
                  ✅ You're Using Growth Plan
                </div>
              ) : (
                <Button 
                  data-testid="upgrade-to-growth"
                  className="w-full bg-blue-600 hover:bg-blue-700 font-bold"
                  onClick={() => handleUpgrade('growth')}
                  disabled={upgradeLoading === 'growth'}
                >
                  {upgradeLoading === 'growth' ? 'Processing...' : (user.tier === 'starter' ? '🚀 SKIP AHEAD TO GROWTH' : '⬆️ UPGRADE TO GROWTH')}
                </Button>
              )}
            </div>

            {/* Scale Tier */}
            <div className={`relative border-2 rounded-lg p-5 ${user.tier === 'scale' ? 'border-purple-400 bg-purple-50' : 'border-purple-300 hover:border-purple-400 hover:bg-purple-50'} transition-all transform hover:scale-105`}>
              {user.tier === 'scale' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white text-xs px-3 py-1 rounded-full font-bold">
                  YOUR CURRENT PLAN
                </div>
              )}
              {user.tier !== 'scale' && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-purple-600 text-white text-xs px-3 py-1 rounded-full font-bold">
                  👑 ULTIMATE POWER
                </div>
              )}
              
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Crown className="h-6 w-6 text-purple-600" />
                  <h3 className="font-bold text-lg">Scale</h3>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-purple-600">$19.95</div>
                  <div className="text-xs text-gray-500">per month</div>
                </div>
              </div>
              
              <div className="space-y-3 mb-6">
                <div className="bg-white border border-purple-200 rounded-md p-3">
                  <div className="text-sm font-semibold text-purple-800 mb-1">🚀 EVERYTHING in Growth +</div>
                  <div className="text-xs text-purple-600">All Growth benefits included</div>
                </div>
                
                <div className="bg-white border border-purple-200 rounded-md p-3">
                  <div className="text-sm font-semibold text-purple-800 mb-1">♾️ UNLIMITED Pages</div>
                  <div className="text-xs text-purple-600">Analyze massive sites (capped at $19.95 AI cost)</div>
                </div>
                
                <div className="bg-white border border-purple-200 rounded-md p-3">
                  <div className="text-sm font-semibold text-purple-800 mb-1">🤖 Full AI Analysis</div>
                  <div className="text-xs text-purple-600">AI processes ALL pages (not just samples)</div>
                </div>
                
                <div className="bg-white border border-purple-200 rounded-md p-3">
                  <div className="text-sm font-semibold text-purple-800 mb-1">🔗 API Access</div>
                  <div className="text-xs text-purple-600">Integrate with your tools & workflows</div>
                </div>
                
                <div className="bg-white border border-purple-200 rounded-md p-3">
                  <div className="text-sm font-semibold text-purple-800 mb-1">🏢 Multi-Site Management</div>
                  <div className="text-xs text-purple-600">Perfect for agencies & enterprises</div>
                </div>
                
                <div className="bg-white border border-purple-200 rounded-md p-3">
                  <div className="text-sm font-semibold text-purple-800 mb-1">📞 Direct Support Line</div>
                  <div className="text-xs text-purple-600">Email jamie@llmtxtmastery.com for priority help</div>
                </div>
              </div>
              
              {user.tier === 'scale' ? (
                <div className="text-center py-2 text-purple-600 font-medium">
                  ✅ You're Using Scale Plan
                </div>
              ) : (
                <Button 
                  data-testid="upgrade-to-scale"
                  className="w-full bg-purple-600 hover:bg-purple-700 font-bold"
                  onClick={() => handleUpgrade('scale')}
                  disabled={upgradeLoading === 'scale'}
                >
                  {upgradeLoading === 'scale' ? 'Processing...' : (user.tier === 'starter' ? '🚀 GO ENTERPRISE WITH SCALE' : user.tier === 'coffee' ? '⬆️ UPGRADE TO SCALE' : '⬆️ UPGRADE TO SCALE')}
                </Button>
              )}
            </div>
          </div>
          
          {/* Guarantee Section */}
          <div className="mt-8 bg-green-50 border-2 border-green-200 rounded-lg p-6 text-center">
            <h4 className="font-bold text-green-800 text-lg mb-2">🛡️ ZERO RISK GUARANTEE</h4>
            <p className="text-green-700 text-sm mb-3">
              Try any plan for 30 days. Not satisfied? Get every penny back, no questions asked.
            </p>
            <div className="flex justify-center space-x-6 text-xs text-green-600">
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
              <h4 className="font-medium mb-2 text-red-600">Danger Zone</h4>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleSignOut}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="text-red-600 border-red-300 hover:bg-red-50"
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

  // Check for tab parameter in URL
  const getDefaultTab = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    return ['overview', 'analyses', 'billing', 'settings'].includes(tab || '') ? (tab || 'overview') : 'overview';
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
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
                  <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                  <p className="text-sm text-gray-600">
                    Welcome back, {user?.email}
                  </p>
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
                  onClick={() => window.location.href = '/analyze'}
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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview" className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Overview</span>
              </TabsTrigger>
              <TabsTrigger value="analyses" className="flex items-center space-x-2">
                <Activity className="h-4 w-4" />
                <span>My Analyses</span>
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
              <AccountOverview />
            </TabsContent>

            <TabsContent value="analyses">
              <AnalysisHistory />
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
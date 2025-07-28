import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
                <span className="capitalize">{user.tier}</span>
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
                    <li>Unlimited daily analyses</li>
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
                  
                  <Button 
                    onClick={handleManageBilling}
                    disabled={portalLoading}
                    variant="outline"
                    className="w-full"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {portalLoading ? 'Opening...' : 'Manage Billing & Subscription'}
                  </Button>
                </div>
              ) : user.tier === 'coffee' ? (
                <div className="space-y-4">
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <h4 className="font-medium text-orange-800">Coffee Credits</h4>
                    <p className="text-sm text-orange-600 mt-1">
                      You have {user.creditsRemaining} analysis credit{user.creditsRemaining !== 1 ? 's' : ''} remaining.
                    </p>
                    <p className="text-xs text-orange-500 mt-2">
                      Coffee credits are one-time purchases and don't require subscription management.
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

      {/* Upgrade Options */}
      {user.tier === 'starter' || user.tier === 'coffee' ? (
        <Card>
          <CardHeader>
            <CardTitle>Upgrade Your Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Growth Plan</h4>
                  <div className="text-right">
                    <div className="text-lg font-bold">$25</div>
                    <div className="text-xs text-gray-500">per month</div>
                  </div>
                </div>
                <ul className="text-sm space-y-1 text-gray-600 mb-4">
                  <li>• Unlimited daily analyses</li>
                  <li>• Up to 1,000 pages per analysis</li>
                  <li>• AI-enhanced analysis</li>
                  <li>• Priority support</li>
                </ul>
                <Button className="w-full" size="sm">
                  Upgrade to Growth
                </Button>
              </div>

              <div className="border border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Scale Plan</h4>
                  <div className="text-right">
                    <div className="text-lg font-bold">$99</div>
                    <div className="text-xs text-gray-500">per month</div>
                  </div>
                </div>
                <ul className="text-sm space-y-1 text-gray-600 mb-4">
                  <li>• Everything in Growth</li>
                  <li>• Unlimited pages per analysis</li>
                  <li>• Full AI analysis for all pages</li>
                  <li>• API access</li>
                  <li>• Custom integrations</li>
                </ul>
                <Button className="w-full bg-purple-600 hover:bg-purple-700" size="sm">
                  Upgrade to Scale
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}
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

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-sm text-gray-600">
                  Welcome back, {user?.email}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <Badge className={getTierColor(user?.tier || 'starter')}>
                  <div className="flex items-center space-x-1">
                    {getTierIcon(user?.tier || 'starter')}
                    <span className="capitalize">{user?.tier || 'starter'}</span>
                  </div>
                </Badge>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.href = '/'}
                >
                  Back to App
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview" className="flex items-center space-x-2">
                <User className="h-4 w-4" />
                <span>Overview</span>
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
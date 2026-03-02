import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Switch } from '../ui/switch';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { Separator } from '../ui/separator';
import { useFeatureFlagAdmin } from '../../hooks/useFeatureFlags';
import { AlertCircle, Settings, Users, TrendingUp, RefreshCw } from 'lucide-react';

interface FeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage: number;
  environmentOverrides: Record<string, boolean>;
  userOverrides: Record<string, boolean>;
  metadata: {
    description: string;
    owner: string;
    createdAt: string;
    updatedAt: string;
    dependencies?: string[];
    tags?: string[];
  };
}

interface AdminStats {
  totalFlags: number;
  enabledFlags: number;
  rolloutFlags: number;
  userOverrides: number;
}

export default function FeatureFlagManager() {
  const { flags, loading, error, refresh, updateFlag, setUserOverride } = useFeatureFlagAdmin();
  const [editingFlag, setEditingFlag] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<FeatureFlag>>({});
  const [userOverrideForm, setUserOverrideForm] = useState({ userId: '', enabled: false });
  const [stats, setStats] = useState<AdminStats>({
    totalFlags: 0,
    enabledFlags: 0,
    rolloutFlags: 0,
    userOverrides: 0,
  });
  const [healthStatus, setHealthStatus] = useState<any>(null);

  useEffect(() => {
    if (flags.length > 0 && flags[0].stats) {
      setStats(flags[0].stats);
    }
    if (flags.length > 0 && flags[0].health) {
      setHealthStatus(flags[0].health);
    }
  }, [flags]);

  const handleFlagUpdate = async (flagName: string, updates: Partial<FeatureFlag>) => {
    const success = await updateFlag(flagName, updates);
    if (success) {
      setEditingFlag(null);
      setEditForm({});
    }
  };

  const handleUserOverride = async (flagName: string) => {
    if (!userOverrideForm.userId) return;

    const success = await setUserOverride(
      flagName,
      userOverrideForm.userId,
      userOverrideForm.enabled
    );
    if (success) {
      setUserOverrideForm({ userId: '', enabled: false });
    }
  };

  const getStatusColor = (flag: FeatureFlag) => {
    if (!flag.enabled) return 'secondary';
    if (flag.rolloutPercentage === 100) return 'default';
    if (flag.rolloutPercentage > 0) return 'outline';
    return 'secondary';
  };

  if (loading && flags.length === 0) {
    return (
      <div className="p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-signal-blue mx-auto"></div>
        <p className="text-center mt-4 text-slate-brand">Loading feature flags...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-6">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>Error loading feature flags: {error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Feature Flag Management</h1>
          <p className="text-slate-brand mt-2">Manage semantic enhancement feature rollouts</p>
        </div>
        <Button onClick={refresh} variant="outline" className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Settings className="h-8 w-8 text-signal-blue" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-brand">Total Flags</p>
                <p className="text-2xl font-bold">{stats.totalFlags}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-success" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-brand">Enabled</p>
                <p className="text-2xl font-bold">{stats.enabledFlags}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-action-amber" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-brand">In Rollout</p>
                <p className="text-2xl font-bold">{stats.rolloutFlags}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-slate-brand" />
              <div className="ml-4">
                <p className="text-sm font-medium text-slate-brand">User Overrides</p>
                <p className="text-2xl font-bold">{stats.userOverrides}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Health Status */}
      {healthStatus && (
        <Alert
          className={`mb-6 ${healthStatus.status === 'healthy' ? 'border-mist bg-success/10' : 'border-mist bg-error/10'}`}
        >
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>System Health:</strong> {healthStatus.status}
            {healthStatus.details && (
              <div className="mt-2 text-sm">
                Redis: {healthStatus.details.redis} | Cache Size: {healthStatus.details.cacheSize} |
                Last Update: {new Date(healthStatus.details.lastCacheUpdate).toLocaleString()}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Feature Flags List */}
      <div className="grid grid-cols-1 gap-6">
        {flags.map((flag: FeatureFlag) => (
          <Card key={flag.name} className="w-full">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-3">
                    <span className="font-mono">{flag.name}</span>
                    <Badge variant={getStatusColor(flag)}>
                      {!flag.enabled
                        ? 'Disabled'
                        : flag.rolloutPercentage === 100
                          ? 'Full Rollout'
                          : flag.rolloutPercentage === 0
                            ? 'No Rollout'
                            : `${flag.rolloutPercentage}% Rollout`}
                    </Badge>
                  </CardTitle>
                  <p className="text-slate-brand mt-1">{flag.metadata.description}</p>
                  <div className="flex gap-2 mt-2">
                    {flag.metadata.tags?.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingFlag(flag.name);
                    setEditForm(flag);
                  }}
                >
                  Edit
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              <Tabs defaultValue="settings" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                  <TabsTrigger value="overrides">Overrides</TabsTrigger>
                  <TabsTrigger value="info">Info</TabsTrigger>
                </TabsList>

                <TabsContent value="settings" className="space-y-4">
                  {editingFlag === flag.name ? (
                    <div className="space-y-4 p-4 border rounded-lg">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={editForm.enabled}
                          onCheckedChange={(enabled) => setEditForm({ ...editForm, enabled })}
                        />
                        <Label>Enabled</Label>
                      </div>

                      <div>
                        <Label>Rollout Percentage</Label>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={editForm.rolloutPercentage || 0}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              rolloutPercentage: parseInt(e.target.value),
                            })
                          }
                          className="w-24"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button onClick={() => handleFlagUpdate(flag.name, editForm)} size="sm">
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setEditingFlag(null);
                            setEditForm({});
                          }}
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <Switch checked={flag.enabled} disabled />
                        <span>Global Enable: {flag.enabled ? 'Yes' : 'No'}</span>
                      </div>
                      <div>
                        <span>Rollout: {flag.rolloutPercentage}%</span>
                      </div>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="overrides" className="space-y-4">
                  {/* Environment Overrides */}
                  <div>
                    <h4 className="font-semibold mb-2">Environment Overrides</h4>
                    <div className="space-y-2">
                      {Object.entries(flag.environmentOverrides).map(([env, enabled]) => (
                        <div
                          key={env}
                          className="flex items-center justify-between p-2 border rounded"
                        >
                          <span className="font-mono">{env}</span>
                          <Badge variant={enabled ? 'default' : 'secondary'}>
                            {enabled ? 'Enabled' : 'Disabled'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* User Overrides */}
                  <div>
                    <h4 className="font-semibold mb-2">User Overrides</h4>
                    {Object.keys(flag.userOverrides).length === 0 ? (
                      <p className="text-stone-brand">No user overrides</p>
                    ) : (
                      <div className="space-y-2">
                        {Object.entries(flag.userOverrides).map(([userId, enabled]) => (
                          <div
                            key={userId}
                            className="flex items-center justify-between p-2 border rounded"
                          >
                            <span>User {userId}</span>
                            <Badge variant={enabled ? 'default' : 'secondary'}>
                              {enabled ? 'Enabled' : 'Disabled'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add User Override */}
                    <div className="mt-4 p-3 border rounded-lg space-y-3">
                      <h5 className="font-medium">Add User Override</h5>
                      <div className="flex gap-2">
                        <Input
                          placeholder="User ID"
                          value={userOverrideForm.userId}
                          onChange={(e) =>
                            setUserOverrideForm({ ...userOverrideForm, userId: e.target.value })
                          }
                          className="flex-1"
                        />
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={userOverrideForm.enabled}
                            onCheckedChange={(enabled) =>
                              setUserOverrideForm({ ...userOverrideForm, enabled })
                            }
                          />
                          <Label>Enabled</Label>
                        </div>
                        <Button onClick={() => handleUserOverride(flag.name)}>Add</Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="info" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="font-semibold">Owner</Label>
                      <p>{flag.metadata.owner}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Created</Label>
                      <p>{new Date(flag.metadata.createdAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Last Updated</Label>
                      <p>{new Date(flag.metadata.updatedAt).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <Label className="font-semibold">Dependencies</Label>
                      {flag.metadata.dependencies?.length ? (
                        <div className="flex gap-1 mt-1">
                          {flag.metadata.dependencies.map((dep) => (
                            <Badge key={dep} variant="outline" className="text-xs">
                              {dep}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p>None</p>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

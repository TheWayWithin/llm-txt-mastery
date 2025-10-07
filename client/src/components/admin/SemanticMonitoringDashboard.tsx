import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  Activity,
  Clock,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Zap,
  Users,
} from 'lucide-react';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface DashboardMetrics {
  overview: {
    totalRequests: number;
    successRate: number;
    avgResponseTime: number;
    totalCost: number;
    activeFeatures: string[];
  };
  featureBreakdown: Array<{
    feature: string;
    requests: number;
    successRate: number;
    avgDuration: number;
    cost: number;
  }>;
  performanceTrends: Array<{
    timestamp: Date;
    responseTime: number;
    throughput: number;
    errorRate: number;
  }>;
  alerts: Array<{
    type: 'performance' | 'error' | 'cost';
    severity: 'low' | 'medium' | 'high';
    message: string;
    timestamp: Date;
  }>;
}

interface FeatureMetrics {
  operationBreakdown: Array<{
    operation: string;
    requests: number;
    successRate: number;
    avgDuration: number;
    totalTokens: number;
    totalCost: number;
  }>;
  timeSeries: Array<{
    timestamp: Date;
    avgDuration: number;
    requests: number;
    errorRate: number;
  }>;
}

const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0'];

export default function SemanticMonitoringDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [featureMetrics, setFeatureMetrics] = useState<Record<string, FeatureMetrics>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'1h' | '6h' | '24h' | '7d'>('24h');
  const [selectedFeature, setSelectedFeature] = useState<string>('');

  const fetchDashboardMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/semantic/metrics/dashboard?timeRange=${timeRange}`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch metrics: ${response.statusText}`);
      }

      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load metrics');
    } finally {
      setLoading(false);
    }
  };

  const fetchFeatureMetrics = async (feature: string) => {
    try {
      const response = await fetch(
        `/api/semantic/metrics/feature/${feature}?timeRange=${timeRange}`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('auth_token')}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch feature metrics: ${response.statusText}`);
      }

      const data = await response.json();
      setFeatureMetrics((prev) => ({ ...prev, [feature]: data }));
    } catch (err) {
      console.error('Error fetching feature metrics:', err);
    }
  };

  useEffect(() => {
    fetchDashboardMetrics();
  }, [timeRange]);

  useEffect(() => {
    if (selectedFeature) {
      fetchFeatureMetrics(selectedFeature);
    }
  }, [selectedFeature, timeRange]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (loading && !metrics) {
    return (
      <div className="p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-center mt-4 text-gray-600">Loading monitoring dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="m-6">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>Error loading monitoring dashboard: {error}</AlertDescription>
      </Alert>
    );
  }

  if (!metrics) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Semantic Features Monitoring</h1>
          <p className="text-gray-600 mt-2">Real-time performance and usage analytics</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={timeRange} onValueChange={(value: any) => setTimeRange(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Last 1h</SelectItem>
              <SelectItem value="6h">Last 6h</SelectItem>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7d</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchDashboardMetrics} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Activity className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold">
                  {metrics.overview.totalRequests.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold">{metrics.overview.successRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-orange-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                <p className="text-2xl font-bold">
                  {formatDuration(metrics.overview.avgResponseTime)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Cost</p>
                <p className="text-2xl font-bold">{formatCurrency(metrics.overview.totalCost)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Zap className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Active Features</p>
                <p className="text-2xl font-bold">{metrics.overview.activeFeatures.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {metrics.alerts.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Active Alerts ({metrics.alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.alerts.map((alert, index) => (
                <Alert key={index} variant={alert.severity === 'high' ? 'destructive' : 'default'}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant={getSeverityColor(alert.severity) as any}>
                        {alert.severity}
                      </Badge>
                      <span>{alert.message}</span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="features">Feature Analysis</TabsTrigger>
          <TabsTrigger value="performance">Performance Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Feature Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Feature Usage Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={metrics.featureBreakdown}
                      dataKey="requests"
                      nameKey="feature"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      label={({ feature, requests }) => `${feature}: ${requests}`}
                    >
                      {metrics.featureBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Feature Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.featureBreakdown}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="feature" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="successRate" fill="#82ca9d" name="Success Rate %" />
                    <Bar dataKey="avgDuration" fill="#8884d8" name="Avg Duration (ms)" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Feature Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>Feature Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Feature</th>
                      <th className="text-right p-2">Requests</th>
                      <th className="text-right p-2">Success Rate</th>
                      <th className="text-right p-2">Avg Duration</th>
                      <th className="text-right p-2">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.featureBreakdown.map((feature) => (
                      <tr key={feature.feature} className="border-b hover:bg-gray-50">
                        <td className="p-2 font-medium">{feature.feature}</td>
                        <td className="p-2 text-right">{feature.requests.toLocaleString()}</td>
                        <td className="p-2 text-right">{feature.successRate.toFixed(1)}%</td>
                        <td className="p-2 text-right">{formatDuration(feature.avgDuration)}</td>
                        <td className="p-2 text-right">{formatCurrency(feature.cost)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-6">
          {/* Feature Selector */}
          <Card>
            <CardHeader>
              <CardTitle>Feature Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedFeature} onValueChange={setSelectedFeature}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select a feature to analyze" />
                </SelectTrigger>
                <SelectContent>
                  {metrics.overview.activeFeatures.map((feature) => (
                    <SelectItem key={feature} value={feature}>
                      {feature}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Feature Metrics */}
          {selectedFeature && featureMetrics[selectedFeature] && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Operation Breakdown - {selectedFeature}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Operation</th>
                          <th className="text-right p-2">Requests</th>
                          <th className="text-right p-2">Success Rate</th>
                          <th className="text-right p-2">Avg Duration</th>
                          <th className="text-right p-2">Tokens</th>
                          <th className="text-right p-2">Cost</th>
                        </tr>
                      </thead>
                      <tbody>
                        {featureMetrics[selectedFeature].operationBreakdown.map((op) => (
                          <tr key={op.operation} className="border-b hover:bg-gray-50">
                            <td className="p-2 font-medium">{op.operation}</td>
                            <td className="p-2 text-right">{op.requests.toLocaleString()}</td>
                            <td className="p-2 text-right">{op.successRate.toFixed(1)}%</td>
                            <td className="p-2 text-right">{formatDuration(op.avgDuration)}</td>
                            <td className="p-2 text-right">{op.totalTokens.toLocaleString()}</td>
                            <td className="p-2 text-right">{formatCurrency(op.totalCost)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Performance Over Time - {selectedFeature}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={featureMetrics[selectedFeature].timeSeries}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="timestamp"
                        tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                      />
                      <YAxis yAxisId="left" />
                      <YAxis yAxisId="right" orientation="right" />
                      <Tooltip labelFormatter={(value) => new Date(value).toLocaleString()} />
                      <Legend />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="avgDuration"
                        stroke="#8884d8"
                        name="Avg Duration (ms)"
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="requests"
                        stroke="#82ca9d"
                        name="Requests"
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="errorRate"
                        stroke="#ff7c7c"
                        name="Error Rate (%)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="performance" className="space-y-6">
          {/* Performance Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <AreaChart data={metrics.performanceTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                  />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip labelFormatter={(value) => new Date(value).toLocaleString()} />
                  <Legend />
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="responseTime"
                    stackId="1"
                    stroke="#8884d8"
                    fill="#8884d8"
                    name="Response Time (ms)"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="throughput"
                    stackId="2"
                    stroke="#82ca9d"
                    fill="#82ca9d"
                    name="Throughput (req/h)"
                  />
                  <Area
                    yAxisId="right"
                    type="monotone"
                    dataKey="errorRate"
                    stackId="3"
                    stroke="#ff7c7c"
                    fill="#ff7c7c"
                    name="Error Rate (%)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

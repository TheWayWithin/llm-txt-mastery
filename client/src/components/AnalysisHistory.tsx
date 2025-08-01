import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Activity,
  Globe,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Search,
  RefreshCw,
  Download,
  Eye,
  ExternalLink
} from 'lucide-react';
import { Link } from 'wouter';

interface Analysis {
  id: number;
  url: string;
  status: 'pending' | 'analyzing' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  totalPages: number;
  siteType: 'single-page' | 'multi-page' | 'unknown';
  analysisMethod: string;
  processingTime: number;
  tier: string;
  discoveredPagesCount: number;
  metrics?: {
    cacheHit?: boolean;
    processingTime?: number;
    apiCalls?: number;
    costSaved?: number;
    analyzedPages?: number;
    cachedPages?: number;
    aiCallsUsed?: number;
    htmlExtractionsUsed?: number;
  };
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'failed':
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    case 'analyzing':
    case 'processing':
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    default:
      return <Clock className="h-4 w-4 text-yellow-500" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'failed':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'analyzing':
    case 'processing':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
  }
};

const getTierColor = (tier: string) => {
  switch (tier) {
    case 'coffee':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'growth':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'scale':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export function AnalysisHistory() {
  const { getAccessToken } = useAuth();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'pages'>('newest');

  useEffect(() => {
    loadAnalyses();
  }, []);

  const loadAnalyses = async () => {
    try {
      setLoading(true);
      const token = getAccessToken();
      if (!token) {
        console.error('No access token available');
        return;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://llm-txt-mastery-production.up.railway.app'}/api/auth/my-analyses`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setAnalyses(data.analyses || []);
    } catch (error) {
      console.error('Failed to load analyses:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedAnalyses = analyses
    .filter(analysis => {
      const matchesSearch = analysis.url.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || analysis.status === statusFilter;
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'pages':
          return b.discoveredPagesCount - a.discoveredPagesCount;
        default:
          return 0;
      }
    });

  const handleRerunAnalysis = async (url: string) => {
    try {
      // Navigate to the home page with the URL pre-filled
      window.location.href = `/?url=${encodeURIComponent(url)}&rerun=true`;
    } catch (error) {
      console.error('Failed to initiate re-run:', error);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-gray-600">Loading your analysis history...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>My Analyses</span>
            <Badge variant="outline" className="ml-2">
              {analyses.length} total
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by website URL..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="analyzing">In Progress</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>

            {/* Sort */}
            <Select value={sortBy} onValueChange={(value: 'newest' | 'oldest' | 'pages') => setSortBy(value)}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="pages">Most Pages</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Results */}
      {filteredAndSortedAnalyses.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Globe className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || statusFilter !== 'all' ? 'No matching analyses found' : 'No analyses yet'}
            </h3>
            <p className="text-gray-600 mb-6">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filter criteria' 
                : 'Start your first website analysis to see it here'
              }
            </p>
            {!searchTerm && statusFilter === 'all' && (
              <Link href="/">
                <a>
                  <Button>
                    <Globe className="h-4 w-4 mr-2" />
                    Start New Analysis
                  </Button>
                </a>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredAndSortedAnalyses.map((analysis) => (
            <Card key={analysis.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-3">
                      {getStatusIcon(analysis.status)}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 truncate">
                          {new URL(analysis.url).hostname}
                        </h3>
                        <p className="text-sm text-gray-500 truncate">
                          {analysis.url}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge className={getStatusColor(analysis.status)}>
                          {analysis.status}
                        </Badge>
                        <Badge className={getTierColor(analysis.tier)}>
                          {analysis.tier}
                        </Badge>
                      </div>
                    </div>

                    {/* Analysis Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-4">
                      <div>
                        <span className="font-medium">Pages Found:</span>
                        <div>{analysis.discoveredPagesCount}</div>
                      </div>
                      <div>
                        <span className="font-medium">Site Type:</span>
                        <div className="capitalize">{analysis.siteType}</div>
                      </div>
                      <div>
                        <span className="font-medium">Method:</span>
                        <div className="capitalize">{analysis.analysisMethod}</div>
                      </div>
                      <div>
                        <span className="font-medium">Created:</span>
                        <div>{new Date(analysis.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>

                    {/* Processing Time and Metrics */}
                    {analysis.metrics && (
                      <div className="text-xs text-gray-500 mb-4">
                        Processing: {analysis.processingTime}s
                        {analysis.metrics.aiCallsUsed && ` • AI calls: ${analysis.metrics.aiCallsUsed}`}
                        {analysis.metrics.cachedPages && ` • Cached: ${analysis.metrics.cachedPages}`}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2 ml-4">
                    {analysis.status === 'completed' && (
                      <>
                        <Link href={`/analysis/${analysis.id}`}>
                          <a>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              View
                            </Button>
                          </a>
                        </Link>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleRerunAnalysis(analysis.url)}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Re-run
                        </Button>
                      </>
                    )}
                    {analysis.status === 'analyzing' && (
                      <Button variant="outline" size="sm" disabled>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing
                      </Button>
                    )}
                    {analysis.status === 'failed' && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleRerunAnalysis(analysis.url)}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Retry
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
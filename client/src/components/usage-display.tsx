import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Zap, TrendingUp, DollarSign, Clock } from "lucide-react";

interface UsageDisplayProps {
  userEmail: string;
}

export default function UsageDisplay({ userEmail }: UsageDisplayProps) {
  const { data: usageData } = useQuery({
    queryKey: ["/api/usage", userEmail],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/usage/${encodeURIComponent(userEmail)}`);
      return response.json();
    },
    enabled: !!userEmail,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (!usageData) return null;

  const analysisPercentage = (usageData.usage.analysesToday / usageData.limits.dailyAnalyses) * 100;
  const costSaved = usageData.usage.costToday ? (usageData.usage.cacheHitsToday * 0.03 * 0.7).toFixed(2) : "0.00";

  return (
    <Card className="bg-slate-50 border-slate-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-framework-black">Your Usage Today</h4>
          <span className="text-xs bg-mastery-blue text-white px-2 py-1 rounded">
            {usageData.tier.toUpperCase()}
          </span>
        </div>
        
        <div className="space-y-3">
          {/* Daily Analyses */}
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-ai-silver">Daily Analyses</span>
              <span className="text-framework-black font-medium">
                {usageData.usage.analysesToday} / {usageData.limits.dailyAnalyses}
              </span>
            </div>
            <Progress value={analysisPercentage} className="h-1.5" />
          </div>

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <div className="flex items-center space-x-2">
              <Zap className="w-4 h-4 text-innovation-teal" />
              <div>
                <p className="text-xs text-ai-silver">Cache Hits</p>
                <p className="text-sm font-semibold text-framework-black">
                  {usageData.usage.cacheHitsToday}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              <div>
                <p className="text-xs text-ai-silver">Saved Today</p>
                <p className="text-sm font-semibold text-framework-black">
                  ${costSaved}
                </p>
              </div>
            </div>
          </div>

          {/* Tier Features */}
          <div className="pt-2 border-t border-slate-200">
            <p className="text-xs text-ai-silver mb-1">Your tier includes:</p>
            <div className="space-y-1">
              <p className="text-xs text-framework-black">
                • Max {usageData.limits.maxPagesPerAnalysis} pages per analysis
              </p>
              {usageData.limits.aiPagesLimit > 0 && (
                <p className="text-xs text-framework-black">
                  • AI analysis for first {usageData.limits.aiPagesLimit} pages
                </p>
              )}
              {usageData.features.smartCaching && (
                <p className="text-xs text-framework-black">
                  • Smart caching with change detection
                </p>
              )}
            </div>
          </div>

          {/* Upgrade Prompt */}
          {usageData.tier !== 'scale' && analysisPercentage >= 80 && (
            <div className="pt-2 border-t border-slate-200">
              <p className="text-xs text-ai-silver">
                Running low on analyses? 
                <a href="#upgrade" className="text-mastery-blue ml-1 hover:underline">
                  Upgrade your plan
                </a>
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
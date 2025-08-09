import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Zap, TrendingUp, DollarSign, Clock, Coffee } from "lucide-react";
import { getTierDisplayName, getTierColorClass } from "@/lib/tier-utils";

interface UsageDisplayProps {
  userEmail: string;
}

export default function UsageDisplay({ userEmail }: UsageDisplayProps) {
  const { data: usageData } = useQuery({
    queryKey: ["/api/usage", userEmail],
    queryFn: async () => {
      console.log(`🔍 Fetching usage data for: ${userEmail}`);
      
      // Add cache-busting parameter to ensure fresh data
      const timestamp = Date.now();
      const response = await apiRequest("GET", `/api/usage/${encodeURIComponent(userEmail)}?t=${timestamp}`);
      const data = await response.json();
      
      console.log(`📊 Usage data received for ${userEmail}:`, {
        tier: data.tier,
        dailyAnalyses: data.limits?.dailyAnalyses,
        currentUsage: data.usage?.analysesToday
      });
      
      return data;
    },
    enabled: !!userEmail,
    refetchInterval: 5000, // Refresh every 5 seconds for immediate updates
    staleTime: 0, // Always refetch
    cacheTime: 0, // Don't cache
    refetchOnWindowFocus: true, // Refetch when window gains focus
    refetchOnMount: 'always', // Always refetch on mount
  });

  if (!usageData) return null;

  const analysisPercentage = (usageData.usage.analysesToday / usageData.limits.dailyAnalyses) * 100;
  const costSaved = usageData.usage.costToday ? (usageData.usage.cacheHitsToday * 0.03 * 0.7).toFixed(2) : "0.00";
  const isCoffeeTier = usageData.tier === 'coffee';
  const creditsRemaining = usageData.usage.creditsRemaining || 0;

  return (
    <Card className="bg-slate-50 border-slate-200">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-framework-black">
            {isCoffeeTier ? '☕ Premium Credits' : 'Today\'s Progress'}
          </h4>
          <span className={`text-xs px-2 py-1 rounded font-medium ${
            isCoffeeTier 
              ? 'bg-orange-100 text-orange-800 border border-orange-300' 
              : usageData.tier === 'starter'
              ? 'bg-green-100 text-green-800 border border-green-300'
              : usageData.tier === 'growth'
              ? 'bg-teal-100 text-teal-800 border border-teal-300'
              : 'bg-blue-100 text-blue-800 border border-blue-300'
          }`}>
            {getTierDisplayName(usageData.tier)}
          </span>
        </div>
        
        <div className="space-y-3">
          {/* Credits for Coffee Tier or Daily Analyses for Others */}
          {isCoffeeTier ? (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-ai-silver">Analysis Credits</span>
                <span className="text-framework-black font-medium">
                  {creditsRemaining} {creditsRemaining === 1 ? 'credit' : 'credits'} left
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <Coffee className="w-5 h-5 text-orange-600 flex-shrink-0" />
                <div className="flex-1 bg-orange-100 rounded-full h-3">
                  <div 
                    className="bg-orange-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: creditsRemaining > 0 ? '100%' : '0%' }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-ai-silver">Daily Analyses</span>
                <span className="text-framework-black font-medium">
                  {usageData.usage.analysesToday} / {usageData.limits.dailyAnalyses}
                </span>
              </div>
              <Progress value={analysisPercentage} className="h-1.5" />
            </div>
          )}

          {/* Statistics Grid */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="flex items-center space-x-3">
              <Zap className="w-5 h-5 text-innovation-teal flex-shrink-0" />
              <div>
                <p className="text-xs text-ai-silver">Cache Hits</p>
                <p className="text-sm font-semibold text-framework-black">
                  {usageData.usage.cacheHitsToday}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <DollarSign className="w-5 h-5 text-green-600 flex-shrink-0" />
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
              {usageData.tier === 'starter' && (
                <p className="text-xs text-framework-black">
                  • 3 free analyses per day
                </p>
              )}
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

          {/* Upgrade Prompts */}
          {usageData.tier === 'starter' && analysisPercentage >= 100 && (
            <div className="pt-2 border-t border-slate-200">
              <p className="text-xs text-red-600 font-medium mb-2">
                🚫 Daily limit reached! Upgrade to continue analyzing.
              </p>
              <p className="text-xs text-ai-silver mb-3">
                Get unlimited daily analyses with AI-enhanced results for just $4.95
              </p>
              <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                <button 
                  onClick={() => window.location.href = '/api/stripe/create-coffee-checkout?email=' + encodeURIComponent(userEmail)}
                  className="text-xs bg-orange-600 text-white px-4 py-3 rounded hover:bg-orange-700 transition-colors text-center min-h-[44px] flex items-center justify-center cursor-pointer"
                >
                  ☕ Buy me a coffee ($4.95)
                </button>
                <button 
                  onClick={() => window.location.href = '/#pricing'}
                  className="text-xs text-mastery-blue hover:underline py-3 text-center min-h-[44px] flex items-center justify-center cursor-pointer"
                >
                  See all options
                </button>
              </div>
            </div>
          )}
          
          {usageData.tier === 'starter' && analysisPercentage >= 67 && analysisPercentage < 100 && (
            <div className="pt-2 border-t border-slate-200">
              <p className="text-xs text-amber-600 font-medium mb-2">
                ⚡ Almost at your daily limit! Keep the momentum going?
              </p>
              <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                <button 
                  onClick={() => window.location.href = '/api/stripe/create-coffee-checkout?email=' + encodeURIComponent(userEmail)}
                  className="text-xs bg-orange-600 text-white px-4 py-3 rounded hover:bg-orange-700 transition-colors text-center min-h-[44px] flex items-center justify-center cursor-pointer"
                >
                  ☕ Buy me a coffee ($4.95)
                </button>
                <button 
                  onClick={() => window.location.href = '/#pricing'}
                  className="text-xs text-mastery-blue hover:underline py-3 text-center min-h-[44px] flex items-center justify-center cursor-pointer"
                >
                  See all options
                </button>
              </div>
            </div>
          )}
          
          {isCoffeeTier && creditsRemaining === 0 && (
            <div className="pt-2 border-t border-slate-200">
              <p className="text-xs text-ai-silver mb-2">
                ☕ Ready for another premium analysis? Perfect timing!
              </p>
              <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                <a href="/pricing" className="text-xs bg-orange-600 text-white px-4 py-3 rounded hover:bg-orange-700 transition-colors text-center min-h-[44px] flex items-center justify-center">
                  Another Coffee ($4.95)
                </a>
                <a href="/pricing" className="text-xs text-mastery-blue hover:underline py-3 text-center min-h-[44px] flex items-center justify-center">
                  Go unlimited
                </a>
              </div>
            </div>
          )}
          
          {usageData.tier === 'growth' && analysisPercentage >= 80 && (
            <div className="pt-2 border-t border-slate-200">
              <p className="text-xs text-ai-silver">
                🚀 Ready for unlimited AI analysis? 
                <a href="/pricing" className="text-mastery-blue ml-1 hover:underline">
                  Scale up now
                </a>
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
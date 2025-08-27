import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Zap, TrendingUp, DollarSign, Clock, Coffee } from "lucide-react";
import { getTierDisplayName, getTierColorClass } from "@/lib/tier-utils";
import { useToast } from "@/hooks/use-toast";

interface UsageDisplayProps {
  userEmail: string;
  usageData?: any; // Optional: accept usage data as prop to avoid duplicate fetching
}

export default function UsageDisplay({ userEmail, usageData: propUsageData }: UsageDisplayProps) {
  const { toast } = useToast();
  
  // Only fetch if usageData not provided as prop (backwards compatibility)
  const { data: fetchedUsageData } = useQuery({
    queryKey: ["/api/usage", userEmail],
    queryFn: async () => {
      console.log(`🔍 Fetching usage data for: ${userEmail}`);
      
      const response = await apiRequest("GET", `/api/usage/${encodeURIComponent(userEmail)}`);
      const data = await response.json();
      
      console.log(`📊 Usage data received for ${userEmail}:`, {
        tier: data.tier,
        dailyAnalyses: data.limits?.dailyAnalyses,
        maxPagesPerAnalysis: data.limits?.maxPagesPerAnalysis,
        currentUsage: data.usage?.analysesToday,
        creditsRemaining: data.creditsRemaining
      });
      
      return data;
    },
    enabled: !!userEmail && !propUsageData, // Don't fetch if data provided as prop
    refetchInterval: 60000, // Less aggressive - 60 seconds
    staleTime: 30000, // Consider data fresh for 30 seconds
    gcTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch on focus (analyze.tsx handles this)
    refetchOnMount: false, // Don't always refetch
  });
  
  // Use prop data if provided, otherwise use fetched data
  const usageData = propUsageData || fetchedUsageData;

  if (!usageData) return null;

  // Handle both data structures - from props (nested) and from API (flat)
  const currentUsage = usageData?.currentUsage ?? usageData?.usage?.analysesToday ?? 0;
  const dailyAnalyses = usageData?.dailyAnalyses ?? usageData?.limits?.dailyAnalyses ?? 3;
  // Coffee tier should have 200 pages per analysis
  const maxPagesPerAnalysis = usageData?.maxPagesPerAnalysis ?? usageData?.limits?.maxPagesPerAnalysis ?? (usageData?.tier === 'coffee' ? 200 : 20);
  const aiPagesLimit = usageData?.aiPagesLimit ?? usageData?.limits?.aiPagesLimit ?? 0;
  const cacheHitsToday = usageData?.cacheHitsToday ?? usageData?.usage?.cacheHitsToday ?? 0;

  const analysisPercentage = (currentUsage / dailyAnalyses) * 100;
  const costSaved = cacheHitsToday ? (cacheHitsToday * 0.03 * 0.7).toFixed(2) : "0.00";
  const isCoffeeTier = usageData.tier === 'coffee';
  const creditsRemaining = usageData?.creditsRemaining || 0;
  
  // Debug logging for Coffee tier
  if (isCoffeeTier) {
    console.log('[UsageDisplay] Coffee tier data:', {
      creditsRemaining: `${creditsRemaining} credits`,
      rawCredits: usageData?.creditsRemaining,
      maxPagesPerAnalysis: maxPagesPerAnalysis,
      rawMaxPages: usageData?.limits?.maxPagesPerAnalysis,
      fullData: usageData
    });
  }

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
                  {currentUsage} / {dailyAnalyses}
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
                  {cacheHitsToday}
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
              {usageData.tier === 'coffee' && (
                <>
                  <p className="text-xs text-framework-black">
                    • 100 monthly analysis credits
                  </p>
                  <p className="text-xs text-framework-black">
                    • Max 200 pages per analysis
                  </p>
                  <p className="text-xs text-framework-black">
                    • AI analysis for all pages
                  </p>
                </>
              )}
              {usageData.tier !== 'coffee' && (
                <>
                  <p className="text-xs text-framework-black">
                    • Max {maxPagesPerAnalysis} pages per analysis
                  </p>
                  {aiPagesLimit > 0 && (
                    <p className="text-xs text-framework-black">
                      • AI analysis for first {aiPagesLimit} pages
                    </p>
                  )}
                </>
              )}
              {usageData?.smartCaching && (
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
                Get 100 monthly analyses with AI-enhanced results for just $4.95/month
              </p>
              <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
                <button 
                  onClick={async () => {
                    try {
                      const response = await apiRequest("POST", "/api/stripe/create-coffee-checkout", {
                        email: userEmail
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
                        title: "Payment Setup Failed",
                        description: "Unable to create checkout session. Please try again.",
                        variant: "destructive",
                      });
                    }
                  }}
                  className="text-xs bg-orange-600 text-white px-4 py-3 rounded hover:bg-orange-700 transition-colors text-center min-h-[44px] flex items-center justify-center cursor-pointer"
                >
                  ☕ Coffee Plan ($4.95/month)
                </button>
                <button 
                  onClick={() => window.location.href = '/pricing'}
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
                  onClick={async () => {
                    try {
                      const response = await apiRequest("POST", "/api/stripe/create-coffee-checkout", {
                        email: userEmail
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
                        title: "Payment Setup Failed",
                        description: "Unable to create checkout session. Please try again.",
                        variant: "destructive",
                      });
                    }
                  }}
                  className="text-xs bg-orange-600 text-white px-4 py-3 rounded hover:bg-orange-700 transition-colors text-center min-h-[44px] flex items-center justify-center cursor-pointer"
                >
                  ☕ Coffee Plan ($4.95/month)
                </button>
                <button 
                  onClick={() => window.location.href = '/pricing'}
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
                  Another Coffee ($5)
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
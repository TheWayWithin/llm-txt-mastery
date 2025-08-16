import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface UsageData {
  tier: string;
  dailyAnalyses: number;
  currentUsage: number;
  lastReset: string;
}

// Client-side usage tracking as fallback
class ClientUsageTracker {
  private static STORAGE_KEY = 'llm_usage_tracking';
  
  static getUsage(email: string): UsageData {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) {
      return this.createDefault();
    }
    
    try {
      const data = JSON.parse(stored);
      const today = new Date().toDateString();
      
      // Reset if it's a new day
      if (data.lastReset !== today) {
        return this.createDefault();
      }
      
      // Check if this email's data exists
      if (data[email]) {
        return data[email];
      }
      
      return this.createDefault();
    } catch {
      return this.createDefault();
    }
  }
  
  static incrementUsage(email: string): UsageData {
    const stored = localStorage.getItem(this.STORAGE_KEY) || '{}';
    const data = JSON.parse(stored);
    const today = new Date().toDateString();
    
    // Initialize or reset if new day
    if (!data[email] || data[email].lastReset !== today) {
      data[email] = this.createDefault();
    }
    
    // Increment usage
    data[email].currentUsage += 1;
    
    // Save back to storage
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    
    console.log(`📊 [CLIENT] Usage incremented for ${email}: ${data[email].currentUsage}/${data[email].dailyAnalyses}`);
    return data[email];
  }
  
  private static createDefault(): UsageData {
    return {
      tier: 'starter',
      dailyAnalyses: 3,
      currentUsage: 0,
      lastReset: new Date().toDateString()
    };
  }
}

export function useUsageTracking(email: string | undefined) {
  const queryClient = useQueryClient();
  const [clientUsage, setClientUsage] = useState<UsageData | null>(null);
  
  // Initialize client-side tracking
  useEffect(() => {
    if (email) {
      const usage = ClientUsageTracker.getUsage(email);
      setClientUsage(usage);
    }
  }, [email]);
  
  // Server-side query with fallback to client
  const { data: serverUsage, isLoading, error } = useQuery({
    queryKey: ['/api/usage', email],
    queryFn: async () => {
      if (!email) return null;
      
      try {
        // Try the simple usage endpoint first (more reliable)
        const simpleResponse = await apiRequest('GET', `/api/simple-usage/${encodeURIComponent(email)}`);
        if (simpleResponse.ok) {
          const simpleData = await simpleResponse.json();
          const usage: UsageData = {
            tier: simpleData.tier || 'starter',
            dailyAnalyses: simpleData.limits?.dailyAnalyses || 3,
            currentUsage: simpleData.usage?.analysesToday || 0,
            lastReset: new Date().toDateString()
          };
          console.log(`📊 [SIMPLE] Usage fetched for ${email}: ${usage.currentUsage}/${usage.dailyAnalyses}`);
          return usage;
        }
      } catch (simpleError) {
        console.warn(`⚠️ [SIMPLE] Failed to fetch simple usage:`, simpleError);
      }
      
      // Fallback to regular usage endpoint
      try {
        const response = await apiRequest('GET', `/api/usage/${encodeURIComponent(email)}`);
        const data = await response.json();
        
        // Transform server response to our format
        const usage: UsageData = {
          tier: data.tier || 'starter',
          dailyAnalyses: data.limits?.dailyAnalyses || 3,
          currentUsage: data.usage?.analysesToday || 0,
          lastReset: new Date().toDateString()
        };
        
        console.log(`📊 [SERVER] Usage fetched for ${email}: ${usage.currentUsage}/${usage.dailyAnalyses}`);
        return usage;
      } catch (error) {
        console.warn(`⚠️ [SERVER] Failed to fetch usage, using client fallback:`, error);
        // Return client usage as fallback
        return clientUsage;
      }
    },
    enabled: !!email,
    refetchInterval: 60000, // Refresh every 60 seconds (less aggressive)
    retry: 1, // Only retry once to avoid delays
    staleTime: 30000, // Data is fresh for 30 seconds (prevents flashing)
  });
  
  // Track usage mutation
  const trackUsageMutation = useMutation({
    mutationFn: async () => {
      if (!email) return null;
      
      // Always increment client-side first
      const newClientUsage = ClientUsageTracker.incrementUsage(email);
      setClientUsage(newClientUsage);
      
      // Get the current tier from server usage or client usage
      const currentTier = serverUsage?.tier || clientUsage.tier || 'starter';
      
      // Try to update server using simple tracking endpoint
      try {
        const response = await apiRequest('POST', '/api/simple-usage/track', { 
          email,
          tier: currentTier
        });
        const data = await response.json();
        console.log(`✅ [SIMPLE-SERVER] Usage tracked for ${email}: count=${data.count}, tier=${data.tier}`);
        return newClientUsage; // Return client usage to maintain consistency
      } catch (error) {
        console.warn(`⚠️ [SIMPLE-SERVER] Failed to track usage, client-side updated:`, error);
        return newClientUsage;
      }
    },
    onSuccess: () => {
      // Invalidate server cache to refetch
      queryClient.invalidateQueries({ queryKey: ['/api/usage', email] });
    }
  });
  
  // Determine which usage data to use (prefer server, fallback to client)
  const usage = serverUsage || clientUsage || {
    tier: 'starter',
    dailyAnalyses: 3,
    currentUsage: 0,
    lastReset: new Date().toDateString()
  };
  
  // Check if limit reached
  const isLimitReached = usage.currentUsage >= usage.dailyAnalyses;
  
  return {
    usage,
    isLoading,
    error,
    trackUsage: trackUsageMutation.mutate,
    isTracking: trackUsageMutation.isPending,
    isLimitReached,
    // Expose both for debugging
    serverUsage,
    clientUsage
  };
}
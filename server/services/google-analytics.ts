/**
 * Google Analytics Data API v1 Service
 * Optional integration for Business Objective mode in semantic analysis
 */

import { BetaAnalyticsDataClient } from '@google-analytics/data';

// Configuration from environment
const PROPERTY_ID = process.env.GA4_PROPERTY_ID;
const ENABLE_ANALYTICS = process.env.ENABLE_ANALYTICS_INTEGRATION === 'true';
const CACHE_TTL_HOURS = parseInt(process.env.ANALYTICS_CACHE_TTL_HOURS || '24');
const MAX_RESULTS = parseInt(process.env.ANALYTICS_MAX_RESULTS || '1000');

// Types for Analytics data
export interface PageAnalytics {
  page_path: string;
  page_title: string;
  sessions: number;
  page_views: number;
  unique_page_views: number;
  bounce_rate: number;
  avg_session_duration: number;
  conversion_rate?: number;
  traffic_source_medium?: string;
  device_category?: string;
}

export interface ContentPerformance {
  url: string;
  title: string;
  traffic_score: number; // 1-10 based on relative performance
  engagement_score: number; // 1-10 based on time on page, bounce rate
  conversion_value: number; // 1-10 based on goal completions
  overall_score: number; // Weighted average
  recommendations: string[];
}

export interface AnalyticsInsights {
  property_id: string;
  date_range: { start_date: string; end_date: string };
  total_pages: number;
  top_performing_pages: ContentPerformance[];
  content_gaps: string[];
  traffic_trends: {
    organic_search: number;
    direct: number;
    referral: number;
    social: number;
    paid: number;
  };
  device_breakdown: {
    desktop: number;
    mobile: number;
    tablet: number;
  };
  generated_at: Date;
}

// Simple in-memory cache (production should use Redis)
class AnalyticsCache {
  private cache = new Map<string, { data: any; expires: number }>();
  private ttlMs: number;

  constructor(ttlHours: number = CACHE_TTL_HOURS) {
    this.ttlMs = ttlHours * 60 * 60 * 1000;
  }

  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + this.ttlMs,
    });
  }

  clear(): void {
    this.cache.clear();
  }

  getStats(): { size: number; ttl_hours: number } {
    return {
      size: this.cache.size,
      ttl_hours: this.ttlMs / (1000 * 60 * 60),
    };
  }
}

const cache = new AnalyticsCache();

// Initialize Analytics client
let analyticsClient: BetaAnalyticsDataClient | null = null;

if (ENABLE_ANALYTICS && PROPERTY_ID) {
  try {
    analyticsClient = new BetaAnalyticsDataClient({
      // Credentials will be loaded from GOOGLE_APPLICATION_CREDENTIALS or GAX_APPLICATION_CREDENTIALS_JSON
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
      credentials: process.env.GA4_SERVICE_ACCOUNT_KEY_JSON
        ? JSON.parse(process.env.GA4_SERVICE_ACCOUNT_KEY_JSON)
        : undefined,
    });

    console.log('📊 Google Analytics Data API initialized');
    console.log(`   - Property ID: ${PROPERTY_ID}`);
    console.log(`   - Cache TTL: ${CACHE_TTL_HOURS} hours`);
    console.log(`   - Max Results: ${MAX_RESULTS}`);
  } catch (error) {
    console.warn(
      '⚠️ Google Analytics initialization failed (running without Analytics):',
      error.message
    );
    analyticsClient = null;
  }
} else {
  console.log('📊 Google Analytics integration disabled');
}

/**
 * Check if Analytics integration is available
 */
export function isAnalyticsAvailable(): boolean {
  return analyticsClient !== null && PROPERTY_ID !== undefined;
}

/**
 * Get page performance data from Analytics
 */
export async function getPageAnalytics(
  dateRange: { startDate: string; endDate: string } = {
    startDate: '30daysAgo',
    endDate: 'today',
  },
  pages?: string[]
): Promise<PageAnalytics[]> {
  if (!isAnalyticsAvailable()) {
    throw new Error('Google Analytics not configured');
  }

  const cacheKey = `page_analytics_${dateRange.startDate}_${dateRange.endDate}_${pages?.join(',') || 'all'}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log('[Analytics] Using cached page analytics');
    return cached;
  }

  try {
    const [response] = await analyticsClient!.runReport({
      property: `properties/${PROPERTY_ID}`,
      dateRanges: [dateRange],
      dimensions: [
        { name: 'pagePath' },
        { name: 'pageTitle' },
        { name: 'deviceCategory' },
        { name: 'sessionSourceMedium' },
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
        { name: 'conversions' },
      ],
      dimensionFilter: pages
        ? {
            filter: {
              fieldName: 'pagePath',
              inListFilter: { values: pages },
            },
          }
        : undefined,
      limit: MAX_RESULTS,
      orderBys: [
        {
          metric: { metricName: 'sessions' },
          desc: true,
        },
      ],
    });

    const analytics: PageAnalytics[] = [];

    if (response.rows) {
      for (const row of response.rows) {
        const dimensions = row.dimensionValues || [];
        const metrics = row.metricValues || [];

        analytics.push({
          page_path: dimensions[0]?.value || '',
          page_title: dimensions[1]?.value || '',
          sessions: parseInt(metrics[0]?.value || '0'),
          page_views: parseInt(metrics[1]?.value || '0'),
          unique_page_views: parseInt(metrics[1]?.value || '0'), // Approximation
          bounce_rate: parseFloat(metrics[2]?.value || '0'),
          avg_session_duration: parseFloat(metrics[3]?.value || '0'),
          conversion_rate: parseFloat(metrics[4]?.value || '0'),
          traffic_source_medium: dimensions[3]?.value || '',
          device_category: dimensions[2]?.value || '',
        });
      }
    }

    cache.set(cacheKey, analytics);
    console.log(`[Analytics] Retrieved ${analytics.length} page analytics records`);
    return analytics;
  } catch (error: any) {
    console.error('[Analytics] Failed to get page analytics:', error);
    throw new Error(`Analytics API error: ${error.message}`);
  }
}

/**
 * Generate content performance insights
 */
export async function generateContentInsights(
  urls?: string[],
  dateRange: { startDate: string; endDate: string } = {
    startDate: '30daysAgo',
    endDate: 'today',
  }
): Promise<AnalyticsInsights> {
  if (!isAnalyticsAvailable()) {
    throw new Error('Google Analytics not configured');
  }

  const cacheKey = `content_insights_${dateRange.startDate}_${dateRange.endDate}_${urls?.join(',') || 'all'}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log('[Analytics] Using cached content insights');
    return cached;
  }

  try {
    // Get page analytics
    const pageAnalytics = await getPageAnalytics(dateRange, urls);

    // Calculate performance scores
    const maxSessions = Math.max(...pageAnalytics.map((p) => p.sessions));
    const maxPageViews = Math.max(...pageAnalytics.map((p) => p.page_views));
    const maxDuration = Math.max(...pageAnalytics.map((p) => p.avg_session_duration));

    const performanceData: ContentPerformance[] = pageAnalytics.map((page) => {
      // Traffic score (1-10 based on relative sessions)
      const traffic_score =
        maxSessions > 0 ? Math.min(10, Math.max(1, (page.sessions / maxSessions) * 10)) : 1;

      // Engagement score (based on bounce rate and session duration)
      const bounce_penalty = page.bounce_rate > 0.7 ? -2 : page.bounce_rate > 0.5 ? -1 : 0;
      const duration_boost = maxDuration > 0 ? (page.avg_session_duration / maxDuration) * 3 : 0;
      const engagement_score = Math.min(10, Math.max(1, 5 + duration_boost + bounce_penalty));

      // Conversion value (if available)
      const conversion_value = page.conversion_rate
        ? Math.min(10, Math.max(1, page.conversion_rate * 100))
        : 5;

      // Overall score (weighted average)
      const overall_score = traffic_score * 0.4 + engagement_score * 0.4 + conversion_value * 0.2;

      // Generate recommendations
      const recommendations: string[] = [];
      if (page.bounce_rate > 0.7) {
        recommendations.push('High bounce rate - improve content engagement');
      }
      if (page.avg_session_duration < 30) {
        recommendations.push('Low session duration - add more valuable content');
      }
      if (traffic_score < 3) {
        recommendations.push('Low traffic - improve SEO and discoverability');
      }
      if (engagement_score < 4) {
        recommendations.push('Poor engagement - review content quality and UX');
      }

      return {
        url: page.page_path,
        title: page.page_title,
        traffic_score: Math.round(traffic_score * 10) / 10,
        engagement_score: Math.round(engagement_score * 10) / 10,
        conversion_value: Math.round(conversion_value * 10) / 10,
        overall_score: Math.round(overall_score * 10) / 10,
        recommendations,
      };
    });

    // Sort by overall score
    performanceData.sort((a, b) => b.overall_score - a.overall_score);

    // Identify content gaps (pages with high traffic but low engagement)
    const content_gaps = performanceData
      .filter((p) => p.traffic_score > 6 && p.engagement_score < 4)
      .map((p) => p.url)
      .slice(0, 10);

    // Calculate traffic source breakdown
    const trafficSources = pageAnalytics.reduce(
      (acc, page) => {
        const source = page.traffic_source_medium?.toLowerCase() || 'unknown';
        if (source.includes('organic')) acc.organic_search++;
        else if (source.includes('direct')) acc.direct++;
        else if (source.includes('referral')) acc.referral++;
        else if (source.includes('social')) acc.social++;
        else if (source.includes('cpc') || source.includes('paid')) acc.paid++;
        return acc;
      },
      { organic_search: 0, direct: 0, referral: 0, social: 0, paid: 0 }
    );

    // Calculate device breakdown
    const deviceBreakdown = pageAnalytics.reduce(
      (acc, page) => {
        const device = page.device_category?.toLowerCase() || 'unknown';
        if (device.includes('desktop')) acc.desktop++;
        else if (device.includes('mobile')) acc.mobile++;
        else if (device.includes('tablet')) acc.tablet++;
        return acc;
      },
      { desktop: 0, mobile: 0, tablet: 0 }
    );

    const insights: AnalyticsInsights = {
      property_id: PROPERTY_ID!,
      date_range: dateRange,
      total_pages: performanceData.length,
      top_performing_pages: performanceData.slice(0, 20),
      content_gaps,
      traffic_trends: trafficSources,
      device_breakdown: deviceBreakdown,
      generated_at: new Date(),
    };

    cache.set(cacheKey, insights);
    console.log(`[Analytics] Generated insights for ${insights.total_pages} pages`);
    return insights;
  } catch (error: any) {
    console.error('[Analytics] Failed to generate content insights:', error);
    throw new Error(`Analytics insights error: ${error.message}`);
  }
}

/**
 * Get high-priority URLs for semantic analysis based on Analytics
 */
export async function getHighPriorityUrls(
  limit: number = 50,
  dateRange: { startDate: string; endDate: string } = {
    startDate: '30daysAgo',
    endDate: 'today',
  }
): Promise<Array<{ url: string; priority_score: number; reason: string }>> {
  if (!isAnalyticsAvailable()) {
    console.log('[Analytics] Not available - returning empty priority list');
    return [];
  }

  try {
    const insights = await generateContentInsights(undefined, dateRange);

    const priorityUrls = insights.top_performing_pages.slice(0, limit).map((page) => {
      let reason = '';
      if (page.traffic_score > 8) reason += 'High traffic. ';
      if (page.engagement_score > 7) reason += 'Good engagement. ';
      if (page.conversion_value > 6) reason += 'Strong conversions. ';
      if (page.recommendations.length > 0) reason += 'Needs optimization. ';

      return {
        url: page.url,
        priority_score: page.overall_score,
        reason: reason.trim() || 'Good overall performance',
      };
    });

    console.log(`[Analytics] Generated ${priorityUrls.length} high-priority URLs`);
    return priorityUrls;
  } catch (error: any) {
    console.error('[Analytics] Failed to get high-priority URLs:', error);
    return []; // Graceful degradation
  }
}

/**
 * Test Analytics API connection
 */
export async function testAnalyticsConnection(): Promise<{
  success: boolean;
  message: string;
  property_id?: string;
  sample_data?: {
    total_sessions: number;
    total_pages: number;
    date_range: string;
  };
  error?: string;
}> {
  if (!isAnalyticsAvailable()) {
    return {
      success: false,
      message: 'Google Analytics not configured',
      error: 'PROPERTY_ID or credentials missing',
    };
  }

  try {
    console.log('[Analytics Test] Testing API connection...');

    // Test basic API call
    const [response] = await analyticsClient!.runReport({
      property: `properties/${PROPERTY_ID}`,
      dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'sessions' }],
      limit: 10,
    });

    const totalSessions =
      response.rows?.reduce((sum, row) => sum + parseInt(row.metricValues?.[0]?.value || '0'), 0) ||
      0;

    return {
      success: true,
      message: 'Analytics API connection successful',
      property_id: PROPERTY_ID,
      sample_data: {
        total_sessions: totalSessions,
        total_pages: response.rowCount || 0,
        date_range: '7 days',
      },
    };
  } catch (error: any) {
    console.error('[Analytics Test] Connection failed:', error);
    return {
      success: false,
      message: 'Analytics API connection failed',
      error: error.message,
    };
  }
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { enabled: boolean; stats?: any } {
  return {
    enabled: isAnalyticsAvailable(),
    stats: isAnalyticsAvailable() ? cache.getStats() : undefined,
  };
}

/**
 * Clear Analytics cache
 */
export function clearAnalyticsCache(): void {
  cache.clear();
  console.log('[Analytics] Cache cleared');
}

// Export configuration for external use
export const AnalyticsConfig = {
  enabled: ENABLE_ANALYTICS,
  propertyId: PROPERTY_ID,
  maxResults: MAX_RESULTS,
  cacheTtlHours: CACHE_TTL_HOURS,
};

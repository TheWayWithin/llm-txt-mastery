import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Keep existing users table as-is for backward compatibility
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
});

// New authentication users table
export const authUsers = pgTable('auth_users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  emailVerified: boolean('email_verified').default(false),
  tier: text('tier').notNull().default('starter'), // "starter", "solo", "growth", "scale"
  creditsRemaining: integer('credits_remaining').default(0), // For solo tier
  stripeCustomerId: text('stripe_customer_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  // Sprint 6: JS rendering quota tracking (Scale tier only)
  jsRendersUsedThisMonth: integer('js_renders_used_this_month').default(0),
  jsRendersResetAt: timestamp('js_renders_reset_at'),
});

export const emailCaptures = pgTable('emailCaptures', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  email: text('email').notNull().unique(),
  websiteUrl: text('websiteUrl'), // Made optional to fix email capture
  tier: text('tier').notNull().default('starter'), // "starter", "growth", or "scale"
  createdAt: timestamp('createdAt').defaultNow(),
});

export const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  tier: text('tier').notNull().default('starter'), // "starter", "growth", or "scale"
  status: text('status').notNull().default('active'), // "active", "canceled", "past_due", "incomplete"
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const paymentHistory = pgTable('payment_history', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  subscriptionId: integer('subscription_id').references(() => subscriptions.id),
  stripePaymentIntentId: text('stripe_payment_intent_id').unique(),
  amount: integer('amount').notNull(), // Amount in cents
  currency: text('currency').notNull().default('usd'),
  status: text('status').notNull(), // "succeeded", "failed", "pending"
  createdAt: timestamp('created_at').defaultNow(),
});

// Shape of sitemapAnalysis.analysis_metadata as the code actually writes it
// (analyzeWebsiteEnhanced, the orphan detector, and the v1 API all contribute).
export interface SitemapAnalysisMetadata {
  siteType: 'single-page' | 'multi-page' | 'unknown';
  sitemapFound: boolean;
  // 'error' is written on failed analyses
  analysisMethod: 'sitemap' | 'robots.txt' | 'homepage-only' | 'fallback-crawl' | 'error';
  // Some failure writes omit message
  message?: string;
  totalPagesFound: number;
  userEmail?: string;
  tier?: StoredUserTier;
  // Written on failed analyses
  error?: string;
  // Sprint 6/10: JS rendering fields on completed analyses
  jsRenderingEnabled?: boolean;
  jsRenderedPages?: number;
  // API v1 provenance
  apiKeyId?: number;
  consumer?: string;
  // Enhanced SPA detection fields (Sprint 1: Phase 1)
  spaDetection?: SPADetectionResult;
  contentCoveragePercentage?: number;
  renderingStrategy?: RenderingStrategy;
  metrics?: {
    cacheHit: boolean;
    processingTime: number;
    apiCalls: number;
    costSaved: number;
    analyzedPages?: number;
    cachedPages?: number;
    aiCallsUsed?: number;
    htmlExtractionsUsed?: number;
  };
  processingTime?: number;
}

export const sitemapAnalysis = pgTable('sitemapAnalysis', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  url: text('url').notNull(),
  sitemapContent: jsonb('sitemap_content'),
  discoveredPages: jsonb('discovered_pages').$type<DiscoveredPage[]>(),
  status: text('status').notNull().default('pending'),
  analysisMetadata: jsonb('analysis_metadata').$type<SitemapAnalysisMetadata>(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const llmTextFiles = pgTable('llmTextFiles', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => users.id),
  analysisId: integer('analysis_id').references(() => sitemapAnalysis.id),
  selectedPages: jsonb('selected_pages').$type<SelectedPage[]>(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const usageTracking = pgTable('usage_tracking', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  date: text('date').notNull(), // YYYY-MM-DD format
  analysesCount: integer('analyses_count').notNull().default(0),
  validationsCount: integer('validations_count').notNull().default(0), // llms.txt validations
  pagesProcessed: integer('pages_processed').notNull().default(0),
  aiCallsCount: integer('ai_calls_count').notNull().default(0),
  htmlExtractionsCount: integer('html_extractions_count').notNull().default(0),
  cacheHits: integer('cache_hits').notNull().default(0),
  totalCost: integer('total_cost').notNull().default(0), // Cost in cents
  // New AI cost tracking fields
  actualTokensUsed: integer('actual_tokens_used').default(0),
  actualAiCost: integer('actual_ai_cost').default(0), // Actual AI cost in cents
  modelUsed: text('model_used'), // Track which OpenAI model was used
  costCapWouldTrigger: boolean('cost_cap_would_trigger').default(false),
  costCapTriggeredAt: timestamp('cost_cap_triggered_at'),
});

export const analysisCache = pgTable('analysis_cache', {
  id: serial('id').primaryKey(),
  url: text('url').notNull(),
  urlHash: text('url_hash').notNull().unique(),
  contentHash: text('content_hash').notNull(),
  lastModified: text('last_modified'),
  etag: text('etag'),
  analysisResult: jsonb('analysis_result').$type<DiscoveredPage[]>(),
  tier: text('tier').notNull(),
  cachedAt: timestamp('cached_at').defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
  hitCount: integer('hit_count').notNull().default(0),
});

export const oneTimeCredits = pgTable('one_time_credits', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  creditsRemaining: integer('credits_remaining').notNull().default(0),
  creditsTotal: integer('credits_total').notNull().default(0),
  productType: text('product_type').notNull().default('solo'), // "solo", future: "pro", etc.
  priceId: text('price_id'), // Stripe price ID for the purchase
  stripePaymentIntentId: text('stripe_payment_intent_id').unique(),
  purchasedAt: timestamp('purchased_at').notNull().defaultNow(), // Track for 30-day guarantee
  refunded: boolean('refunded').notNull().default(false),
  refundedAt: timestamp('refunded_at'),
  // expiresAt: timestamp("expires_at"), // REMOVED: Column doesn't exist in production DB
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const userProfiles = pgTable('user_profiles', {
  id: text('id').primaryKey(), // Supabase user UUID
  email: text('email').notNull(),
  tier: text('tier').notNull().default('starter'),
  stripeCustomerId: text('stripe_customer_id').unique(),
  subscriptionId: text('subscription_id'),
  subscriptionStatus: text('subscription_status'),
  creditsRemaining: integer('credits_remaining').notNull().default(0), // Current coffee credits
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// User sessions for JWT token management
export const userSessions = pgTable('user_sessions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => authUsers.id),
  tokenHash: text('token_hash').notNull().unique(),
  refreshTokenHash: text('refresh_token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  refreshExpiresAt: timestamp('refresh_expires_at').notNull(),
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at').defaultNow(),
  lastUsedAt: timestamp('last_used_at').defaultNow(),
});

export interface DiscoveredPage {
  url: string;
  title: string;
  description: string;
  qualityScore: number;
  category: string;
  lastModified?: string;
  bodyContent?: string; // Raw extracted text content (up to 4000 chars) for llms-full.txt
}

// Wire shape of GET /api/analysis/:id (see routes.ts): metadata fields are
// flattened with fallbacks, plus the full analysisMetadata for components.
export interface SiteAnalysisResult {
  id: number;
  url: string;
  status: 'analyzing' | 'completed' | 'failed' | 'pending' | 'processing';
  discoveredPages: DiscoveredPage[];
  siteType: 'single-page' | 'multi-page' | 'unknown';
  sitemapFound: boolean;
  analysisMethod: SitemapAnalysisMetadata['analysisMethod'] | 'unknown';
  message: string;
  totalPagesFound: number;
  analysisMetadata?: SitemapAnalysisMetadata;
  metrics?: {
    cacheHit: boolean;
    processingTime: number;
    apiCalls: number;
    costSaved: number;
  };
  spaDetection?: SPADetectionResult;
  contentCoveragePercentage?: number;
  renderingStrategy?: RenderingStrategy;
}

export interface SelectedPage {
  url: string;
  title: string;
  description: string;
  selected: boolean;
  category?: string;
  qualityScore?: number;
  // Optional per-page metadata; getPageQualityScore falls back when absent
  analysisMetadata?: { qualityScore?: number };
  bodyContent?: string; // Raw extracted text content for llms-full.txt
}

export const urlAnalysisSchema = z.object({
  url: z.string().url('Please enter a valid URL'),
});

export const insertSitemapAnalysisSchema = createInsertSchema(sitemapAnalysis).pick({
  userId: true,
  url: true,
  sitemapContent: true,
  discoveredPages: true,
  status: true,
  analysisMetadata: true,
});

export const insertLlmTextFileSchema = createInsertSchema(llmTextFiles).pick({
  userId: true,
  analysisId: true,
  selectedPages: true,
  content: true,
});

export type InsertSitemapAnalysis = z.infer<typeof insertSitemapAnalysisSchema>;
export type InsertLlmTextFile = z.infer<typeof insertLlmTextFileSchema>;
export type SitemapAnalysis = typeof sitemapAnalysis.$inferSelect;
export type LlmTextFile = typeof llmTextFiles.$inferSelect;

export const insertEmailCaptureSchema = createInsertSchema(emailCaptures).pick({
  userId: true,
  email: true,
  websiteUrl: true,
  tier: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).pick({
  userId: true,
  stripeCustomerId: true,
  stripeSubscriptionId: true,
  tier: true,
  status: true,
  currentPeriodStart: true,
  currentPeriodEnd: true,
  cancelAtPeriodEnd: true,
});

export const insertPaymentHistorySchema = createInsertSchema(paymentHistory).pick({
  userId: true,
  subscriptionId: true,
  stripePaymentIntentId: true,
  amount: true,
  currency: true,
  status: true,
});

export const insertUsageTrackingSchema = createInsertSchema(usageTracking).pick({
  userId: true,
  date: true,
  analysesCount: true,
  pagesProcessed: true,
  aiCallsCount: true,
  htmlExtractionsCount: true,
  cacheHits: true,
  totalCost: true,
});

export const insertAnalysisCacheSchema = createInsertSchema(analysisCache).pick({
  url: true,
  urlHash: true,
  contentHash: true,
  lastModified: true,
  etag: true,
  analysisResult: true,
  tier: true,
  expiresAt: true,
  hitCount: true,
});

export const insertOneTimeCreditSchema = createInsertSchema(oneTimeCredits).pick({
  userId: true,
  creditsRemaining: true,
  creditsTotal: true,
  productType: true,
  priceId: true,
  stripePaymentIntentId: true,
  // expiresAt intentionally absent: the column was removed from the table above
});

export const insertUserProfileSchema = createInsertSchema(userProfiles).pick({
  id: true,
  email: true,
  tier: true,
  stripeCustomerId: true,
  subscriptionId: true,
  subscriptionStatus: true,
  creditsRemaining: true,
});

export const emailCaptureSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  websiteUrl: z
    .union([z.string().url('Please enter a valid URL'), z.literal(''), z.null(), z.undefined()])
    .optional()
    .nullable(),
  tier: z.enum(['starter', 'solo', 'growth', 'scale']).default('solo'),
});

export type InsertEmailCapture = z.infer<typeof insertEmailCaptureSchema>;
export type EmailCapture = typeof emailCaptures.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertPaymentHistory = z.infer<typeof insertPaymentHistorySchema>;
export type PaymentHistory = typeof paymentHistory.$inferSelect;
export type InsertUsageTracking = z.infer<typeof insertUsageTrackingSchema>;
export type UsageTrackingDb = typeof usageTracking.$inferSelect;
export type InsertAnalysisCache = z.infer<typeof insertAnalysisCacheSchema>;
export type AnalysisCacheDb = typeof analysisCache.$inferSelect;
export type InsertOneTimeCredit = z.infer<typeof insertOneTimeCreditSchema>;
export type OneTimeCredit = typeof oneTimeCredits.$inferSelect;
export type InsertUserProfile = z.infer<typeof insertUserProfileSchema>;
export type UserProfile = typeof userProfiles.$inferSelect;

// Tier-based types
export type UserTier = 'starter' | 'solo' | 'growth' | 'scale' | 'cancelled';

// Tier as actually stored in the database: includes the legacy 'coffee' value,
// a pre-rename alias for 'solo' still present on old rows. Runtime treats
// 'coffee' exactly like 'solo'; new records never write it.
export type StoredUserTier = UserTier | 'coffee';

// ===================================================================
// ENHANCED SPA DETECTION TYPES (Sprint 1: Phase 1)
// ===================================================================

/**
 * Rendering strategy detected for a website
 */
export type RenderingStrategy = 'SSR' | 'SSG' | 'CSR' | 'HYBRID' | 'UNKNOWN';

/**
 * Framework and rendering strategy detection result
 */
export interface SPAFrameworkIndicators {
  framework:
    | 'react'
    | 'vue'
    | 'angular'
    | 'svelte'
    | 'next'
    | 'nuxt'
    | 'gatsby'
    | 'astro'
    | 'wordpress'
    | 'unknown';
  renderingStrategy: RenderingStrategy;
  indicators: string[];
}

/**
 * Signals used to estimate content coverage
 */
export interface ContentCoverageSignals {
  textToHtmlRatio: number;
  hasSSRData: boolean;
  hasSkeletonUI: boolean;
  bodyContentLength: number;
  htmlStructureSize: number;
}

/**
 * Content coverage estimation with confidence level
 */
export interface ContentCoverageEstimate {
  estimatedCoverage: number; // 0-100 percentage
  confidence: 'high' | 'medium' | 'low';
  signals: ContentCoverageSignals;
}

/**
 * Complete SPA detection result (replaces simple isSinglePage boolean)
 */
export interface SPADetectionResult {
  isSinglePage: boolean; // Backward compatibility
  framework: SPAFrameworkIndicators;
  contentCoverage: ContentCoverageEstimate;
  contentCoverageWarning?: string;
}

export interface TierLimits {
  tier: UserTier;
  dailyAnalyses: number;
  maxPagesPerAnalysis: number;
  aiPagesLimit: number;
  cacheDurationDays: number;
  features: {
    htmlExtraction: boolean;
    aiAnalysis: boolean;
    fileHistory: boolean;
    prioritySupport: boolean;
    smartCaching: boolean;
    whiteLabel?: boolean;
    apiAccess?: boolean;
  };
}

// Legacy interfaces for backward compatibility - use database types for new code
export interface CachedAnalysis {
  id: number;
  url: string;
  urlHash: string;
  contentHash: string;
  lastModified?: string;
  etag?: string;
  analysisResult: DiscoveredPage[];
  tier: StoredUserTier;
  cachedAt: Date;
  expiresAt: Date;
  hitCount: number;
}

export interface UsageTracking {
  id: number;
  userId?: number;
  userEmail?: string;
  date: string;
  analysesCount: number;
  pagesProcessed: number;
  aiCallsCount?: number;
  htmlExtractionsCount?: number;
  cacheHits: number;
  cost?: number;
  totalCost?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

// Authentication schemas and types
export const insertAuthUserSchema = createInsertSchema(authUsers).pick({
  email: true,
  passwordHash: true,
  emailVerified: true,
  tier: true,
  creditsRemaining: true,
  stripeCustomerId: true,
});

export const insertUserSessionSchema = createInsertSchema(userSessions).pick({
  userId: true,
  tokenHash: true,
  refreshTokenHash: true,
  expiresAt: true,
  refreshExpiresAt: true,
  userAgent: true,
  ipAddress: true,
});

export const userRegistrationSchema = z
  .object({
    email: z.string().email('Please enter a valid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

export const userLoginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type AuthUser = typeof authUsers.$inferSelect;
export type InsertAuthUser = z.infer<typeof insertAuthUserSchema>;
export type UserSession = typeof userSessions.$inferSelect;
export type InsertUserSession = z.infer<typeof insertUserSessionSchema>;
export type UserRegistration = z.infer<typeof userRegistrationSchema>;
export type UserLogin = z.infer<typeof userLoginSchema>;

// Rate limiting table for API throttling
export const rateLimits = pgTable('rate_limits', {
  id: serial('id').primaryKey(),
  identifier: text('identifier').notNull(),
  identifierType: text('identifier_type').notNull(), // 'user' or 'ip'
  endpoint: text('endpoint').notNull(),
  requestCount: integer('request_count').notNull().default(1),
  windowStart: timestamp('window_start').notNull().defaultNow(),
  windowEnd: timestamp('window_end').notNull(),
});

// llms.txt validation results
export const llmsTxtValidations = pgTable('llms_txt_validations', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').references(() => authUsers.id),
  anonymousId: text('anonymous_id'),
  url: text('url').notNull(),
  fileUrl: text('file_url').notNull(),
  urlHash: text('url_hash').notNull(),
  valid: boolean('valid').notNull(),
  score: integer('score').notNull(),
  issues: jsonb('issues'),
  recommendations: jsonb('recommendations'),
  robotsConflicts: jsonb('robots_conflicts'),
  tier: text('tier').notNull(),
  cached: boolean('cached').notNull().default(false),
  processingTime: integer('processing_time'),
  createdAt: timestamp('created_at').defaultNow(),
  expiresAt: timestamp('expires_at'),
});

// Validation cache for 24-hour caching
export const validationCache = pgTable('validation_cache', {
  id: serial('id').primaryKey(),
  urlHash: text('url_hash').notNull().unique(),
  validationResult: jsonb('validation_result').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
});

// Cancellation and refund tracking
export const cancellations = pgTable('cancellations', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => authUsers.id),
  subscriptionId: text('subscription_id'),
  tier: text('tier').notNull(),
  reason: text('reason'),
  requestedAt: timestamp('requested_at').notNull().defaultNow(),
  processedAt: timestamp('processed_at'),
  refundAmount: integer('refund_amount'), // Amount in cents
  refundStatus: text('refund_status'), // pending, processing, completed, failed
  refundStripeId: text('refund_stripe_id'),
  purchaseDate: timestamp('purchase_date'), // For 30-day guarantee check
  daysSincePurchase: integer('days_since_purchase'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const refundRequests = pgTable('refund_requests', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => authUsers.id),
  cancellationId: integer('cancellation_id').references(() => cancellations.id),
  amount: integer('amount').notNull(), // Amount in cents
  reason: text('reason'),
  status: text('status').notNull().default('pending'),
  stripeRefundId: text('stripe_refund_id'),
  processedAt: timestamp('processed_at'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// JWT payload interface
export interface JWTPayload {
  userId: number;
  email: string;
  tier: StoredUserTier;
  iat: number;
  exp: number;
}

// Authentication response interface
export interface AuthResponse {
  user: {
    id: number;
    email: string;
    tier: UserTier;
    creditsRemaining: number;
    emailVerified: boolean;
  };
  accessToken: string;
  refreshToken: string;
}

// Rate limiting types
export type RateLimit = typeof rateLimits.$inferSelect;
export type InsertRateLimit = typeof rateLimits.$inferInsert;

// File type options for llms.txt validation (Sprint 5)
export const LlmsTxtFileType = z.enum([
  'auto', // Auto-detect: check all locations
  'llms.txt', // Standard: /llms.txt
  'llms-full.txt', // Extended: /llms-full.txt
  '.well-known', // Well-known: /.well-known/llms.txt
  'llms.md', // Markdown: /llms.md
]);
export type LlmsTxtFileType = z.infer<typeof LlmsTxtFileType>;

// Validation request schema with SSRF protection
export const validateLlmsTxtSchema = z.object({
  url: z
    .string()
    .url('Please enter a valid URL')
    .refine(
      (url) => {
        // SSRF Protection: Block localhost and private IPs
        const privateRanges = [
          /^https?:\/\/localhost/i,
          /^https?:\/\/127\./,
          /^https?:\/\/192\.168\./,
          /^https?:\/\/10\./,
          /^https?:\/\/172\.(1[6-9]|2\d|3[01])\./,
          /^https?:\/\/169\.254\./,
        ];
        return !privateRanges.some((regex) => regex.test(url));
      },
      { message: 'Invalid or unsafe URL (localhost/private IPs not allowed)' }
    ),
  fileType: LlmsTxtFileType.optional().default('auto'),
  includeRobotsTxt: z.boolean().optional().default(true),
  bustCache: z.boolean().optional().default(false),
});

export type ValidateLlmsTxtRequest = z.infer<typeof validateLlmsTxtSchema>;

// Validation types
export type LlmsTxtValidation = typeof llmsTxtValidations.$inferSelect;
export type InsertLlmsTxtValidation = typeof llmsTxtValidations.$inferInsert;
export type ValidationCacheEntry = typeof validationCache.$inferSelect;
export type InsertValidationCache = typeof validationCache.$inferInsert;

// ===================================================================
// PUBLIC API INFRASTRUCTURE
// ===================================================================

/**
 * API Keys table - manages authentication for public API access
 * SECURITY: Never store plain-text keys, only SHA-256 hashes
 */
export const apiKeys = pgTable('api_keys', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(), // Descriptive name (e.g., "aimpactscanner-production")
  keyHash: text('key_hash').notNull().unique(), // SHA-256 hashed API key
  keyPrefix: text('key_prefix').notNull(), // Display prefix (e.g., "llmtxt_abc123...")
  consumer: text('consumer').notNull(), // e.g., 'aimpactscanner', 'public', 'internal'
  tier: text('tier').notNull().default('free'), // 'free', 'partner', 'enterprise'
  rateLimit: integer('rate_limit').notNull().default(100), // Requests per hour
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at'),
  expiresAt: timestamp('expires_at'), // Optional expiration
  metadata: jsonb('metadata'), // Flexible additional data
});

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
export const insertApiKeySchema = createInsertSchema(apiKeys);

/**
 * API Usage table - tracks all API requests for analytics and billing
 */
export const apiUsage = pgTable('api_usage', {
  id: serial('id').primaryKey(),
  apiKeyId: integer('api_key_id')
    .notNull()
    .references(() => apiKeys.id),
  endpoint: text('endpoint').notNull(), // e.g., '/api/v1/analyze'
  method: text('method').notNull(), // GET, POST, etc.
  statusCode: integer('status_code').notNull(),
  responseTime: integer('response_time'), // Milliseconds
  requestSize: integer('request_size'), // Bytes
  responseSize: integer('response_size'), // Bytes
  errorMessage: text('error_message'),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
});

export type ApiUsageRecord = typeof apiUsage.$inferSelect;
export type NewApiUsage = typeof apiUsage.$inferInsert;
export const insertApiUsageSchema = createInsertSchema(apiUsage);

/**
 * API Webhooks table - webhook configurations for event notifications
 * SECURITY: Webhook secrets should be hashed for signature verification
 */
export const apiWebhooks = pgTable('api_webhooks', {
  id: serial('id').primaryKey(),
  apiKeyId: integer('api_key_id')
    .notNull()
    .references(() => apiKeys.id),
  url: text('url').notNull(), // Webhook endpoint URL
  events: jsonb('events').notNull(), // Array like ['analysis.completed', 'generation.completed']
  isActive: boolean('is_active').notNull().default(true),
  secret: text('secret').notNull(), // Hashed secret for signature verification
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastTriggeredAt: timestamp('last_triggered_at'),
});

export type ApiWebhook = typeof apiWebhooks.$inferSelect;
export type NewApiWebhook = typeof apiWebhooks.$inferInsert;
export const insertApiWebhookSchema = createInsertSchema(apiWebhooks);

/**
 * Relations for API infrastructure tables
 */
export const apiKeysRelations = relations(apiKeys, ({ many }) => ({
  usage: many(apiUsage),
  webhooks: many(apiWebhooks),
}));

export const apiUsageRelations = relations(apiUsage, ({ one }) => ({
  apiKey: one(apiKeys, {
    fields: [apiUsage.apiKeyId],
    references: [apiKeys.id],
  }),
}));

export const apiWebhooksRelations = relations(apiWebhooks, ({ one }) => ({
  apiKey: one(apiKeys, {
    fields: [apiWebhooks.apiKeyId],
    references: [apiKeys.id],
  }),
}));

// API Consumer Tiers
export type ApiConsumerTier = 'free' | 'partner' | 'enterprise';

// API Key with usage statistics
export interface ApiKeyWithStats extends ApiKey {
  totalRequests: number;
  requestsThisHour: number;
  averageResponseTime: number;
  errorRate: number;
}

// ===================================================================
// SPRINT 7: API JS RENDER QUOTAS (Per API Key + External User)
// ===================================================================

/**
 * API JS Render Quotas table - tracks JS rendering usage per external user per API key
 * Used when API consumers (like AImpactScanner) pass their user's tier and userId
 */
export const apiJsRenderQuotas = pgTable('api_js_render_quotas', {
  id: serial('id').primaryKey(),
  apiKeyId: integer('api_key_id')
    .notNull()
    .references(() => apiKeys.id),
  externalUserId: text('external_user_id').notNull(), // Consumer-provided user ID (e.g., aimp_user_123)
  rendersUsedThisMonth: integer('renders_used_this_month').default(0).notNull(),
  resetAt: timestamp('reset_at'), // When the quota counter will reset (first of next month)
  createdAt: timestamp('created_at').defaultNow(),
});

export type ApiJsRenderQuota = typeof apiJsRenderQuotas.$inferSelect;
export type NewApiJsRenderQuota = typeof apiJsRenderQuotas.$inferInsert;
export const insertApiJsRenderQuotaSchema = createInsertSchema(apiJsRenderQuotas);

// Tier limits for API consumers (mapped from userTier parameter)
export const API_TIER_LIMITS: Record<
  UserTier,
  {
    maxPagesPerAnalysis: number;
    aiPagesLimit: number;
    jsRenderingEnabled: boolean;
    jsRendersPerMonth: number;
  }
> = {
  starter: {
    maxPagesPerAnalysis: 20,
    aiPagesLimit: 20,
    jsRenderingEnabled: false,
    jsRendersPerMonth: 0,
  },
  solo: {
    maxPagesPerAnalysis: 200,
    aiPagesLimit: 200,
    jsRenderingEnabled: false,
    jsRendersPerMonth: 0,
  },
  growth: {
    maxPagesPerAnalysis: 500,
    aiPagesLimit: 500,
    jsRenderingEnabled: false,
    jsRendersPerMonth: 0,
  },
  scale: {
    maxPagesPerAnalysis: 1000,
    aiPagesLimit: 1000,
    jsRenderingEnabled: true,
    jsRendersPerMonth: 100,
  },
  cancelled: {
    maxPagesPerAnalysis: 0,
    aiPagesLimit: 0,
    jsRenderingEnabled: false,
    jsRendersPerMonth: 0,
  },
};

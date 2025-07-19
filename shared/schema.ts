import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const emailCaptures = pgTable("email_captures", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  websiteUrl: text("website_url").notNull(),
  tier: text("tier").notNull().default("starter"), // "starter", "growth", or "scale"
  createdAt: timestamp("created_at").defaultNow(),
});

export const sitemapAnalysis = pgTable("sitemap_analysis", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  sitemapContent: jsonb("sitemap_content"),
  discoveredPages: jsonb("discovered_pages").$type<DiscoveredPage[]>(),
  status: text("status").notNull().default("pending"),
  analysisMetadata: jsonb("analysis_metadata").$type<{
    siteType: "single-page" | "multi-page" | "unknown";
    sitemapFound: boolean;
    analysisMethod: "sitemap" | "robots.txt" | "homepage-only" | "fallback-crawl";
    message: string;
    totalPagesFound: number;
    userEmail?: string;
    tier?: UserTier;
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
  }>(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const llmTextFiles = pgTable("llm_text_files", {
  id: serial("id").primaryKey(),
  analysisId: integer("analysis_id").references(() => sitemapAnalysis.id),
  selectedPages: jsonb("selected_pages").$type<SelectedPage[]>(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export interface DiscoveredPage {
  url: string;
  title: string;
  description: string;
  qualityScore: number;
  category: string;
  lastModified?: string;
}

export interface SiteAnalysisResult {
  id: number;
  url: string;
  status: "analyzing" | "completed" | "failed" | "pending" | "processing";
  discoveredPages: DiscoveredPage[];
  siteType: "single-page" | "multi-page" | "unknown";
  sitemapFound: boolean;
  analysisMethod: "sitemap" | "robots.txt" | "homepage-only" | "fallback-crawl";
  message: string;
  totalPagesFound: number;
  metrics?: {
    cacheHit: boolean;
    processingTime: number;
    apiCalls: number;
    costSaved: number;
  };
}

export interface SelectedPage {
  url: string;
  title: string;
  description: string;
  selected: boolean;
}

export const urlAnalysisSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
});

export const insertSitemapAnalysisSchema = createInsertSchema(sitemapAnalysis).pick({
  url: true,
  sitemapContent: true,
  discoveredPages: true,
  status: true,
  analysisMetadata: true,
});

export const insertLlmTextFileSchema = createInsertSchema(llmTextFiles).pick({
  analysisId: true,
  selectedPages: true,
  content: true,
});

export type InsertSitemapAnalysis = z.infer<typeof insertSitemapAnalysisSchema>;
export type InsertLlmTextFile = z.infer<typeof insertLlmTextFileSchema>;
export type SitemapAnalysis = typeof sitemapAnalysis.$inferSelect;
export type LlmTextFile = typeof llmTextFiles.$inferSelect;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertEmailCaptureSchema = createInsertSchema(emailCaptures).pick({
  email: true,
  websiteUrl: true,
  tier: true,
});

export const emailCaptureSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  websiteUrl: z.string().url("Please enter a valid URL"),
  tier: z.enum(["starter", "growth", "scale"]).default("starter"),
});

export type InsertEmailCapture = z.infer<typeof insertEmailCaptureSchema>;
export type EmailCapture = typeof emailCaptures.$inferSelect;

// Tier-based types
export type UserTier = 'starter' | 'growth' | 'scale';

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

export interface CachedAnalysis {
  id: number;
  url: string;
  urlHash: string;
  contentHash: string;
  lastModified?: string;
  etag?: string;
  analysisResult: DiscoveredPage[];
  tier: UserTier;
  cachedAt: Date;
  expiresAt: Date;
  hitCount: number;
}

export interface UsageTracking {
  id: number;
  userEmail?: string;
  date: Date;
  analysesCount: number;
  pagesProcessed: number;
  aiCallsCount: number;
  htmlExtractionsCount: number;
  cacheHits: number;
  totalCost: number;
}

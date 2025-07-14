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
  tier: text("tier").notNull().default("free"), // "free" or "premium"
  createdAt: timestamp("created_at").defaultNow(),
});

export const sitemapAnalysis = pgTable("sitemap_analysis", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  sitemapContent: jsonb("sitemap_content"),
  discoveredPages: jsonb("discovered_pages").$type<DiscoveredPage[]>(),
  status: text("status").notNull().default("pending"),
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
  tier: z.enum(["free", "premium"]).default("free"),
});

export type InsertEmailCapture = z.infer<typeof insertEmailCaptureSchema>;
export type EmailCapture = typeof emailCaptures.$inferSelect;

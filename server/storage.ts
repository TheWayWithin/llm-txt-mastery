import { users, sitemapAnalysis, llmTextFiles, emailCaptures, type User, type InsertUser, type SitemapAnalysis, type LlmTextFile, type InsertSitemapAnalysis, type InsertLlmTextFile, type EmailCapture, type InsertEmailCapture } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Analysis methods
  getAnalysisByUrl(url: string): Promise<SitemapAnalysis | undefined>;
  createAnalysis(analysis: InsertSitemapAnalysis): Promise<SitemapAnalysis>;
  getAnalysis(id: number): Promise<SitemapAnalysis | undefined>;
  updateAnalysis(id: number, updates: Partial<SitemapAnalysis>): Promise<SitemapAnalysis | undefined>;
  
  // LLM file methods
  createLlmFile(llmFile: InsertLlmTextFile): Promise<LlmTextFile>;
  getLlmFile(id: number): Promise<LlmTextFile | undefined>;
  
  // Email capture methods
  createEmailCapture(emailCapture: InsertEmailCapture): Promise<EmailCapture>;
  getEmailCapture(email: string): Promise<EmailCapture | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private analyses: Map<number, SitemapAnalysis>;
  private llmFiles: Map<number, LlmTextFile>;
  private emailCaptures: Map<string, EmailCapture>;
  private currentUserId: number;
  private currentAnalysisId: number;
  private currentLlmFileId: number;
  private currentEmailCaptureId: number;

  constructor() {
    this.users = new Map();
    this.analyses = new Map();
    this.llmFiles = new Map();
    this.emailCaptures = new Map();
    this.currentUserId = 1;
    this.currentAnalysisId = 1;
    this.currentLlmFileId = 1;
    this.currentEmailCaptureId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Analysis methods
  async getAnalysisByUrl(url: string): Promise<SitemapAnalysis | undefined> {
    return Array.from(this.analyses.values()).find(
      (analysis) => analysis.url === url,
    );
  }

  async createAnalysis(insertAnalysis: InsertSitemapAnalysis): Promise<SitemapAnalysis> {
    const id = this.currentAnalysisId++;
    const analysis: SitemapAnalysis = {
      id,
      url: insertAnalysis.url,
      status: insertAnalysis.status || "pending",
      sitemapContent: insertAnalysis.sitemapContent || null,
      discoveredPages: (insertAnalysis.discoveredPages as any) || null,
      createdAt: new Date(),
    };
    this.analyses.set(id, analysis);
    return analysis;
  }

  async getAnalysis(id: number): Promise<SitemapAnalysis | undefined> {
    return this.analyses.get(id);
  }

  async updateAnalysis(id: number, updates: Partial<SitemapAnalysis>): Promise<SitemapAnalysis | undefined> {
    const existing = this.analyses.get(id);
    if (!existing) return undefined;
    
    const updated = { ...existing, ...updates };
    this.analyses.set(id, updated);
    return updated;
  }

  // LLM file methods
  async createLlmFile(insertLlmFile: InsertLlmTextFile): Promise<LlmTextFile> {
    const id = this.currentLlmFileId++;
    const llmFile: LlmTextFile = {
      id,
      analysisId: insertLlmFile.analysisId || null,
      selectedPages: (insertLlmFile.selectedPages as any) || null,
      content: insertLlmFile.content,
      createdAt: new Date(),
    };
    this.llmFiles.set(id, llmFile);
    return llmFile;
  }

  async getLlmFile(id: number): Promise<LlmTextFile | undefined> {
    return this.llmFiles.get(id);
  }

  // Email capture methods
  async createEmailCapture(insertEmailCapture: InsertEmailCapture): Promise<EmailCapture> {
    const id = this.currentEmailCaptureId++;
    const emailCapture: EmailCapture = {
      id,
      email: insertEmailCapture.email,
      websiteUrl: insertEmailCapture.websiteUrl,
      tier: insertEmailCapture.tier || "free",
      createdAt: new Date(),
    };
    this.emailCaptures.set(insertEmailCapture.email, emailCapture);
    return emailCapture;
  }

  async getEmailCapture(email: string): Promise<EmailCapture | undefined> {
    return this.emailCaptures.get(email);
  }
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAnalysisByUrl(url: string): Promise<SitemapAnalysis | undefined> {
    const [analysis] = await db
      .select()
      .from(sitemapAnalysis)
      .where(eq(sitemapAnalysis.url, url))
      .orderBy(desc(sitemapAnalysis.id));
    return analysis || undefined;
  }

  async createAnalysis(insertAnalysis: InsertSitemapAnalysis): Promise<SitemapAnalysis> {
    const [analysis] = await db
      .insert(sitemapAnalysis)
      .values({
        url: insertAnalysis.url,
        status: insertAnalysis.status,
        sitemapContent: insertAnalysis.sitemapContent,
        discoveredPages: insertAnalysis.discoveredPages
      })
      .returning();
    return analysis;
  }

  async getAnalysis(id: number): Promise<SitemapAnalysis | undefined> {
    const [analysis] = await db
      .select()
      .from(sitemapAnalysis)
      .where(eq(sitemapAnalysis.id, id));
    return analysis || undefined;
  }

  async updateAnalysis(id: number, updates: Partial<SitemapAnalysis>): Promise<SitemapAnalysis | undefined> {
    const [analysis] = await db
      .update(sitemapAnalysis)
      .set(updates)
      .where(eq(sitemapAnalysis.id, id))
      .returning();
    return analysis || undefined;
  }

  async createLlmFile(insertLlmFile: InsertLlmTextFile): Promise<LlmTextFile> {
    const [llmFile] = await db
      .insert(llmTextFiles)
      .values({
        analysisId: insertLlmFile.analysisId,
        selectedPages: insertLlmFile.selectedPages,
        content: insertLlmFile.content
      })
      .returning();
    return llmFile;
  }

  async getLlmFile(id: number): Promise<LlmTextFile | undefined> {
    const [llmFile] = await db
      .select()
      .from(llmTextFiles)
      .where(eq(llmTextFiles.id, id));
    return llmFile || undefined;
  }

  // Email capture methods
  async createEmailCapture(insertEmailCapture: InsertEmailCapture): Promise<EmailCapture> {
    const [emailCapture] = await db
      .insert(emailCaptures)
      .values({
        email: insertEmailCapture.email,
        websiteUrl: insertEmailCapture.websiteUrl,
        tier: insertEmailCapture.tier || "free"
      })
      .returning();
    return emailCapture;
  }

  async getEmailCapture(email: string): Promise<EmailCapture | undefined> {
    const [emailCapture] = await db
      .select()
      .from(emailCaptures)
      .where(eq(emailCaptures.email, email));
    return emailCapture || undefined;
  }
}

export const storage = new DatabaseStorage();

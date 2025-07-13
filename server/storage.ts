import { users, type User, type InsertUser, type SitemapAnalysis, type LlmTextFile, type InsertSitemapAnalysis, type InsertLlmTextFile } from "@shared/schema";

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
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private analyses: Map<number, SitemapAnalysis>;
  private llmFiles: Map<number, LlmTextFile>;
  private currentUserId: number;
  private currentAnalysisId: number;
  private currentLlmFileId: number;

  constructor() {
    this.users = new Map();
    this.analyses = new Map();
    this.llmFiles = new Map();
    this.currentUserId = 1;
    this.currentAnalysisId = 1;
    this.currentLlmFileId = 1;
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
}

export const storage = new MemStorage();

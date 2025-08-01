import { eq, and, desc } from 'drizzle-orm';
import { db } from '../db';
import { 
  authUsers, 
  userSessions, 
  sitemapAnalysis,
  llmTextFiles,
  AuthUser, 
  UserSession, 
  InsertAuthUser, 
  InsertUserSession,
  UserTier
} from '@shared/schema';
import { hashToken } from './auth';

export class AuthStorage {
  // User operations
  async createUser(userData: Omit<InsertAuthUser, 'id'>): Promise<AuthUser> {
    const [user] = await db.insert(authUsers).values(userData).returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<AuthUser | null> {
    const [user] = await db.select().from(authUsers).where(eq(authUsers.email, email));
    return user || null;
  }

  async getUserById(id: number): Promise<AuthUser | null> {
    const [user] = await db.select().from(authUsers).where(eq(authUsers.id, id));
    return user || null;
  }

  async updateUser(id: number, updates: Partial<Omit<AuthUser, 'id' | 'createdAt'>>): Promise<AuthUser | null> {
    const [updatedUser] = await db
      .update(authUsers)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(authUsers.id, id))
      .returning();
    return updatedUser || null;
  }

  async verifyUserEmail(id: number): Promise<boolean> {
    const result = await db
      .update(authUsers)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(eq(authUsers.id, id))
      .returning({ id: authUsers.id });
    
    return result.length > 0;
  }

  async updateUserTier(id: number, tier: UserTier, creditsRemaining?: number): Promise<boolean> {
    const updates: any = { tier, updatedAt: new Date() };
    if (creditsRemaining !== undefined) {
      updates.creditsRemaining = creditsRemaining;
    }

    const result = await db
      .update(authUsers)
      .set(updates)
      .where(eq(authUsers.id, id))
      .returning({ id: authUsers.id });
    
    return result.length > 0;
  }

  // Session operations
  async createSession(sessionData: Omit<InsertUserSession, 'id'>): Promise<UserSession> {
    const [session] = await db.insert(userSessions).values(sessionData).returning();
    return session;
  }

  async getSessionByTokenHash(tokenHash: string): Promise<UserSession | null> {
    const [session] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.tokenHash, tokenHash));
    return session || null;
  }

  async getSessionByRefreshTokenHash(refreshTokenHash: string): Promise<UserSession | null> {
    const [session] = await db
      .select()
      .from(userSessions)
      .where(eq(userSessions.refreshTokenHash, refreshTokenHash));
    return session || null;
  }

  async updateSessionLastUsed(id: number): Promise<void> {
    await db
      .update(userSessions)
      .set({ lastUsedAt: new Date() })
      .where(eq(userSessions.id, id));
  }

  async deleteSession(id: number): Promise<boolean> {
    const result = await db
      .delete(userSessions)
      .where(eq(userSessions.id, id))
      .returning({ id: userSessions.id });
    
    return result.length > 0;
  }

  async deleteSessionByTokenHash(tokenHash: string): Promise<boolean> {
    const result = await db
      .delete(userSessions)
      .where(eq(userSessions.tokenHash, tokenHash))
      .returning({ id: userSessions.id });
    
    return result.length > 0;
  }

  async deleteAllUserSessions(userId: number): Promise<number> {
    const result = await db
      .delete(userSessions)
      .where(eq(userSessions.userId, userId))
      .returning({ id: userSessions.id });
    
    return result.length;
  }

  async deleteExpiredSessions(): Promise<number> {
    const now = new Date();
    const result = await db
      .delete(userSessions)
      .where(eq(userSessions.expiresAt, now))
      .returning({ id: userSessions.id });
    
    return result.length;
  }

  // Combined operations
  async getUserWithSession(tokenHash: string): Promise<{ user: AuthUser; session: UserSession } | null> {
    const session = await this.getSessionByTokenHash(tokenHash);
    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    const user = await this.getUserById(session.userId);
    if (!user) {
      return null;
    }

    // Update last used time
    await this.updateSessionLastUsed(session.id);

    return { user, session };
  }

  async refreshUserSession(refreshTokenHash: string, newTokenHash: string, newRefreshTokenHash: string, expiresAt: Date, refreshExpiresAt: Date): Promise<UserSession | null> {
    const session = await this.getSessionByRefreshTokenHash(refreshTokenHash);
    if (!session || session.refreshExpiresAt < new Date()) {
      return null;
    }

    const [updatedSession] = await db
      .update(userSessions)
      .set({
        tokenHash: newTokenHash,
        refreshTokenHash: newRefreshTokenHash,
        expiresAt,
        refreshExpiresAt,
        lastUsedAt: new Date(),
      })
      .where(eq(userSessions.id, session.id))
      .returning();

    return updatedSession || null;
  }

  // Email and authentication helpers
  async isEmailTaken(email: string): Promise<boolean> {
    const [user] = await db
      .select({ id: authUsers.id })
      .from(authUsers)
      .where(eq(authUsers.email, email));
    
    return !!user;
  }

  async getUserStats(userId: number): Promise<{
    totalSessions: number;
    activeSessions: number;
    lastLogin: Date | null;
  }> {
    const now = new Date();
    
    const [stats] = await db
      .select({
        totalSessions: userSessions.id,
        lastUsed: userSessions.lastUsedAt,
      })
      .from(userSessions)
      .where(eq(userSessions.userId, userId));

    const activeSessions = await db
      .select({ id: userSessions.id })
      .from(userSessions)
      .where(
        and(
          eq(userSessions.userId, userId),
          eq(userSessions.expiresAt, now)
        )
      );

    return {
      totalSessions: stats ? 1 : 0, // This would need to be a proper count query
      activeSessions: activeSessions.length,
      lastLogin: stats?.lastUsed || null,
    };
  }

  // Admin operations
  async getUserCount(): Promise<number> {
    const [result] = await db
      .select({ count: authUsers.id })
      .from(authUsers);
    
    return result?.count || 0;
  }

  async getActiveSessionCount(): Promise<number> {
    const now = new Date();
    const sessions = await db
      .select({ id: userSessions.id })
      .from(userSessions)
      .where(eq(userSessions.expiresAt, now));
    
    return sessions.length;
  }

  // Analysis history methods
  async getUserAnalyses(userEmail: string): Promise<any[]> {
    try {
      const analyses = await db
        .select()
        .from(sitemapAnalysis)
        .where(eq(sitemapAnalysis.analysisMetadata, userEmail))
        .orderBy(desc(sitemapAnalysis.createdAt));
      
      // Note: This is a simplified query. In production, we'd want to properly 
      // query the JSON field for userEmail within analysisMetadata
      // For now, we'll need to filter in JavaScript
      return analyses.filter(analysis => 
        analysis.analysisMetadata && 
        typeof analysis.analysisMetadata === 'object' &&
        'userEmail' in analysis.analysisMetadata &&
        analysis.analysisMetadata.userEmail === userEmail
      );
    } catch (error) {
      console.error('Error fetching user analyses:', error);
      return [];
    }
  }

  async getUserAnalysis(userEmail: string, analysisId: number): Promise<any | null> {
    try {
      const [analysis] = await db
        .select()
        .from(sitemapAnalysis)
        .where(eq(sitemapAnalysis.id, analysisId));
      
      if (!analysis) return null;
      
      // Verify this analysis belongs to the user
      if (analysis.analysisMetadata && 
          typeof analysis.analysisMetadata === 'object' &&
          'userEmail' in analysis.analysisMetadata &&
          analysis.analysisMetadata.userEmail === userEmail) {
        return analysis;
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching user analysis:', error);
      return null;
    }
  }

  async getUserAnalysisFiles(userEmail: string): Promise<any[]> {
    try {
      // Get all analyses for this user first
      const userAnalyses = await this.getUserAnalyses(userEmail);
      const analysisIds = userAnalyses.map(a => a.id);
      
      if (analysisIds.length === 0) return [];
      
      // Get all LLM files for these analyses
      const files = await db
        .select()
        .from(llmTextFiles)
        .where(eq(llmTextFiles.analysisId, analysisIds[0])); // This would need proper IN query
      
      return files;
    } catch (error) {
      console.error('Error fetching user analysis files:', error);
      return [];
    }
  }
}

// Export singleton instance
export const authStorage = new AuthStorage();
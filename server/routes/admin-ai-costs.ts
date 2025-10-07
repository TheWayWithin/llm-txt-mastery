import { Router } from 'express';
import { db } from '../db';
import { usageTracking, emailCaptures, users } from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { getMonthlyAiCost } from '../services/usage';

const router = Router();

// Admin authentication middleware (simple implementation)
const requireAdmin = (req: any, res: any, next: any) => {
  // For now, check for admin header
  // TODO: Replace with proper admin authentication
  const adminToken = req.headers['x-admin-token'];
  if (adminToken !== process.env.ADMIN_API_TOKEN && process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Get AI cost summary for all users
router.get('/ai-costs/summary', requireAdmin, async (req, res) => {
  try {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const monthStartStr = monthStart.toISOString().split('T')[0];

    // Get monthly summary
    const summary = await db.execute(sql`
      SELECT 
        ec.tier,
        COUNT(DISTINCT ut.user_id) as active_users,
        SUM(ut.actual_ai_cost) / 100.0 as total_ai_cost_usd,
        SUM(ut.actual_tokens_used) as total_tokens,
        AVG(ut.actual_ai_cost) / 100.0 as avg_cost_per_user,
        MAX(ut.actual_ai_cost) / 100.0 as max_user_cost,
        COUNT(DISTINCT CASE WHEN ut.cost_cap_would_trigger THEN ut.user_id END) as users_hitting_cap
      FROM usage_tracking ut
      JOIN email_captures ec ON ec.user_id = ut.user_id
      WHERE ut.date >= ${monthStartStr}
      GROUP BY ec.tier
      ORDER BY total_ai_cost_usd DESC
    `);

    // Get overall stats
    const overallStats = await db.execute(sql`
      SELECT 
        SUM(actual_ai_cost) / 100.0 as total_month_cost,
        SUM(actual_tokens_used) as total_month_tokens,
        COUNT(DISTINCT user_id) as total_active_users,
        COUNT(DISTINCT CASE WHEN cost_cap_would_trigger THEN user_id END) as total_users_hitting_cap
      FROM usage_tracking
      WHERE date >= ${monthStartStr}
    `);

    // Get top spenders
    const topSpenders = await db.execute(sql`
      SELECT 
        u.username,
        ec.email,
        ec.tier,
        SUM(ut.actual_ai_cost) / 100.0 as total_cost,
        SUM(ut.actual_tokens_used) as total_tokens,
        MAX(ut.model_used) as last_model_used
      FROM usage_tracking ut
      JOIN users u ON u.id = ut.user_id
      JOIN email_captures ec ON ec.user_id = u.id
      WHERE ut.date >= ${monthStartStr}
      GROUP BY u.id, u.username, ec.email, ec.tier
      ORDER BY total_cost DESC
      LIMIT 10
    `);

    res.json({
      month: monthStart.toISOString().substring(0, 7),
      overall: overallStats.rows[0] || {},
      byTier: summary.rows,
      topSpenders: topSpenders.rows,
      costCapsEnabled: process.env.ENABLE_AI_COST_CAPS === 'true',
      budgets: {
        growth: parseFloat(process.env.AI_COST_CAP_GROWTH || '8.00'),
        scale: parseFloat(process.env.AI_COST_CAP_SCALE || '16.00'),
      },
    });
  } catch (error) {
    console.error('Error getting AI cost summary:', error);
    res.status(500).json({ error: 'Failed to get AI cost summary' });
  }
});

// Get detailed AI costs for a specific user
router.get('/ai-costs/user/:email', requireAdmin, async (req, res) => {
  try {
    const { email } = req.params;

    // Get user and tier
    const emailCapture = await db
      .select()
      .from(emailCaptures)
      .where(eq(emailCaptures.email, email))
      .limit(1);

    if (!emailCapture[0]) {
      return res.status(404).json({ error: 'User not found' });
    }

    const userId = emailCapture[0].userId;
    const tier = emailCapture[0].tier;

    // Get monthly costs
    const monthlyCosts = await getMonthlyAiCost(email);

    // Get daily breakdown for current month
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().split('T')[0];

    const dailyBreakdown = await db
      .select({
        date: usageTracking.date,
        analysesCount: usageTracking.analysesCount,
        aiCallsCount: usageTracking.aiCallsCount,
        actualTokensUsed: usageTracking.actualTokensUsed,
        actualAiCost: usageTracking.actualAiCost,
        modelUsed: usageTracking.modelUsed,
        costCapWouldTrigger: usageTracking.costCapWouldTrigger,
      })
      .from(usageTracking)
      .where(and(eq(usageTracking.userId, userId!), sql`${usageTracking.date} >= ${monthStartStr}`))
      .orderBy(desc(usageTracking.date));

    // Calculate budget status
    const monthlyBudgets = {
      starter: 0,
      coffee: 3.0,
      growth: parseFloat(process.env.AI_COST_CAP_GROWTH || '8.00'),
      scale: parseFloat(process.env.AI_COST_CAP_SCALE || '16.00'),
    };

    const budget = monthlyBudgets[tier as keyof typeof monthlyBudgets];
    const percentUsed = budget > 0 ? (monthlyCosts.monthlyTotal / budget) * 100 : 0;

    res.json({
      email,
      tier,
      monthlyBudget: budget,
      monthlyCosts: {
        total: monthlyCosts.monthlyTotal,
        dailyAverage: monthlyCosts.dailyAverage,
        tokensUsed: monthlyCosts.tokensUsed,
        daysActive: monthlyCosts.daysActive,
        percentOfBudget: percentUsed,
      },
      dailyBreakdown: dailyBreakdown.map((day) => ({
        ...day,
        actualAiCostUSD: (day.actualAiCost || 0) / 100,
      })),
      warnings: {
        approachingLimit: percentUsed >= 70,
        wouldTriggerCap: monthlyCosts.monthlyTotal >= budget,
        costCapsEnabled: process.env.ENABLE_AI_COST_CAPS === 'true',
      },
    });
  } catch (error) {
    console.error('Error getting user AI costs:', error);
    res.status(500).json({ error: 'Failed to get user AI costs' });
  }
});

// Simulation endpoint - what would happen if caps were enabled
router.post('/ai-costs/simulation', requireAdmin, async (req, res) => {
  try {
    const { enableCaps = true, growthBudget = 8.0, scaleBudget = 16.0 } = req.body;

    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().split('T')[0];

    // Simulate impact
    const simulation = await db.execute(sql`
      WITH monthly_costs AS (
        SELECT 
          ut.user_id,
          ec.tier,
          ec.email,
          SUM(ut.actual_ai_cost) / 100.0 as monthly_cost
        FROM usage_tracking ut
        JOIN email_captures ec ON ec.user_id = ut.user_id
        WHERE ut.date >= ${monthStartStr}
        GROUP BY ut.user_id, ec.tier, ec.email
      )
      SELECT 
        tier,
        COUNT(*) as total_users,
        COUNT(CASE 
          WHEN tier = 'growth' AND monthly_cost > ${growthBudget} THEN 1
          WHEN tier = 'scale' AND monthly_cost > ${scaleBudget} THEN 1
        END) as users_affected,
        SUM(CASE 
          WHEN tier = 'growth' AND monthly_cost > ${growthBudget} THEN monthly_cost - ${growthBudget}
          WHEN tier = 'scale' AND monthly_cost > ${scaleBudget} THEN monthly_cost - ${scaleBudget}
          ELSE 0
        END) as total_cost_over_budget,
        MAX(monthly_cost) as max_user_cost
      FROM monthly_costs
      WHERE tier IN ('growth', 'scale')
      GROUP BY tier
    `);

    res.json({
      simulation: {
        enabled: enableCaps,
        budgets: { growth: growthBudget, scale: scaleBudget },
        impact: simulation.rows,
        recommendation: simulation.rows.some((r: any) => r.users_affected > 0)
          ? 'Some users would be affected. Consider gradual rollout or user notifications.'
          : 'No users currently exceed proposed budgets. Safe to enable.',
      },
    });
  } catch (error) {
    console.error('Error running simulation:', error);
    res.status(500).json({ error: 'Failed to run simulation' });
  }
});

export default router;

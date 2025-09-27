import { Router, Request, Response } from 'express';
import { featureFlagService, FeatureFlagName } from '../services/feature-flags';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * Get feature flags for the current user context
 * GET /api/feature-flags
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Extract user context from token if available
    const userContext = {
      userId: (req as any).user?.userId,
      email: (req as any).user?.email,
      tier: (req as any).user?.tier,
      environment: process.env.NODE_ENV
    };

    // Get enabled features for this user
    const enabledFeatures = await featureFlagService.getEnabledFeatures(userContext);
    
    // Create flags object
    const flags: Record<FeatureFlagName, boolean> = {
      clustering: false,
      semantic_tags: false,
      enhanced_descriptions: false,
      multi_sequencing: false,
      blockquote_summaries: false,
      admin_dashboard: false,
      performance_metrics: false
    };

    // Set enabled flags
    for (const feature of enabledFeatures) {
      flags[feature] = true;
    }

    res.json({
      flags,
      enabledFeatures,
      userContext: {
        userId: userContext.userId,
        tier: userContext.tier,
        environment: userContext.environment
      }
    });
  } catch (error) {
    console.error('Error fetching feature flags:', error);
    res.status(500).json({
      error: 'Failed to fetch feature flags',
      flags: {
        clustering: false,
        semantic_tags: false,
        enhanced_descriptions: false,
        multi_sequencing: false,
        blockquote_summaries: false,
        admin_dashboard: false,
        performance_metrics: process.env.NODE_ENV === 'development'
      },
      enabledFeatures: []
    });
  }
});

/**
 * Check if a specific feature is enabled
 * GET /api/feature-flags/:flag
 */
router.get('/:flag', async (req: Request, res: Response) => {
  try {
    const flagName = req.params.flag as FeatureFlagName;
    
    const userContext = {
      userId: (req as any).user?.userId,
      email: (req as any).user?.email,
      tier: (req as any).user?.tier,
      environment: process.env.NODE_ENV
    };

    const isEnabled = await featureFlagService.isEnabled(flagName, userContext);
    const dependencies = await featureFlagService.checkDependencies(flagName, userContext);

    res.json({
      flag: flagName,
      enabled: isEnabled,
      dependencies
    });
  } catch (error) {
    console.error('Error checking feature flag:', error);
    res.status(500).json({
      error: 'Failed to check feature flag',
      flag: req.params.flag,
      enabled: false
    });
  }
});

// Admin routes (require authentication and admin privileges)

/**
 * Get all feature flags for admin panel
 * GET /api/admin/feature-flags
 */
router.get('/admin/all', authenticate, async (req: Request, res: Response) => {
  try {
    // Check if user has admin privileges (you may want to add admin role check)
    const user = (req as any).user;
    
    // For now, allow any authenticated user to view flags in development
    if (process.env.NODE_ENV !== 'development' && user.tier !== 'scale') {
      return res.status(403).json({ error: 'Admin privileges required' });
    }

    const flags = await featureFlagService.getAllFlags();
    const stats = await featureFlagService.getStats();
    const healthCheck = await featureFlagService.healthCheck();

    res.json({
      flags,
      stats,
      health: healthCheck
    });
  } catch (error) {
    console.error('Error fetching admin flags:', error);
    res.status(500).json({ error: 'Failed to fetch admin flags' });
  }
});

/**
 * Update a feature flag
 * PUT /api/admin/feature-flags/:flag
 */
router.put('/admin/:flag', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    // Check admin privileges
    if (process.env.NODE_ENV !== 'development' && user.tier !== 'scale') {
      return res.status(403).json({ error: 'Admin privileges required' });
    }

    const flagName = req.params.flag as FeatureFlagName;
    const updates = req.body;

    // Validate updates
    if (updates.rolloutPercentage !== undefined) {
      if (typeof updates.rolloutPercentage !== 'number' || updates.rolloutPercentage < 0 || updates.rolloutPercentage > 100) {
        return res.status(400).json({ error: 'rolloutPercentage must be a number between 0 and 100' });
      }
    }

    const success = await featureFlagService.updateFlag(flagName, updates);
    
    if (!success) {
      return res.status(404).json({ error: 'Feature flag not found' });
    }

    const updatedFlag = await featureFlagService.getFlag(flagName);
    res.json({ success: true, flag: updatedFlag });
  } catch (error) {
    console.error('Error updating feature flag:', error);
    res.status(500).json({ error: 'Failed to update feature flag' });
  }
});

/**
 * Set user-specific override for a feature flag
 * PUT /api/admin/feature-flags/:flag/users/:userId
 */
router.put('/admin/:flag/users/:userId', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    // Check admin privileges
    if (process.env.NODE_ENV !== 'development' && user.tier !== 'scale') {
      return res.status(403).json({ error: 'Admin privileges required' });
    }

    const flagName = req.params.flag as FeatureFlagName;
    const userId = req.params.userId;
    const { enabled } = req.body;

    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'enabled must be a boolean' });
    }

    const success = await featureFlagService.setUserOverride(flagName, userId, enabled);
    
    if (!success) {
      return res.status(404).json({ error: 'Feature flag not found' });
    }

    res.json({ success: true, userId, flagName, enabled });
  } catch (error) {
    console.error('Error setting user override:', error);
    res.status(500).json({ error: 'Failed to set user override' });
  }
});

/**
 * Remove user-specific override for a feature flag
 * DELETE /api/admin/feature-flags/:flag/users/:userId
 */
router.delete('/admin/:flag/users/:userId', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    // Check admin privileges
    if (process.env.NODE_ENV !== 'development' && user.tier !== 'scale') {
      return res.status(403).json({ error: 'Admin privileges required' });
    }

    const flagName = req.params.flag as FeatureFlagName;
    const userId = req.params.userId;

    const success = await featureFlagService.removeUserOverride(flagName, userId);
    
    if (!success) {
      return res.status(404).json({ error: 'Feature flag not found' });
    }

    res.json({ success: true, userId, flagName, removed: true });
  } catch (error) {
    console.error('Error removing user override:', error);
    res.status(500).json({ error: 'Failed to remove user override' });
  }
});

/**
 * Get feature flag health check
 * GET /api/feature-flags/health
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const healthCheck = await featureFlagService.healthCheck();
    const status = healthCheck.status === 'healthy' ? 200 : 503;
    
    res.status(status).json(healthCheck);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    });
  }
});

/**
 * Clear feature flag cache
 * POST /api/admin/feature-flags/cache/clear
 */
router.post('/admin/cache/clear', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    // Check admin privileges
    if (process.env.NODE_ENV !== 'development' && user.tier !== 'scale') {
      return res.status(403).json({ error: 'Admin privileges required' });
    }

    await featureFlagService.clearCache();
    res.json({ success: true, message: 'Cache cleared successfully' });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ error: 'Failed to clear cache' });
  }
});

export default router;
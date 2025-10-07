import { Router, Request, Response } from 'express';
import { abTestingService } from '../services/ab-testing';
import { authenticate, optionalAuth } from '../middleware/auth';
import { z } from 'zod';

const router = Router();

// Validation schemas
const userContextSchema = z.object({
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  email: z.string().email().optional(),
  tier: z.string().optional(),
  properties: z.record(z.any()).optional(),
});

const trackEventSchema = z.object({
  variant: z.string(),
  eventType: z.string(),
  eventValue: z.number().optional(),
  eventProperties: z.record(z.any()).optional(),
  userContext: userContextSchema,
});

const createExperimentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  featureFlag: z.string().optional(),
  variants: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        trafficAllocation: z.number().min(0).max(100),
        config: z.record(z.any()).optional(),
      })
    )
    .min(2),
  metrics: z
    .array(
      z.object({
        name: z.string(),
        type: z.enum(['conversion_rate', 'click_through_rate', 'average_value', 'count']),
        eventType: z.string(),
        description: z.string().optional(),
        isPrimary: z.boolean().optional(),
      })
    )
    .min(1),
  targetingRules: z
    .array(
      z.object({
        type: z.enum(['user_property', 'session_property', 'random']),
        property: z.string().optional(),
        operator: z.enum([
          'equals',
          'not_equals',
          'in',
          'not_in',
          'greater_than',
          'less_than',
          'contains',
        ]),
        value: z.any(),
      })
    )
    .optional(),
  trafficAllocation: z.number().min(0).max(100).optional(),
});

/**
 * Get experiment assignment for a user/session
 * POST /api/ab-testing/assignment/:experimentName
 */
router.post('/assignment/:experimentName', optionalAuth, async (req: Request, res: Response) => {
  try {
    const experimentName = req.params.experimentName;
    const { userContext } = req.body;

    // Validate input
    const validatedContext = userContextSchema.safeParse(userContext);
    if (!validatedContext.success) {
      return res.status(400).json({
        error: 'Invalid user context',
        details: validatedContext.error.errors,
      });
    }

    // Get assignment
    const assignment = await abTestingService.getAssignment(experimentName, validatedContext.data);

    if (!assignment) {
      return res.status(404).json({
        error: 'Experiment not found or not running',
        experimentName,
      });
    }

    res.json(assignment);
  } catch (error) {
    console.error('Error getting experiment assignment:', error);
    res.status(500).json({ error: 'Failed to get experiment assignment' });
  }
});

/**
 * Get multiple experiment assignments
 * POST /api/ab-testing/assignments
 */
router.post('/assignments', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { experimentNames, userContext } = req.body;

    if (!Array.isArray(experimentNames)) {
      return res.status(400).json({ error: 'experimentNames must be an array' });
    }

    // Validate input
    const validatedContext = userContextSchema.safeParse(userContext);
    if (!validatedContext.success) {
      return res.status(400).json({
        error: 'Invalid user context',
        details: validatedContext.error.errors,
      });
    }

    // Get assignments
    const assignments = await abTestingService.getMultipleAssignments(
      experimentNames,
      validatedContext.data
    );

    res.json(assignments);
  } catch (error) {
    console.error('Error getting experiment assignments:', error);
    res.status(500).json({ error: 'Failed to get experiment assignments' });
  }
});

/**
 * Track experiment event
 * POST /api/ab-testing/event/:experimentName
 */
router.post('/event/:experimentName', optionalAuth, async (req: Request, res: Response) => {
  try {
    const experimentName = req.params.experimentName;

    // Validate input
    const validatedData = trackEventSchema.safeParse(req.body);
    if (!validatedData.success) {
      return res.status(400).json({
        error: 'Invalid event data',
        details: validatedData.error.errors,
      });
    }

    const { variant, eventType, eventValue, eventProperties, userContext } = validatedData.data;

    // Track event
    const success = await abTestingService.trackEvent(
      experimentName,
      variant,
      eventType,
      userContext,
      eventValue,
      eventProperties
    );

    if (!success) {
      return res.status(404).json({ error: 'Experiment not found' });
    }

    res.json({ success: true, tracked: true });
  } catch (error) {
    console.error('Error tracking experiment event:', error);
    res.status(500).json({ error: 'Failed to track experiment event' });
  }
});

/**
 * Track conversion event (convenience endpoint)
 * POST /api/ab-testing/conversion
 */
router.post('/conversion', optionalAuth, async (req: Request, res: Response) => {
  try {
    const { experimentName, conversionType, eventValue, eventProperties, userContext } = req.body;

    if (!experimentName || !conversionType || !userContext) {
      return res.status(400).json({
        error: 'Missing required fields: experimentName, conversionType, userContext',
      });
    }

    // Validate user context
    const validatedContext = userContextSchema.safeParse(userContext);
    if (!validatedContext.success) {
      return res.status(400).json({
        error: 'Invalid user context',
        details: validatedContext.error.errors,
      });
    }

    // Get user's current assignment to determine variant
    const assignment = await abTestingService.getAssignment(experimentName, validatedContext.data);
    if (!assignment) {
      return res.status(404).json({ error: 'No active assignment for this experiment' });
    }

    // Track conversion event
    const success = await abTestingService.trackEvent(
      experimentName,
      assignment.variant,
      `conversion_${conversionType}`,
      validatedContext.data,
      eventValue,
      { ...eventProperties, conversionType }
    );

    res.json({ success, tracked: success, variant: assignment.variant });
  } catch (error) {
    console.error('Error tracking conversion:', error);
    res.status(500).json({ error: 'Failed to track conversion' });
  }
});

// Admin routes (require authentication)

/**
 * Create new experiment
 * POST /api/admin/ab-testing/experiments
 */
router.post('/admin/experiments', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    // Check admin privileges
    if (process.env.NODE_ENV !== 'development' && user.tier !== 'scale') {
      return res.status(403).json({ error: 'Admin privileges required' });
    }

    // Validate input
    const validatedData = createExperimentSchema.safeParse(req.body);
    if (!validatedData.success) {
      return res.status(400).json({
        error: 'Invalid experiment data',
        details: validatedData.error.errors,
      });
    }

    const experimentData = {
      ...validatedData.data,
      createdBy: user.email || user.userId.toString(),
    };

    const experimentId = await abTestingService.createExperiment(experimentData);

    if (!experimentId) {
      return res.status(400).json({ error: 'Failed to create experiment' });
    }

    res.status(201).json({
      success: true,
      experimentId,
      message: 'Experiment created successfully',
    });
  } catch (error) {
    console.error('Error creating experiment:', error);
    res.status(500).json({ error: 'Failed to create experiment' });
  }
});

/**
 * Start experiment
 * POST /api/admin/ab-testing/experiments/:experimentName/start
 */
router.post(
  '/admin/experiments/:experimentName/start',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;

      // Check admin privileges
      if (process.env.NODE_ENV !== 'development' && user.tier !== 'scale') {
        return res.status(403).json({ error: 'Admin privileges required' });
      }

      const experimentName = req.params.experimentName;
      const success = await abTestingService.startExperiment(experimentName);

      if (!success) {
        return res.status(404).json({ error: 'Experiment not found' });
      }

      res.json({ success: true, message: 'Experiment started successfully' });
    } catch (error) {
      console.error('Error starting experiment:', error);
      res.status(500).json({ error: 'Failed to start experiment' });
    }
  }
);

/**
 * Stop experiment
 * POST /api/admin/ab-testing/experiments/:experimentName/stop
 */
router.post(
  '/admin/experiments/:experimentName/stop',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;

      // Check admin privileges
      if (process.env.NODE_ENV !== 'development' && user.tier !== 'scale') {
        return res.status(403).json({ error: 'Admin privileges required' });
      }

      const experimentName = req.params.experimentName;
      const { winnerVariant } = req.body;

      const success = await abTestingService.stopExperiment(experimentName, winnerVariant);

      if (!success) {
        return res.status(404).json({ error: 'Experiment not found' });
      }

      res.json({
        success: true,
        message: 'Experiment stopped successfully',
        winnerVariant,
      });
    } catch (error) {
      console.error('Error stopping experiment:', error);
      res.status(500).json({ error: 'Failed to stop experiment' });
    }
  }
);

/**
 * Get experiment results
 * GET /api/admin/ab-testing/experiments/:experimentName/results
 */
router.get(
  '/admin/experiments/:experimentName/results',
  authenticate,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;

      // Check admin privileges
      if (process.env.NODE_ENV !== 'development' && user.tier !== 'scale') {
        return res.status(403).json({ error: 'Admin privileges required' });
      }

      const experimentName = req.params.experimentName;
      const results = await abTestingService.getExperimentResults(experimentName);

      if (!results) {
        return res.status(404).json({ error: 'Experiment not found' });
      }

      res.json(results);
    } catch (error) {
      console.error('Error getting experiment results:', error);
      res.status(500).json({ error: 'Failed to get experiment results' });
    }
  }
);

/**
 * Get active experiments for current user
 * GET /api/ab-testing/active
 */
router.get('/active', optionalAuth, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    const userContext = {
      userId: user?.userId?.toString(),
      sessionId: req.headers['x-session-id'] as string,
      email: user?.email,
      tier: user?.tier,
    };

    const activeExperiments = await abTestingService.getActiveExperiments(userContext);

    res.json({
      activeExperiments,
      userContext: {
        userId: userContext.userId,
        sessionId: userContext.sessionId,
        tier: userContext.tier,
      },
    });
  } catch (error) {
    console.error('Error getting active experiments:', error);
    res.status(500).json({ error: 'Failed to get active experiments' });
  }
});

/**
 * Health check for A/B testing service
 * GET /api/ab-testing/health
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const healthCheck = await abTestingService.healthCheck();
    const status = healthCheck.status === 'healthy' ? 200 : 503;

    res.status(status).json(healthCheck);
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    });
  }
});

export default router;

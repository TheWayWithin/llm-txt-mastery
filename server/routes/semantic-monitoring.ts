import { Router, Request, Response } from 'express';
import { semanticMonitoring } from '../services/semantic-monitoring';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * Get dashboard metrics
 * GET /api/semantic/metrics/dashboard
 */
router.get('/dashboard', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    // Check admin privileges
    if (process.env.NODE_ENV !== 'development' && user.tier !== 'scale') {
      return res.status(403).json({ error: 'Admin privileges required' });
    }

    const timeRange = req.query.timeRange as '1h' | '6h' | '24h' | '7d' || '24h';
    const metrics = await semanticMonitoring.getDashboardMetrics(timeRange);

    res.json(metrics);
  } catch (error) {
    console.error('Error getting dashboard metrics:', error);
    res.status(500).json({ error: 'Failed to get dashboard metrics' });
  }
});

/**
 * Get feature-specific metrics
 * GET /api/semantic/metrics/feature/:feature
 */
router.get('/feature/:feature', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    // Check admin privileges
    if (process.env.NODE_ENV !== 'development' && user.tier !== 'scale') {
      return res.status(403).json({ error: 'Admin privileges required' });
    }

    const feature = req.params.feature;
    const timeRange = req.query.timeRange as '1h' | '6h' | '24h' | '7d' || '24h';
    
    const metrics = await semanticMonitoring.getFeatureMetrics(feature, timeRange);

    res.json(metrics);
  } catch (error) {
    console.error('Error getting feature metrics:', error);
    res.status(500).json({ error: 'Failed to get feature metrics' });
  }
});

/**
 * Log semantic operation (internal use)
 * POST /api/semantic/log
 */
router.post('/log', authenticate, async (req: Request, res: Response) => {
  try {
    const logEntry = req.body;
    
    // Validate required fields
    if (!logEntry.feature || !logEntry.operation || !logEntry.status) {
      return res.status(400).json({ 
        error: 'Missing required fields: feature, operation, status' 
      });
    }

    await semanticMonitoring.logOperation(logEntry);

    res.json({ success: true, logged: true });
  } catch (error) {
    console.error('Error logging semantic operation:', error);
    res.status(500).json({ error: 'Failed to log operation' });
  }
});

/**
 * Record performance metric (internal use)
 * POST /api/semantic/metrics
 */
router.post('/metrics', authenticate, async (req: Request, res: Response) => {
  try {
    const metric = req.body;
    
    // Validate required fields
    if (!metric.feature || !metric.operation || !metric.metric || metric.value === undefined) {
      return res.status(400).json({ 
        error: 'Missing required fields: feature, operation, metric, value' 
      });
    }

    // Ensure timestamp is a Date object
    metric.timestamp = metric.timestamp ? new Date(metric.timestamp) : new Date();

    await semanticMonitoring.recordMetric(metric);

    res.json({ success: true, recorded: true });
  } catch (error) {
    console.error('Error recording performance metric:', error);
    res.status(500).json({ error: 'Failed to record metric' });
  }
});

/**
 * Get real-time metrics from Redis
 * GET /api/semantic/metrics/realtime/:feature
 */
router.get('/realtime/:feature', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    // Check admin privileges
    if (process.env.NODE_ENV !== 'development' && user.tier !== 'scale') {
      return res.status(403).json({ error: 'Admin privileges required' });
    }

    const feature = req.params.feature;
    
    // Get real-time metrics from Redis (implementation depends on specific needs)
    // For now, return a placeholder structure
    res.json({
      feature,
      realTimeMetrics: {
        currentRequests: 0,
        averageResponseTime: 0,
        errorRate: 0,
        throughput: 0
      },
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error getting real-time metrics:', error);
    res.status(500).json({ error: 'Failed to get real-time metrics' });
  }
});

/**
 * Health check for monitoring service
 * GET /api/semantic/health
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const healthCheck = await semanticMonitoring.healthCheck();
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
 * Get system alerts
 * GET /api/semantic/alerts
 */
router.get('/alerts', authenticate, async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    
    // Check admin privileges
    if (process.env.NODE_ENV !== 'development' && user.tier !== 'scale') {
      return res.status(403).json({ error: 'Admin privileges required' });
    }

    // Get alerts from Redis or database
    // This would be implemented based on how alerts are stored
    res.json({
      alerts: [],
      count: 0,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error getting alerts:', error);
    res.status(500).json({ error: 'Failed to get alerts' });
  }
});

export default router;
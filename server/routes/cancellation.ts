import type { Express } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth';
import { apiLimiter } from '../middleware/rate-limit';
import {
  requestCancellation,
  checkRefundEligibility,
  getCancellationStatus,
  calculateRefundAmount,
} from '../services/cancellation';

export function registerCancellationRoutes(app: Express) {
  /**
   * Request cancellation with optional refund
   */
  app.post('/api/cancel', requireAuth, apiLimiter, async (req, res) => {
    try {
      const { reason, processRefund = true } = z
        .object({
          reason: z.string().optional(),
          processRefund: z.boolean().default(true),
        })
        .parse(req.body);

      const authUser = req.user;
      if (!authUser) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Check if user has already cancelled
      const existingCancellation = await getCancellationStatus(authUser.id);
      if (existingCancellation.hasCancelled) {
        return res.status(400).json({
          message: 'You have already cancelled your subscription',
          cancellation: existingCancellation.cancellation,
        });
      }

      // Process cancellation
      const result = await requestCancellation({
        userId: authUser.id,
        reason,
        immediateRefund: processRefund,
      });

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          cancellationId: result.cancellationId,
        });
      } else {
        res.status(400).json({
          success: false,
          message: result.message,
        });
      }
    } catch (error) {
      console.error('Cancellation request failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process cancellation. Please contact support.',
      });
    }
  });

  /**
   * Check refund eligibility without processing
   */
  app.get('/api/refund/eligibility', requireAuth, async (req, res) => {
    try {
      const authUser = req.user;
      if (!authUser) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const eligibility = await checkRefundEligibility(authUser.id);

      res.json({
        eligible: eligibility.eligible,
        amount: eligibility.amount,
        amountFormatted: `$${(eligibility.amount / 100).toFixed(2)}`,
        reason: eligibility.reason,
        guaranteeApplies: eligibility.guaranteeApplies,
        tier: authUser.tier,
      });
    } catch (error) {
      console.error('Failed to check refund eligibility:', error);
      res.status(500).json({
        eligible: false,
        amount: 0,
        reason: 'Error checking eligibility',
      });
    }
  });

  /**
   * Get cancellation status
   */
  app.get('/api/cancellation/status', requireAuth, async (req, res) => {
    try {
      const authUser = req.user;
      if (!authUser) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      const status = await getCancellationStatus(authUser.id);

      res.json({
        hasCancelled: status.hasCancelled,
        cancellation: status.cancellation
          ? {
              id: status.cancellation.id,
              requestedAt: status.cancellation.requestedAt,
              processedAt: status.cancellation.processedAt,
              refundAmount: status.cancellation.refundAmount,
              refundStatus: status.cancellation.refundStatus,
              reason: status.cancellation.reason,
            }
          : null,
        refund: status.refund
          ? {
              id: status.refund.id,
              amount: status.refund.amount,
              status: status.refund.status,
              processedAt: status.refund.processedAt,
            }
          : null,
      });
    } catch (error) {
      console.error('Failed to get cancellation status:', error);
      res.status(500).json({
        hasCancelled: false,
        message: 'Error fetching cancellation status',
      });
    }
  });

  /**
   * Request manual refund (for special cases)
   */
  app.post('/api/refund/request', requireAuth, apiLimiter, async (req, res) => {
    try {
      const { reason } = z
        .object({
          reason: z.string().min(10, 'Please provide a detailed reason'),
        })
        .parse(req.body);

      const authUser = req.user;
      if (!authUser) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Check eligibility first
      const eligibility = await checkRefundEligibility(authUser.id);

      if (!eligibility.eligible) {
        return res.status(400).json({
          success: false,
          message: eligibility.reason,
        });
      }

      // Process refund request as a cancellation
      const result = await requestCancellation({
        userId: authUser.id,
        reason: `Manual refund request: ${reason}`,
        immediateRefund: true,
      });

      res.json({
        success: result.success,
        message: result.success
          ? `Refund request submitted. Amount: $${(eligibility.amount / 100).toFixed(2)}`
          : result.message,
      });
    } catch (error) {
      console.error('Refund request failed:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to process refund request',
      });
    }
  });

  /**
   * Get refund policy information
   */
  app.get('/api/refund/policy', async (req, res) => {
    res.json({
      guarantees: [
        {
          name: '30-Day Money-Back Guarantee',
          description: 'Not satisfied? Get a full refund within 30 days of purchase.',
          applies_to: ['coffee', 'growth', 'scale'],
          conditions: 'No questions asked',
        },
        {
          name: 'Cancel Anytime',
          description: 'Cancel your subscription at any time with one click.',
          applies_to: ['growth', 'scale'],
          conditions: 'Prorated refund for unused time',
        },
        {
          name: 'Results Guarantee',
          description: 'See improvements within 24 hours or get your money back.',
          applies_to: ['coffee', 'growth', 'scale'],
          conditions: 'Must complete at least one analysis',
        },
      ],
      process: {
        steps: [
          "Click 'Cancel Subscription' in your dashboard",
          'Select optional cancellation reason',
          'Confirm cancellation',
          'Refund processed within 5-7 business days',
        ],
        support_email: 'support@llmtxtmastery.com',
      },
    });
  });
}

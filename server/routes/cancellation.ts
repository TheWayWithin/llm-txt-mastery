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

      // If user is already cancelled, return friendly message
      if (authUser.tier === 'cancelled') {
        return res.status(400).json({
          success: false,
          message: 'Your subscription is already cancelled.',
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
          subscriptionEndsAt: result.subscriptionEndsAt || null,
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
        isCancelled: authUser.tier === 'cancelled',
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

      const eligibility = await checkRefundEligibility(authUser.id);

      if (!eligibility.eligible) {
        return res.status(400).json({
          success: false,
          message: eligibility.reason,
        });
      }

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
          applies_to: ['solo', 'growth', 'scale'],
          conditions: 'No questions asked',
        },
        {
          name: 'Cancel Anytime',
          description: 'Cancel your subscription at any time. Access continues until end of billing period.',
          applies_to: ['solo', 'growth', 'scale'],
          conditions: 'Access until billing period ends',
        },
      ],
      process: {
        steps: [
          "Click 'Cancel Subscription' in your dashboard",
          'Select optional cancellation reason',
          'Confirm cancellation',
          'Within 30 days: instant refund, access ends immediately',
          'After 30 days: access until billing period ends, then cancelled',
        ],
        support_email: 'support@llmtxtmastery.com',
      },
    });
  });
}

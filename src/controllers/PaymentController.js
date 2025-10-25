'use strict';

const PaymentService = require('../services/PaymentService');
const UserService = require('../services/UserService');
const NotificationService = require('../services/NotificationService');
const { logger } = require('../utils/logger');
const { successResponse, errorResponse } = require('../utils/response');

class PaymentController {
  // Process payment
  static async processPayment(req, res) {
    try {
      const userId = req.user.id;
      const paymentData = req.body;
      
      // Validate required fields
      if (!paymentData.amount || !paymentData.currency || !paymentData.paymentMethod) {
        return errorResponse(res, 'Amount, currency, and payment method are required', 400);
      }

      // Process payment
      const payment = await PaymentService.processPayment(userId, paymentData);
      
      // Send payment confirmation notification
      try {
        await NotificationService.createNotification({
          user_id: userId,
          type: 'payment_successful',
          title: 'Payment Successful',
          message: `Your payment of ${paymentData.currency} ${paymentData.amount} has been processed successfully.`,
          data: { paymentId: payment.id, amount: paymentData.amount, currency: paymentData.currency }
        });
      } catch (notificationError) {
        logger.warn('Failed to send payment confirmation notification:', notificationError);
      }
      
      logger.info(`Payment processed successfully for user ${userId}: ${paymentData.currency} ${paymentData.amount}`);
      return successResponse(res, 'Payment processed successfully', { payment }, 201);
    } catch (error) {
      logger.error('Process payment error:', error);
      
      if (error.message.includes('Payment validation failed')) {
        return errorResponse(res, error.message, 400);
      }
      
      if (error.message.includes('Insufficient funds')) {
        return errorResponse(res, 'Insufficient funds for this payment', 400);
      }
      
      if (error.message.includes('Payment limit exceeded')) {
        return errorResponse(res, 'Payment amount exceeds your daily limit', 400);
      }
      
      if (error.message.includes('Payment method not supported')) {
        return errorResponse(res, 'This payment method is not supported', 400);
      }
      
      return errorResponse(res, 'Payment processing failed', 500);
    }
  }

  // Create subscription
  static async createSubscription(req, res) {
    try {
      const userId = req.user.id;
      const subscriptionData = req.body;
      
      // Validate required fields
      if (!subscriptionData.planId || !subscriptionData.paymentMethod) {
        return errorResponse(res, 'Plan ID and payment method are required', 400);
      }

      // Create subscription
      const subscription = await PaymentService.createSubscription(userId, subscriptionData);
      
      // Send subscription confirmation notification
      try {
        await NotificationService.createNotification({
          user_id: userId,
          type: 'subscription_created',
          title: 'Subscription Created',
          message: `Your subscription to ${subscription.plan_name} has been created successfully.`,
          data: { subscriptionId: subscription.id, planName: subscription.plan_name }
        });
      } catch (notificationError) {
        logger.warn('Failed to send subscription confirmation notification:', notificationError);
      }
      
      logger.info(`Subscription created for user ${userId}: ${subscription.plan_name}`);
      return successResponse(res, 'Subscription created successfully', { subscription }, 201);
    } catch (error) {
      logger.error('Create subscription error:', error);
      
      if (error.message.includes('Subscription validation failed')) {
        return errorResponse(res, error.message, 400);
      }
      
      if (error.message.includes('Plan not found')) {
        return errorResponse(res, 'Selected plan not found', 404);
      }
      
      if (error.message.includes('Already subscribed')) {
        return errorResponse(res, 'You already have an active subscription', 400);
      }
      
      if (error.message.includes('Payment failed')) {
        return errorResponse(res, 'Payment for subscription failed', 400);
      }
      
      return errorResponse(res, 'Subscription creation failed', 500);
    }
  }

  // Cancel subscription
  static async cancelSubscription(req, res) {
    try {
      const userId = req.user.id;
      const { subscriptionId } = req.params;
      const { reason } = req.body;

      const cancelledSubscription = await PaymentService.cancelSubscription(subscriptionId, userId, reason);
      
      // Send subscription cancellation notification
      try {
        await NotificationService.createNotification({
          user_id: userId,
          type: 'subscription_cancelled',
          title: 'Subscription Cancelled',
          message: `Your subscription to ${cancelledSubscription.plan_name} has been cancelled.`,
          data: { subscriptionId, planName: cancelledSubscription.plan_name, reason }
        });
      } catch (notificationError) {
        logger.warn('Failed to send subscription cancellation notification:', notificationError);
      }
      
      logger.info(`Subscription ${subscriptionId} cancelled by user ${userId}`);
      return successResponse(res, 'Subscription cancelled successfully', { subscription: cancelledSubscription });
    } catch (error) {
      logger.error('Cancel subscription error:', error);
      
      if (error.message.includes('Subscription not found')) {
        return errorResponse(res, 'Subscription not found', 404);
      }
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to cancel this subscription', 403);
      }
      
      if (error.message.includes('already cancelled')) {
        return errorResponse(res, 'Subscription is already cancelled', 400);
      }
      
      return errorResponse(res, 'Failed to cancel subscription', 500);
    }
  }

  // Renew subscription
  static async renewSubscription(req, res) {
    try {
      const userId = req.user.id;
      const { subscriptionId } = req.params;
      const paymentData = req.body;

      if (!paymentData.paymentMethod) {
        return errorResponse(res, 'Payment method is required', 400);
      }

      const renewedSubscription = await PaymentService.renewSubscription(subscriptionId, paymentData);
      
      // Send subscription renewal notification
      try {
        await NotificationService.createNotification({
          user_id: userId,
          type: 'subscription_renewed',
          title: 'Subscription Renewed',
          message: `Your subscription to ${renewedSubscription.plan_name} has been renewed successfully.`,
          data: { subscriptionId, planName: renewedSubscription.plan_name }
        });
      } catch (notificationError) {
        logger.warn('Failed to send subscription renewal notification:', notificationError);
      }
      
      logger.info(`Subscription ${subscriptionId} renewed by user ${userId}`);
      return successResponse(res, 'Subscription renewed successfully', { subscription: renewedSubscription });
    } catch (error) {
      logger.error('Renew subscription error:', error);
      
      if (error.message.includes('Subscription not found')) {
        return errorResponse(res, 'Subscription not found', 404);
      }
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to renew this subscription', 403);
      }
      
      if (error.message.includes('Payment failed')) {
        return errorResponse(res, 'Payment for renewal failed', 400);
      }
      
      return errorResponse(res, 'Failed to renew subscription', 500);
    }
  }

  // Upgrade subscription
  static async upgradeSubscription(req, res) {
    try {
      const userId = req.user.id;
      const { subscriptionId } = req.params;
      const { newPlanId, paymentData } = req.body;

      if (!newPlanId || !paymentData.paymentMethod) {
        return errorResponse(res, 'New plan ID and payment method are required', 400);
      }

      const upgradedSubscription = await PaymentService.upgradeSubscription(subscriptionId, newPlanId, paymentData);
      
      // Send subscription upgrade notification
      try {
        await NotificationService.createNotification({
          user_id: userId,
          type: 'subscription_upgraded',
          title: 'Subscription Upgraded',
          message: `Your subscription has been upgraded to ${upgradedSubscription.plan_name}.`,
          data: { subscriptionId, newPlanName: upgradedSubscription.plan_name }
        });
      } catch (notificationError) {
        logger.warn('Failed to send subscription upgrade notification:', notificationError);
      }
      
      logger.info(`Subscription ${subscriptionId} upgraded by user ${userId}`);
      return successResponse(res, 'Subscription upgraded successfully', { subscription: upgradedSubscription });
    } catch (error) {
      logger.error('Upgrade subscription error:', error);
      
      if (error.message.includes('Subscription not found')) {
        return errorResponse(res, 'Subscription not found', 404);
      }
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to upgrade this subscription', 403);
      }
      
      if (error.message.includes('Plan not found')) {
        return errorResponse(res, 'New plan not found', 404);
      }
      
      if (error.message.includes('Payment failed')) {
        return errorResponse(res, 'Payment for upgrade failed', 400);
      }
      
      return errorResponse(res, 'Failed to upgrade subscription', 500);
    }
  }

  // Get user subscriptions
  static async getUserSubscriptions(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, status, sort_by = 'created_at', sort_order = 'desc' } = req.query;

      const subscriptions = await PaymentService.getUserSubscriptions(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        sortBy: sort_by,
        sortOrder: sort_order
      });
      
      return successResponse(res, 'User subscriptions retrieved successfully', { subscriptions });
    } catch (error) {
      logger.error('Get user subscriptions error:', error);
      return errorResponse(res, 'Failed to retrieve user subscriptions', 500);
    }
  }

  // Get subscription details
  static async getSubscriptionDetails(req, res) {
    try {
      const userId = req.user.id;
      const { subscriptionId } = req.params;

      const subscription = await PaymentService.getSubscriptionDetails(subscriptionId, userId);
      
      if (!subscription) {
        return errorResponse(res, 'Subscription not found', 404);
      }
      
      return successResponse(res, 'Subscription details retrieved successfully', { subscription });
    } catch (error) {
      logger.error('Get subscription details error:', error);
      
      if (error.message.includes('Subscription not found')) {
        return errorResponse(res, 'Subscription not found', 404);
      }
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to view this subscription', 403);
      }
      
      return errorResponse(res, 'Failed to retrieve subscription details', 500);
    }
  }

  // Process refund
  static async processRefund(req, res) {
    try {
      const userId = req.user.id;
      const { paymentId } = req.params;
      const { amount, reason } = req.body;

      if (!amount || !reason) {
        return errorResponse(res, 'Amount and reason are required', 400);
      }

      const refund = await PaymentService.processRefund(paymentId, amount, reason);
      
      // Send refund notification
      try {
        await NotificationService.createNotification({
          user_id: userId,
          type: 'refund_processed',
          title: 'Refund Processed',
          message: `Your refund of ${refund.currency} ${refund.amount} has been processed.`,
          data: { refundId: refund.id, amount: refund.amount, currency: refund.currency, reason }
        });
      } catch (notificationError) {
        logger.warn('Failed to send refund notification:', notificationError);
      }
      
      logger.info(`Refund processed for payment ${paymentId} by user ${userId}`);
      return successResponse(res, 'Refund processed successfully', { refund });
    } catch (error) {
      logger.error('Process refund error:', error);
      
      if (error.message.includes('Payment not found')) {
        return errorResponse(res, 'Payment not found', 404);
      }
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to process this refund', 403);
      }
      
      if (error.message.includes('Invalid refund amount')) {
        return errorResponse(res, 'Invalid refund amount', 400);
      }
      
      if (error.message.includes('Refund not allowed')) {
        return errorResponse(res, 'Refund is not allowed for this payment', 400);
      }
      
      return errorResponse(res, 'Failed to process refund', 500);
    }
  }

  // Get payment history
  static async getPaymentHistory(req, res) {
    try {
      const userId = req.user.id;
      const { page = 1, limit = 20, status, startDate, endDate, sort_by = 'created_at', sort_order = 'desc' } = req.query;

      const payments = await PaymentService.getPaymentHistory(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        status,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        sortBy: sort_by,
        sortOrder: sort_order
      });
      
      return successResponse(res, 'Payment history retrieved successfully', { payments });
    } catch (error) {
      logger.error('Get payment history error:', error);
      return errorResponse(res, 'Failed to retrieve payment history', 500);
    }
  }

  // Get billing information
  static async getBillingInformation(req, res) {
    try {
      const userId = req.user.id;

      const billingInfo = await PaymentService.getBillingInformation(userId);
      
      return successResponse(res, 'Billing information retrieved successfully', { billingInfo });
    } catch (error) {
      logger.error('Get billing information error:', error);
      return errorResponse(res, 'Failed to retrieve billing information', 500);
    }
  }

  // Update billing information
  static async updateBillingInformation(req, res) {
    try {
      const userId = req.user.id;
      const billingData = req.body;

      if (Object.keys(billingData).length === 0) {
        return errorResponse(res, 'No billing data provided', 400);
      }

      const updatedBilling = await PaymentService.updateBillingInformation(userId, billingData);
      
      logger.info(`Billing information updated for user ${userId}`);
      return successResponse(res, 'Billing information updated successfully', { billingInfo: updatedBilling });
    } catch (error) {
      logger.error('Update billing information error:', error);
      
      if (error.message.includes('Validation failed')) {
        return errorResponse(res, error.message, 400);
      }
      
      return errorResponse(res, 'Failed to update billing information', 500);
    }
  }

  // Generate invoice
  static async generateInvoice(req, res) {
    try {
      const userId = req.user.id;
      const { paymentId } = req.params;
      const { format = 'pdf' } = req.query;

      const invoice = await PaymentService.generateInvoice(paymentId, format);
      
      if (format === 'json') {
        return successResponse(res, 'Invoice generated successfully', { invoice });
      } else {
        // For PDF/HTML format, set appropriate headers
        const contentType = format === 'pdf' ? 'application/pdf' : 'text/html';
        const extension = format === 'pdf' ? 'pdf' : 'html';
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="invoice_${paymentId}.${extension}"`);
        return res.send(invoice);
      }
    } catch (error) {
      logger.error('Generate invoice error:', error);
      
      if (error.message.includes('Payment not found')) {
        return errorResponse(res, 'Payment not found', 404);
      }
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to generate this invoice', 403);
      }
      
      if (error.message.includes('Invalid format')) {
        return errorResponse(res, 'Invalid invoice format', 400);
      }
      
      return errorResponse(res, 'Failed to generate invoice', 500);
    }
  }

  // Get payment methods
  static async getPaymentMethods(req, res) {
    try {
      const userId = req.user.id;

      const paymentMethods = await PaymentService.getPaymentMethods(userId);
      
      return successResponse(res, 'Payment methods retrieved successfully', { paymentMethods });
    } catch (error) {
      logger.error('Get payment methods error:', error);
      return errorResponse(res, 'Failed to retrieve payment methods', 500);
    }
  }

  // Add payment method
  static async addPaymentMethod(req, res) {
    try {
      const userId = req.user.id;
      const paymentMethodData = req.body;
      
      // Validate required fields
      if (!paymentMethodData.type || !paymentMethodData.details) {
        return errorResponse(res, 'Payment method type and details are required', 400);
      }

      const paymentMethod = await PaymentService.addPaymentMethod(userId, paymentMethodData);
      
      logger.info(`Payment method added for user ${userId}: ${paymentMethodData.type}`);
      return successResponse(res, 'Payment method added successfully', { paymentMethod }, 201);
    } catch (error) {
      logger.error('Add payment method error:', error);
      
      if (error.message.includes('Validation failed')) {
        return errorResponse(res, error.message, 400);
      }
      
      if (error.message.includes('Payment method already exists')) {
        return errorResponse(res, 'This payment method already exists', 400);
      }
      
      return errorResponse(res, 'Failed to add payment method', 500);
    }
  }

  // Remove payment method
  static async removePaymentMethod(req, res) {
    try {
      const userId = req.user.id;
      const { methodId } = req.params;

      await PaymentService.removePaymentMethod(methodId, userId);
      
      logger.info(`Payment method ${methodId} removed by user ${userId}`);
      return successResponse(res, 'Payment method removed successfully');
    } catch (error) {
      logger.error('Remove payment method error:', error);
      
      if (error.message.includes('Payment method not found')) {
        return errorResponse(res, 'Payment method not found', 404);
      }
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to remove this payment method', 403);
      }
      
      if (error.message.includes('Cannot remove default')) {
        return errorResponse(res, 'Cannot remove default payment method', 400);
      }
      
      return errorResponse(res, 'Failed to remove payment method', 500);
    }
  }

  // Set default payment method
  static async setDefaultPaymentMethod(req, res) {
    try {
      const userId = req.user.id;
      const { methodId } = req.params;

      const paymentMethod = await PaymentService.setDefaultPaymentMethod(methodId, userId);
      
      logger.info(`Default payment method set to ${methodId} by user ${userId}`);
      return successResponse(res, 'Default payment method set successfully', { paymentMethod });
    } catch (error) {
      logger.error('Set default payment method error:', error);
      
      if (error.message.includes('Payment method not found')) {
        return errorResponse(res, 'Payment method not found', 404);
      }
      
      if (error.message.includes('not authorized')) {
        return errorResponse(res, 'You are not authorized to modify this payment method', 403);
      }
      
      return errorResponse(res, 'Failed to set default payment method', 500);
    }
  }

  // Get subscription plans
  static async getSubscriptionPlans(req, res) {
    try {
      const { category, status, sort_by = 'price', sort_order = 'asc' } = req.query;

      const plans = await PaymentService.getSubscriptionPlans({
        category,
        status,
        sortBy: sort_by,
        sortOrder: sort_order
      });
      
      return successResponse(res, 'Subscription plans retrieved successfully', { plans });
    } catch (error) {
      logger.error('Get subscription plans error:', error);
      return errorResponse(res, 'Failed to retrieve subscription plans', 500);
    }
  }

  // Get plan details
  static async getPlanDetails(req, res) {
    try {
      const { planId } = req.params;

      const plan = await PaymentService.getPlanDetails(planId);
      
      if (!plan) {
        return errorResponse(res, 'Plan not found', 404);
      }
      
      return successResponse(res, 'Plan details retrieved successfully', { plan });
    } catch (error) {
      logger.error('Get plan details error:', error);
      
      if (error.message.includes('Plan not found')) {
        return errorResponse(res, 'Plan not found', 404);
      }
      
      return errorResponse(res, 'Failed to retrieve plan details', 500);
    }
  }

  // Get payment statistics
  static async getPaymentStats(req, res) {
    try {
      const userId = req.user.id;
      const { startDate, endDate, groupBy } = req.query;

      const stats = await PaymentService.getPaymentStats(userId, {
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        groupBy: groupBy || 'month'
      });
      
      return successResponse(res, 'Payment statistics retrieved successfully', { stats });
    } catch (error) {
      logger.error('Get payment stats error:', error);
      return errorResponse(res, 'Failed to retrieve payment statistics', 500);
    }
  }

  // Get daily spending limit
  static async getDailySpendingLimit(req, res) {
    try {
      const userId = req.user.id;

      const limit = await PaymentService.getDailySpendingLimit(userId);
      
      return successResponse(res, 'Daily spending limit retrieved successfully', { limit });
    } catch (error) {
      logger.error('Get daily spending limit error:', error);
      return errorResponse(res, 'Failed to retrieve daily spending limit', 500);
    }
  }

  // Update daily spending limit
  static async updateDailySpendingLimit(req, res) {
    try {
      const userId = req.user.id;
      const { limit } = req.body;

      if (!limit || limit < 0) {
        return errorResponse(res, 'Valid spending limit is required', 400);
      }

      const updatedLimit = await PaymentService.updateDailySpendingLimit(userId, limit);
      
      logger.info(`Daily spending limit updated to ${limit} for user ${userId}`);
      return successResponse(res, 'Daily spending limit updated successfully', { limit: updatedLimit });
    } catch (error) {
      logger.error('Update daily spending limit error:', error);
      
      if (error.message.includes('Invalid limit')) {
        return errorResponse(res, 'Invalid spending limit', 400);
      }
      
      return errorResponse(res, 'Failed to update daily spending limit', 500);
    }
  }

  // Get payment analytics
  static async getPaymentAnalytics(req, res) {
    try {
      const userId = req.user.id;
      const { startDate, endDate, groupBy, metrics } = req.query;

      const analytics = await PaymentService.getPaymentAnalytics(userId, {
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        groupBy: groupBy || 'month',
        metrics: metrics ? metrics.split(',') : ['payments', 'subscriptions', 'refunds', 'revenue']
      });
      
      return successResponse(res, 'Payment analytics retrieved successfully', { analytics });
    } catch (error) {
      logger.error('Get payment analytics error:', error);
      return errorResponse(res, 'Failed to retrieve payment analytics', 500);
    }
  }
}

module.exports = PaymentController;

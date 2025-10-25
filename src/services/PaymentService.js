'use strict';

const User = require('../models/User');
const { logger } = require('../utils/logger');

class PaymentService {
  // Process payment
  static async processPayment(userId, paymentData) {
    try {
      // Validate payment data
      const validationErrors = PaymentService.validatePaymentData(paymentData);
      if (validationErrors.length > 0) {
        throw new Error(`Payment validation failed: ${validationErrors.join(', ')}`);
      }

      // Get user information
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if user can make payment
      const canPay = await PaymentService.canUserMakePayment(userId, paymentData);
      if (!canPay.allowed) {
        throw new Error(`Cannot process payment: ${canPay.reason}`);
      }

      // Process payment based on method
      let paymentResult;
      switch (paymentData.paymentMethod) {
        case 'stripe':
          paymentResult = await PaymentService.processStripePayment(paymentData);
          break;
        case 'paypal':
          paymentResult = await PaymentService.processPayPalPayment(paymentData);
          break;
        case 'razorpay':
          paymentResult = await PaymentService.processRazorpayPayment(paymentData);
          break;
        default:
          throw new Error('Unsupported payment method');
      }

      // Create payment record
      const payment = await PaymentService.createPaymentRecord(userId, paymentData, paymentResult);

      // Handle successful payment
      if (paymentResult.status === 'successful') {
        await PaymentService.handleSuccessfulPayment(userId, payment, paymentData);
      }

      // Log payment action
      await PaymentService.logPaymentAction('payment_processed', {
        userId,
        paymentId: payment.id,
        amount: paymentData.amount,
        currency: paymentData.currency,
        status: paymentResult.status,
        paymentMethod: paymentData.paymentMethod
      });

      logger.info(`Payment processed for user ${userId}: ${paymentResult.status}`);
      return {
        payment,
        result: paymentResult
      };
    } catch (error) {
      logger.error('Error processing payment:', error);
      throw error;
    }
  }

  // Create subscription
  static async createSubscription(userId, subscriptionData) {
    try {
      // Validate subscription data
      const validationErrors = PaymentService.validateSubscriptionData(subscriptionData);
      if (validationErrors.length > 0) {
        throw new Error(`Subscription validation failed: ${validationErrors.join(', ')}`);
      }

      // Check if user can subscribe
      const canSubscribe = await PaymentService.canUserSubscribe(userId, subscriptionData);
      if (!canSubscribe.allowed) {
        throw new Error(`Cannot create subscription: ${canSubscribe.reason}`);
      }

      // Check for existing subscription
      const existingSubscription = await PaymentService.getActiveSubscription(userId);
      if (existingSubscription) {
        throw new Error('User already has an active subscription');
      }

      // Process initial payment
      const paymentResult = await this.processPayment(userId, {
        amount: subscriptionData.plan.price,
        currency: subscriptionData.plan.currency,
        paymentMethod: subscriptionData.paymentMethod,
        description: `Subscription to ${subscriptionData.plan.name}`,
        metadata: {
          type: 'subscription',
          planId: subscriptionData.plan.id,
          planName: subscriptionData.plan.name
        }
      });

      if (paymentResult.result.status !== 'successful') {
        throw new Error('Initial payment failed');
      }

      // Create subscription
      const subscription = await PaymentService.createSubscriptionRecord(userId, subscriptionData, paymentResult.payment);

      // Activate subscription benefits
      await PaymentService.activateSubscriptionBenefits(userId, subscription);

      // Send subscription confirmation
      try {
        await PaymentService.sendSubscriptionConfirmation(userId, subscription);
      } catch (notificationError) {
        logger.warn('Failed to send subscription confirmation:', notificationError);
      }

      // Log subscription creation
      await PaymentService.logPaymentAction('subscription_created', {
        userId,
        subscriptionId: subscription.id,
        planId: subscriptionData.plan.id,
        planName: subscriptionData.plan.name,
        amount: subscriptionData.plan.price,
        currency: subscriptionData.plan.currency
      });

      logger.info(`Subscription created for user ${userId} to plan ${subscriptionData.plan.name}`);
      return subscription;
    } catch (error) {
      logger.error('Error creating subscription:', error);
      throw error;
    }
  }

  // Cancel subscription
  static async cancelSubscription(userId, subscriptionId, reason = '') {
    try {
      // Get subscription
      const subscription = await PaymentService.getSubscriptionById(subscriptionId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Check if user can cancel this subscription
      if (subscription.user_id !== userId) {
        throw new Error('Cannot cancel subscription for another user');
      }

      // Cancel subscription with payment provider
      const cancellationResult = await PaymentService.cancelSubscriptionWithProvider(subscription);

      // Update subscription status
      const updatedSubscription = await PaymentService.updateSubscriptionStatus(subscriptionId, 'cancelled', {
        cancelled_at: new Date(),
        cancellation_reason: reason,
        provider_cancellation_id: cancellationResult.cancellationId
      });

      // Deactivate subscription benefits
      await PaymentService.deactivateSubscriptionBenefits(userId, subscription);

      // Process refund if applicable
      if (subscription.refundable && subscription.refund_amount > 0) {
        await PaymentService.processRefund(subscription, subscription.refund_amount);
      }

      // Send cancellation confirmation
      try {
        await PaymentService.sendSubscriptionCancellation(userId, subscription);
      } catch (notificationError) {
        logger.warn('Failed to send cancellation confirmation:', notificationError);
      }

      // Log subscription cancellation
      await PaymentService.logPaymentAction('subscription_cancelled', {
        userId,
        subscriptionId,
        reason,
        refundAmount: subscription.refund_amount,
        providerCancellationId: cancellationResult.cancellationId
      });

      logger.info(`Subscription ${subscriptionId} cancelled by user ${userId}`);
      return updatedSubscription;
    } catch (error) {
      logger.error('Error cancelling subscription:', error);
      throw error;
    }
  }

  // Renew subscription
  static async renewSubscription(subscriptionId, paymentData) {
    try {
      // Get subscription
      const subscription = await PaymentService.getSubscriptionById(subscriptionId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Check if subscription can be renewed
      if (subscription.status !== 'active' && subscription.status !== 'expired') {
        throw new Error('Subscription cannot be renewed');
      }

      // Process renewal payment
      const paymentResult = await this.processPayment(subscription.user_id, {
        ...paymentData,
        description: `Renewal of ${subscription.plan_name}`,
        metadata: {
          type: 'subscription_renewal',
          subscriptionId: subscription.id,
          planId: subscription.plan_id
        }
      });

      if (paymentResult.result.status !== 'successful') {
        throw new Error('Renewal payment failed');
      }

      // Update subscription
      const updatedSubscription = await PaymentService.renewSubscriptionRecord(subscriptionId, paymentResult.payment);

      // Extend subscription benefits
      await PaymentService.extendSubscriptionBenefits(subscription.user_id, updatedSubscription);

      // Send renewal confirmation
      try {
        await PaymentService.sendSubscriptionRenewal(subscription.user_id, updatedSubscription);
      } catch (notificationError) {
        logger.warn('Failed to send renewal confirmation:', notificationError);
      }

      // Log subscription renewal
      await PaymentService.logPaymentAction('subscription_renewed', {
        userId: subscription.user_id,
        subscriptionId,
        renewalPaymentId: paymentResult.payment.id,
        newExpiryDate: updatedSubscription.expires_at
      });

      logger.info(`Subscription ${subscriptionId} renewed successfully`);
      return updatedSubscription;
    } catch (error) {
      logger.error('Error renewing subscription:', error);
      throw error;
    }
  }

  // Upgrade subscription
  static async upgradeSubscription(subscriptionId, newPlanId, paymentData) {
    try {
      // Get current subscription
      const subscription = await PaymentService.getSubscriptionById(subscriptionId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Get new plan
      const newPlan = await PaymentService.getPlanById(newPlanId);
      if (!newPlan) {
        throw new Error('New plan not found');
      }

      // Calculate upgrade cost
      const upgradeCost = PaymentService.calculateUpgradeCost(subscription, newPlan);

      // Process upgrade payment
      const paymentResult = await this.processPayment(subscription.user_id, {
        ...paymentData,
        amount: upgradeCost,
        description: `Upgrade from ${subscription.plan_name} to ${newPlan.name}`,
        metadata: {
          type: 'subscription_upgrade',
          subscriptionId: subscription.id,
          oldPlanId: subscription.plan_id,
          newPlanId: newPlan.id
        }
      });

      if (paymentResult.result.status !== 'successful') {
        throw new Error('Upgrade payment failed');
      }

      // Upgrade subscription
      const upgradedSubscription = await PaymentService.upgradeSubscriptionRecord(subscriptionId, newPlan, paymentResult.payment);

      // Update subscription benefits
      await PaymentService.updateSubscriptionBenefits(subscription.user_id, upgradedSubscription);

      // Send upgrade confirmation
      try {
        await PaymentService.sendSubscriptionUpgrade(subscription.user_id, upgradedSubscription);
      } catch (notificationError) {
        logger.warn('Failed to send upgrade confirmation:', notificationError);
      }

      // Log subscription upgrade
      await PaymentService.logPaymentAction('subscription_upgraded', {
        userId: subscription.user_id,
        subscriptionId,
        oldPlanId: subscription.plan_id,
        newPlanId: newPlan.id,
        upgradeCost,
        upgradePaymentId: paymentResult.payment.id
      });

      logger.info(`Subscription ${subscriptionId} upgraded to plan ${newPlan.name}`);
      return upgradedSubscription;
    } catch (error) {
      logger.error('Error upgrading subscription:', error);
      throw error;
    }
  }

  // Get user subscriptions
  static async getUserSubscriptions(userId, options = {}) {
    try {
      const {
        status = null,
        includeExpired = false,
        page = 1,
        limit = 20
      } = options;

      const subscriptions = await PaymentService.getSubscriptionsByUser(userId, {
        status,
        includeExpired,
        page,
        limit
      });

      // Enrich subscriptions with plan details
      const enrichedSubscriptions = await Promise.all(
        subscriptions.map(async (subscription) => {
          const plan = await PaymentService.getPlanById(subscription.plan_id);
          return {
            ...subscription,
            plan: plan ? {
              id: plan.id,
              name: plan.name,
              description: plan.description,
              features: plan.features,
              price: plan.price,
              currency: plan.currency,
              interval: plan.interval
            } : null
          };
        })
      );

      return {
        subscriptions: enrichedSubscriptions,
        pagination: {
          page,
          limit,
          total: subscriptions.length,
          hasMore: subscriptions.length === limit
        }
      };
    } catch (error) {
      logger.error('Error getting user subscriptions:', error);
      throw error;
    }
  }

  // Get subscription details
  static async getSubscriptionDetails(subscriptionId, userId) {
    try {
      const subscription = await PaymentService.getSubscriptionById(subscriptionId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      // Check if user can view this subscription
      if (subscription.user_id !== userId) {
        throw new Error('Cannot view subscription for another user');
      }

      // Get plan details
      const plan = await PaymentService.getPlanById(subscription.plan_id);
      
      // Get payment history
      const payments = await PaymentService.getSubscriptionPayments(subscriptionId);

      // Get usage statistics
      const usage = await PaymentService.getSubscriptionUsage(subscriptionId);

      return {
        subscription,
        plan,
        payments,
        usage
      };
    } catch (error) {
      logger.error('Error getting subscription details:', error);
      throw error;
    }
  }

  // Process refund
  static async processRefund(paymentId, amount, reason = '') {
    try {
      // Get payment
      const payment = await PaymentService.getPaymentById(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      // Check if payment can be refunded
      if (payment.status !== 'successful') {
        throw new Error('Payment cannot be refunded');
      }

      if (payment.refunded_amount >= payment.amount) {
        throw new Error('Payment already fully refunded');
      }

      // Calculate refund amount
      const refundableAmount = Math.min(amount, payment.amount - payment.refunded_amount);

      // Process refund with payment provider
      const refundResult = await PaymentService.processRefundWithProvider(payment, refundableAmount);

      // Update payment record
      const updatedPayment = await PaymentService.updatePaymentRefund(paymentId, {
        refunded_amount: payment.refunded_amount + refundableAmount,
        refund_status: refundResult.status,
        last_refund_at: new Date(),
        refund_reason: reason
      });

      // Create refund record
      const refund = await PaymentService.createRefundRecord(paymentId, {
        amount: refundableAmount,
        reason,
        provider_refund_id: refundResult.refundId,
        status: refundResult.status
      });

      // Send refund notification
      try {
        await PaymentService.sendRefundNotification(payment.user_id, refund);
      } catch (notificationError) {
        logger.warn('Failed to send refund notification:', notificationError);
      }

      // Log refund action
      await PaymentService.logPaymentAction('refund_processed', {
        paymentId,
        userId: payment.user_id,
        amount: refundableAmount,
        reason,
        providerRefundId: refundResult.refundId
      });

      logger.info(`Refund processed for payment ${paymentId}: ${refundableAmount}`);
      return {
        payment: updatedPayment,
        refund
      };
    } catch (error) {
      logger.error('Error processing refund:', error);
      throw error;
    }
  }

  // Get payment history
  static async getPaymentHistory(userId, options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status = null,
        paymentMethod = null,
        startDate = null,
        endDate = null
      } = options;

      const payments = await PaymentService.getPaymentsByUser(userId, {
        page,
        limit,
        status,
        paymentMethod,
        startDate,
        endDate
      });

      return {
        payments,
        pagination: {
          page,
          limit,
          total: payments.length,
          hasMore: payments.length === limit
        }
      };
    } catch (error) {
      logger.error('Error getting payment history:', error);
      throw error;
    }
  }

  // Get billing information
  static async getBillingInformation(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get billing address
      const billingAddress = await PaymentService.getBillingAddress(userId);

      // Get payment methods
      const paymentMethods = await PaymentService.getPaymentMethods(userId);

      // Get tax information
      const taxInfo = await PaymentService.getTaxInformation(userId);

      return {
        billingAddress,
        paymentMethods,
        taxInfo,
        currency: user.preferred_currency || 'USD'
      };
    } catch (error) {
      logger.error('Error getting billing information:', error);
      throw error;
    }
  }

  // Update billing information
  static async updateBillingInformation(userId, billingData) {
    try {
      // Validate billing data
      const validationErrors = PaymentService.validateBillingData(billingData);
      if (validationErrors.length > 0) {
        throw new Error(`Billing validation failed: ${validationErrors.join(', ')}`);
      }

      const results = {};

      // Update billing address
      if (billingData.address) {
        results.address = await PaymentService.updateBillingAddress(userId, billingData.address);
      }

      // Update payment methods
      if (billingData.paymentMethods) {
        results.paymentMethods = await PaymentService.updatePaymentMethods(userId, billingData.paymentMethods);
      }

      // Update tax information
      if (billingData.taxInfo) {
        results.taxInfo = await PaymentService.updateTaxInformation(userId, billingData.taxInfo);
      }

      // Log billing update
      await PaymentService.logPaymentAction('billing_updated', {
        userId,
        updatedFields: Object.keys(billingData)
      });

      logger.info(`Billing information updated for user ${userId}`);
      return results;
    } catch (error) {
      logger.error('Error updating billing information:', error);
      throw error;
    }
  }

  // Generate invoice
  static async generateInvoice(paymentId, format = 'pdf') {
    try {
      // Get payment details
      const payment = await PaymentService.getPaymentById(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      // Get user information
      const user = await User.findById(payment.user_id);
      if (!user) {
        throw new Error('User not found');
      }

      // Generate invoice content
      const invoiceData = await PaymentService.generateInvoiceData(payment, user);

      // Generate invoice in requested format
      let invoice;
      switch (format) {
        case 'pdf':
          invoice = await PaymentService.generatePDFInvoice(invoiceData);
          break;
        case 'html':
          invoice = await PaymentService.generateHTMLInvoice(invoiceData);
          break;
        case 'json':
          invoice = invoiceData;
          break;
        default:
          throw new Error('Unsupported invoice format');
      }

      // Log invoice generation
      await PaymentService.logPaymentAction('invoice_generated', {
        paymentId,
        userId: payment.user_id,
        format,
        invoiceNumber: invoiceData.invoiceNumber
      });

      return invoice;
    } catch (error) {
      logger.error('Error generating invoice:', error);
      throw error;
    }
  }

  // Utility methods

  static validatePaymentData(paymentData) {
    const errors = [];

    if (!paymentData.amount || paymentData.amount <= 0) {
      errors.push('Valid amount is required');
    }

    if (!paymentData.currency) {
      errors.push('Currency is required');
    }

    if (!paymentData.paymentMethod) {
      errors.push('Payment method is required');
    }

    if (!paymentData.description) {
      errors.push('Payment description is required');
    }

    // Validate currency
    const validCurrencies = ['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD'];
    if (!validCurrencies.includes(paymentData.currency)) {
      errors.push('Invalid currency');
    }

    return errors;
  }

  static validateSubscriptionData(subscriptionData) {
    const errors = [];

    if (!subscriptionData.plan || !subscriptionData.plan.id) {
      errors.push('Valid plan is required');
    }

    if (!subscriptionData.paymentMethod) {
      errors.push('Payment method is required');
    }

    return errors;
  }

  static validateBillingData(billingData) {
    const errors = [];

    if (billingData.address) {
      if (!billingData.address.street) {
        errors.push('Street address is required');
      }
      if (!billingData.address.city) {
        errors.push('City is required');
      }
      if (!billingData.address.country) {
        errors.push('Country is required');
      }
    }

    return errors;
  }

  static async canUserMakePayment(userId, paymentData) {
    try {
      // Check if user exists and is active
      const user = await User.findById(userId);
      if (!user || !user.is_active) {
        return { allowed: false, reason: 'User account not found or inactive' };
      }

      // Check payment limits
      const dailySpent = await PaymentService.getDailySpending(userId);
      const dailyLimit = user.payment_daily_limit || 1000; // Default $1000

      if (dailySpent + paymentData.amount > dailyLimit) {
        return { allowed: false, reason: 'Daily payment limit exceeded' };
      }

      return { allowed: true };
    } catch (error) {
      logger.error('Error checking if user can make payment:', error);
      return { allowed: false, reason: 'Error checking payment permissions' };
    }
  }

  static async canUserSubscribe(userId, subscriptionData) {
    try {
      // Check if user exists and is active
      const user = await User.findById(userId);
      if (!user || !user.is_active) {
        return { allowed: false, reason: 'User account not found or inactive' };
      }

      // Check subscription limits
      const activeSubscriptions = await PaymentService.getActiveSubscriptions(userId);
      const maxSubscriptions = user.max_subscriptions || 3; // Default 3

      if (activeSubscriptions.length >= maxSubscriptions) {
        return { allowed: false, reason: 'Maximum subscription limit reached' };
      }

      return { allowed: true };
    } catch (error) {
      logger.error('Error checking if user can subscribe:', error);
      return { allowed: false, reason: 'Error checking subscription permissions' };
    }
  }

  static calculateUpgradeCost(currentSubscription, newPlan) {
    try {
      // Calculate prorated upgrade cost
      const daysRemaining = Math.ceil((new Date(currentSubscription.expires_at) - new Date()) / (1000 * 60 * 60 * 24));
      const totalDays = Math.ceil((new Date(currentSubscription.expires_at) - new Date(currentSubscription.starts_at)) / (1000 * 60 * 60 * 24));
      
      const currentPlanDailyCost = currentSubscription.amount / totalDays;
      const newPlanDailyCost = newPlan.price / totalDays;
      
      const upgradeCost = Math.max(0, (newPlanDailyCost - currentPlanDailyCost) * daysRemaining);
      
      return Math.round(upgradeCost * 100) / 100; // Round to 2 decimal places
    } catch (error) {
      logger.error('Error calculating upgrade cost:', error);
      return 0;
    }
  }

  static async logPaymentAction(action, details) {
    try {
      // Log payment actions for audit trail
      // This would typically write to an audit log
      logger.info(`Payment action logged: ${action}`, {
        ...details,
        timestamp: new Date()
      });
    } catch (error) {
      logger.error('Error logging payment action:', error);
    }
  }

  // Payment provider integration methods (stubs - would be implemented with actual providers)
  static async processStripePayment(paymentData) {
    // Implementation would integrate with Stripe API
    return {
      status: 'successful',
      transactionId: 'stripe_txn_' + Date.now(),
      provider: 'stripe'
    };
  }

  static async processPayPalPayment(paymentData) {
    // Implementation would integrate with PayPal API
    return {
      status: 'successful',
      transactionId: 'paypal_txn_' + Date.now(),
      provider: 'paypal'
    };
  }

  static async processRazorpayPayment(paymentData) {
    // Implementation would integrate with Razorpay API
    return {
      status: 'successful',
      transactionId: 'razorpay_txn_' + Date.now(),
      provider: 'razorpay'
    };
  }

  // Database operation methods (stubs - would be implemented with actual models)
  static async createPaymentRecord(userId, paymentData, paymentResult) {
    // Implementation would create payment record in database
    return {
      id: 'pay_' + Date.now(),
      user_id: userId,
      amount: paymentData.amount,
      currency: paymentData.currency,
      status: paymentResult.status,
      payment_method: paymentData.paymentMethod,
      provider_transaction_id: paymentResult.transactionId,
      created_at: new Date()
    };
  }

  static async createSubscriptionRecord(userId, subscriptionData, payment) {
    // Implementation would create subscription record in database
    return {
      id: 'sub_' + Date.now(),
      user_id: userId,
      plan_id: subscriptionData.plan.id,
      plan_name: subscriptionData.plan.name,
      status: 'active',
      starts_at: new Date(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      created_at: new Date()
    };
  }

  // Additional stub methods for database operations
  static async getActiveSubscription(userId) { return null; }
  static async getSubscriptionById(subscriptionId) { return null; }
  static async getPlanById(planId) { return null; }
  static async getActiveSubscriptions(userId) { return []; }
  static async getSubscriptionsByUser(userId, options) { return []; }
  static async getPaymentById(paymentId) { return null; }
  static async getPaymentsByUser(userId, options) { return []; }
  static async getBillingAddress(userId) { return null; }
  static async getPaymentMethods(userId) { return []; }
  static async getTaxInformation(userId) { return null; }
  static async getDailySpending(userId) { return 0; }
  static async getSubscriptionPayments(subscriptionId) { return []; }
  static async getSubscriptionUsage(subscriptionId) { return {}; }
  static async updateSubscriptionStatus(subscriptionId, status, data) { return null; }
  static async renewSubscriptionRecord(subscriptionId, payment) { return null; }
  static async upgradeSubscriptionRecord(subscriptionId, newPlan, payment) { return null; }
  static async updatePaymentRefund(paymentId, data) { return null; }
  static async createRefundRecord(paymentId, data) { return null; }
  static async updateBillingAddress(userId, address) { return null; }
  static async updatePaymentMethods(userId, methods) { return null; }
  static async updateTaxInformation(userId, info) { return null; }
  static async generateInvoiceData(payment, user) { return {}; }
  static async generatePDFInvoice(data) { return null; }
  static async generateHTMLInvoice(data) { return null; }
  static async cancelSubscriptionWithProvider(subscription) { return { cancellationId: 'cancel_' + Date.now() }; }
  static async processRefundWithProvider(payment, amount) { return { refundId: 'refund_' + Date.now(), status: 'successful' }; }
  static async activateSubscriptionBenefits(userId, subscription) { return true; }
  static async deactivateSubscriptionBenefits(userId, subscription) { return true; }
  static async extendSubscriptionBenefits(userId, subscription) { return true; }
  static async updateSubscriptionBenefits(userId, subscription) { return true; }
  static async sendSubscriptionConfirmation(userId, subscription) { return true; }
  static async sendSubscriptionCancellation(userId, subscription) { return true; }
  static async sendSubscriptionRenewal(userId, subscription) { return true; }
  static async sendSubscriptionUpgrade(userId, subscription) { return true; }
  static async sendRefundNotification(userId, refund) { return true; }
}

module.exports = PaymentService;

/**
 * SolanaPay Shopify Plugin
 * Enables Solana payments in Shopify stores
 */

class SolanaPayShopify {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.apiSecret = config.apiSecret;
    this.baseUrl = config.baseUrl || 'https://api.solanapay.com';
    this.shopDomain = config.shopDomain;
    this.webhookSecret = config.webhookSecret;
    this.testMode = config.testMode || false;
  }

  /**
   * Initialize the plugin
   */
  async initialize() {
    try {
      // Verify API credentials
      const response = await this.makeRequest('/api/merchant/profile', 'GET');
      if (!response.success) {
        throw new Error('Invalid API credentials');
      }

      console.log('SolanaPay Shopify Plugin initialized successfully');
      return true;
    } catch (error) {
      console.error('Failed to initialize SolanaPay plugin:', error);
      return false;
    }
  }

  /**
   * Create payment intent for Shopify order
   */
  async createPaymentIntent(orderData) {
    try {
      const paymentData = {
        amount: parseFloat(orderData.total_price),
        currency: this.getCurrency(orderData.currency),
        description: `Shopify Order #${orderData.order_number}`,
        customerEmail: orderData.customer?.email,
        metadata: JSON.stringify({
          shopify_order_id: orderData.id,
          order_number: orderData.order_number,
          shop_domain: this.shopDomain,
          line_items: orderData.line_items?.map(item => ({
            title: item.title,
            quantity: item.quantity,
            price: item.price
          }))
        })
      };

      const response = await this.makeRequest('/api/merchant/payment/create', 'POST', paymentData);
      
      if (response.success) {
        return {
          success: true,
          paymentIntent: response.paymentIntent,
          paymentUrl: `${this.baseUrl}/pay/${response.paymentIntent.id}`
        };
      } else {
        throw new Error(response.message || 'Failed to create payment intent');
      }
    } catch (error) {
      console.error('Error creating payment intent:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Check payment status
   */
  async checkPaymentStatus(paymentIntentId) {
    try {
      const response = await this.makeRequest(`/api/merchant/payment/${paymentIntentId}`, 'GET');
      
      if (response.success) {
        return {
          success: true,
          status: response.paymentIntent.status,
          transactionHash: response.paymentIntent.transactionHash,
          completedAt: response.paymentIntent.completedAt
        };
      } else {
        throw new Error(response.message || 'Failed to check payment status');
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle webhook from SolanaPay
   */
  async handleWebhook(webhookData, signature) {
    try {
      // Verify webhook signature
      if (!this.verifyWebhookSignature(webhookData, signature)) {
        throw new Error('Invalid webhook signature');
      }

      const { event, data } = webhookData;

      switch (event) {
        case 'payment.completed':
          return await this.handlePaymentCompleted(data);
        case 'payment.failed':
          return await this.handlePaymentFailed(data);
        default:
          console.log(`Unhandled webhook event: ${event}`);
          return { success: true };
      }
    } catch (error) {
      console.error('Error handling webhook:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle successful payment
   */
  async handlePaymentCompleted(paymentData) {
    try {
      const metadata = JSON.parse(paymentData.metadata || '{}');
      const shopifyOrderId = metadata.shopify_order_id;

      if (!shopifyOrderId) {
        throw new Error('Missing Shopify order ID in payment metadata');
      }

      // Update Shopify order status
      await this.updateShopifyOrder(shopifyOrderId, {
        financial_status: 'paid',
        fulfillment_status: 'unfulfilled',
        note: `Paid with Solana. Transaction: ${paymentData.transactionHash}`
      });

      // Log transaction for analytics
      await this.logTransaction({
        amount: paymentData.amount,
        currency: paymentData.currency,
        customer_id: paymentData.customerEmail,
        transaction_hash: paymentData.transactionHash,
        metadata: JSON.stringify({
          source: 'shopify',
          order_id: shopifyOrderId,
          ...metadata
        })
      });

      console.log(`Payment completed for Shopify order ${shopifyOrderId}`);
      return { success: true };
    } catch (error) {
      console.error('Error handling payment completion:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Handle failed payment
   */
  async handlePaymentFailed(paymentData) {
    try {
      const metadata = JSON.parse(paymentData.metadata || '{}');
      const shopifyOrderId = metadata.shopify_order_id;

      if (shopifyOrderId) {
        await this.updateShopifyOrder(shopifyOrderId, {
          financial_status: 'pending',
          note: 'Solana payment failed. Customer may retry payment.'
        });
      }

      console.log(`Payment failed for order ${shopifyOrderId}`);
      return { success: true };
    } catch (error) {
      console.error('Error handling payment failure:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get merchant analytics
   */
  async getAnalytics(period = '30d') {
    try {
      const response = await this.makeRequest(`/api/merchant/analytics?period=${period}`, 'GET');
      
      if (response.success) {
        return {
          success: true,
          analytics: response.analytics
        };
      } else {
        throw new Error(response.message || 'Failed to fetch analytics');
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Issue loyalty points to customer
   */
  async issueLoyaltyPoints(customerEmail, points, reason) {
    try {
      const response = await this.makeRequest('/api/merchant/loyalty/create', 'POST', {
        customerEmail,
        points,
        reason
      });

      if (response.success) {
        return {
          success: true,
          loyaltyReward: response.loyaltyReward
        };
      } else {
        throw new Error(response.message || 'Failed to issue loyalty points');
      }
    } catch (error) {
      console.error('Error issuing loyalty points:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Make HTTP request to SolanaPay API
   */
  async makeRequest(endpoint, method = 'GET', data = null) {
    const url = `${this.baseUrl}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.apiKey,
        'User-Agent': 'SolanaPay-Shopify-Plugin/1.0.0'
      }
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);
    return await response.json();
  }

  /**
   * Update Shopify order
   */
  async updateShopifyOrder(orderId, updateData) {
    // This would integrate with Shopify Admin API
    // Implementation depends on Shopify's API structure
    console.log(`Updating Shopify order ${orderId}:`, updateData);
    
    // Mock implementation - replace with actual Shopify API calls
    return {
      success: true,
      order: {
        id: orderId,
        ...updateData
      }
    };
  }

  /**
   * Log transaction for analytics
   */
  async logTransaction(transactionData) {
    try {
      const response = await this.makeRequest('/api/merchant/analytics/transaction', 'POST', transactionData);
      return response.success;
    } catch (error) {
      console.error('Error logging transaction:', error);
      return false;
    }
  }

  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload, signature) {
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }

  /**
   * Convert currency to supported format
   */
  getCurrency(shopifyCurrency) {
    const currencyMap = {
      'USD': 'USDC',
      'EUR': 'USDC',
      'GBP': 'USDC'
    };
    
    return currencyMap[shopifyCurrency] || 'SOL';
  }

  /**
   * Generate payment button HTML
   */
  generatePaymentButton(paymentIntentId, amount, currency) {
    return `
      <div id="solanapay-button-${paymentIntentId}" class="solanapay-button">
        <button onclick="window.open('${this.baseUrl}/pay/${paymentIntentId}', '_blank')" 
                style="background: linear-gradient(135deg, #9945FF, #14F195); 
                       color: white; 
                       border: none; 
                       padding: 12px 24px; 
                       border-radius: 8px; 
                       font-weight: bold; 
                       cursor: pointer;
                       font-size: 16px;
                       display: flex;
                       align-items: center;
                       gap: 8px;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
          </svg>
          Pay ${amount} ${currency} with Solana
        </button>
      </div>
    `;
  }
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SolanaPayShopify;
}

// Example usage and installation instructions
const INSTALLATION_GUIDE = `
# SolanaPay Shopify Plugin Installation Guide

## 1. Install the Plugin

### Option A: NPM Package (Recommended)
\`\`\`bash
npm install @solanapay/shopify-plugin
\`\`\`

### Option B: Direct Integration
Download this file and include it in your Shopify theme.

## 2. Configuration

Add this to your Shopify theme's settings_schema.json:

\`\`\`json
{
  "name": "SolanaPay Settings",
  "settings": [
    {
      "type": "text",
      "id": "solanapay_api_key",
      "label": "SolanaPay API Key",
      "info": "Get your API key from SolanaPay merchant dashboard"
    },
    {
      "type": "text",
      "id": "solanapay_webhook_secret",
      "label": "Webhook Secret",
      "info": "Webhook secret for payment notifications"
    },
    {
      "type": "checkbox",
      "id": "solanapay_test_mode",
      "label": "Test Mode",
      "default": true
    }
  ]
}
\`\`\`

## 3. Theme Integration

Add to your checkout template:

\`\`\`liquid
{% if settings.solanapay_api_key != blank %}
<script src="{{ 'solanapay-shopify-plugin.js' | asset_url }}"></script>
<script>
  const solanaPayPlugin = new SolanaPayShopify({
    apiKey: '{{ settings.solanapay_api_key }}',
    shopDomain: '{{ shop.domain }}',
    webhookSecret: '{{ settings.solanapay_webhook_secret }}',
    testMode: {{ settings.solanapay_test_mode | json }}
  });

  // Initialize on page load
  document.addEventListener('DOMContentLoaded', async () => {
    const initialized = await solanaPayPlugin.initialize();
    if (initialized) {
      // Add Solana payment option to checkout
      addSolanaPaymentOption();
    }
  });

  async function addSolanaPaymentOption() {
    const checkoutForm = document.querySelector('[data-checkout-form]');
    if (checkoutForm) {
      const orderData = {
        id: '{{ checkout.id }}',
        order_number: '{{ checkout.order_number }}',
        total_price: '{{ checkout.total_price | money_without_currency }}',
        currency: '{{ shop.currency }}',
        customer: {
          email: '{{ checkout.email }}'
        },
        line_items: [
          {% for line_item in checkout.line_items %}
          {
            title: '{{ line_item.title | escape }}',
            quantity: {{ line_item.quantity }},
            price: '{{ line_item.price | money_without_currency }}'
          }{% unless forloop.last %},{% endunless %}
          {% endfor %}
        ]
      };

      const paymentIntent = await solanaPayPlugin.createPaymentIntent(orderData);
      if (paymentIntent.success) {
        const buttonHtml = solanaPayPlugin.generatePaymentButton(
          paymentIntent.paymentIntent.id,
          orderData.total_price,
          orderData.currency
        );
        
        const paymentMethods = document.querySelector('.payment-methods');
        if (paymentMethods) {
          paymentMethods.insertAdjacentHTML('beforeend', buttonHtml);
        }
      }
    }
  }
</script>
{% endif %}
\`\`\`

## 4. Webhook Setup

Set up webhook endpoint in your Shopify app:
- URL: https://your-domain.com/webhooks/solanapay
- Events: payment.completed, payment.failed

## 5. Testing

1. Enable test mode in settings
2. Place a test order
3. Use Solana devnet for testing
4. Verify webhook notifications

## Support

For support, visit: https://docs.solanapay.com/shopify
`;

console.log('SolanaPay Shopify Plugin loaded successfully');

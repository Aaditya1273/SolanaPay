import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

export interface CircleConfig {
  apiKey: string;
  baseUrl: string;
  entitySecret: string;
  masterWalletId: string;
}

export class CircleService {
  private config: CircleConfig;
  private client: ReturnType<typeof axios.create>;

  constructor(config: CircleConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`
      }
    });
  }

  // Generate a unique idempotency key
  private generateIdempotencyKey(): string {
    return `circle_${uuidv4()}`;
  }

  // Create a new blockchain address for a user
  async createBlockchainAddress(userId: string, blockchain: 'SOL' | 'ETH'): Promise<{ address: string; addressTag?: string }> {
    try {
      const response = await this.client.post('/v1/wallets/addresses', {
        idempotencyKey: this.generateIdempotencyKey(),
        currency: 'USD',
        chain: blockchain,
        address: userId, // User's ID or reference
      });

      return {
        address: response.data.data.address,
        addressTag: response.data.data.addressTag
      };
    } catch (error) {
      console.error('Error creating blockchain address:', error);
      throw error;
    }
  }

  // Initiate a fiat deposit
  async initiateFiatDeposit(
    userId: string,
    amount: string,
    paymentMethod: 'credit_card' | 'bank_transfer',
    returnUrl: string
  ) {
    try {
      const response = await this.client.post('/v1/paymentIntents', {
        idempotencyKey: this.generateIdempotencyKey(),
        amount: {
          amount,
          currency: 'USD'
        },
        settlementCurrency: 'USD',
        paymentMethods: [{
          type: paymentMethod,
          metadata: {
            email: `${userId}@solanapay.com`,
            phoneNumber: '+1234567890'
          }
        }],
        metadata: {
          userId,
          type: 'fiat_deposit'
        },
        autoClaim: true,
        verificationSuccessUrl: `${returnUrl}?status=success`,
        verificationFailureUrl: `${returnUrl}?status=failed`
      });

      return response.data.data;
    } catch (error) {
      console.error('Error initiating fiat deposit:', error);
      throw error;
    }
  }

  // Initiate a fiat withdrawal
  async initiateFiatWithdrawal(
    userId: string,
    amount: string,
    destination: {
      type: 'wire' | 'ach' | 'sepa';
      name: string;
      accountNumber: string;
      routingNumber?: string;
      iban?: string;
      swiftCode?: string;
      address?: string;
      city?: string;
      country?: string;
    },
    returnUrl: string
  ) {
    try {
      const response = await this.client.post('/v1/transfers', {
        idempotencyKey: this.generateIdempotencyKey(),
        source: {
          type: 'wallet',
          id: this.config.masterWalletId
        },
        destination: {
          type: 'wire',
          ...destination
        },
        amount: {
          amount,
          currency: 'USD'
        },
        metadata: {
          userId,
          type: 'fiat_withdrawal'
        },
        returnUrl: `${returnUrl}?status=success`,
        cancelUrl: `${returnUrl}?status=cancelled`
      });

      return response.data.data;
    } catch (error) {
      console.error('Error initiating fiat withdrawal:', error);
      throw error;
    }
  }

  // Get transaction status
  async getTransactionStatus(transactionId: string) {
    try {
      const response = await this.client.get(`/v1/transactions/${transactionId}`);
      return response.data.data;
    } catch (error) {
      console.error('Error getting transaction status:', error);
      throw error;
    }
  }

  // Webhook signature verification
  verifyWebhookSignature(payload: any, signature: string, webhookSecret: string): boolean {
    // Implement webhook signature verification
    // This is a placeholder - actual implementation depends on Circle's webhook signing method
    return true;
  }
}

// Example usage:
/*
const circleService = new CircleService({
  apiKey: process.env.CIRCLE_API_KEY!,
  baseUrl: process.env.CIRCLE_API_URL!,
  entitySecret: process.env.CIRCLE_ENTITY_SECRET!,
  masterWalletId: process.env.CIRCLE_MASTER_WALLET_ID!
});
*/

export default CircleService;

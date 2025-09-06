import { ApolloServer } from 'apollo-server-express';
import { createServer } from 'http';
import express from 'express';
import { execute, subscribe } from 'graphql';
import { SubscriptionServer } from 'subscriptions-transport-ws';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { OmniFlowSDK } from '../sdk';
import { SDKConfig } from '../sdk/core/types';
import { typeDefs } from './schema';
import { resolvers, pubsub } from './resolvers';

/**
 * OmniFlow GraphQL API Server
 * Provides comprehensive GraphQL endpoints with real-time subscriptions
 */
export class OmniFlowGraphQLServer {
  private app: express.Application;
  private httpServer: any;
  private apolloServer: ApolloServer;
  private sdk: OmniFlowSDK;
  private port: number;
  private subscriptionServer: SubscriptionServer | null = null;

  constructor(config: SDKConfig, port: number = 4000) {
    this.app = express();
    this.port = port;
    this.sdk = new OmniFlowSDK(config);
    
    this.setupServer();
  }

  private setupServer(): void {
    // Create executable schema
    const schema = makeExecutableSchema({
      typeDefs,
      resolvers,
    });

    // Create Apollo Server
    this.apolloServer = new ApolloServer({
      schema,
      context: ({ req, connection }) => {
        // For subscriptions, use connection context
        if (connection) {
          return {
            sdk: this.sdk,
            pubsub,
            user: connection.context.user,
          };
        }
        
        // For queries and mutations, use request context
        return {
          sdk: this.sdk,
          pubsub,
          user: req.headers.authorization ? this.extractUser(req.headers.authorization) : null,
        };
      },
      subscriptions: {
        path: '/graphql',
        onConnect: (connectionParams: any) => {
          console.log('GraphQL subscription client connected');
          return {
            user: connectionParams.authorization ? this.extractUser(connectionParams.authorization) : null,
          };
        },
        onDisconnect: () => {
          console.log('GraphQL subscription client disconnected');
        },
      },
      introspection: true,
      playground: {
        settings: {
          'request.credentials': 'include',
        },
        subscriptionEndpoint: `ws://localhost:${this.port}/graphql`,
      },
      formatError: (error) => {
        console.error('GraphQL Error:', error);
        return {
          message: error.message,
          code: error.extensions?.code || 'INTERNAL_ERROR',
          path: error.path,
        };
      },
    });

    // Create HTTP server
    this.httpServer = createServer(this.app);
  }

  private extractUser(authorization: string): any {
    // Mock user extraction from authorization header
    // In production, this would validate JWT tokens
    try {
      const token = authorization.replace('Bearer ', '');
      return { id: token, address: token }; // Mock user object
    } catch {
      return null;
    }
  }

  /**
   * Initialize SDK and start the GraphQL server
   */
  async start(): Promise<void> {
    try {
      // Initialize SDK
      await this.sdk.initialize();
      console.log('OmniFlow SDK initialized for GraphQL server');

      // Apply Apollo GraphQL middleware
      await this.apolloServer.start();
      this.apolloServer.applyMiddleware({ 
        app: this.app, 
        path: '/graphql',
        cors: {
          origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
          credentials: true,
        },
      });

      // Setup subscription server
      this.subscriptionServer = SubscriptionServer.create(
        {
          schema: this.apolloServer.schema!,
          execute,
          subscribe,
          onConnect: (connectionParams: any) => {
            console.log('GraphQL subscription client connected');
            return {
              sdk: this.sdk,
              pubsub,
              user: connectionParams.authorization ? this.extractUser(connectionParams.authorization) : null,
            };
          },
          onDisconnect: () => {
            console.log('GraphQL subscription client disconnected');
          },
        },
        {
          server: this.httpServer,
          path: '/graphql',
        }
      );

      // Setup SDK event listeners for real-time subscriptions
      this.setupSDKEventListeners();

      // Health check endpoint
      this.app.get('/health', (req, res) => {
        res.json({
          success: true,
          status: 'healthy',
          timestamp: new Date().toISOString(),
          version: '1.0.0',
          graphql: this.apolloServer.graphqlPath,
        });
      });

      // Start HTTP server
      this.httpServer.listen(this.port, () => {
        console.log(`🚀 OmniFlow GraphQL Server running on port ${this.port}`);
        console.log(`📊 GraphQL Playground: http://localhost:${this.port}${this.apolloServer.graphqlPath}`);
        console.log(`🔄 Subscriptions: ws://localhost:${this.port}/graphql`);
        console.log(`🔍 Health Check: http://localhost:${this.port}/health`);
      });
    } catch (error) {
      console.error('Failed to start OmniFlow GraphQL Server:', error);
      process.exit(1);
    }
  }

  /**
   * Setup SDK event listeners for real-time GraphQL subscriptions
   */
  private setupSDKEventListeners(): void {
    // Asset events
    this.sdk.assets.on('assetCreated', ({ asset }) => {
      pubsub.publish('ASSET_CREATED', { assetCreated: asset });
    });

    this.sdk.assets.on('assetUpdated', ({ asset }) => {
      pubsub.publish('ASSET_UPDATED', { assetUpdated: asset });
    });

    this.sdk.assets.on('assetTransferred', ({ asset }) => {
      pubsub.publish('ASSET_TRANSFERRED', { assetTransferred: asset });
    });

    // Marketplace events
    this.sdk.marketplace.on('listingCreated', ({ listing }) => {
      pubsub.publish('LISTING_CREATED', { listingCreated: listing });
    });

    this.sdk.marketplace.on('listingUpdated', ({ listing }) => {
      pubsub.publish('LISTING_UPDATED', { listingUpdated: listing });
    });

    this.sdk.marketplace.on('assetPurchased', ({ listing }) => {
      pubsub.publish('ASSET_PURCHASED', { assetPurchased: listing });
    });

    this.sdk.marketplace.on('bidPlaced', ({ listing }) => {
      pubsub.publish('BID_PLACED', { bidPlaced: listing });
    });

    // DeFi events
    this.sdk.defi.on('assetStaked', ({ position }) => {
      pubsub.publish('ASSET_STAKED', { assetStaked: position });
    });

    this.sdk.defi.on('assetUnstaked', ({ position }) => {
      pubsub.publish('ASSET_UNSTAKED', { assetUnstaked: position });
    });

    this.sdk.defi.on('rewardsClaimed', ({ position }) => {
      pubsub.publish('REWARDS_CLAIMED', { rewardsClaimed: position });
    });

    // Bridge events
    this.sdk.bridge.on('bridgeInitiated', ({ transfer }) => {
      pubsub.publish('BRIDGE_INITIATED', { bridgeInitiated: transfer });
    });

    this.sdk.bridge.on('bridgeCompleted', ({ transfer }) => {
      pubsub.publish('BRIDGE_COMPLETED', { bridgeCompleted: transfer });
    });

    this.sdk.bridge.on('bridgeFailed', ({ transfer }) => {
      pubsub.publish('BRIDGE_FAILED', { bridgeFailed: transfer });
    });
  }

  /**
   * Graceful shutdown
   */
  async stop(): Promise<void> {
    try {
      if (this.subscriptionServer) {
        this.subscriptionServer.close();
      }
      
      await this.apolloServer.stop();
      await this.sdk.disconnect();
      
      this.httpServer.close(() => {
        console.log('OmniFlow GraphQL Server stopped gracefully');
      });
    } catch (error) {
      console.error('Error during GraphQL server shutdown:', error);
    }
  }

  /**
   * Get Apollo Server instance
   */
  getApolloServer(): ApolloServer {
    return this.apolloServer;
  }

  /**
   * Get Express app instance
   */
  getApp(): express.Application {
    return this.app;
  }

  /**
   * Get SDK instance
   */
  getSDK(): OmniFlowSDK {
    return this.sdk;
  }
}

// Export factory function for easy server creation
export function createOmniFlowGraphQLServer(config: SDKConfig, port?: number): OmniFlowGraphQLServer {
  return new OmniFlowGraphQLServer(config, port);
}

// CLI entry point
if (require.main === module) {
  const config: SDKConfig = {
    chains: ['onechain', 'ethereum', 'polygon', 'bsc'],
    preferredChain: 'onechain',
    environment: process.env.NODE_ENV === 'production' ? 'mainnet' : 'testnet',
    apiEndpoints: {
      rest: process.env.API_BASE_URL || 'http://localhost:3001',
      websocket: process.env.WS_BASE_URL || 'ws://localhost:3001',
    },
    rpcEndpoints: {
      onechain: process.env.ONECHAIN_RPC_URL,
      ethereum: process.env.ETHEREUM_RPC_URL,
      polygon: process.env.POLYGON_RPC_URL,
      bsc: process.env.BSC_RPC_URL,
    },
    apiKeys: {
      infura: process.env.INFURA_API_KEY,
      alchemy: process.env.ALCHEMY_API_KEY,
    },
    privateKey: process.env.PRIVATE_KEY,
  };

  const server = createOmniFlowGraphQLServer(config, parseInt(process.env.GRAPHQL_PORT || '4000'));
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nReceived SIGINT, shutting down GraphQL server gracefully...');
    await server.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\nReceived SIGTERM, shutting down GraphQL server gracefully...');
    await server.stop();
    process.exit(0);
  });

  // Start the server
  server.start().catch(console.error);
}

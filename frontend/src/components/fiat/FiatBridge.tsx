import React, { useState, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { initFiatBridgeService, FIAT_BRIDGE_PROGRAM_ID } from '@/services/fiatBridgeService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ArrowDownUp, ArrowUpDown, ArrowRight } from 'lucide-react';

export const FiatBridge: React.FC = () => {
  const { connection } = useConnection();
  const { publicKey, signTransaction, connected } = useWallet();
  const { toast } = useToast();
  
  const [fiatBridgeService, setFiatBridgeService] = useState<any>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [bridgeState, setBridgeState] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('deposit');
  
  // Initialize fiat bridge service
  useEffect(() => {
    if (!publicKey || !connection) return;
    
    const config = {
      circleApiKey: process.env.NEXT_PUBLIC_CIRCLE_API_KEY || '',
      circleBaseUrl: process.env.NEXT_PUBLIC_CIRCLE_API_URL || 'https://api.circle.com',
      circleEntitySecret: process.env.NEXT_PUBLIC_CIRCLE_ENTITY_SECRET || '',
      circleMasterWalletId: process.env.NEXT_PUBLIC_CIRCLE_MASTER_WALLET_ID || '',
      solanaNetwork: process.env.NEXT_PUBLIC_SOLANA_NETWORK || 'mainnet-beta',
    };
    
    const service = initFiatBridgeService(connection, { publicKey, signTransaction }, config);
    setFiatBridgeService(service);
    
    // Load bridge state
    const loadBridgeState = async () => {
      try {
        const state = await service.getBridgeState();
        setBridgeState(state);
      } catch (error) {
        console.error('Error loading bridge state:', error);
      }
    };
    
    loadBridgeState();
  }, [publicKey, connection, signTransaction]);
  
  // Handle fiat deposit
  const handleDeposit = async () => {
    if (!fiatBridgeService || !amount) return;
    
    try {
      setLoading(true);
      
      // Convert amount to cents (smallest unit for Circle API)
      const amountInCents = Math.floor(parseFloat(amount) * 100).toString();
      
      // Generate return URL for after KYC verification
      const returnUrl = `${window.location.origin}/dashboard/fiat?tab=deposit`;
      
      // Initiate fiat deposit through Circle
      const paymentIntent = await fiatBridgeService.initiateFiatDeposit(amountInCents, returnUrl);
      
      // Redirect to Circle's hosted checkout page
      if (paymentIntent.paymentUrl) {
        window.location.href = paymentIntent.paymentUrl;
      } else {
        throw new Error('Failed to get payment URL');
      }
    } catch (error) {
      console.error('Error initiating deposit:', error);
      toast({
        title: 'Error',
        description: 'Failed to initiate fiat deposit. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Handle fiat withdrawal
  const handleWithdraw = async () => {
    if (!fiatBridgeService || !amount) return;
    
    try {
      setLoading(true);
      
      // Convert amount to lamports (smallest unit for Solana)
      const amountInLamports = Math.floor(parseFloat(amount) * 1_000_000);
      
      // Process withdrawal
      const txId = await fiatBridgeService.processWithdrawal(amountInLamports);
      
      toast({
        title: 'Success',
        description: `Withdrawal initiated. Transaction ID: ${txId}`,
      });
    } catch (error) {
      console.error('Error processing withdrawal:', error);
      toast({
        title: 'Error',
        description: 'Failed to process withdrawal. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Check for pending transactions in URL params
  useEffect(() => {
    const checkForPendingTransactions = async () => {
      const params = new URLSearchParams(window.location.search);
      const txId = params.get('txId');
      const status = params.get('status');
      
      if (txId && status === 'success' && fiatBridgeService) {
        try {
          setLoading(true);
          
          // Check if transaction was already processed
          const isProcessed = await fiatBridgeService.isTransactionProcessed(txId);
          
          if (!isProcessed) {
            // Process the deposit on-chain
            await fiatBridgeService.processFiatDeposit(txId);
            
            toast({
              title: 'Success',
              description: 'Your fiat deposit has been processed and USDC has been credited to your account.',
            });
          } else {
            toast({
              title: 'Info',
              description: 'This transaction has already been processed.',
            });
          }
          
          // Clean up URL
          window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
          console.error('Error processing pending transaction:', error);
          toast({
            title: 'Error',
            description: 'Failed to process pending transaction. Please contact support.',
            variant: 'destructive',
          });
        } finally {
          setLoading(false);
        }
      }
    };
    
    if (fiatBridgeService) {
      checkForPendingTransactions();
    }
  }, [fiatBridgeService, toast]);
  
  if (!connected) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <h3 className="text-xl font-semibold mb-2">Connect Your Wallet</h3>
        <p className="text-muted-foreground mb-4">Please connect your wallet to use the fiat bridge.</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowDownUp className="h-6 w-6" />
            Fiat Bridge
          </CardTitle>
          <CardDescription>
            Convert between fiat and USDC on Solana
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Tabs 
            value={activeTab} 
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="deposit">Deposit</TabsTrigger>
              <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
            </TabsList>
            
            <TabsContent value="deposit" className="mt-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="deposit-amount" className="block text-sm font-medium mb-1">
                    Amount (USD)
                  </label>
                  <Input
                    id="deposit-amount"
                    type="number"
                    min="10"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="text-lg py-6 px-4"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum deposit: $10.00
                  </p>
                </div>
                
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>You pay</span>
                  <ArrowRight className="h-4 w-4" />
                  <span>You receive</span>
                </div>
                
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">${amount || '0.00'} USD</span>
                    <ArrowRight className="h-4 w-4 mx-2" />
                    <span className="font-medium">
                      {amount ? (parseFloat(amount) * 0.99).toFixed(2) : '0.00'} USDC
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Fee: 1% (${amount ? (parseFloat(amount) * 0.01).toFixed(2) : '0.00'})
                  </div>
                </div>
                
                <Button
                  onClick={handleDeposit}
                  disabled={!amount || parseFloat(amount) < 10 || loading}
                  className="w-full py-6 text-base"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Continue to Payment'
                  )}
                </Button>
                
                <div className="text-xs text-muted-foreground text-center">
                  Powered by Circle and Solana Pay
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="withdraw" className="mt-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="withdraw-amount" className="block text-sm font-medium mb-1">
                    Amount (USDC)
                  </label>
                  <Input
                    id="withdraw-amount"
                    type="number"
                    min="10"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="text-lg py-6 px-4"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum withdrawal: 10 USDC
                  </p>
                </div>
                
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>You send</span>
                  <ArrowRight className="h-4 w-4" />
                  <span>You receive</span>
                </div>
                
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">{amount || '0.00'} USDC</span>
                    <ArrowRight className="h-4 w-4 mx-2" />
                    <span className="font-medium">
                      ${amount ? (parseFloat(amount) * 0.99).toFixed(2) : '0.00'} USD
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Fee: 1% ({amount ? (parseFloat(amount) * 0.01).toFixed(2) : '0.00'} USDC)
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div>
                    <label htmlFor="bank-account" className="block text-sm font-medium mb-1">
                      Bank Account
                    </label>
                    <select
                      id="bank-account"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      defaultValue=""
                    >
                      <option value="" disabled>Select bank account</option>
                      <option value="chase">Chase •••• 1234</option>
                      <option value="bankofamerica">Bank of America •••• 5678</option>
                      <option value="add">+ Add new bank account</option>
                    </select>
                  </div>
                </div>
                
                <Button
                  onClick={handleWithdraw}
                  disabled={!amount || parseFloat(amount) < 10 || loading}
                  className="w-full py-6 text-base"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Withdraw to Bank Account'
                  )}
                </Button>
                
                <div className="text-xs text-muted-foreground text-center">
                  Withdrawals typically complete in 1-3 business days
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      
      {bridgeState && (
        <div className="mt-4 text-sm text-muted-foreground text-center">
          Bridge fees: {bridgeState.feeBasisPoints / 100}% | 
          Min deposit: $10.00 | 
          Min withdrawal: 10 USDC
        </div>
      )}
    </div>
  );
};

export default FiatBridge;

import React, { useState, useEffect } from 'react';
import { useMultiChainWallet } from '../../contexts/MultiChainWalletContext';
import { useAccountAbstraction } from '../../contexts/AccountAbstractionContext';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseEther, formatEther, parseUnits, formatUnits } from 'viem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Loader2, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import GaslessPaymentToggle from './GaslessPaymentToggle';

interface PaymentRequest {
  merchantAddress: string;
  amount: number;
  currency: string;
  orderId: string;
  description?: string;
}

interface TokenOption {
  symbol: string;
  address: string;
  decimals: number;
  balance: string;
  usdValue: number;
  gasEstimate: string;
  recommended?: boolean;
}

const MultiChainPaymentProcessor: React.FC<{ paymentRequest: PaymentRequest }> = ({ 
  paymentRequest 
}) => {
  const { 
    isConnected, 
    address, 
    chainId, 
    currentChain, 
    switchToChain, 
    isChainSupported 
  } = useMultiChainWallet();

  const {
    isGaslessEnabled,
    sendUserOperation,
    isAccountAbstractionSupported
  } = useAccountAbstraction();

  const [selectedToken, setSelectedToken] = useState<TokenOption | null>(null);
  const [tokenOptions, setTokenOptions] = useState<TokenOption[]>([]);
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'select' | 'confirm' | 'processing' | 'success' | 'error'>('select');
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Contract interaction hooks
  const { writeContract, data: writeData, isPending: isWritePending } = useWriteContract();
  const { isLoading: isTxLoading, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: writeData,
  });

  // Mock exchange rates (in production, fetch from exchange rate service)
  useEffect(() => {
    const mockRates = {
      'ETH': 2000,
      'MATIC': 0.8,
      'BNB': 300,
      'USDC': 1.0,
      'USDT': 1.0,
      'DAI': 1.0,
      'BUSD': 1.0
    };
    setExchangeRates(mockRates);
  }, []);

  // Get available token options for current chain
  useEffect(() => {
    if (!isConnected || !isChainSupported) return;

    const getTokenOptions = async () => {
      setLoading(true);
      try {
        const options: TokenOption[] = [];
        
        // Chain-specific tokens
        const chainTokens = {
          1: [ // Ethereum
            { symbol: 'ETH', address: '0x0', decimals: 18 },
            { symbol: 'USDC', address: '0xA0b86a33E6441b8435b662303c0f218C8c7e8e56', decimals: 6 },
            { symbol: 'USDT', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6 },
            { symbol: 'DAI', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18 }
          ],
          137: [ // Polygon
            { symbol: 'MATIC', address: '0x0', decimals: 18 },
            { symbol: 'USDC', address: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174', decimals: 6 },
            { symbol: 'USDT', address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6 },
            { symbol: 'DAI', address: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063', decimals: 18 }
          ],
          56: [ // BSC
            { symbol: 'BNB', address: '0x0', decimals: 18 },
            { symbol: 'USDC', address: '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d', decimals: 18 },
            { symbol: 'USDT', address: '0x55d398326f99059fF775485246999027B3197955', decimals: 18 },
            { symbol: 'BUSD', address: '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', decimals: 18 }
          ]
        };

        const tokens = chainTokens[chainId as keyof typeof chainTokens] || [];

        for (const token of tokens) {
          // Mock balance (in production, fetch real balances)
          const mockBalance = token.symbol === 'ETH' || token.symbol === 'MATIC' || token.symbol === 'BNB' 
            ? '1.5' : '1000.0';
          
          const rate = exchangeRates[token.symbol] || 1;
          const usdValue = parseFloat(mockBalance) * rate;
          
          // Calculate required token amount
          const requiredAmount = paymentRequest.amount / rate;
          const hasEnoughBalance = parseFloat(mockBalance) >= requiredAmount;

          if (hasEnoughBalance) {
            options.push({
              symbol: token.symbol,
              address: token.address,
              decimals: token.decimals,
              balance: mockBalance,
              usdValue,
              gasEstimate: token.address === '0x0' ? '0.002' : '0.005', // Mock gas estimates
              recommended: token.symbol === 'USDC' // Recommend stablecoins
            });
          }
        }

        // Sort by recommendation and USD value
        options.sort((a, b) => {
          if (a.recommended && !b.recommended) return -1;
          if (!a.recommended && b.recommended) return 1;
          return b.usdValue - a.usdValue;
        });

        setTokenOptions(options);
        if (options.length > 0 && !selectedToken) {
          setSelectedToken(options[0]);
        }
      } catch (err) {
        setError('Failed to load payment options');
      } finally {
        setLoading(false);
      }
    };

    getTokenOptions();
  }, [chainId, isConnected, isChainSupported, paymentRequest.amount, exchangeRates]);

  // Handle payment processing
  const processPayment = async () => {
    if (!selectedToken || !address) return;

    setStep('processing');
    setError(null);

    try {
      const rate = exchangeRates[selectedToken.symbol] || 1;
      const tokenAmount = paymentRequest.amount / rate;

      if (isGaslessEnabled && isAccountAbstractionSupported) {
        // Use account abstraction for gasless payment
        const callData = selectedToken.address === '0x0' 
          ? '0x' // Native token transfer data
          : '0xa9059cbb'; // ERC20 transfer function selector
        
        const value = selectedToken.address === '0x0' 
          ? BigInt(Math.floor(tokenAmount * 1e18))
          : 0n;

        const txHash = await sendUserOperation(
          paymentRequest.merchantAddress as `0x${string}`,
          callData as `0x${string}`,
          value
        );

        setTxHash(txHash);
      } else {
        // Regular payment flow
        if (selectedToken.address === '0x0') {
          // Native token payment
          const amountWei = parseEther(tokenAmount.toString());
          
          await writeContract({
            address: '0x1234567890123456789012345678901234567890', // Mock contract address
            abi: [
              {
                name: 'createNativePayment',
                type: 'function',
                inputs: [
                  { name: 'merchant', type: 'address' },
                  { name: 'orderId', type: 'string' }
                ],
                outputs: [],
                stateMutability: 'payable'
              }
            ],
            functionName: 'createNativePayment',
            args: [paymentRequest.merchantAddress, paymentRequest.orderId],
            value: amountWei
          });
        } else {
          // ERC20 token payment
          const amountUnits = parseUnits(tokenAmount.toString(), selectedToken.decimals);
          
          await writeContract({
            address: '0x1234567890123456789012345678901234567890', // Mock contract address
            abi: [
              {
                name: 'createTokenPayment',
                type: 'function',
                inputs: [
                  { name: 'merchant', type: 'address' },
                  { name: 'token', type: 'address' },
                  { name: 'amount', type: 'uint256' },
                  { name: 'orderId', type: 'string' }
                ],
                outputs: [],
                stateMutability: 'nonpayable'
              }
            ],
            functionName: 'createTokenPayment',
            args: [
              paymentRequest.merchantAddress,
              selectedToken.address,
              amountUnits,
              paymentRequest.orderId
            ]
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
      setStep('error');
    }
  };

  // Handle transaction success
  useEffect(() => {
    if (isTxSuccess && writeData) {
      setTxHash(writeData);
      setStep('success');
    }
  }, [isTxSuccess, writeData]);

  // Handle transaction loading
  useEffect(() => {
    if (isWritePending || isTxLoading) {
      setStep('processing');
    }
  }, [isWritePending, isTxLoading]);

  if (!isConnected) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Wallet Not Connected</h3>
          <p className="text-gray-600 mb-4">Please connect your wallet to proceed with payment</p>
        </CardContent>
      </Card>
    );
  }

  if (!isChainSupported) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Unsupported Network</h3>
          <p className="text-gray-600 mb-4">Please switch to a supported network</p>
          <div className="space-y-2">
            <Button onClick={() => switchToChain(1)} variant="outline" size="sm">
              Switch to Ethereum
            </Button>
            <Button onClick={() => switchToChain(137)} variant="outline" size="sm">
              Switch to Polygon
            </Button>
            <Button onClick={() => switchToChain(56)} variant="outline" size="sm">
              Switch to BSC
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <span>Payment Summary</span>
            {currentChain && <span className="text-lg">{currentChain.icon}</span>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Amount:</span>
              <span className="font-semibold">${paymentRequest.amount.toFixed(2)} {paymentRequest.currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Order ID:</span>
              <span className="font-mono text-sm">{paymentRequest.orderId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Network:</span>
              <span>{currentChain?.name}</span>
            </div>
            {paymentRequest.description && (
              <div className="flex justify-between">
                <span className="text-gray-600">Description:</span>
                <span className="text-sm">{paymentRequest.description}</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Gasless Payment Toggle */}
      {step === 'select' && selectedToken && (
        <GaslessPaymentToggle
          merchantAddress={paymentRequest.merchantAddress}
          paymentAmount={paymentRequest.amount}
          selectedToken={selectedToken.symbol}
          onGaslessToggle={(enabled, savings) => {
            console.log('Gasless payment toggled:', enabled, 'Savings:', savings);
          }}
        />
      )}

      {/* Token Selection */}
      {step === 'select' && (
        <Card>
          <CardHeader>
            <CardTitle>Select Payment Method</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="ml-2">Loading payment options...</span>
              </div>
            ) : tokenOptions.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                <p className="text-gray-600">No suitable payment methods available</p>
              </div>
            ) : (
              <div className="space-y-3">
                {tokenOptions.map((token) => {
                  const rate = exchangeRates[token.symbol] || 1;
                  const requiredAmount = paymentRequest.amount / rate;
                  
                  return (
                    <button
                      key={token.symbol}
                      onClick={() => setSelectedToken(token)}
                      className={`w-full p-4 border rounded-lg text-left transition-colors ${
                        selectedToken?.symbol === token.symbol
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold">{token.symbol.slice(0, 2)}</span>
                          </div>
                          <div>
                            <div className="font-medium">{token.symbol}</div>
                            <div className="text-sm text-gray-600">
                              Balance: {parseFloat(token.balance).toFixed(4)} {token.symbol}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">
                            {requiredAmount.toFixed(6)} {token.symbol}
                          </div>
                          <div className="text-sm text-gray-600">
                            ~${paymentRequest.amount.toFixed(2)}
                          </div>
                          {token.recommended && (
                            <div className="text-xs text-green-600 font-medium">Recommended</div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Payment Confirmation */}
      {step === 'confirm' && selectedToken && (
        <Card>
          <CardHeader>
            <CardTitle>Confirm Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">You will pay:</span>
                <span className="font-semibold">
                  {(paymentRequest.amount / (exchangeRates[selectedToken.symbol] || 1)).toFixed(6)} {selectedToken.symbol}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-600">Estimated gas:</span>
                <span className="text-sm">{selectedToken.gasEstimate} {currentChain?.nativeCurrency?.symbol}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Total USD value:</span>
                <span className="font-semibold">${paymentRequest.amount.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing State */}
      {step === 'processing' && (
        <Card>
          <CardContent className="p-6 text-center">
            <Loader2 className="h-12 w-12 text-blue-500 mx-auto mb-4 animate-spin" />
            <h3 className="text-lg font-semibold mb-2">Processing Payment</h3>
            <p className="text-gray-600">Please confirm the transaction in your wallet</p>
          </CardContent>
        </Card>
      )}

      {/* Success State */}
      {step === 'success' && (
        <Card>
          <CardContent className="p-6 text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Payment Successful!</h3>
            <p className="text-gray-600 mb-4">Your payment has been processed successfully</p>
            {txHash && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">Transaction Hash:</p>
                <p className="font-mono text-xs break-all">{txHash}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {step === 'error' && (
        <Card>
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Payment Failed</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => setStep('select')} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {step === 'select' && selectedToken && (
        <Button 
          onClick={() => setStep('confirm')} 
          className="w-full"
          disabled={!selectedToken}
        >
          Continue to Payment
          <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      )}

      {step === 'confirm' && (
        <div className="flex space-x-3">
          <Button 
            onClick={() => setStep('select')} 
            variant="outline" 
            className="flex-1"
          >
            Back
          </Button>
          <Button 
            onClick={processPayment} 
            className="flex-1"
            disabled={isWritePending || isTxLoading}
          >
            {isWritePending || isTxLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              'Confirm Payment'
            )}
          </Button>
        </div>
      )}
    </div>
  );
};

export default MultiChainPaymentProcessor;

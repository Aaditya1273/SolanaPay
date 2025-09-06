import React, { useState, useEffect } from 'react';
import { useAccountAbstraction } from '../../contexts/AccountAbstractionContext';
import { useMultiChainWallet } from '../../contexts/MultiChainWalletContext';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Fuel, 
  Zap, 
  DollarSign, 
  Info, 
  CheckCircle, 
  AlertTriangle,
  Loader2,
  Sparkles
} from 'lucide-react';

interface GaslessPaymentToggleProps {
  merchantAddress: string;
  paymentAmount: number;
  selectedToken: string;
  onGaslessToggle: (enabled: boolean, estimatedSavings?: number) => void;
  disabled?: boolean;
}

interface GasEstimate {
  regularGas: bigint;
  gasPrice: bigint;
  totalCostETH: number;
  totalCostUSD: number;
  savings: number;
}

const GaslessPaymentToggle: React.FC<GaslessPaymentToggleProps> = ({
  merchantAddress,
  paymentAmount,
  selectedToken,
  onGaslessToggle,
  disabled = false
}) => {
  const { 
    isGaslessEnabled,
    setGaslessEnabled,
    smartAccount,
    paymasterConfig,
    checkGasSponsorship,
    estimateUserOperationGas,
    isAccountAbstractionSupported,
    error: aaError
  } = useAccountAbstraction();

  const { currentChain } = useMultiChainWallet();

  const [gasEstimate, setGasEstimate] = useState<GasEstimate | null>(null);
  const [canSponsor, setCanSponsor] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check gas sponsorship availability
  useEffect(() => {
    const checkSponsorship = async () => {
      if (!isAccountAbstractionSupported || !smartAccount || !paymasterConfig) {
        setCanSponsor(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Estimate gas for the payment transaction
        const estimatedGas = await estimateUserOperationGas(
          merchantAddress as `0x${string}`,
          '0x', // Mock transaction data
          BigInt(Math.floor(paymentAmount * 1e18)) // Convert to wei
        );

        // Check if merchant can sponsor this gas amount
        const sponsorshipAvailable = await checkGasSponsorship(
          merchantAddress as `0x${string}`,
          estimatedGas
        );

        setCanSponsor(sponsorshipAvailable);

        // Calculate gas costs and savings
        const gasPrice = BigInt(30e9); // 30 gwei mock gas price
        const totalGasCost = estimatedGas * gasPrice;
        const totalCostETH = Number(totalGasCost) / 1e18;
        const ethPrice = 2000; // Mock ETH price
        const totalCostUSD = totalCostETH * ethPrice;

        const estimate: GasEstimate = {
          regularGas: estimatedGas,
          gasPrice,
          totalCostETH,
          totalCostUSD,
          savings: totalCostUSD
        };

        setGasEstimate(estimate);

      } catch (err) {
        console.error('Failed to check gas sponsorship:', err);
        setError('Failed to check gas sponsorship availability');
        setCanSponsor(false);
      } finally {
        setLoading(false);
      }
    };

    if (merchantAddress && paymentAmount > 0 && selectedToken) {
      checkSponsorship();
    }
  }, [
    merchantAddress, 
    paymentAmount, 
    selectedToken, 
    smartAccount, 
    paymasterConfig,
    isAccountAbstractionSupported
  ]);

  const handleToggle = (enabled: boolean) => {
    if (!canSponsor && enabled) {
      return; // Prevent enabling if sponsorship not available
    }

    setGaslessEnabled(enabled);
    onGaslessToggle(enabled, gasEstimate?.savings);
  };

  const getStatusInfo = () => {
    if (loading) {
      return {
        icon: Loader2,
        text: 'Checking availability...',
        color: 'blue',
        spinning: true
      };
    }

    if (error || aaError) {
      return {
        icon: AlertTriangle,
        text: 'Unavailable',
        color: 'red',
        spinning: false
      };
    }

    if (!isAccountAbstractionSupported) {
      return {
        icon: AlertTriangle,
        text: 'Not supported on this network',
        color: 'yellow',
        spinning: false
      };
    }

    if (!smartAccount) {
      return {
        icon: AlertTriangle,
        text: 'Smart account required',
        color: 'yellow',
        spinning: false
      };
    }

    if (!canSponsor) {
      return {
        icon: AlertTriangle,
        text: 'Merchant sponsorship unavailable',
        color: 'yellow',
        spinning: false
      };
    }

    return {
      icon: CheckCircle,
      text: 'Available',
      color: 'green',
      spinning: false
    };
  };

  const statusInfo = getStatusInfo();
  const isToggleDisabled = disabled || loading || !canSponsor || !isAccountAbstractionSupported;

  return (
    <Card className={`transition-all duration-200 ${
      isGaslessEnabled ? 'border-green-500 bg-green-50' : 'border-gray-200'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isGaslessEnabled ? 'bg-green-100' : 'bg-gray-100'
            }`}>
              {isGaslessEnabled ? (
                <Sparkles className="h-5 w-5 text-green-600" />
              ) : (
                <Fuel className="h-5 w-5 text-gray-600" />
              )}
            </div>
            
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-medium">Gasless Payment</span>
                {isGaslessEnabled && (
                  <Badge variant="default" className="bg-green-600">
                    <Zap className="h-3 w-3 mr-1" />
                    Active
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center space-x-2 mt-1">
                {React.createElement(statusInfo.icon, {
                  className: `h-3 w-3 text-${statusInfo.color}-600 ${
                    statusInfo.spinning ? 'animate-spin' : ''
                  }`
                })}
                <span className={`text-xs text-${statusInfo.color}-600`}>
                  {statusInfo.text}
                </span>
              </div>
            </div>
          </div>

          <Switch
            checked={isGaslessEnabled}
            onCheckedChange={handleToggle}
            disabled={isToggleDisabled}
          />
        </div>

        {/* Gas Estimate Details */}
        {gasEstimate && canSponsor && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-600">Estimated Gas</div>
                <div className="font-medium">
                  {Number(gasEstimate.regularGas).toLocaleString()} units
                </div>
              </div>
              
              <div>
                <div className="text-gray-600">Gas Price</div>
                <div className="font-medium">
                  {Number(gasEstimate.gasPrice) / 1e9} gwei
                </div>
              </div>
              
              <div>
                <div className="text-gray-600">Regular Cost</div>
                <div className="font-medium">
                  ${gasEstimate.totalCostUSD.toFixed(3)}
                </div>
              </div>
              
              <div>
                <div className="text-gray-600">Your Savings</div>
                <div className="font-medium text-green-600">
                  ${gasEstimate.savings.toFixed(3)}
                </div>
              </div>
            </div>

            {isGaslessEnabled && (
              <div className="mt-3 p-3 bg-green-100 rounded-lg">
                <div className="flex items-center space-x-2 text-green-800">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Gas fees sponsored by merchant
                  </span>
                </div>
                <div className="text-xs text-green-700 mt-1">
                  This transaction will be processed without gas fees
                </div>
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {(error || aaError) && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center space-x-2 text-red-600">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">{error || aaError}</span>
            </div>
          </div>
        )}

        {/* Information for unsupported cases */}
        {!isAccountAbstractionSupported && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-start space-x-2 text-yellow-700">
              <Info className="h-4 w-4 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium">Network Not Supported</div>
                <div className="text-xs mt-1">
                  Gasless payments are available on Ethereum, Polygon, and BSC networks.
                  Switch networks to enable this feature.
                </div>
              </div>
            </div>
          </div>
        )}

        {!smartAccount && isAccountAbstractionSupported && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-start space-x-2 text-blue-700">
              <Info className="h-4 w-4 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium">Smart Account Required</div>
                <div className="text-xs mt-1">
                  A smart account wallet is required for gasless transactions.
                  Connect a compatible wallet to enable this feature.
                </div>
              </div>
            </div>
          </div>
        )}

        {!canSponsor && smartAccount && isAccountAbstractionSupported && !loading && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-start space-x-2 text-yellow-700">
              <Info className="h-4 w-4 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium">Sponsorship Unavailable</div>
                <div className="text-xs mt-1">
                  The merchant has not enabled gas sponsorship for this transaction,
                  or has reached their daily sponsorship limit.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Benefits Information */}
        {canSponsor && !isGaslessEnabled && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-start space-x-2 text-blue-700">
              <Sparkles className="h-4 w-4 mt-0.5" />
              <div className="text-sm">
                <div className="font-medium">Gasless Payment Benefits</div>
                <ul className="text-xs mt-1 space-y-1">
                  <li>• No gas fees - merchant covers transaction costs</li>
                  <li>• Faster checkout experience</li>
                  <li>• No need to hold ETH for gas</li>
                  <li>• Simplified Web3 payments</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GaslessPaymentToggle;

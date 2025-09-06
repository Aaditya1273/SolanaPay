const axios = require('axios');

class ExchangeRateService {
  constructor() {
    this.baseURL = 'https://api.coingecko.com/api/v3';
    this.cache = new Map();
    this.cacheTimeout = 60000; // 1 minute cache
    
    // Supported stablecoins and their CoinGecko IDs
    this.tokenIds = {
      'USDC': 'usd-coin',
      'USDT': 'tether',
      'DAI': 'dai',
      'BUSD': 'binance-usd',
      'ETH': 'ethereum',
      'MATIC': 'matic-network',
      'BNB': 'binancecoin'
    };

    // Fiat currencies supported
    this.supportedFiats = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'INR'];
  }

  /**
   * Get real-time exchange rates for multiple tokens
   */
  async getExchangeRates(tokens = ['USDC', 'USDT', 'DAI', 'ETH', 'MATIC', 'BNB'], fiats = ['USD']) {
    try {
      const cacheKey = `rates_${tokens.join(',')}_${fiats.join(',')}`;
      const cached = this.cache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.data;
      }

      const tokenIds = tokens.map(token => this.tokenIds[token]).filter(Boolean);
      const fiatString = fiats.join(',').toLowerCase();

      const response = await axios.get(`${this.baseURL}/simple/price`, {
        params: {
          ids: tokenIds.join(','),
          vs_currencies: fiatString,
          include_24hr_change: true,
          include_last_updated_at: true
        },
        timeout: 10000
      });

      const rates = {};
      
      // Process response and map back to token symbols
      Object.entries(response.data).forEach(([coinId, priceData]) => {
        const tokenSymbol = Object.keys(this.tokenIds).find(
          key => this.tokenIds[key] === coinId
        );
        
        if (tokenSymbol) {
          rates[tokenSymbol] = {
            prices: {},
            change24h: {},
            lastUpdated: priceData.last_updated_at
          };

          fiats.forEach(fiat => {
            const fiatLower = fiat.toLowerCase();
            rates[tokenSymbol].prices[fiat] = priceData[fiatLower] || 0;
            rates[tokenSymbol].change24h[fiat] = priceData[`${fiatLower}_24h_change`] || 0;
          });
        }
      });

      // Cache the result
      this.cache.set(cacheKey, {
        data: rates,
        timestamp: Date.now()
      });

      return rates;
    } catch (error) {
      console.error('Error fetching exchange rates:', error);
      
      // Return fallback rates if API fails
      return this.getFallbackRates(tokens, fiats);
    }
  }

  /**
   * Get exchange rate for a specific token pair
   */
  async getTokenPrice(token, fiat = 'USD') {
    try {
      const rates = await this.getExchangeRates([token], [fiat]);
      return rates[token]?.prices[fiat] || 0;
    } catch (error) {
      console.error(`Error fetching price for ${token}:`, error);
      return 0;
    }
  }

  /**
   * Convert amount from one currency to another
   */
  async convertAmount(amount, fromToken, toFiat = 'USD') {
    try {
      const rate = await this.getTokenPrice(fromToken, toFiat);
      return amount * rate;
    } catch (error) {
      console.error(`Error converting ${amount} ${fromToken} to ${toFiat}:`, error);
      return 0;
    }
  }

  /**
   * Get historical price data for charts
   */
  async getHistoricalPrices(token, days = 7, fiat = 'USD') {
    try {
      const tokenId = this.tokenIds[token];
      if (!tokenId) {
        throw new Error(`Token ${token} not supported`);
      }

      const response = await axios.get(`${this.baseURL}/coins/${tokenId}/market_chart`, {
        params: {
          vs_currency: fiat.toLowerCase(),
          days: days,
          interval: days <= 1 ? 'hourly' : 'daily'
        },
        timeout: 10000
      });

      return {
        prices: response.data.prices.map(([timestamp, price]) => ({
          timestamp,
          price,
          date: new Date(timestamp).toISOString()
        })),
        volumes: response.data.total_volumes.map(([timestamp, volume]) => ({
          timestamp,
          volume,
          date: new Date(timestamp).toISOString()
        }))
      };
    } catch (error) {
      console.error(`Error fetching historical data for ${token}:`, error);
      return { prices: [], volumes: [] };
    }
  }

  /**
   * Get market data for supported tokens
   */
  async getMarketData(tokens = ['USDC', 'USDT', 'DAI', 'ETH', 'MATIC', 'BNB']) {
    try {
      const tokenIds = tokens.map(token => this.tokenIds[token]).filter(Boolean);

      const response = await axios.get(`${this.baseURL}/coins/markets`, {
        params: {
          vs_currency: 'usd',
          ids: tokenIds.join(','),
          order: 'market_cap_desc',
          per_page: tokens.length,
          page: 1,
          sparkline: false,
          price_change_percentage: '1h,24h,7d'
        },
        timeout: 10000
      });

      const marketData = {};
      
      response.data.forEach(coin => {
        const tokenSymbol = Object.keys(this.tokenIds).find(
          key => this.tokenIds[key] === coin.id
        );
        
        if (tokenSymbol) {
          marketData[tokenSymbol] = {
            price: coin.current_price,
            marketCap: coin.market_cap,
            volume24h: coin.total_volume,
            priceChange: {
              '1h': coin.price_change_percentage_1h_in_currency || 0,
              '24h': coin.price_change_percentage_24h || 0,
              '7d': coin.price_change_percentage_7d_in_currency || 0
            },
            lastUpdated: coin.last_updated
          };
        }
      });

      return marketData;
    } catch (error) {
      console.error('Error fetching market data:', error);
      return {};
    }
  }

  /**
   * Calculate optimal payment route based on fees and exchange rates
   */
  async getOptimalPaymentRoute(amount, targetFiat = 'USD') {
    try {
      const rates = await this.getExchangeRates(['USDC', 'USDT', 'DAI', 'ETH', 'MATIC', 'BNB'], [targetFiat]);
      const routes = [];

      // Calculate cost for each token option
      Object.entries(rates).forEach(([token, data]) => {
        const price = data.prices[targetFiat];
        if (price > 0) {
          const tokenAmount = amount / price;
          
          // Estimate gas fees based on chain (mock data)
          const gasFees = {
            'ETH': 0.005, // Higher gas on Ethereum
            'MATIC': 0.001, // Lower gas on Polygon
            'BNB': 0.002, // Medium gas on BSC
            'USDC': token === 'USDC' ? (amount > 1000 ? 0.001 : 0.005) : 0.005,
            'USDT': token === 'USDT' ? (amount > 1000 ? 0.001 : 0.005) : 0.005,
            'DAI': token === 'DAI' ? (amount > 1000 ? 0.001 : 0.005) : 0.005
          };

          const estimatedGasFee = gasFees[token] || 0.005;
          const totalCost = amount + (estimatedGasFee * price);

          routes.push({
            token,
            tokenAmount,
            fiatAmount: amount,
            gasFeeUSD: estimatedGasFee * price,
            totalCostUSD: totalCost,
            priceChange24h: data.change24h[targetFiat],
            chain: this.getTokenChain(token),
            recommended: false
          });
        }
      });

      // Sort by total cost and mark the cheapest as recommended
      routes.sort((a, b) => a.totalCostUSD - b.totalCostUSD);
      if (routes.length > 0) {
        routes[0].recommended = true;
      }

      return routes;
    } catch (error) {
      console.error('Error calculating optimal payment route:', error);
      return [];
    }
  }

  /**
   * Get token chain mapping
   */
  getTokenChain(token) {
    const chainMapping = {
      'ETH': 'ethereum',
      'MATIC': 'polygon',
      'BNB': 'bsc',
      'USDC': 'multi', // Available on multiple chains
      'USDT': 'multi',
      'DAI': 'multi',
      'BUSD': 'bsc'
    };
    return chainMapping[token] || 'ethereum';
  }

  /**
   * Fallback rates when API is unavailable
   */
  getFallbackRates(tokens, fiats) {
    const fallbackRates = {};
    
    tokens.forEach(token => {
      fallbackRates[token] = {
        prices: {},
        change24h: {},
        lastUpdated: Math.floor(Date.now() / 1000)
      };

      fiats.forEach(fiat => {
        // Approximate fallback rates
        const rates = {
          'USDC': { USD: 1.00, EUR: 0.85, GBP: 0.73 },
          'USDT': { USD: 1.00, EUR: 0.85, GBP: 0.73 },
          'DAI': { USD: 1.00, EUR: 0.85, GBP: 0.73 },
          'ETH': { USD: 2000, EUR: 1700, GBP: 1460 },
          'MATIC': { USD: 0.80, EUR: 0.68, GBP: 0.58 },
          'BNB': { USD: 300, EUR: 255, GBP: 219 }
        };

        fallbackRates[token].prices[fiat] = rates[token]?.[fiat] || 1;
        fallbackRates[token].change24h[fiat] = 0;
      });
    });

    return fallbackRates;
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }
}

module.exports = { ExchangeRateService };

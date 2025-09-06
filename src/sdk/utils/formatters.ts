export const formatCurrency = (value: number, currency: string = 'USD') =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);

export const formatPercent = (value: number, fractionDigits = 2) =>
  `${value.toFixed(fractionDigits)}%`;

export const truncateAddress = (address: string, size = 4) =>
  `${address.slice(0, 2 + size)}...${address.slice(-size)}`;

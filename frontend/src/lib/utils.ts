import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, currency = 'VRC'): string {
  return `${amount.toFixed(2)} ${currency}`
}

export async function formatAddress(address: string): Promise<string> {
  if (!address) return ''
  
  // Try to resolve SNS domain first
  try {
    const { snsService } = await import('../services/snsService')
    const displayName = await snsService.formatDisplayName(address)
    return displayName
  } catch (error) {
    console.error('Error resolving SNS:', error)
    // Fallback to truncated address
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }
}

// Synchronous version for backwards compatibility
export function formatAddressSync(address: string): string {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date))
}

export function formatRelativeTime(date: string | Date): string {
  const now = new Date()
  const then = new Date(date)
  const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000)

  if (diffInSeconds < 60) return 'Just now'
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`
  
  return formatDate(date)
}

export function generateQRData(data: any): string {
  return JSON.stringify(data)
}

export function parseQRData(qrString: string): any {
  try {
    return JSON.parse(qrString)
  } catch {
    return null
  }
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validateWalletAddress(address: string): boolean {
  const ethAddressRegex = /^0x[a-fA-F0-9]{40}$/
  return ethAddressRegex.test(address)
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

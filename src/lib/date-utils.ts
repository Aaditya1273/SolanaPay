/**
 * Date utilities to prevent hydration errors by ensuring consistent
 * date formatting between server and client rendering
 */

export interface DateFormatOptions {
  includeTime?: boolean;
  format?: 'short' | 'medium' | 'long';
  locale?: string;
}

/**
 * Format date consistently for SSR/hydration compatibility
 * Uses ISO string parsing to avoid timezone inconsistencies
 */
export function formatDate(
  date: Date | string | number,
  options: DateFormatOptions = {}
): string {
  const {
    includeTime = false,
    format = 'medium',
    locale = 'en-US'
  } = options;

  let dateObj: Date;
  
  if (typeof date === 'string' || typeof date === 'number') {
    dateObj = new Date(date);
  } else {
    dateObj = date;
  }

  // Ensure valid date
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  // Use consistent UTC-based formatting to avoid hydration mismatches
  const year = dateObj.getFullYear();
  const month = dateObj.getMonth() + 1;
  const day = dateObj.getDate();
  const hours = dateObj.getHours();
  const minutes = dateObj.getMinutes();

  // Format based on requested format
  switch (format) {
    case 'short':
      return `${month}/${day}/${year}`;
    
    case 'medium':
      const monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
      ];
      const formattedDate = `${monthNames[month - 1]} ${day}, ${year}`;
      
      if (includeTime) {
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12;
        const displayMinutes = minutes.toString().padStart(2, '0');
        return `${formattedDate} ${displayHours}:${displayMinutes} ${ampm}`;
      }
      
      return formattedDate;
    
    case 'long':
      const fullMonthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      return `${fullMonthNames[month - 1]} ${day}, ${year}`;
    
    default:
      return `${month}/${day}/${year}`;
  }
}

/**
 * Format relative time (e.g., "2 hours ago", "3 days ago")
 * Consistent across server/client
 */
export function formatRelativeTime(date: Date | string | number): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date) 
    : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid Date';
  }

  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  // For older dates, use consistent formatting
  return formatDate(dateObj, { format: 'short' });
}

/**
 * Format date for chart/graph display
 * Ensures consistent formatting for data visualization
 */
export function formatChartDate(date: Date | string | number, timeRange?: string): string {
  const dateObj = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date) 
    : date;
  
  if (isNaN(dateObj.getTime())) {
    return 'Invalid';
  }

  const month = dateObj.getMonth() + 1;
  const day = dateObj.getDate();
  const year = dateObj.getFullYear();

  // Short format for charts
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  if (timeRange === 'ALL' || timeRange === '1Y') {
    return `${monthNames[month - 1]} ${year}`;
  }
  
  return `${monthNames[month - 1]} ${day}`;
}

/**
 * Create a date range for consistent server/client behavior
 */
export function createDateRange(days: number): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    // Reset time to avoid timezone issues
    date.setHours(0, 0, 0, 0);
    dates.push(date);
  }
  
  return dates;
}

/**
 * Check if we're in a browser environment (client-side)
 * Useful for conditional rendering to prevent hydration errors
 */
export function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Safe date formatter that works consistently in SSR
 * Falls back to ISO string if formatting fails
 */
export function safeFormatDate(
  date: Date | string | number,
  options: DateFormatOptions = {}
): string {
  try {
    return formatDate(date, options);
  } catch (error) {
    console.warn('Date formatting error:', error);
    const dateObj = new Date(date);
    return dateObj.toISOString().split('T')[0]; // YYYY-MM-DD fallback
  }
}

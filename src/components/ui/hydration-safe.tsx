"use client";

import { useEffect, useState } from 'react';

/**
 * Component to prevent hydration mismatches by only rendering on client
 */
export function ClientOnly({ children, fallback = null }: { 
  children: React.ReactNode; 
  fallback?: React.ReactNode;
}) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

/**
 * Safe date display component that prevents hydration errors
 */
export function SafeDateDisplay({ 
  date, 
  format = 'medium',
  fallback = 'Loading...'
}: { 
  date: Date | string | number;
  format?: 'short' | 'medium' | 'long';
  fallback?: string;
}) {
  return (
    <ClientOnly fallback={<span>{fallback}</span>}>
      <span>
        {(() => {
          const dateObj = new Date(date);
          if (isNaN(dateObj.getTime())) return 'Invalid Date';
          
          // Use consistent formatting
          const year = dateObj.getFullYear();
          const month = dateObj.getMonth() + 1;
          const day = dateObj.getDate();
          
          switch (format) {
            case 'short':
              return `${month}/${day}/${year}`;
            case 'long':
              const monthNames = [
                'January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'
              ];
              return `${monthNames[month - 1]} ${day}, ${year}`;
            default: // medium
              const shortMonths = [
                'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
              ];
              return `${shortMonths[month - 1]} ${day}, ${year}`;
          }
        })()}
      </span>
    </ClientOnly>
  );
}

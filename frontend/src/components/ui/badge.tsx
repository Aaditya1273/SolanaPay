import * as React from "react"

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline"
}

function Badge({ className = "", variant = "default", ...props }: BadgeProps) {
  const baseClasses = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
  
  const variantClasses = {
    default: "border-transparent bg-purple-600 text-white hover:bg-purple-700",
    secondary: "border-transparent bg-gray-100 text-gray-900 hover:bg-gray-200",
    destructive: "border-transparent bg-red-600 text-white hover:bg-red-700",
    outline: "border-gray-300 text-gray-700 hover:bg-gray-50",
  }
  
  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${className}`
  
  return (
    <div className={combinedClasses} {...props} />
  )
}

export { Badge }

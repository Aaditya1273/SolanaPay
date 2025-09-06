import { NavLink } from 'react-router-dom'
import { Home, Wallet, Briefcase, Gift, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const navigation = [
  { name: 'Home', href: '/', icon: Home },
  { name: 'Wallet', href: '/wallet', icon: Wallet },
  { name: 'Tasks', href: '/tasks', icon: Briefcase },
  { name: 'Rewards', href: '/rewards', icon: Gift },
  { name: 'Profile', href: '/profile', icon: User },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border mobile-safe-area">
      <div className="flex justify-around items-center py-2">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center space-y-1 px-3 py-2 rounded-lg transition-colors min-w-0',
                isActive
                  ? 'text-vpay-purple-600 dark:text-vpay-purple-400'
                  : 'text-muted-foreground hover:text-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <item.icon 
                  className={cn(
                    'h-5 w-5',
                    isActive && 'fill-current'
                  )} 
                />
                <span className="text-xs font-medium truncate">{item.name}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}

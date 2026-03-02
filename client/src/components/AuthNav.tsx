import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { User, Coffee, Crown, Zap, Star, LogOut, Settings, CreditCard, Search } from 'lucide-react';
import { useLocation } from 'wouter';
import { getTierDisplayName } from '@/lib/tier-utils';

export function AuthNav() {
  const { user, signOut, loading } = useAuth();
  const [location, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-mist rounded-full animate-pulse" />
      </div>
    );
  }

  const getTierIcon = (tier?: string) => {
    switch (tier) {
      case 'solo':
        return <Coffee className="h-3 w-3" />;
      case 'growth':
        return <Zap className="h-3 w-3" />;
      case 'scale':
        return <Crown className="h-3 w-3" />;
      default:
        return <Star className="h-3 w-3" />;
    }
  };

  const getTierColor = (tier?: string) => {
    switch (tier) {
      case 'solo':
        return 'bg-cloud text-ink border-mist';
      case 'growth':
        return 'bg-signal-blue/10 text-mastery-blue border-mist';
      case 'scale':
        return 'bg-cloud text-ink border-mist';
      default:
        return 'bg-cloud text-ink border-mist';
    }
  };

  if (!user) {
    return (
      <div className="flex items-center space-x-2">
        <Button variant="outline" onClick={() => setLocation('/login')}>
          Sign In
        </Button>
        <Button className="bg-signal-blue hover:bg-[#1D4ED8]" onClick={() => setLocation('/signup')}>Generate Your File</Button>
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center space-x-3">
        {/* Tier Badge */}
        {user && (
          <Badge className={`${getTierColor(user.tier)} flex items-center gap-1`}>
            {getTierIcon(user.tier)}
            {getTierDisplayName(user.tier)}
          </Badge>
        )}

        {/* Credits Display for Coffee Tier */}
        {user?.tier === 'solo' && (
          <div className="flex items-center space-x-1 text-sm text-action-amber">
            <Coffee className="h-4 w-4" />
            <span className="font-medium">{user.creditsRemaining}</span>
            <span className="text-stone-brand">credits</span>
          </div>
        )}

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-mist rounded-full flex items-center justify-center">
                <User className="h-4 w-4" />
              </div>
              <span className="hidden sm:inline-block">{user.email?.split('@')[0]}</span>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div>
                <div className="font-medium">{user.email}</div>
                <div className="text-xs text-stone-brand capitalize">{user.tier} tier</div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem onClick={() => setLocation('/analyze')} className="cursor-pointer">
              <Search className="mr-2 h-4 w-4" />
              New Analysis
            </DropdownMenuItem>

            <DropdownMenuItem onClick={() => setLocation('/dashboard')} className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4" />
              Dashboard
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={() => setLocation('/dashboard?tab=analyses')}
              className="cursor-pointer"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              My Analyses
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onClick={signOut}
              className="cursor-pointer text-error focus:text-error"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}

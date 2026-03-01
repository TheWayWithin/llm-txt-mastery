import { useState } from 'react';
import { X, User, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DemoModeBannerProps {
  onLogin: () => void;
}

export function DemoModeBanner({ onLogin }: DemoModeBannerProps) {
  const [isDismissed, setIsDismissed] = useState(() => {
    return sessionStorage.getItem('demo-banner-dismissed') === 'true';
  });

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem('demo-banner-dismissed', 'true');
  };

  if (isDismissed) {
    return null;
  }

  return (
    <div className="sticky top-0 z-50 bg-action-amber/10 border-b-2 border-action-amber shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-action-amber/20 rounded-full flex items-center justify-center">
                <Info className="h-4 w-4 text-ink" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ink">
                Demo Mode - Exploring with sample data
              </p>
              <p className="text-xs text-action-amber">
                Changes won't be saved. Create a real account to save your analyses and files.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button
              onClick={onLogin}
              size="sm"
              className="bg-action-amber hover:bg-action-amber/80 text-white border-0"
            >
              <User className="h-3 w-3 mr-1" />
              Login with Real Account
            </Button>

            <button
              onClick={handleDismiss}
              className="text-action-amber hover:text-ink p-1 rounded-md hover:bg-action-amber/20 transition-colors"
              aria-label="Dismiss demo banner"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Button } from "@/components/ui/button";
import { Home, RotateCcw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";

interface ResetButtonProps {
  onReset: () => void;
  variant?: 'header' | 'inline' | 'prominent';
  showConfirmation?: boolean;
  className?: string;
}

export default function ResetButton({ 
  onReset, 
  variant = 'inline', 
  showConfirmation = true,
  className = '' 
}: ResetButtonProps) {
  const [showDialog, setShowDialog] = useState(false);

  const handleReset = () => {
    if (showConfirmation) {
      setShowDialog(true);
    } else {
      onReset();
    }
  };

  const confirmReset = () => {
    setShowDialog(false);
    onReset();
  };

  const getButtonProps = () => {
    switch (variant) {
      case 'header':
        return {
          variant: 'outline' as const,
          size: 'sm' as const,
          className: `border-green-300 text-green-700 hover:bg-green-50 ${className}`,
          children: (
            <>
              <Home className="h-4 w-4 mr-2" />
              Start Over
            </>
          )
        };
      case 'prominent':
        return {
          variant: 'default' as const,
          size: 'lg' as const,
          className: `bg-green-600 hover:bg-green-700 text-white ${className}`,
          children: (
            <>
              <Home className="h-5 w-5 mr-2" />
              Start Over
            </>
          )
        };
      default: // inline
        return {
          variant: 'outline' as const,
          size: 'default' as const,
          className: `border-green-300 text-green-700 hover:bg-green-50 ${className}`,
          children: (
            <>
              <RotateCcw className="h-4 w-4 mr-2" />
              Start Over
            </>
          )
        };
    }
  };

  const buttonProps = getButtonProps();

  if (!showConfirmation) {
    return (
      <Button
        onClick={onReset}
        variant={buttonProps.variant}
        size={buttonProps.size}
        className={buttonProps.className}
      >
        {buttonProps.children}
      </Button>
    );
  }

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button
          onClick={handleReset}
          variant={buttonProps.variant}
          size={buttonProps.size}
          className={buttonProps.className}
        >
          {buttonProps.children}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Home className="h-5 w-5 mr-2 text-green-600" />
            Start Over?
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <p className="text-slate-700">
            This will reset your current progress and return you to the beginning. 
            Any unsaved work will be lost.
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-sm text-blue-800">
              💡 <strong>Tip:</strong> If you're experiencing an error, try the "Try Again" 
              button first - it might resolve the issue without losing your progress.
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              onClick={() => setShowDialog(false)}
              variant="outline"
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmReset}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <Home className="h-4 w-4 mr-2" />
              Yes, Start Over
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
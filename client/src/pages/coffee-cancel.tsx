import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, ArrowLeft, MessageCircle, Coffee } from 'lucide-react';
import { Link } from 'wouter';

export default function CoffeeCancel() {
  return (
    <div className="min-h-screen bg-cloud flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <div className="relative">
            <XCircle className="h-16 w-16 mx-auto mb-6 text-action-amber" />
            <Coffee className="h-6 w-6 absolute -top-1 -right-1 text-stone-brand" />
          </div>
          <h1 className="text-2xl font-bold text-ink mb-2">Purchase Cancelled</h1>
          <p className="text-slate-brand mb-6">
            No worries! Your purchase was cancelled and no payment was processed. You can try again
            anytime or continue with our free plan.
          </p>

          <div className="bg-cloud rounded-lg p-4 mb-6 border border-mist">
            <h3 className="font-semibold text-ink mb-2">
              Still interested in premium features?
            </h3>
            <div className="text-sm text-slate-brand space-y-1">
              <p>• 10x more pages (200 vs 20)</p>
              <p>• AI-enhanced quality scoring</p>
              <p>• Professional analysis insights</p>
              <p>• Monthly subscription for 20 analyses</p>
            </div>
          </div>

          <div className="space-y-3">
            <Link to="/">
              <Button className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Continue with Free Plan
              </Button>
            </Link>

            <Link to="/pricing">
              <Button
                variant="outline"
                className="w-full bg-cloud border-mist text-signal-blue hover:bg-signal-blue/10"
              >
                <Coffee className="h-4 w-4 mr-2" />
                Try Coffee Analysis ($4.95)
              </Button>
            </Link>

            <Button variant="ghost" className="w-full text-sm">
              <MessageCircle className="h-4 w-4 mr-2" />
              Contact Support
            </Button>
          </div>

          <div className="mt-6 text-xs text-stone-brand">
            Need help? We're here to assist with any questions about our plans or features.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

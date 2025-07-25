import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle, ArrowRight, Coffee } from 'lucide-react';
import { Link, useLocation } from 'wouter';

export default function CoffeeSuccess() {
  const [location] = useLocation();
  const [loading, setLoading] = useState(true);
  
  // Extract session_id, website URL, and email from URL
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const sessionId = urlParams.get('session_id');
  const websiteUrl = urlParams.get('website');
  const email = urlParams.get('email');

  useEffect(() => {
    // Simple loading delay to show the animation
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          {loading ? (
            <>
              <Coffee className="h-12 w-12 animate-pulse mx-auto mb-4 text-orange-500" />
              <h1 className="text-xl font-semibold mb-2">Brewing your analysis credits...</h1>
              <p className="text-slate-600">Please wait while we set up your coffee analysis.</p>
            </>
          ) : (
            <>
              <div className="relative">
                <CheckCircle className="h-16 w-16 mx-auto mb-6 text-green-500" />
                <Coffee className="h-8 w-8 absolute -top-2 -right-2 text-orange-500" />
              </div>
              <h1 className="text-2xl font-bold text-green-800 mb-2">
                ☕ Coffee Analysis Ready!
              </h1>
              <p className="text-slate-600 mb-6">
                Your $4.95 purchase was successful! You now have <strong>1 analysis credit</strong> for premium website analysis with AI enhancement.
              </p>
              
              <div className="bg-orange-50 rounded-lg p-4 mb-6 border border-orange-200">
                <h3 className="font-semibold text-orange-800 mb-2">What you get:</h3>
                <ul className="text-sm text-orange-700 space-y-1 text-left">
                  <li>• Up to 200 pages per analysis (10x free tier)</li>
                  <li>• Full AI-enhanced quality scoring</li>
                  <li>• Professional LLM.txt file generation</li>
                  <li>• Credits never expire</li>
                </ul>
              </div>

              {sessionId && (
                <div className="bg-slate-100 rounded-lg p-4 mb-6">
                  <p className="text-sm text-slate-600">
                    Purchase ID: <span className="font-mono text-xs">{sessionId}</span>
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {websiteUrl && email ? (
                  <Link href={`/?url=${encodeURIComponent(websiteUrl)}&email=${encodeURIComponent(email)}&coffee=true`}>
                    <a className="block">
                      <Button className="w-full bg-orange-600 hover:bg-orange-700">
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Continue Analysis of {new URL(websiteUrl).hostname}
                      </Button>
                    </a>
                  </Link>
                ) : (
                  <Link href="/">
                    <a className="block">
                      <Button className="w-full bg-orange-600 hover:bg-orange-700">
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Start Your Analysis
                      </Button>
                    </a>
                  </Link>
                )}
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  <strong>💡 Pro tip:</strong> Your credit will be automatically used for your next analysis. 
                  Enjoy the enhanced AI features!
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
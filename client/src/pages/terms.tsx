import React from 'react';
import { Card, CardContent } from '../components/ui/card';
import { FileText, AlertCircle } from 'lucide-react';

export const TermsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Terms of Service</h1>
          <p className="text-xl text-gray-600">
            Plain English terms from a solopreneur who believes in fairness
          </p>
          <p className="text-sm text-gray-500 mt-4">Last updated: January 13, 2025</p>
        </div>

        {/* Main Content */}
        <Card>
          <CardContent className="p-8 prose prose-gray max-w-none">
            {/* Plain English Summary */}
            <div className="mb-8 bg-blue-50 border-l-4 border-blue-600 p-6">
              <h2 className="text-xl font-bold mb-3 flex items-center">
                <AlertCircle className="mr-2 text-blue-600" />
                Plain English Summary
              </h2>
              <ul className="space-y-2 text-gray-700">
                <li>• Use the tool for legitimate business purposes</li>
                <li>• Don't abuse the service or try to break it</li>
                <li>• Pay for premium features if you use them</li>
                <li>• I'll do my best to keep the service running smoothly</li>
                <li>• If something goes wrong, we'll work it out like reasonable people</li>
              </ul>
            </div>

            {/* Agreement */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">1. Agreement</h2>
              <p className="text-gray-700">
                By using LLM.txt Mastery, you agree to these terms. If you don't agree, please don't
                use the service. Simple as that.
              </p>
            </div>

            {/* Service Description */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">2. What We Provide</h2>
              <p className="text-gray-700 mb-4">
                LLM.txt Mastery analyzes websites and generates llms.txt files to help your content
                get proper attribution from AI systems. The service includes:
              </p>
              <ul className="space-y-2 text-gray-700 ml-6">
                <li>• Website content analysis</li>
                <li>• AI-powered content evaluation</li>
                <li>• Generation of optimized llms.txt files</li>
                <li>• Guidance on implementation</li>
              </ul>
            </div>

            {/* Acceptable Use */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">3. Acceptable Use</h2>
              <p className="text-gray-700 mb-4">Please use the service responsibly:</p>
              <ul className="space-y-2 text-gray-700">
                <li>✓ Analyze websites you own or have permission to analyze</li>
                <li>✓ Use the generated files to improve AI attribution</li>
                <li>✓ Provide honest feedback to help improve the service</li>
              </ul>
              <p className="text-gray-700 mt-4">Please don't:</p>
              <ul className="space-y-2 text-gray-700">
                <li>❌ Analyze websites you don't have rights to</li>
                <li>❌ Attempt to overload or abuse the service</li>
                <li>❌ Use the service for any illegal purposes</li>
                <li>❌ Resell or redistribute the service without permission</li>
              </ul>
            </div>

            {/* Payment Terms */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">4. Payment & Refunds</h2>
              <div className="space-y-4 text-gray-700">
                <p>
                  <strong>Free Tier:</strong> Get 3 analyses per day with AI-powered evaluation. No
                  credit card required.
                </p>
                <p>
                  <strong>Paid Tiers:</strong> Various plans available for more analyses and
                  features. Payments processed securely through Stripe.
                </p>
                <p>
                  <strong>Refunds:</strong> Not happy? Contact me within 7 days for a full refund.
                  No questions asked. I'd rather have happy users than unhappy customers.
                </p>
              </div>
            </div>

            {/* Intellectual Property */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">5. Intellectual Property</h2>
              <p className="text-gray-700">
                You retain all rights to your website content. The llms.txt files generated are
                yours to use however you want. The service itself and its underlying technology
                remain my property.
              </p>
            </div>

            {/* Liability */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">6. Limitations & Liability</h2>
              <p className="text-gray-700 mb-4">
                I'm a solopreneur, not a megacorp with deep pockets. I'll do my best to provide a
                reliable, useful service, but:
              </p>
              <ul className="space-y-2 text-gray-700 ml-6">
                <li>• The service is provided "as is"</li>
                <li>• I can't guarantee 100% uptime (though I'll try)</li>
                <li>• I'm not responsible for how AI systems interpret your llms.txt files</li>
                <li>• My liability is limited to the amount you've paid for the service</li>
              </ul>
            </div>

            {/* Privacy */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">7. Privacy</h2>
              <p className="text-gray-700">
                Your privacy matters. See our{' '}
                <a href="/privacy" className="text-blue-600 hover:underline">
                  Privacy Policy
                </a>{' '}
                for details on how we handle your data. Short version: We don't sell it, share it
                unnecessarily, or use it for anything beyond providing the service.
              </p>
            </div>

            {/* Changes to Service */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">8. Service Changes</h2>
              <p className="text-gray-700">
                The service will evolve based on user feedback and technological advances. I'll
                notify you of significant changes via email. If changes materially affect your
                usage, you can cancel anytime.
              </p>
            </div>

            {/* Termination */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">9. Termination</h2>
              <p className="text-gray-700">
                You can stop using the service anytime. If you violate these terms, I may suspend or
                terminate your access. In either case, you can download your generated files before
                account closure.
              </p>
            </div>

            {/* Dispute Resolution */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">10. Disputes</h2>
              <p className="text-gray-700">
                If we have a disagreement, let's try to work it out like adults. Email me directly
                and we'll find a solution. No mandatory arbitration clauses or legal gymnastics—just
                honest communication.
              </p>
            </div>

            {/* Contact */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">11. Contact</h2>
              <p className="text-gray-700">
                Questions about these terms? Contact me at{' '}
                <a href="mailto:support@llmtxtmastery.com" className="text-blue-600 hover:underline">
                  support@llmtxtmastery.com
                </a>
                . I personally read and respond to every message.
              </p>
            </div>

            {/* Final Note */}
            <div className="bg-green-50 border-l-4 border-green-600 p-6">
              <h2 className="text-xl font-bold mb-3">The Bottom Line</h2>
              <p className="text-gray-700">
                These terms exist to protect both of us and ensure the service works well for
                everyone. I'm not trying to trick you with legal jargon or hidden clauses. Just use
                the service responsibly, and we'll get along great.
              </p>
              <p className="text-gray-700 mt-3">
                Thanks for choosing a tool built by a solopreneur over corporate alternatives. Your
                support means everything.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

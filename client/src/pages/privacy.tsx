import React from 'react';
import { Card, CardContent } from '../components/ui/card';
import { Shield, Lock, Eye, UserCheck } from 'lucide-react';

export const PrivacyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-xl text-gray-600">
            Your privacy matters. Here's exactly what we do (and don't do) with your data.
          </p>
          <p className="text-sm text-gray-500 mt-4">
            Last updated: January 13, 2025
          </p>
        </div>

        {/* Main Content */}
        <Card>
          <CardContent className="p-8 prose prose-gray max-w-none">
            {/* Introduction */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <Shield className="mr-3 text-blue-600" />
                The Simple Truth
              </h2>
              <p className="text-gray-700">
                I'm not a corporation harvesting data. I'm a solopreneur who believes in respecting user privacy. 
                This tool collects only what's necessary to function and nothing more.
              </p>
            </div>

            {/* What We Collect */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <Eye className="mr-3 text-purple-600" />
                What We Collect
              </h2>
              <ul className="space-y-2 text-gray-700">
                <li><strong>Email Address:</strong> Only if you provide it for account creation or to receive your analysis</li>
                <li><strong>Website URLs:</strong> The sites you analyze (stored temporarily for processing)</li>
                <li><strong>Payment Information:</strong> Processed securely through Stripe (we never see your card details)</li>
                <li><strong>Usage Data:</strong> Basic analytics to improve the service (page views, feature usage)</li>
              </ul>
            </div>

            {/* What We Don't Collect */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <Lock className="mr-3 text-green-600" />
                What We DON'T Collect
              </h2>
              <ul className="space-y-2 text-gray-700">
                <li>❌ Personal information beyond what's necessary</li>
                <li>❌ Tracking cookies or advertising data</li>
                <li>❌ Your website's content or proprietary information</li>
                <li>❌ Third-party analytics that compromise privacy</li>
                <li>❌ Any data we don't explicitly need to provide the service</li>
              </ul>
            </div>

            {/* How We Use It */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">How We Use Your Data</h2>
              <ul className="space-y-2 text-gray-700">
                <li>✓ To generate and deliver your llms.txt files</li>
                <li>✓ To send you the analysis results you requested</li>
                <li>✓ To process payments for premium features</li>
                <li>✓ To improve the service based on usage patterns</li>
                <li>✓ To contact you about critical service updates (if subscribed)</li>
              </ul>
            </div>

            {/* Data Security */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Data Security</h2>
              <p className="text-gray-700">
                Your data is stored securely using industry-standard encryption. Website analyses are processed 
                in memory and results are stored temporarily. We use secure HTTPS connections for all data transfers.
              </p>
            </div>

            {/* Third Party Services */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Third-Party Services</h2>
              <p className="text-gray-700 mb-4">We use a few trusted services to operate:</p>
              <ul className="space-y-2 text-gray-700">
                <li><strong>Stripe:</strong> Payment processing (PCI compliant)</li>
                <li><strong>Railway:</strong> Secure hosting infrastructure</li>
                <li><strong>OpenAI:</strong> AI analysis (content processed, not stored)</li>
              </ul>
            </div>

            {/* Data Retention */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Data Retention</h2>
              <p className="text-gray-700">
                Analysis results are retained for 30 days to allow re-downloading. 
                Account information is kept as long as you maintain an account. 
                You can request deletion at any time by contacting me directly.
              </p>
            </div>

            {/* Your Rights */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <UserCheck className="mr-3 text-indigo-600" />
                Your Rights
              </h2>
              <p className="text-gray-700 mb-4">You have the right to:</p>
              <ul className="space-y-2 text-gray-700">
                <li>✓ Access any personal data we hold about you</li>
                <li>✓ Request correction of inaccurate data</li>
                <li>✓ Request deletion of your data</li>
                <li>✓ Opt-out of any communications</li>
                <li>✓ Export your data in a portable format</li>
              </ul>
            </div>

            {/* No Corporate BS */}
            <div className="mb-8 bg-blue-50 border-l-4 border-blue-600 p-6">
              <h2 className="text-xl font-bold mb-3">No Corporate BS Promise</h2>
              <p className="text-gray-700">
                I won't sell your data. I won't share it with advertisers. I won't use dark patterns 
                to trick you into giving up privacy. This is a tool built by someone who values privacy 
                as much as you do.
              </p>
            </div>

            {/* Contact */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Questions?</h2>
              <p className="text-gray-700">
                If you have any privacy concerns or questions, contact me directly at{' '}
                <a href="mailto:jamie@llmtxtmastery.com" className="text-blue-600 hover:underline">
                  jamie@llmtxtmastery.com
                </a>
                . No support tickets, no runaround—just direct answers from the person who built this.
              </p>
            </div>

            {/* Updates */}
            <div className="text-sm text-gray-600 border-t pt-6">
              <p>
                This privacy policy may be updated occasionally. Any significant changes will be 
                communicated via email to registered users. The "Last updated" date at the top 
                will always reflect the most recent revision.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
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
            Last updated: August 19, 2025 • GDPR Compliant
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
                I'm not a corporation harvesting data. I'm a solopreneur who believes in respecting
                user privacy. This tool collects only what's necessary to function and nothing more.
              </p>
            </div>

            {/* What We Collect */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <Eye className="mr-3 text-purple-600" />
                What We Collect
              </h2>
              <ul className="space-y-2 text-gray-700">
                <li>
                  <strong>Email Address:</strong> Only if you provide it for account creation or to
                  receive your analysis
                </li>
                <li>
                  <strong>Website URLs:</strong> The sites you analyze (stored temporarily for
                  processing)
                </li>
                <li>
                  <strong>Payment Information:</strong> Processed securely through Stripe (we never
                  see your card details)
                </li>
                <li>
                  <strong>Usage Data:</strong> Basic analytics to improve the service (page views,
                  feature usage)
                </li>
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
                Your data is stored securely using industry-standard encryption. Website analyses
                are processed in memory and results are stored temporarily. We use secure HTTPS
                connections for all data transfers.
              </p>
            </div>

            {/* Cookies and Analytics */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Cookies and Analytics</h2>
              <p className="text-gray-700 mb-4">
                We use cookies and similar technologies to improve your experience:
              </p>
              <ul className="space-y-3 text-gray-700">
                <li>
                  <strong>Essential Cookies:</strong> Required for the website to function (login,
                  preferences)
                </li>
                <li>
                  <strong>Analytics Cookies (Google Analytics 4):</strong> Help us understand how
                  you use our service to improve it
                </li>
                <li>
                  <strong>Consent Management (Enzuzo):</strong> Manages your privacy preferences and
                  cookie consent
                </li>
              </ul>
              <p className="text-gray-700 mt-4">
                You can control cookie preferences through our consent banner. Essential cookies
                cannot be disabled as they're necessary for the service to function properly.
              </p>
            </div>

            {/* Legal Basis for Processing (GDPR) */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Legal Basis for Processing (GDPR)</h2>
              <p className="text-gray-700 mb-4">We process your personal data based on:</p>
              <ul className="space-y-2 text-gray-700">
                <li>
                  <strong>Contract Performance:</strong> To provide the llms.txt analysis service
                  you requested
                </li>
                <li>
                  <strong>Legitimate Interest:</strong> To improve our service and prevent fraud
                </li>
                <li>
                  <strong>Consent:</strong> For analytics and optional communications (you can
                  withdraw anytime)
                </li>
                <li>
                  <strong>Legal Obligation:</strong> To comply with tax and business regulations
                </li>
              </ul>
            </div>

            {/* Data Controller Information */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Data Controller Information</h2>
              <div className="bg-gray-50 p-4 rounded">
                <p className="text-gray-700">
                  <strong>Data Controller:</strong> Jamie Watters
                  <br />
                  <strong>Business:</strong> LLM.txt Mastery
                  <br />
                  <strong>Email:</strong> jamie@llmtxtmastery.com
                  <br />
                  <strong>Website:</strong> www.llmtxtmastery.com
                </p>
              </div>
            </div>

            {/* Third Party Services */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Third-Party Services</h2>
              <p className="text-gray-700 mb-4">
                We use trusted services to operate (all GDPR compliant):
              </p>
              <ul className="space-y-2 text-gray-700">
                <li>
                  <strong>Stripe:</strong> Payment processing (PCI compliant, EU-approved)
                </li>
                <li>
                  <strong>Railway:</strong> Secure hosting infrastructure (EU data centers
                  available)
                </li>
                <li>
                  <strong>OpenAI:</strong> AI analysis (content processed, not stored permanently)
                </li>
                <li>
                  <strong>Google Analytics 4:</strong> Website analytics (IP anonymization enabled)
                </li>
                <li>
                  <strong>Google Tag Manager:</strong> Analytics and consent management
                </li>
                <li>
                  <strong>Enzuzo:</strong> GDPR consent management and privacy compliance
                </li>
              </ul>
            </div>

            {/* Data Retention */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">Data Retention</h2>
              <p className="text-gray-700">
                Analysis results are retained for 30 days to allow re-downloading. Account
                information is kept as long as you maintain an account. You can request deletion at
                any time by contacting me directly.
              </p>
            </div>

            {/* International Data Transfers */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4">International Data Transfers</h2>
              <p className="text-gray-700 mb-4">
                Some of our service providers are located outside the EU. When we transfer data
                internationally, we ensure adequate protection through:
              </p>
              <ul className="space-y-2 text-gray-700">
                <li>
                  ✓ <strong>Standard Contractual Clauses (SCCs)</strong> approved by the European
                  Commission
                </li>
                <li>
                  ✓ <strong>Adequacy Decisions</strong> for countries with equivalent data
                  protection
                </li>
                <li>
                  ✓ <strong>Additional safeguards</strong> like encryption and access controls
                </li>
              </ul>
            </div>

            {/* Your Rights */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold mb-4 flex items-center">
                <UserCheck className="mr-3 text-indigo-600" />
                Your Rights (GDPR Articles 15-22)
              </h2>
              <p className="text-gray-700 mb-4">
                Under GDPR, you have comprehensive rights regarding your personal data:
              </p>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-bold text-blue-800 mb-2">Article 15 - Right of Access</h3>
                  <p className="text-gray-700 text-sm">
                    Get a complete copy of your personal data, including how it's processed, who
                    it's shared with, and how long it's stored.
                  </p>
                </div>

                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="font-bold text-green-800 mb-2">
                    Article 16 - Right to Rectification
                  </h3>
                  <p className="text-gray-700 text-sm">
                    Correct any inaccurate or incomplete personal data we hold about you.
                  </p>
                </div>

                <div className="bg-red-50 p-4 rounded-lg">
                  <h3 className="font-bold text-red-800 mb-2">
                    Article 17 - Right to Erasure ("Right to be Forgotten")
                  </h3>
                  <p className="text-gray-700 text-sm">
                    Request deletion of your personal data when there's no longer a legitimate
                    reason for processing it.
                  </p>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="font-bold text-yellow-800 mb-2">
                    Article 18 - Right to Restriction
                  </h3>
                  <p className="text-gray-700 text-sm">
                    Limit how we process your data while disputes are resolved or accuracy is
                    verified.
                  </p>
                </div>

                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-bold text-purple-800 mb-2">
                    Article 20 - Right to Data Portability
                  </h3>
                  <p className="text-gray-700 text-sm">
                    Export your data in a machine-readable format to transfer to another service.
                  </p>
                </div>

                <div className="bg-indigo-50 p-4 rounded-lg">
                  <h3 className="font-bold text-indigo-800 mb-2">Article 21 - Right to Object</h3>
                  <p className="text-gray-700 text-sm">
                    Opt-out of data processing based on legitimate interest or for direct marketing
                    purposes.
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg mb-4">
                <h3 className="font-bold text-gray-800 mb-3">How to Exercise Your Rights</h3>
                <div className="space-y-3 text-gray-700">
                  <p>
                    <strong>Email:</strong>{' '}
                    <a
                      href="mailto:jamie@llmtxtmastery.com?subject=GDPR%20Data%20Subject%20Request"
                      className="text-blue-600 hover:underline"
                    >
                      jamie@llmtxtmastery.com
                    </a>
                  </p>
                  <p>
                    <strong>Subject Line:</strong> "GDPR Data Subject Request" (for faster
                    processing)
                  </p>
                  <p>
                    <strong>Response Time:</strong> Within 30 days (1 month) of receiving your
                    request
                  </p>
                  <p>
                    <strong>Verification:</strong> We may need to verify your identity before
                    processing requests
                  </p>
                  <p>
                    <strong>Cost:</strong> Free for most requests (reasonable fees may apply for
                    excessive requests)
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 border-l-4 border-amber-400 p-4">
                <h3 className="font-bold text-amber-800 mb-2">Right to Complain (Article 77)</h3>
                <p className="text-gray-700 text-sm">
                  If you're not satisfied with how we handle your request or believe we're not
                  complying with GDPR, you can file a complaint with your local data protection
                  authority. For EU residents, find your
                  <a
                    href="https://edpb.europa.eu/about-edpb/about-edpb/members_en"
                    className="text-amber-700 hover:underline font-medium"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    local data protection authority here
                  </a>
                  .
                </p>
              </div>
            </div>

            {/* No Corporate BS */}
            <div className="mb-8 bg-blue-50 border-l-4 border-blue-600 p-6">
              <h2 className="text-xl font-bold mb-3">No Corporate BS Promise</h2>
              <p className="text-gray-700">
                I won't sell your data. I won't share it with advertisers. I won't use dark patterns
                to trick you into giving up privacy. This is a tool built by someone who values
                privacy as much as you do.
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
                . No support tickets, no runaround—just direct answers from the person who built
                this.
              </p>
            </div>

            {/* Updates */}
            <div className="text-sm text-gray-600 border-t pt-6">
              <p>
                This privacy policy may be updated occasionally. Any significant changes will be
                communicated via email to registered users. The "Last updated" date at the top will
                always reflect the most recent revision.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

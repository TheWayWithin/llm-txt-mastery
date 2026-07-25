import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Cookie, Shield, Info, Settings, ArrowLeft } from 'lucide-react';
import Footer from '@/components/footer';
import { useSEO } from '@/hooks/useSEO';

export default function CookiesPage() {
  useSEO({
    title: 'Cookie Policy - LLM.txt Mastery',
    description: 'Cookie policy for LLM.txt Mastery.',
  });
  const lastUpdated = 'January 6, 2025';

  return (
    <div className="min-h-screen bg-cloud">
      {/* Header */}
      <header className="bg-mastery-blue shadow-sm border-b border-mastery-blue">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/">
              <a className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
                <img
                  src="/images/logo-primary.png"
                  alt="LLM.txt Mastery"
                  className="h-16 md:h-20 w-auto"
                />
              </a>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link href="/">
          <a className="inline-flex items-center text-signal-blue hover:text-mastery-blue mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </a>
        </Link>

        {/* Page Title */}
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-4">
            <Cookie className="h-8 w-8 text-signal-blue" />
            <h1 className="text-3xl font-bold text-ink">Cookie Policy</h1>
          </div>
          <p className="text-slate-brand">
            Last updated: <time dateTime="2025-01-06">{lastUpdated}</time>
          </p>
        </div>

        {/* Cookie Management Widget */}
        <Card className="mb-8 border-mist bg-cloud">
          <CardContent className="p-6">
            <div className="flex items-start space-x-4">
              <Settings className="h-6 w-6 text-signal-blue mt-1" />
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-ink mb-2">
                  Manage Your Cookie Preferences
                </h2>
                <p className="text-sm text-slate-brand mb-4">
                  You can update your cookie preferences at any time using the button below. We
                  respect your choices and only use cookies as you permit.
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    className="bg-signal-blue hover:bg-[#1D4ED8]"
                    onClick={() => {
                      // Trigger native consent manager
                      if (typeof window !== 'undefined' && (window as any).__gdprConsent) {
                        (window as any).__gdprConsent('show');
                      } else {
                        // Clear consent to force banner to reappear
                        localStorage.removeItem('gdpr_consent');
                        window.location.reload();
                      }
                    }}
                  >
                    <Cookie className="h-4 w-4 mr-2" />
                    Manage Cookie Preferences
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Introduction */}
        <Card className="mb-6">
          <CardContent className="p-6 prose prose-slate max-w-none">
            <h2 className="text-xl font-semibold text-ink mb-4">Introduction</h2>
            <p className="text-slate-brand">
              LLM.txt Mastery ("we", "our", or "us") uses cookies and similar tracking technologies
              to enhance your experience on our website. This Cookie Policy explains what cookies
              are, how we use them, and your choices regarding their use.
            </p>
            <p className="text-slate-brand">
              By using our website, you consent to our use of cookies in accordance with this
              policy. You can manage your preferences at any time using the cookie management tool
              above.
            </p>
          </CardContent>
        </Card>

        {/* What Are Cookies */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-ink mb-4">What Are Cookies?</h2>
            <p className="text-slate-brand mb-4">
              Cookies are small text files that are placed on your device when you visit a website.
              They help the website remember your preferences and understand how you use the site.
            </p>

            <div className="bg-cloud rounded-lg p-4 border border-mist">
              <h3 className="font-semibold text-ink mb-2">Types of Storage We Use:</h3>
              <ul className="space-y-2 text-sm text-slate-brand">
                <li className="flex items-start">
                  <span className="text-signal-blue mr-2">•</span>
                  <span>
                    <strong>Session Cookies:</strong> Temporary cookies that expire when you close
                    your browser
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-signal-blue mr-2">•</span>
                  <span>
                    <strong>Persistent Cookies:</strong> Remain on your device for a set period
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-signal-blue mr-2">•</span>
                  <span>
                    <strong>Local Storage:</strong> Browser storage for user preferences and session
                    data
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-signal-blue mr-2">•</span>
                  <span>
                    <strong>Session Storage:</strong> Temporary browser storage cleared when tab
                    closes
                  </span>
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Cookie Categories */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-ink mb-4">Cookie Categories</h2>
            <div className="space-y-4">
              {/* Necessary Cookies */}
              <div className="border-l-4 border-success pl-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-ink">Necessary Cookies</h3>
                  <span className="text-xs bg-success/10 text-success px-2 py-1 rounded">
                    Always Active
                  </span>
                </div>
                <p className="text-sm text-slate-brand mb-2">
                  Essential for the website to function properly. These cannot be disabled.
                </p>
                <div className="bg-cloud rounded p-3 text-xs">
                  <p className="font-semibold mb-1">Cookies used:</p>
                  <ul className="space-y-1 text-slate-brand">
                    <li>
                      • <code>auth_access_token</code> - User authentication
                    </li>
                    <li>
                      • <code>auth_refresh_token</code> - Session management
                    </li>
                    <li>
                      • <code>gdpr_consent</code> - Cookie consent preferences
                    </li>
                    <li>
                      • <code>stripe_session</code> - Payment processing security
                    </li>
                  </ul>
                </div>
              </div>

              {/* Analytics Cookies */}
              <div className="border-l-4 border-signal-blue pl-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-ink">Analytics Cookies</h3>
                  <span className="text-xs bg-signal-blue/10 text-signal-blue px-2 py-1 rounded">
                    Optional
                  </span>
                </div>
                <p className="text-sm text-slate-brand mb-2">
                  Help us understand how visitors interact with our website to improve user
                  experience.
                </p>
                <div className="bg-cloud rounded p-3 text-xs">
                  <p className="font-semibold mb-1">Services used:</p>
                  <ul className="space-y-1 text-slate-brand">
                    <li>
                      • <strong>Google Analytics 4:</strong> Website usage statistics
                    </li>
                    <li>• Tracks: Page views, session duration, bounce rate</li>
                    <li>• Data retention: 14 months</li>
                    <li>• Anonymized IP addresses</li>
                  </ul>
                </div>
              </div>

              {/* Functional Cookies */}
              <div className="border-l-4 border-clarity-teal pl-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-ink">Functional Cookies</h3>
                  <span className="text-xs bg-clarity-teal/10 text-clarity-teal px-2 py-1 rounded">
                    Optional
                  </span>
                </div>
                <p className="text-sm text-slate-brand mb-2">
                  Enable enhanced functionality and personalization.
                </p>
                <div className="bg-cloud rounded p-3 text-xs">
                  <p className="font-semibold mb-1">Features enabled:</p>
                  <ul className="space-y-1 text-slate-brand">
                    <li>• Remember your analysis preferences</li>
                    <li>• Store recently analyzed websites</li>
                    <li>• Maintain UI preferences (theme, layout)</li>
                  </ul>
                </div>
              </div>

              {/* Marketing Cookies */}
              <div className="border-l-4 border-stone-brand pl-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-ink">Marketing Cookies</h3>
                  <span className="text-xs bg-cloud text-stone-brand px-2 py-1 rounded">
                    Currently Disabled
                  </span>
                </div>
                <p className="text-sm text-slate-brand mb-2">
                  Used to track visitors across websites for advertising purposes. We do not
                  currently use marketing cookies.
                </p>
                <div className="bg-cloud rounded p-3 text-xs">
                  <p className="text-slate-brand italic">
                    We prioritize your privacy and do not engage in retargeting or advertising
                    tracking.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Third-Party Services */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-ink mb-4">Third-Party Services</h2>
            <p className="text-slate-brand mb-4">
              We integrate with the following third-party services that may set their own cookies:
            </p>

            <div className="space-y-3">
              <div className="flex items-start space-x-3 p-3 bg-cloud rounded">
                <Shield className="h-5 w-5 text-success mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-ink">Stripe</h4>
                  <p className="text-sm text-slate-brand">
                    Payment processing. Sets cookies for fraud prevention and security.
                  </p>
                  <a
                    href="https://stripe.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-signal-blue hover:underline"
                  >
                    Stripe Privacy Policy →
                  </a>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-cloud rounded">
                <Shield className="h-5 w-5 text-signal-blue mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-ink">Google Analytics</h4>
                  <p className="text-sm text-slate-brand">
                    Website analytics. Only active if you consent to analytics cookies.
                  </p>
                  <a
                    href="https://policies.google.com/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-signal-blue hover:underline"
                  >
                    Google Privacy Policy →
                  </a>
                </div>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-cloud rounded">
                <Shield className="h-5 w-5 text-slate-brand mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-ink">Native Consent Manager</h4>
                  <p className="text-sm text-slate-brand">
                    Built-in cookie consent management to comply with GDPR and privacy laws.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Your Rights */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-ink mb-4">Your Rights & Choices</h2>

            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-signal-blue mt-0.5" />
                <div>
                  <h3 className="font-semibold text-ink mb-1">Accept or Reject Cookies</h3>
                  <p className="text-sm text-slate-brand">
                    You can choose to accept all cookies, reject non-essential cookies, or customize
                    your preferences using our cookie management tool.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-signal-blue mt-0.5" />
                <div>
                  <h3 className="font-semibold text-ink mb-1">Browser Settings</h3>
                  <p className="text-sm text-slate-brand">
                    Most browsers allow you to refuse cookies or alert you when cookies are being
                    sent. Note that some parts of our service may not function properly without
                    cookies.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-signal-blue mt-0.5" />
                <div>
                  <h3 className="font-semibold text-ink mb-1">Withdraw Consent</h3>
                  <p className="text-sm text-slate-brand">
                    You can withdraw your consent for non-essential cookies at any time using the
                    "Manage Cookie Preferences" button above.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <Info className="h-5 w-5 text-signal-blue mt-0.5" />
                <div>
                  <h3 className="font-semibold text-ink mb-1">Do Not Track</h3>
                  <p className="text-sm text-slate-brand">
                    We respect Do Not Track signals. When detected, we disable analytics tracking
                    for your session.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Browser Cookie Management */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-ink mb-4">
              How to Manage Cookies in Your Browser
            </h2>
            <p className="text-slate-brand mb-4">
              You can also manage cookies directly in your browser settings:
            </p>

            <div className="grid gap-3 sm:grid-cols-2">
              <a
                href="https://support.google.com/chrome/answer/95647"
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-cloud rounded hover:bg-mist transition-colors"
              >
                <p className="font-semibold text-ink">Chrome</p>
                <p className="text-xs text-signal-blue">Manage cookies in Chrome →</p>
              </a>

              <a
                href="https://support.mozilla.org/en-US/kb/enable-and-disable-cookies-website-preferences"
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-cloud rounded hover:bg-mist transition-colors"
              >
                <p className="font-semibold text-ink">Firefox</p>
                <p className="text-xs text-signal-blue">Manage cookies in Firefox →</p>
              </a>

              <a
                href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac"
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-cloud rounded hover:bg-mist transition-colors"
              >
                <p className="font-semibold text-ink">Safari</p>
                <p className="text-xs text-signal-blue">Manage cookies in Safari →</p>
              </a>

              <a
                href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 bg-cloud rounded hover:bg-mist transition-colors"
              >
                <p className="font-semibold text-ink">Edge</p>
                <p className="text-xs text-signal-blue">Manage cookies in Edge →</p>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Updates to This Policy */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-ink mb-4">Updates to This Policy</h2>
            <p className="text-slate-brand">
              We may update this Cookie Policy from time to time to reflect changes in our practices
              or for legal, operational, or regulatory reasons. We will notify you of any material
              changes by updating the "Last updated" date at the top of this policy.
            </p>
          </CardContent>
        </Card>

        {/* Contact Information */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold text-ink mb-4">Contact Us</h2>
            <p className="text-slate-brand mb-4">
              If you have questions about our use of cookies or this Cookie Policy, please contact
              us:
            </p>

            <div className="bg-cloud rounded-lg p-4 space-y-2">
              <p className="text-sm text-ink">
                <strong>Email:</strong> privacy@llmtxtmastery.com
              </p>
              <p className="text-sm text-ink">
                <strong>Website:</strong> www.llmtxtmastery.com
              </p>
              <p className="text-sm text-ink">
                <strong>Data Protection:</strong> We are committed to protecting your privacy and
                complying with applicable data protection laws including GDPR.
              </p>
            </div>
          </CardContent>
        </Card>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}

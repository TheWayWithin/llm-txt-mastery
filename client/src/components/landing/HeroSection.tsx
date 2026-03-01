import { Button } from '@/components/ui/button';
import { CheckCircle, Shield, Target, Check } from 'lucide-react';
import { OptimizedImage } from '@/components/OptimizedImage';
import TrustBadges from '@/components/landing/TrustBadges';
import { Link } from 'wouter';

interface HeroSectionProps {
  user: { email: string; tier: string } | null;
}

export default function HeroSection({ user }: HeroSectionProps) {
  return (
    <section className="bg-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-ink mb-4 max-w-[680px] mx-auto">
          AI assistants are answering questions about your industry right now. Is your site part of the conversation?
        </h1>
        <p className="text-base sm:text-lg text-slate-brand mb-6 max-w-2xl mx-auto">
          LLM.txt Mastery generates a quality-scored file that tells AI models exactly how to cite and recommend your business. See where you stand in 60 seconds.
        </p>

        {/* Moat Badges */}
        <div className="bg-cloud border border-mist rounded-lg p-4 mb-6 max-w-3xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            {[
              'AI Quality Scoring',
              'Any Website Type (SSR/CSR/SSG)',
              '15+ Frameworks Detected',
              'Validator + robots.txt Check',
              'All 4 File Locations',
              '47+ Updates in 2025',
            ].map((label) => (
              <div key={label} className="flex items-center justify-center space-x-2 bg-white rounded-md px-3 py-2 border border-mist">
                <Check className="h-4 w-4 text-clarity-teal flex-shrink-0" />
                <span className="text-ink">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hero Illustration */}
        <div className="my-8 flex justify-center">
          <OptimizedImage
            src="/images/hero-illustration-professional.png"
            alt="Website transformation into AI-ready content"
            className="max-w-full h-auto max-h-64 rounded-lg shadow-lg"
            loading="eager"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 1200px"
          />
        </div>

        {/* Hero CTA Buttons */}
        <div className="mt-6 flex flex-col sm:flex-row justify-center gap-4">
          <Button
            size="lg"
            className="bg-signal-blue hover:bg-[#1D4ED8] text-white px-8 py-3"
            onClick={() => {
              window.location.href = user ? '/analyze' : '/signup';
            }}
          >
            Generate Your File
          </Button>
          <Link href="/validator">
            <a>
              <Button
                size="lg"
                variant="outline"
                className="border-signal-blue text-signal-blue hover:bg-signal-blue/10 px-8 py-3"
              >
                Validate Your File Free
              </Button>
            </a>
          </Link>
        </div>

        <p className="text-sm text-slate-brand mt-3">
          Free to validate. Plans from $4.95/mo to generate.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-slate-brand mt-4">
          <div className="flex items-center space-x-1.5">
            <CheckCircle className="h-4 w-4 text-slate-brand" />
            <span>AI-ready in under 5 minutes</span>
          </div>
          <span className="text-mist hidden sm:inline">|</span>
          <div className="flex items-center space-x-1.5">
            <Shield className="h-4 w-4 text-slate-brand" />
            <span>30-day money-back guarantee</span>
          </div>
          <span className="text-mist hidden sm:inline">|</span>
          <div className="flex items-center space-x-1.5">
            <Target className="h-4 w-4 text-slate-brand" />
            <span>100% focused on AI discoverability</span>
          </div>
        </div>

        {/* Security Trust Badges */}
        <div className="mt-6">
          <TrustBadges variant="security" compact={true} alignment="center" />
        </div>
      </div>
    </section>
  );
}

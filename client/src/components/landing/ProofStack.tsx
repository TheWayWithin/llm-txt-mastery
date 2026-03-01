import { Shield, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

export default function ProofStack() {
  return (
    <section className="bg-cloud py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <h2 className="text-2xl sm:text-3xl font-bold text-ink text-center mb-8">
          See it in action
        </h2>

        {/* Sample Output */}
        <div className="bg-white rounded-lg border border-mist p-6">
          <h3 className="font-semibold text-ink mb-3">Sample generated output</h3>
          <pre className="bg-ink text-cloud text-sm rounded-lg p-4 overflow-x-auto font-mono leading-relaxed">
{`# FreecalcHub.com
> Online calculator platform with 147 tools

## Quality-Scored Pages (Top 5)

- [Mortgage Calculator](https://freecalchub.com/mortgage) — Score: 94/100
  Financial planning tool with 50K+ monthly users
- [BMI Calculator](https://freecalchub.com/bmi) — Score: 91/100
  Health assessment tool recommended by nutritionists
- [Compound Interest](https://freecalchub.com/compound) — Score: 89/100
  Investment planning with visual growth charts
- [Loan Amortization](https://freecalchub.com/amortization) — Score: 87/100
  Detailed payment schedule generator
- [Tip Calculator](https://freecalchub.com/tip) — Score: 85/100
  Quick split and tip calculations`}
          </pre>
          <p className="text-xs text-slate-brand mt-2">
            Real output from FreecalcHub.com analysis. Quality scores help AI models prioritize your best content.
          </p>
        </div>

        {/* Validator Preview + Benchmark in 2-col */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Validator Preview */}
          <div className="bg-white rounded-lg border border-mist p-6">
            <h3 className="font-semibold text-ink mb-3">Free validator</h3>
            <p className="text-sm text-slate-brand mb-4">
              Check your existing llms.txt file for formatting issues, broken links, and robots.txt conflicts — before AI models try to read it.
            </p>
            <div className="bg-cloud rounded-lg p-3 mb-4 text-sm">
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-brand">Format compliance</span>
                <span className="text-success font-medium">Passed</span>
              </div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-brand">robots.txt conflicts</span>
                <span className="text-error font-medium">2 found</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-brand">Broken links</span>
                <span className="text-action-amber font-medium">1 warning</span>
              </div>
            </div>
            <Link href="/validator">
              <a>
                <Button variant="outline" className="w-full border-signal-blue text-signal-blue hover:bg-signal-blue/10">
                  Validate Your File Free
                </Button>
              </a>
            </Link>
          </div>

          {/* Benchmark Card */}
          <div className="bg-white rounded-lg border border-mist p-6">
            <h3 className="font-semibold text-ink mb-3">Independent benchmark</h3>
            <p className="text-xs text-slate-brand mb-3">
              FreecalcHub.com, December 2025, internal test
            </p>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between p-2 bg-cloud rounded">
                <span className="text-ink font-medium">LLM.txt Mastery</span>
                <span className="text-success font-bold">147 pages + quality scores</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-cloud rounded">
                <span className="text-slate-brand">Keploy (Free)</span>
                <span className="text-slate-brand">133 pages, no scoring</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-cloud rounded">
                <span className="text-slate-brand">Writesonic</span>
                <span className="text-slate-brand">53 pages, 3/day limit</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-cloud rounded">
                <span className="text-slate-brand">SiteSpeakAI</span>
                <span className="text-slate-brand">21 pages only</span>
              </div>
            </div>
          </div>
        </div>

        {/* Changelog + Risk Reversal in 2-col */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Changelog */}
          <div className="bg-white rounded-lg border border-mist p-6">
            <div className="flex items-center gap-2 mb-3">
              <RefreshCw className="h-4 w-4 text-slate-brand" />
              <h3 className="font-semibold text-ink">Actively maintained</h3>
            </div>
            <p className="text-sm text-slate-brand mb-3">
              47+ updates shipped in 2025. This is a dedicated platform, not a side project.
            </p>
            <p className="text-xs text-slate-brand">
              Recent: partial timeout results, usage tracking fixes, priority sorting, CSR dedup improvements.
            </p>
          </div>

          {/* Risk Reversal */}
          <div className="bg-white rounded-lg border-2 border-success p-6">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-5 w-5 text-slate-brand" />
              <h3 className="font-semibold text-ink">30-day money-back guarantee</h3>
            </div>
            <p className="text-sm text-slate-brand">
              If you don't see improvement in your AI visibility within 30 days, we'll refund your money. No questions asked.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

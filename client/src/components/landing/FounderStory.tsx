import { Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function FounderStory() {
  return (
    <section className="bg-cloud py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Card className="bg-white border-mist">
          <CardContent className="p-8">
            <h3 className="text-xl font-semibold text-ink mb-4">
              I Built This Because I Needed It Myself
            </h3>
            <div className="mb-6 max-w-[680px]">
              <p className="text-sm text-slate-brand mb-3">
                ChatGPT, Claude, and Perplexity are already crawling websites — but most
                businesses are invisible to them. I built this tool because my own content
                wasn't getting found by AI search engines. Having the need, skills, and
                experience to fix this problem, I created the solution.
              </p>
              <p className="text-sm text-slate-brand mb-4">
                Now I'm sharing it with other creators, solopreneurs, founders, and small
                businesses so they can leverage AI to connect directly with the people who need
                their services. Built by someone who actually uses these tools daily.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-ink mb-2">What you get</h4>
                <ul className="text-sm text-slate-brand space-y-2">
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-success mr-2 mt-0.5 flex-shrink-0" />
                    Get indexed by AI search engines like ChatGPT, Claude, and Perplexity
                  </li>
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-success mr-2 mt-0.5 flex-shrink-0" />
                    Your content becomes AI-friendly and properly attributed
                  </li>
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-success mr-2 mt-0.5 flex-shrink-0" />
                    Early adopter advantage — be discoverable before competitors
                  </li>
                  <li className="flex items-start">
                    <Check className="h-4 w-4 text-success mr-2 mt-0.5 flex-shrink-0" />
                    Built following the official{' '}
                    <a
                      href="https://llmstxt.org/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-signal-blue hover:underline"
                    >
                      llms.txt spec
                    </a>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-ink mb-2">
                  How to deploy (3 steps)
                </h4>
                <ol className="text-sm text-slate-brand space-y-1">
                  <li>1. Download your llms.txt file</li>
                  <li>2. Upload it to your site's root</li>
                  <li>3. That's it — you're now AI-discoverable</li>
                </ol>
                <p className="text-xs text-slate-brand mt-3">
                  Make sure it's live at yourdomain.com/llms.txt and AI systems will find it
                  automatically.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-mist">
              <p className="text-xs text-slate-brand">
                <strong>Tip:</strong> Update your llms.txt when you publish new content. Monthly works for most sites. Learn more at the{' '}
                <a
                  href="https://llmstxt.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-signal-blue hover:underline"
                >
                  official llms.txt specification
                </a>
                .
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}

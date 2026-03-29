import { FileText, BookOpen, Zap } from 'lucide-react';

export default function FormatShowcase() {
  const formats = [
    {
      icon: FileText,
      name: 'llms.txt',
      label: 'Standard',
      description: 'Structured index of your pages with AI-optimised descriptions. The official format per the llmstxt.org spec.',
      tokens: '1-4K tokens',
    },
    {
      icon: BookOpen,
      name: 'llms-full.txt',
      label: 'Full',
      description: 'Complete page content inline — gives AI models deep context without follow-up requests. Used by Anthropic, Cloudflare, Vercel.',
      tokens: '10-100K+ tokens',
    },
    {
      icon: Zap,
      name: 'llms-mini.txt',
      label: 'Mini',
      exclusive: true,
      description: 'Ultra-compact summary — top 5 pages in under 500 tokens. Built for AI agents that need fast site classification.',
      tokens: '<500 tokens',
    },
  ];

  return (
    <section className="bg-cloud py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-ink mb-3">
            Three formats, one analysis
          </h2>
          <p className="text-base text-slate-brand max-w-2xl mx-auto">
            Every format AI models need — from quick classification to full content ingestion.
            We're the only generator that produces all three.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {formats.map((format) => {
            const Icon = format.icon;
            return (
              <div
                key={format.name}
                className={`bg-white rounded-xl p-6 border ${format.exclusive ? 'border-signal-blue shadow-md' : 'border-mist'} relative`}
              >
                {format.exclusive && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-signal-blue text-white text-xs font-bold px-3 py-1 rounded-full">
                    Only here
                  </span>
                )}
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${format.exclusive ? 'bg-signal-blue/10' : 'bg-cloud'}`}>
                    <Icon className={`h-5 w-5 ${format.exclusive ? 'text-signal-blue' : 'text-slate-brand'}`} />
                  </div>
                  <div>
                    <p className="font-semibold text-ink text-sm">{format.name}</p>
                    <p className="text-xs text-slate-brand">{format.label}</p>
                  </div>
                </div>
                <p className="text-sm text-slate-brand mb-3">{format.description}</p>
                <span className="inline-block text-xs font-medium text-ink bg-cloud px-2 py-1 rounded">
                  {format.tokens}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

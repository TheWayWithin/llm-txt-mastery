import { Code2, ShieldAlert, BarChart3 } from 'lucide-react';

export default function ProblemAmplification() {
  const cards = [
    {
      icon: Code2,
      title: 'JavaScript rendering gap',
      scenario: 'Your React, Next.js, or Vue site loads content dynamically.',
      consequence: 'Free generators see empty pages. AI models skip your content entirely.',
    },
    {
      icon: ShieldAlert,
      title: 'robots.txt blocking',
      scenario: 'Your robots.txt silently blocks AI crawlers from accessing your pages.',
      consequence: 'No error, no warning. Your llms.txt exists, but AI can\'t read it.',
    },
    {
      icon: BarChart3,
      title: 'No quality scoring',
      scenario: 'Free tools list every page equally — your privacy policy next to your flagship product.',
      consequence: 'AI models have no guidance on what matters. Your best content gets buried.',
    },
  ];

  return (
    <section className="bg-cloud py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-ink mb-8 text-center">
          Three ways AI is skipping over your business
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div key={card.title} className="bg-white rounded-lg border border-mist p-6">
                <div className="w-10 h-10 bg-cloud rounded-lg flex items-center justify-center mb-4">
                  <Icon className="h-5 w-5 text-slate-brand" />
                </div>
                <h3 className="font-semibold text-ink mb-2">{card.title}</h3>
                <p className="text-sm text-slate-brand mb-3">{card.scenario}</p>
                <p className="text-sm text-ink font-medium">{card.consequence}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

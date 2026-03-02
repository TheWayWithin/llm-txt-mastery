import { User, Users, Code2 } from 'lucide-react';

export default function AudienceCards() {
  const audiences = [
    {
      icon: User,
      title: 'Solopreneurs',
      outcome: 'Get your site cited by ChatGPT and Claude without hiring an SEO consultant.',
      detail: 'One file, deployed in minutes. AI models start referencing your content to potential customers.',
    },
    {
      icon: Users,
      title: 'Agencies',
      outcome: 'Add AI visibility as a deliverable for every client engagement.',
      detail: 'Bulk processing and multi-site management. Generate files across your entire client portfolio.',
    },
    {
      icon: Code2,
      title: 'Developers',
      outcome: 'Ship AI-ready sites with proper llms.txt files — including JS-rendered content.',
      detail: 'Framework detection for React, Next.js, Vue, Angular, and 11 more. Quality scoring via API.',
    },
  ];

  return (
    <section className="bg-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-ink mb-8 text-center">
          Is this for you?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {audiences.map((audience) => {
            const Icon = audience.icon;
            return (
              <div key={audience.title} className="bg-cloud rounded-lg border border-mist p-6">
                <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mb-4 border border-mist">
                  <Icon className="h-5 w-5 text-signal-blue" />
                </div>
                <h3 className="font-semibold text-ink mb-2">{audience.title}</h3>
                <p className="text-sm font-medium text-ink mb-2">{audience.outcome}</p>
                <p className="text-sm text-slate-brand">{audience.detail}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

import { Search, FileText, Upload } from 'lucide-react';

export default function SolutionIntro() {
  const steps = [
    {
      icon: Search,
      number: '1',
      title: 'Scan',
      description: 'Enter your URL. We discover every page — including JavaScript-rendered content that free tools miss.',
    },
    {
      icon: FileText,
      number: '2',
      title: 'Generate',
      description: 'AI evaluates each page for citation potential and generates quality-scored llms.txt, llms-full.txt, and llms-mini.txt files with A/B/C/D compliance grading.',
    },
    {
      icon: Upload,
      number: '3',
      title: 'Deploy',
      description: 'Download your files, add the HTML discovery tag and robots.txt directive. Verify deployment with our automated checker.',
    },
  ];

  return (
    <section id="how-it-works" className="bg-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-ink mb-3">
            How LLM.txt Mastery fixes this
          </h2>
          <p className="text-base text-slate-brand max-w-2xl mx-auto">
            Three steps from invisible to discoverable. No technical expertise required.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="text-center">
                <div className="relative mx-auto mb-4">
                  <div className="w-14 h-14 bg-signal-blue rounded-full flex items-center justify-center mx-auto">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <span className="absolute -top-1 -right-1 w-6 h-6 bg-ink text-white rounded-full text-xs font-bold flex items-center justify-center">
                    {step.number}
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-ink mb-2">{step.title}</h3>
                <p className="text-sm text-slate-brand">{step.description}</p>
                {idx < steps.length - 1 && (
                  <div className="hidden md:block absolute top-7 left-full w-8 border-t-2 border-dashed border-mist" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

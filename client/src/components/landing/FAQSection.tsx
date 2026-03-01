import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

const faqs = [
  {
    id: 'what-is-llms-txt',
    question: 'What is an llms.txt file?',
    answer: 'An llms.txt file is a standardized text file placed at your website root (yourdomain.com/llms.txt) that tells AI models like ChatGPT, Claude, and Perplexity what your site is about and which pages to reference. Think of it as a "resume" for your website that AI assistants read before recommending you.',
  },
  {
    id: 'free-vs-paid',
    question: 'Why not use a free generator?',
    answer: 'Free generators find pages — and that\'s fine for basic sites. The difference is quality scoring. LLM.txt Mastery uses AI to evaluate which pages are most likely to get cited, detects JavaScript frameworks (React, Next.js, Vue), and checks for robots.txt conflicts that silently block AI access. Free tools list every page equally, including your privacy policy.',
  },
  {
    id: 'how-long',
    question: 'How long does it take?',
    answer: 'Most sites complete analysis in under 60 seconds. Large sites (500+ pages) may take 2-3 minutes. You get your file immediately after analysis — download it and upload to your site root. The whole process is typically under 5 minutes.',
  },
  {
    id: 'do-i-need-technical',
    question: 'Do I need technical skills?',
    answer: 'No. Enter your URL, review the results, download your file, and upload it to your website root directory. If you can upload a file via FTP or your hosting dashboard, you can deploy llms.txt. We include step-by-step instructions for common platforms.',
  },
  {
    id: 'how-often-update',
    question: 'How often should I update my llms.txt?',
    answer: 'We recommend regenerating your file whenever you publish significant new content — typically monthly. The paid tiers include ongoing analyses so you can keep your file current as your site evolves.',
  },
  {
    id: 'which-ai-models',
    question: 'Which AI models read llms.txt?',
    answer: 'The llms.txt specification is supported by ChatGPT (OpenAI), Claude (Anthropic), Perplexity, and other AI assistants. As AI search grows, having a structured file that tells these models about your content gives you a significant advantage over sites without one.',
  },
];

export default function FAQSection() {
  return (
    <section id="faq" className="bg-white py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-ink mb-8 text-center">
          Frequently asked questions
        </h2>
        <Accordion type="single" collapsible className="space-y-2">
          {faqs.map((faq) => (
            <AccordionItem key={faq.id} value={faq.id} className="border border-mist rounded-lg px-4">
              <AccordionTrigger className="text-left text-ink font-medium hover:no-underline">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-slate-brand leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

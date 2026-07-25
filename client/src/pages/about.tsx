import ContentUpdated from '@/components/content-updated';
import React from 'react';
import { Link } from 'wouter';
import { Card, CardContent } from '../components/ui/card';
import { ArrowRight, Sparkles, Code, Rocket } from 'lucide-react';
import { useSEO } from '@/hooks/useSEO';

export const AboutPage: React.FC = () => {
  useSEO({
    title: 'About - From Corporate Programmer to AI Tool Builder',
    description:
      'Learn the story behind LLM.txt Mastery - how corporate bureaucracy led to building tools for solopreneurs in the AI era.',
  });

  return (
    <div className="min-h-screen bg-cloud">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">From Corporate Programmer to AI Tool Builder</h1>
          <p className="text-xl text-slate-brand">The escape story that led to LLM.txt Mastery</p>
        </div>

        {/* Story Section */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center">
              <Code className="mr-3 text-signal-blue" />
              My Story
            </h2>

            <div className="space-y-4 text-ink">
              <p>
                I started as a programmer writing operating systems in assembler, thinking I had
                technology figured out. When the pace of change accelerated beyond what I could keep
                up with, I moved into management, figuring people never really change even if
                technology does.
              </p>

              <p>
                What I didn't anticipate was how corporate bureaucracy would slowly drain the life
                out of innovation. Years passed in a haze of meetings about meetings, risk-averse
                decision-making, and watching brilliant ideas die in committee. My workplace had
                become a pathetic parody of Office Space.
              </p>

              <p className="font-semibold">Then GPT-3 arrived, and everything changed.</p>
            </div>
          </CardContent>
        </Card>

        {/* The Awakening Section */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center">
              <Sparkles className="mr-3 text-signal-blue" />
              The Awakening
            </h2>

            <div className="space-y-4 text-ink">
              <p>
                At first, it was just curiosity—a programmer's instinct to understand the next big
                thing. But as I dove deeper into AI, something remarkable happened. The spark that
                had been dimmed by years of corporate mediocrity began to glow again.
              </p>

              <p>
                Python felt fresh in my hands. Node.js opened new possibilities. For the first time
                in years, I was building instead of just managing. What started as fear of becoming
                irrelevant transformed into the rediscovery of my true calling.
              </p>

              <p>
                As my AI skills grew and my toolkit expanded, my corporate job became increasingly
                frustrating. Here I was, developing superpowers that could revolutionize how work
                gets done, but corporate risk aversion meant I couldn't use any of it.
              </p>

              <p className="italic">
                It was like being a race car driver forced to commute in a golf cart.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* The Liberation Section */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center">
              <Rocket className="mr-3 text-clarity-teal" />
              The Liberation
            </h2>

            <div className="space-y-4 text-ink">
              <p>
                So I made a choice that changed everything: I became a solopreneur. No staff. No
                boss. No stupid rules and constraints. Just vision, execution, and focus on the
                users who actually matter.
              </p>

              <p>
                The transformation was immediate and intoxicating. Decisions that would take months
                in corporate could be made in minutes. Features that would require committee
                approval could be shipped in days.
              </p>

              <p>
                Today, I'm not running a corporation or even a traditional business. I'm just a guy
                having fun, creating products, and delivering exceptional value to people who need
                it.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Why LLM.txt Mastery Section */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold mb-6">Why I Built LLM.txt Mastery</h2>

            <div className="space-y-4 text-ink">
              <p>
                While everyone else debates the future of AI search, I'm building tools to help
                websites survive it. I've been tracking AI search behavior since GPT-3 launched,
                watching real websites lose real traffic, and building practical solutions rather
                than just writing about the problem.
              </p>

              <p>
                LLM.txt Mastery exists because I saw websites being consumed by AI systems without
                getting credit or traffic for their content. The llms.txt standard was created to
                help, but most implementations are generic, theoretical, or built by people who've
                never actually lost traffic to AI search.
              </p>

              <p>
                This tool incorporates everything I've learned about what actually works versus what
                sounds good in theory. It's not just generating llms.txt files—it's creating
                strategic documents that help AI systems understand your content's value and
                context.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Call to Action */}
        <Card className="bg-mastery-blue text-white">
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Ready to Make Your Site Visible to AI?</h2>
            <p className="mb-6">
              Join me in building a future where creators get credit for their expertise.
            </p>
            <Link
              to="/"
              className="inline-flex items-center bg-white text-signal-blue px-6 py-3 rounded-lg font-semibold hover:bg-cloud transition-colors"
            >
              Generate Your File
              <ArrowRight className="ml-2" />
            </Link>
          </CardContent>
        </Card>

        {/* Footer Note */}
        <div className="text-center mt-12 text-slate-brand">
          <p>
            If you're tired of corporate solutions that don't actually solve anything, these tools
            are for you.
          </p>
          <p className="mt-2">No corporate BS, just solutions that work.</p>
        </div>
        <ContentUpdated />
      </div>
    </div>
  );
};

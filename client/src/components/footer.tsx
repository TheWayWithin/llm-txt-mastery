import { Link } from 'wouter';
import { ExternalLink } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-framework-black text-white py-12 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About Section */}
          <div>
            <h5 className="font-semibold mb-4">LLM.txt Mastery</h5>
            <p className="text-sm text-slate-300">
              Simple, effective AI visibility tools. Built for builders by someone who refuses to
              let corporate slowness hold back innovation.
            </p>
          </div>

          {/* Resources Section */}
          <div>
            <h5 className="font-semibold mb-4">Resources</h5>
            <ul className="text-sm text-slate-300 space-y-2">
              <li>
                <Link href="/docs">
                  <a className="hover:text-innovation-teal transition-colors">Documentation</a>
                </Link>
              </li>
              <li>
                <Link href="/docs#best-practices">
                  <a className="hover:text-innovation-teal transition-colors">Best Practices</a>
                </Link>
              </li>
              <li>
                <Link href="/pricing">
                  <a className="hover:text-innovation-teal transition-colors">Pricing</a>
                </Link>
              </li>
              <li>
                <Link href="/contact">
                  <a className="hover:text-innovation-teal transition-colors">Support</a>
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Section */}
          <div>
            <h5 className="font-semibold mb-4">Legal & Connect</h5>
            <ul className="text-sm text-slate-300 space-y-2">
              <li>
                <Link href="/privacy">
                  <a className="hover:text-innovation-teal transition-colors">Privacy Policy</a>
                </Link>
              </li>
              <li>
                <Link href="/terms">
                  <a className="hover:text-innovation-teal transition-colors">Terms of Service</a>
                </Link>
              </li>
              <li>
                <Link href="/cookies">
                  <a className="hover:text-innovation-teal transition-colors">Cookie Policy</a>
                </Link>
              </li>
              <li>
                <Link href="/contact">
                  <a className="hover:text-innovation-teal transition-colors">Contact</a>
                </Link>
              </li>
            </ul>
          </div>

          {/* Other Projects Section */}
          <div>
            <h5 className="font-semibold mb-4">Other Projects</h5>
            <ul className="text-sm text-slate-300 space-y-2">
              <li>
                <a
                  href="https://www.aisearchmastery.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-innovation-teal transition-colors inline-flex items-center"
                >
                  AI Search Mastery
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.aimpactscanner.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-innovation-teal transition-colors inline-flex items-center"
                >
                  AI Impact Scanner
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </li>
              <li>
                <a
                  href="https://www.aisearchmastery.com/mastery-ai-framework"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-innovation-teal transition-colors inline-flex items-center"
                >
                  MASTERY-AI Framework
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright Section */}
        <div className="border-t border-slate-700 mt-8 pt-8 text-center text-sm text-slate-400">
          <p>&copy; 2026 Jamie Watters. No corporate BS. Just tools that work.</p>
          <p className="mt-2">
            Built with integrity by a solopreneur who ships fast and listens to users.
          </p>
          <p className="mt-4 flex flex-wrap justify-center items-center gap-x-3 gap-y-2">
            <a
              href="https://jamiewatters.work"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-innovation-teal transition-colors inline-flex items-center"
            >
              Built by Jamie Watters
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <a
              href="https://agent-11.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-innovation-teal transition-colors inline-flex items-center"
            >
              Powered by AGENT-11
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
            <span className="text-slate-600 hidden sm:inline">|</span>
            <a
              href="https://evolve-7.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-innovation-teal transition-colors inline-flex items-center"
            >
              More from Evolve-7
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

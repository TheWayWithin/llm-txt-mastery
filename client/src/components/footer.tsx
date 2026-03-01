import { Link } from 'wouter';
import { ExternalLink } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-mastery-blue text-white py-12 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* About Section */}
          <div>
            <h5 className="font-semibold mb-4">LLM.txt Mastery</h5>
            <p className="text-sm text-white/70">
              Simple, effective AI visibility tools. Generate quality-scored llms.txt files
              that help AI models cite and recommend your business.
            </p>
            <p className="text-sm text-white/70 mt-3">
              <a
                href="https://www.aisearchmastery.com"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-white transition-colors inline-flex items-center"
              >
                Part of AI Search Mastery
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </p>
          </div>

          {/* Resources Section */}
          <div>
            <h5 className="font-semibold mb-4">Resources</h5>
            <ul className="text-sm text-white/70 space-y-2">
              <li>
                <Link href="/docs">
                  <a className="hover:text-white transition-colors">Documentation</a>
                </Link>
              </li>
              <li>
                <Link href="/docs#best-practices">
                  <a className="hover:text-white transition-colors">Best Practices</a>
                </Link>
              </li>
              <li>
                <Link href="/pricing">
                  <a className="hover:text-white transition-colors">Pricing</a>
                </Link>
              </li>
              <li>
                <Link href="/contact">
                  <a className="hover:text-white transition-colors">Support</a>
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Section */}
          <div>
            <h5 className="font-semibold mb-4">Legal & Connect</h5>
            <ul className="text-sm text-white/70 space-y-2">
              <li>
                <Link href="/privacy">
                  <a className="hover:text-white transition-colors">Privacy Policy</a>
                </Link>
              </li>
              <li>
                <Link href="/terms">
                  <a className="hover:text-white transition-colors">Terms of Service</a>
                </Link>
              </li>
              <li>
                <Link href="/cookies">
                  <a className="hover:text-white transition-colors">Cookie Policy</a>
                </Link>
              </li>
              <li>
                <Link href="/contact">
                  <a className="hover:text-white transition-colors">Contact</a>
                </Link>
              </li>
            </ul>
          </div>

          {/* Other Projects Section */}
          <div>
            <h5 className="font-semibold mb-4">Other Projects</h5>
            <ul className="text-sm text-white/70 space-y-2">
              <li>
                <a
                  href="https://www.aisearchmastery.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors inline-flex items-center"
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
                  className="hover:text-white transition-colors inline-flex items-center"
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
                  className="hover:text-white transition-colors inline-flex items-center"
                >
                  MASTERY-AI Framework
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright Section */}
        <div className="border-t border-white/20 mt-8 pt-8 text-center text-sm text-white/70">
          <p>&copy; 2026 AI Search Mastery</p>
          <p className="mt-4">
            <a
              href="https://jamiewatters.work"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors inline-flex items-center"
            >
              Built by Jamie Watters
              <ExternalLink className="h-3 w-3 ml-1" />
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}

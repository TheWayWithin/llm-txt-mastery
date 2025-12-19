/**
 * DeploymentGuide.tsx - Sprint 7: Platform-Specific Deployment Instructions
 *
 * Provides contextual deployment guidance based on detected website framework/platform.
 * Supports WordPress, Shopify, Netlify, Vercel, Next.js, and traditional hosting.
 */

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  CheckCircle,
  Copy,
  ExternalLink,
  Server,
  Globe,
  FileText,
  AlertCircle,
  ChevronRight,
  Rocket,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// Types
// ============================================================================

export type DetectedPlatform =
  | 'wordpress'
  | 'shopify'
  | 'netlify'
  | 'vercel'
  | 'next'
  | 'react'
  | 'vue'
  | 'nuxt'
  | 'angular'
  | 'gatsby'
  | 'astro'
  | 'svelte'
  | 'squarespace'
  | 'wix'
  | 'webflow'
  | 'static'
  | 'unknown';

interface DeploymentStep {
  title: string;
  description: string;
  code?: string;
  codeLanguage?: string;
  warning?: string;
  tip?: string;
}

interface DeploymentMethod {
  id: string;
  name: string;
  description: string;
  recommended?: boolean;
  steps: DeploymentStep[];
  verificationUrl?: string;
}

interface PlatformInstructions {
  platform: DetectedPlatform;
  displayName: string;
  icon: string;
  description: string;
  methods: DeploymentMethod[];
  additionalNotes?: string[];
}

interface DeploymentGuideProps {
  detectedPlatform?: DetectedPlatform;
  websiteUrl: string;
  fileLocations?: ('llms.txt' | 'llms-full.txt' | '.well-known' | 'llms.md')[];
}

// ============================================================================
// Platform Instructions Data
// ============================================================================

const PLATFORM_INSTRUCTIONS: Record<DetectedPlatform, PlatformInstructions> = {
  wordpress: {
    platform: 'wordpress',
    displayName: 'WordPress',
    icon: '📝',
    description: 'Upload via FTP, File Manager, or use a plugin',
    methods: [
      {
        id: 'ftp',
        name: 'FTP/SFTP Upload',
        description: 'Upload directly to your WordPress root directory',
        recommended: true,
        steps: [
          {
            title: 'Connect to your server',
            description: 'Use an FTP client like FileZilla to connect to your hosting',
            tip: 'Your hosting provider should have FTP credentials in your account dashboard',
          },
          {
            title: 'Navigate to WordPress root',
            description: 'Go to your WordPress installation directory (usually /public_html/ or /www/)',
          },
          {
            title: 'Upload llms.txt',
            description: 'Upload the downloaded llms.txt file to the root directory (same level as wp-config.php)',
          },
          {
            title: 'Verify the upload',
            description: 'Visit yourdomain.com/llms.txt in your browser to confirm it\'s accessible',
          },
        ],
      },
      {
        id: 'cpanel',
        name: 'cPanel File Manager',
        description: 'Use your hosting control panel to upload',
        steps: [
          {
            title: 'Log into cPanel',
            description: 'Access your hosting control panel (usually at yourdomain.com/cpanel)',
          },
          {
            title: 'Open File Manager',
            description: 'Click on "File Manager" in the Files section',
          },
          {
            title: 'Navigate to public_html',
            description: 'Click on the public_html folder (or your WordPress directory)',
          },
          {
            title: 'Upload the file',
            description: 'Click "Upload" in the top menu, then select your llms.txt file',
          },
        ],
      },
      {
        id: 'plugin',
        name: 'WordPress Plugin Method',
        description: 'Add via a file management plugin',
        steps: [
          {
            title: 'Install WP File Manager plugin',
            description: 'Go to Plugins > Add New, search for "File Manager", install and activate',
          },
          {
            title: 'Open File Manager',
            description: 'Go to WP File Manager in your WordPress admin sidebar',
          },
          {
            title: 'Upload to root',
            description: 'Navigate to your WordPress root and upload the llms.txt file',
          },
        ],
      },
    ],
    additionalNotes: [
      'Make sure the file has proper permissions (644 is typical)',
      'Some caching plugins may need cache cleared after upload',
      'If using Cloudflare, you may need to purge cache',
    ],
  },

  shopify: {
    platform: 'shopify',
    displayName: 'Shopify',
    icon: '🛍️',
    description: 'Upload via Files and configure URL redirect',
    methods: [
      {
        id: 'files-redirect',
        name: 'Files + URL Redirect',
        description: 'Upload to Shopify Files and create a redirect',
        recommended: true,
        steps: [
          {
            title: 'Upload to Shopify Files',
            description: 'Go to Settings > Files in your Shopify admin, click "Upload files" and select your llms.txt file',
          },
          {
            title: 'Copy the file URL',
            description: 'After upload, click on the file to get its CDN URL (it will look like cdn.shopify.com/...)',
          },
          {
            title: 'Create URL redirect',
            description: 'Go to Online Store > Navigation > URL Redirects',
          },
          {
            title: 'Add redirect rule',
            description: 'Create a redirect from /llms.txt to your CDN file URL',
            code: '/llms.txt → https://cdn.shopify.com/s/files/1/xxxx/xxxx/files/llms.txt',
          },
        ],
      },
      {
        id: 'theme-assets',
        name: 'Theme Assets Folder',
        description: 'Add to your theme\'s assets directory',
        steps: [
          {
            title: 'Access Theme Code',
            description: 'Go to Online Store > Themes > Actions > Edit code',
          },
          {
            title: 'Navigate to Assets',
            description: 'Find the Assets folder in the theme file tree',
          },
          {
            title: 'Add new asset',
            description: 'Click "Add new asset" and upload llms.txt',
            warning: 'File will be accessible at /cdn/shop/t/x/assets/llms.txt - you\'ll need a redirect',
          },
        ],
      },
    ],
    additionalNotes: [
      'Shopify doesn\'t allow files at the root by default',
      'URL redirects are the recommended approach',
      'Consider using .well-known location as an alternative',
    ],
  },

  netlify: {
    platform: 'netlify',
    displayName: 'Netlify',
    icon: '🔷',
    description: 'Add to your public folder or use _redirects',
    methods: [
      {
        id: 'public-folder',
        name: 'Public Folder',
        description: 'Add llms.txt to your project\'s public folder',
        recommended: true,
        steps: [
          {
            title: 'Add to public folder',
            description: 'Place llms.txt in your project\'s public/ or static/ folder',
            code: 'cp llms.txt public/llms.txt',
            codeLanguage: 'bash',
          },
          {
            title: 'Commit and push',
            description: 'Commit the file and push to trigger a new deployment',
            code: 'git add public/llms.txt && git commit -m "Add llms.txt for AI discoverability" && git push',
            codeLanguage: 'bash',
          },
          {
            title: 'Verify deployment',
            description: 'After deployment, visit yourdomain.com/llms.txt',
          },
        ],
      },
      {
        id: 'netlify-toml',
        name: 'netlify.toml Configuration',
        description: 'Configure via netlify.toml for more control',
        steps: [
          {
            title: 'Add to public folder',
            description: 'First, add llms.txt to your public folder as above',
          },
          {
            title: 'Optional: Add headers',
            description: 'Add custom headers in netlify.toml if needed',
            code: `[[headers]]
  for = "/llms.txt"
  [headers.values]
    Content-Type = "text/plain; charset=utf-8"
    Cache-Control = "public, max-age=86400"`,
            codeLanguage: 'toml',
          },
        ],
      },
    ],
    additionalNotes: [
      'Files in /public are served at the root automatically',
      'Build output is typically in dist/, build/, or .next/',
    ],
  },

  vercel: {
    platform: 'vercel',
    displayName: 'Vercel',
    icon: '▲',
    description: 'Add to your public folder',
    methods: [
      {
        id: 'public-folder',
        name: 'Public Folder',
        description: 'Add llms.txt to your project\'s public folder',
        recommended: true,
        steps: [
          {
            title: 'Add to public folder',
            description: 'Place llms.txt in your project\'s public/ folder',
            code: 'cp llms.txt public/llms.txt',
            codeLanguage: 'bash',
          },
          {
            title: 'Commit and deploy',
            description: 'Commit the change and push to trigger deployment',
            code: 'git add public/llms.txt && git commit -m "Add llms.txt" && git push',
            codeLanguage: 'bash',
          },
        ],
      },
      {
        id: 'vercel-json',
        name: 'vercel.json Headers',
        description: 'Add custom headers via configuration',
        steps: [
          {
            title: 'Add file to public',
            description: 'First add llms.txt to your public folder',
          },
          {
            title: 'Configure headers (optional)',
            description: 'Add headers in vercel.json if needed',
            code: `{
  "headers": [
    {
      "source": "/llms.txt",
      "headers": [
        { "key": "Content-Type", "value": "text/plain; charset=utf-8" },
        { "key": "Cache-Control", "value": "public, max-age=86400" }
      ]
    }
  ]
}`,
            codeLanguage: 'json',
          },
        ],
      },
    ],
  },

  next: {
    platform: 'next',
    displayName: 'Next.js',
    icon: '⚡',
    description: 'Add to your public folder',
    methods: [
      {
        id: 'public-folder',
        name: 'Public Folder',
        description: 'Next.js serves files from /public at the root',
        recommended: true,
        steps: [
          {
            title: 'Add to public folder',
            description: 'Place llms.txt in your Next.js project\'s public/ folder',
            code: 'cp llms.txt public/llms.txt',
            codeLanguage: 'bash',
          },
          {
            title: 'Commit and deploy',
            description: 'The file will be available at /llms.txt after your next deployment',
            code: 'git add public/llms.txt && git commit -m "Add llms.txt for AI discoverability" && git push',
            codeLanguage: 'bash',
          },
        ],
      },
      {
        id: 'well-known',
        name: '.well-known Location',
        description: 'Alternative: Use the .well-known directory',
        steps: [
          {
            title: 'Create .well-known folder',
            description: 'Create the directory in your public folder',
            code: 'mkdir -p public/.well-known',
            codeLanguage: 'bash',
          },
          {
            title: 'Add llms.txt',
            description: 'Place the file in .well-known',
            code: 'cp llms.txt public/.well-known/llms.txt',
            codeLanguage: 'bash',
          },
        ],
      },
    ],
    additionalNotes: [
      'Files in /public are served statically at the root',
      'No import or require needed - just deploy',
      'Works with both Pages Router and App Router',
    ],
  },

  react: {
    platform: 'react',
    displayName: 'React (Create React App / Vite)',
    icon: '⚛️',
    description: 'Add to your public folder',
    methods: [
      {
        id: 'public-folder',
        name: 'Public Folder',
        description: 'Add to the public folder of your React project',
        recommended: true,
        steps: [
          {
            title: 'Add to public folder',
            description: 'Place llms.txt in your project\'s public/ folder',
            code: 'cp llms.txt public/llms.txt',
            codeLanguage: 'bash',
          },
          {
            title: 'Build and deploy',
            description: 'The file will be included in your build output',
            code: 'npm run build',
            codeLanguage: 'bash',
            tip: 'The file will be copied to your build/ or dist/ folder automatically',
          },
        ],
      },
    ],
  },

  vue: {
    platform: 'vue',
    displayName: 'Vue.js',
    icon: '💚',
    description: 'Add to your public folder',
    methods: [
      {
        id: 'public-folder',
        name: 'Public Folder',
        description: 'Vue CLI and Vite serve files from /public',
        recommended: true,
        steps: [
          {
            title: 'Add to public folder',
            description: 'Place llms.txt in your project\'s public/ folder',
            code: 'cp llms.txt public/llms.txt',
            codeLanguage: 'bash',
          },
          {
            title: 'Build and deploy',
            description: 'Run your build command and deploy',
            code: 'npm run build',
            codeLanguage: 'bash',
          },
        ],
      },
    ],
  },

  nuxt: {
    platform: 'nuxt',
    displayName: 'Nuxt.js',
    icon: '💚',
    description: 'Add to your static or public folder',
    methods: [
      {
        id: 'static-folder',
        name: 'Static/Public Folder',
        description: 'Nuxt serves files from /static (Nuxt 2) or /public (Nuxt 3)',
        recommended: true,
        steps: [
          {
            title: 'Identify your Nuxt version',
            description: 'Nuxt 2 uses /static, Nuxt 3 uses /public',
          },
          {
            title: 'Add llms.txt',
            description: 'Place the file in the appropriate folder',
            code: '# Nuxt 3\ncp llms.txt public/llms.txt\n\n# Nuxt 2\ncp llms.txt static/llms.txt',
            codeLanguage: 'bash',
          },
          {
            title: 'Deploy',
            description: 'Build and deploy your Nuxt application',
          },
        ],
      },
    ],
  },

  angular: {
    platform: 'angular',
    displayName: 'Angular',
    icon: '🅰️',
    description: 'Add to your src/assets folder',
    methods: [
      {
        id: 'assets-folder',
        name: 'Assets Folder',
        description: 'Add to assets and configure angular.json',
        recommended: true,
        steps: [
          {
            title: 'Add to src folder',
            description: 'Place llms.txt in your src/ folder (root level)',
            code: 'cp llms.txt src/llms.txt',
            codeLanguage: 'bash',
          },
          {
            title: 'Update angular.json',
            description: 'Add llms.txt to the assets array in angular.json',
            code: `"assets": [
  "src/favicon.ico",
  "src/assets",
  "src/llms.txt"
]`,
            codeLanguage: 'json',
          },
          {
            title: 'Build and deploy',
            description: 'Run ng build to include the file in your dist folder',
            code: 'ng build --configuration production',
            codeLanguage: 'bash',
          },
        ],
      },
    ],
  },

  gatsby: {
    platform: 'gatsby',
    displayName: 'Gatsby',
    icon: '💜',
    description: 'Add to your static folder',
    methods: [
      {
        id: 'static-folder',
        name: 'Static Folder',
        description: 'Gatsby serves files from /static at the root',
        recommended: true,
        steps: [
          {
            title: 'Add to static folder',
            description: 'Place llms.txt in your project\'s static/ folder',
            code: 'cp llms.txt static/llms.txt',
            codeLanguage: 'bash',
          },
          {
            title: 'Deploy',
            description: 'Build and deploy - the file will be at the root',
            code: 'gatsby build',
            codeLanguage: 'bash',
          },
        ],
      },
    ],
  },

  astro: {
    platform: 'astro',
    displayName: 'Astro',
    icon: '🚀',
    description: 'Add to your public folder',
    methods: [
      {
        id: 'public-folder',
        name: 'Public Folder',
        description: 'Astro serves files from /public at the root',
        recommended: true,
        steps: [
          {
            title: 'Add to public folder',
            description: 'Place llms.txt in your project\'s public/ folder',
            code: 'cp llms.txt public/llms.txt',
            codeLanguage: 'bash',
          },
          {
            title: 'Deploy',
            description: 'Build and deploy your Astro site',
            code: 'npm run build',
            codeLanguage: 'bash',
          },
        ],
      },
    ],
  },

  svelte: {
    platform: 'svelte',
    displayName: 'SvelteKit / Svelte',
    icon: '🔶',
    description: 'Add to your static folder',
    methods: [
      {
        id: 'static-folder',
        name: 'Static Folder',
        description: 'SvelteKit serves files from /static',
        recommended: true,
        steps: [
          {
            title: 'Add to static folder',
            description: 'Place llms.txt in your project\'s static/ folder',
            code: 'cp llms.txt static/llms.txt',
            codeLanguage: 'bash',
          },
          {
            title: 'Deploy',
            description: 'Build and deploy your SvelteKit app',
            code: 'npm run build',
            codeLanguage: 'bash',
          },
        ],
      },
    ],
  },

  squarespace: {
    platform: 'squarespace',
    displayName: 'Squarespace',
    icon: '⬛',
    description: 'Use Code Injection or external hosting',
    methods: [
      {
        id: 'external-hosting',
        name: 'External File Hosting',
        description: 'Host on GitHub Pages or similar and redirect',
        recommended: true,
        steps: [
          {
            title: 'Host the file externally',
            description: 'Upload llms.txt to GitHub Pages, Netlify, or any static host',
            tip: 'GitHub: Create a repo, add llms.txt, enable GitHub Pages',
          },
          {
            title: 'Note the URL',
            description: 'Get the direct URL to your hosted llms.txt file',
          },
          {
            title: 'Consider URL forwarding',
            description: 'Use a service like Cloudflare to redirect /llms.txt to your hosted file',
            warning: 'Squarespace doesn\'t support custom files at root - external hosting required',
          },
        ],
      },
      {
        id: 'well-known',
        name: '.well-known Alternative',
        description: 'Use .well-known path with external hosting',
        steps: [
          {
            title: 'Host at .well-known path',
            description: 'Some external hosting + proxy setups can serve at /.well-known/llms.txt',
          },
        ],
      },
    ],
    additionalNotes: [
      'Squarespace has limited support for custom files',
      'Consider using Cloudflare or similar for URL routing',
      'The .well-known location is a good alternative',
    ],
  },

  wix: {
    platform: 'wix',
    displayName: 'Wix',
    icon: '🔵',
    description: 'Limited support - use external hosting',
    methods: [
      {
        id: 'external-hosting',
        name: 'External File Hosting',
        description: 'Host the file externally and link',
        recommended: true,
        steps: [
          {
            title: 'Host llms.txt externally',
            description: 'Upload to GitHub Pages, Netlify, or any file hosting service',
          },
          {
            title: 'Consider a subdomain',
            description: 'You could create a subdomain that points to your hosted file',
            warning: 'Wix doesn\'t allow custom files at the domain root',
          },
        ],
      },
    ],
    additionalNotes: [
      'Wix has significant limitations for custom root files',
      'Consider migrating to a more flexible platform if AI discoverability is critical',
      'The .well-known location with external hosting may be your best option',
    ],
  },

  webflow: {
    platform: 'webflow',
    displayName: 'Webflow',
    icon: '🌊',
    description: 'Add via Asset Manager or custom code',
    methods: [
      {
        id: 'asset-manager',
        name: 'Asset Manager + 301 Redirect',
        description: 'Upload to assets and create redirect',
        recommended: true,
        steps: [
          {
            title: 'Upload to Asset Manager',
            description: 'Go to Assets panel and upload llms.txt',
          },
          {
            title: 'Copy the asset URL',
            description: 'Right-click the uploaded file and copy the URL',
          },
          {
            title: 'Create 301 redirect',
            description: 'Go to Project Settings > Hosting > 301 Redirects',
          },
          {
            title: 'Add redirect rule',
            description: 'Redirect /llms.txt to your asset URL',
            code: '/llms.txt → https://uploads-ssl.webflow.com/xxx/llms.txt',
          },
        ],
      },
    ],
    additionalNotes: [
      'Webflow assets are served from a CDN',
      '301 redirects are available on paid plans',
    ],
  },

  static: {
    platform: 'static',
    displayName: 'Static Hosting / FTP',
    icon: '📁',
    description: 'Upload via FTP to your document root',
    methods: [
      {
        id: 'ftp',
        name: 'FTP Upload',
        description: 'Upload directly to your web server',
        recommended: true,
        steps: [
          {
            title: 'Connect via FTP',
            description: 'Use FileZilla or another FTP client to connect to your server',
            tip: 'Get credentials from your hosting provider\'s control panel',
          },
          {
            title: 'Navigate to document root',
            description: 'Go to your website\'s root directory (usually public_html, www, or htdocs)',
          },
          {
            title: 'Upload llms.txt',
            description: 'Upload the file to the root directory',
          },
          {
            title: 'Verify permissions',
            description: 'Ensure the file has 644 permissions (readable by all)',
          },
        ],
      },
      {
        id: 'cpanel',
        name: 'cPanel File Manager',
        description: 'Upload through your hosting control panel',
        steps: [
          {
            title: 'Access cPanel',
            description: 'Log into your hosting control panel',
          },
          {
            title: 'Open File Manager',
            description: 'Click on File Manager in the Files section',
          },
          {
            title: 'Upload to root',
            description: 'Navigate to public_html and upload llms.txt',
          },
        ],
      },
    ],
  },

  unknown: {
    platform: 'unknown',
    displayName: 'General Deployment',
    icon: '🌐',
    description: 'Standard deployment instructions',
    methods: [
      {
        id: 'general',
        name: 'General Instructions',
        description: 'Standard deployment for any web platform',
        recommended: true,
        steps: [
          {
            title: 'Download your llms.txt file',
            description: 'Use the download button above to save your generated file',
          },
          {
            title: 'Upload to your website root',
            description: 'Place llms.txt in your website\'s root directory (where index.html lives)',
            tip: 'This is typically public_html, www, htdocs, or public/',
          },
          {
            title: 'Verify accessibility',
            description: 'Visit yourdomain.com/llms.txt in your browser to confirm it\'s working',
          },
          {
            title: 'Test with different paths (optional)',
            description: 'You can also use /.well-known/llms.txt as an alternative location',
          },
        ],
      },
    ],
    additionalNotes: [
      'Most web platforms serve static files from a public or static folder',
      'The file should be accessible without authentication',
      'Clear any CDN or cache after uploading',
    ],
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Map framework detection to platform type
 */
export function mapFrameworkToPlatform(
  framework?: string,
  url?: string
): DetectedPlatform {
  if (!framework || framework === 'unknown') {
    // Try to detect from URL
    if (url) {
      const lowerUrl = url.toLowerCase();
      if (lowerUrl.includes('shopify') || lowerUrl.includes('myshopify')) return 'shopify';
      if (lowerUrl.includes('squarespace')) return 'squarespace';
      if (lowerUrl.includes('wix')) return 'wix';
      if (lowerUrl.includes('webflow')) return 'webflow';
      if (lowerUrl.includes('netlify')) return 'netlify';
      if (lowerUrl.includes('vercel')) return 'vercel';
      if (lowerUrl.includes('wordpress') || lowerUrl.includes('wp-')) return 'wordpress';
    }
    return 'unknown';
  }

  const frameworkMap: Record<string, DetectedPlatform> = {
    react: 'react',
    vue: 'vue',
    angular: 'angular',
    svelte: 'svelte',
    next: 'next',
    nuxt: 'nuxt',
    gatsby: 'gatsby',
    astro: 'astro',
    wordpress: 'wordpress',
  };

  return frameworkMap[framework.toLowerCase()] || 'unknown';
}

// ============================================================================
// Components
// ============================================================================

function CodeBlock({ code, language }: { code: string; language?: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast({ title: 'Copied to clipboard' });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative mt-2 mb-2">
      <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto text-sm font-mono">
        <code>{code}</code>
      </pre>
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 text-slate-400 hover:text-white hover:bg-slate-700"
        onClick={handleCopy}
      >
        {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  );
}

function VerificationChecklist({ websiteUrl }: { websiteUrl: string }) {
  const [checks, setChecks] = useState({
    uploaded: false,
    accessible: false,
    contentType: false,
    noAuth: false,
  });

  const domain = new URL(websiteUrl).origin;

  const toggleCheck = (key: keyof typeof checks) => {
    setChecks(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const allComplete = Object.values(checks).every(Boolean);

  return (
    <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
        <CheckCircle className="h-5 w-5 mr-2" />
        Verification Checklist
      </h4>
      <div className="space-y-2">
        {[
          { key: 'uploaded' as const, label: 'File uploaded to website root' },
          { key: 'accessible' as const, label: `Accessible at ${domain}/llms.txt`, link: `${domain}/llms.txt` },
          { key: 'contentType' as const, label: 'Returns as plain text (not HTML)' },
          { key: 'noAuth' as const, label: 'No authentication required to access' },
        ].map(({ key, label, link }) => (
          <label key={key} className="flex items-center cursor-pointer group">
            <input
              type="checkbox"
              checked={checks[key]}
              onChange={() => toggleCheck(key)}
              className="h-4 w-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
            />
            <span className={`ml-2 text-sm ${checks[key] ? 'text-blue-700 line-through' : 'text-blue-800'}`}>
              {label}
            </span>
            {link && (
              <a
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 text-blue-500 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </label>
        ))}
      </div>
      {allComplete && (
        <div className="mt-3 p-2 bg-green-100 border border-green-200 rounded text-green-800 text-sm flex items-center">
          <Rocket className="h-4 w-4 mr-2" />
          Your llms.txt is deployed and ready for AI systems!
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function DeploymentGuide({
  detectedPlatform = 'unknown',
  websiteUrl,
}: DeploymentGuideProps) {
  const instructions = PLATFORM_INSTRUCTIONS[detectedPlatform] || PLATFORM_INSTRUCTIONS.unknown;

  return (
    <Card className="bg-white shadow-sm border border-slate-200 mt-6">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3 text-xl">
              {instructions.icon}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Deploy to {instructions.displayName}
              </h3>
              <p className="text-sm text-slate-600">{instructions.description}</p>
            </div>
          </div>
          <Globe className="h-6 w-6 text-slate-400" />
        </div>

        <Accordion type="single" collapsible defaultValue={instructions.methods[0]?.id} className="space-y-2">
          {instructions.methods.map((method) => (
            <AccordionItem
              key={method.id}
              value={method.id}
              className="border border-slate-200 rounded-lg overflow-hidden"
            >
              <AccordionTrigger className="px-4 py-3 hover:bg-slate-50">
                <div className="flex items-center">
                  {method.recommended && (
                    <span className="bg-green-100 text-green-800 text-xs font-medium px-2 py-0.5 rounded mr-2">
                      Recommended
                    </span>
                  )}
                  <span className="font-medium">{method.name}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <p className="text-sm text-slate-600 mb-4">{method.description}</p>
                <div className="space-y-4">
                  {method.steps.map((step, index) => (
                    <div key={index} className="flex">
                      <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-semibold mr-3 mt-0.5">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <h5 className="font-medium text-slate-900">{step.title}</h5>
                        <p className="text-sm text-slate-600 mt-1">{step.description}</p>
                        {step.code && <CodeBlock code={step.code} language={step.codeLanguage} />}
                        {step.tip && (
                          <div className="mt-2 text-sm text-blue-700 bg-blue-50 p-2 rounded flex items-start">
                            <span className="mr-1">💡</span> {step.tip}
                          </div>
                        )}
                        {step.warning && (
                          <div className="mt-2 text-sm text-amber-700 bg-amber-50 p-2 rounded flex items-start">
                            <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0 mt-0.5" /> {step.warning}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {instructions.additionalNotes && instructions.additionalNotes.length > 0 && (
          <div className="mt-4 p-3 bg-slate-50 rounded-lg">
            <h4 className="text-sm font-medium text-slate-700 mb-2">Additional Notes:</h4>
            <ul className="text-sm text-slate-600 space-y-1">
              {instructions.additionalNotes.map((note, index) => (
                <li key={index} className="flex items-start">
                  <ChevronRight className="h-4 w-4 mr-1 flex-shrink-0 text-slate-400" />
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )}

        <VerificationChecklist websiteUrl={websiteUrl} />
      </CardContent>
    </Card>
  );
}

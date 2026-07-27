import { useEffect } from 'react';
import { SITE_URL } from '@/lib/structured-data';

interface SEOProps {
  title: string;
  description: string;
}

/**
 * Canonical URL for the current path: always the non-www host, no trailing
 * slash except the root — exactly the forms sitemap.xml declares (LTM-ISS-12).
 */
function canonicalUrlFor(pathname: string): string {
  const path = pathname.replace(/\/+$/, '');
  return path === '' ? `${SITE_URL}/` : `${SITE_URL}${path}`;
}

/**
 * Hook to set page-specific SEO metadata (title and description)
 * This ensures crawlers and prerendering services see unique content per page
 */
export function useSEO({ title, description }: SEOProps) {
  useEffect(() => {
    // Set document title
    const fullTitle = title.includes('LLM.txt Mastery') ? title : `${title} | LLM.txt Mastery`;
    document.title = fullTitle;

    // Set meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', description);

    // Set Open Graph tags for social sharing
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitle);
    }
    ogTitle.setAttribute('content', fullTitle);

    let ogDescription = document.querySelector('meta[property="og:description"]');
    if (!ogDescription) {
      ogDescription = document.createElement('meta');
      ogDescription.setAttribute('property', 'og:description');
      document.head.appendChild(ogDescription);
    }
    ogDescription.setAttribute('content', description);

    // Self-referential canonical + og:url (LTM-ISS-12): one shared constant,
    // non-www, per-route. The prerender snapshot captures these, so crawlers
    // see the right canonical in the initial HTML. (Optional chaining covers
    // jsdom test environments where location is a partial mock.)
    const canonicalUrl = canonicalUrlFor(window.location?.pathname || '/');

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);

    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (!ogUrl) {
      ogUrl = document.createElement('meta');
      ogUrl.setAttribute('property', 'og:url');
      document.head.appendChild(ogUrl);
    }
    ogUrl.setAttribute('content', canonicalUrl);
  }, [title, description]);
}

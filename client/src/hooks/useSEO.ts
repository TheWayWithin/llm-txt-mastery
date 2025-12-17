import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
}

/**
 * Hook to set page-specific SEO metadata (title and description)
 * This ensures crawlers and prerendering services see unique content per page
 */
export function useSEO({ title, description }: SEOProps) {
  useEffect(() => {
    // Set document title
    const fullTitle = title.includes('LLM.txt Mastery')
      ? title
      : `${title} | LLM.txt Mastery`;
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

  }, [title, description]);
}

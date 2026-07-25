/**
 * Structured data (schema.org JSON-LD) for the marketing pages — LTM-ISS-10.
 *
 * Pattern copied from jamiewatters.work lib/structured-data.tsx: plain builder
 * functions plus a tiny <StructuredData> renderer. Every schema here describes
 * only what is visibly true on the page: real tier prices from /pricing, the
 * FAQ schema is built from the SAME constant the visible FAQ renders from
 * (imported by the caller), and there are no invented ratings or reviews.
 *
 * The blocks are rendered by React, which reaches crawlers because the
 * marketing routes are prerendered to static HTML at build time (LTM-ISS-9).
 */

export const SITE_URL = 'https://llmtxtmastery.com';
export const SITE_NAME = 'LLM.txt Mastery';

/**
 * When the marketing content last materially changed. A deliberate constant
 * rather than the build date: Netlify rebuilds on every commit (including
 * backend-only changes), so a build timestamp would claim freshness the
 * content does not have. Bump this when marketing copy genuinely changes.
 */
export const SITE_CONTENT_UPDATED = '2026-07-25';

const SITE_DESCRIPTION =
  'Generate, validate, and deploy llms.txt files. The only generator with all three formats (standard, full, and mini) plus A/B/C/D compliance grading.';

export function getOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/images/logo-primary.png`,
    description: 'Simple, effective AI visibility tools from AI Search Mastery.',
    sameAs: ['https://www.aisearchmastery.com'],
  };
}

export function getWebSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    dateModified: SITE_CONTENT_UPDATED,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}

/**
 * The product. Offers mirror the standard monthly prices shown on /pricing —
 * only prices that are actually charged. No aggregateRating: we do not have
 * published ratings, so none are claimed.
 */
export function getSoftwareApplicationSchema() {
  const offer = (name: string, price: string, description: string) => ({
    '@type': 'Offer',
    name,
    price,
    priceCurrency: 'USD',
    description,
  });

  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: SITE_NAME,
    url: SITE_URL,
    description: SITE_DESCRIPTION,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web Browser',
    dateModified: SITE_CONTENT_UPDATED,
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    offers: [
      offer('Free Trial', '0', 'Seven days of full Growth features at no charge.'),
      offer('Solo', '4.95', 'Monthly subscription for solo site owners.'),
      offer('Growth', '9.95', 'Monthly subscription with larger analyses and file history.'),
      offer('Scale', '19.95', 'Monthly subscription with the highest limits and API access.'),
    ],
  };
}

/**
 * FAQPage schema. Callers must pass the SAME array the visible FAQ renders
 * from (see components/landing/FAQSection.tsx) so markup can never drift
 * from what is on the page.
 */
export function getFaqPageSchema(faqs: ReadonlyArray<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}

/** Renders one JSON-LD block. */
export function StructuredData({ schema }: { schema: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

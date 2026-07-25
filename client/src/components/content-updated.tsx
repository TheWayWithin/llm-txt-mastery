import { SITE_CONTENT_UPDATED } from '@/lib/structured-data';

const DISPLAY = new Date(SITE_CONTENT_UPDATED + 'T00:00:00Z').toLocaleDateString('en-GB', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/**
 * Visible content-freshness line for marketing pages that do not render the
 * shared Footer (which carries the same date). One constant drives both.
 */
export default function ContentUpdated() {
  return (
    <p className="text-center text-sm text-slate-brand mt-12 mb-4">
      Content updated <time dateTime={SITE_CONTENT_UPDATED}>{DISPLAY}</time>
    </p>
  );
}

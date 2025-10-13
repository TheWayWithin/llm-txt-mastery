/**
 * TierGuaranteeContent - Extracted tier-specific messaging and guarantee content
 *
 * Displays tier benefits, warnings, and guarantee information.
 * Focused on presentation only - business logic handled by parent.
 */

import { UserTier } from '@shared/schema';

export interface TierGuaranteeContentProps {
  selectedTier: UserTier;
}

export function TierGuaranteeContent({ selectedTier }: TierGuaranteeContentProps) {
  return (
    <>
      {/* Tier benefits reminder */}
      <div className="text-center text-sm border-t pt-4">
        {selectedTier === 'starter' ? (
          <div className="bg-red-50 border border-red-200 p-3 rounded">
            <span className="text-red-700 font-medium">
              ⚠️ WARNING: Severely limited • Will miss critical pages • Competitors will outrank you
            </span>
          </div>
        ) : selectedTier === 'solo' ? (
          <div className="bg-green-50 border border-green-200 p-3 rounded">
            <span className="text-green-700 font-bold">
              🚀 SMART CHOICE: Full power • 30-day guarantee • Cancel instantly • Risk-FREE
            </span>
          </div>
        ) : selectedTier === 'growth' ? (
          <div className="bg-teal-50 border border-teal-200 p-3 rounded">
            <span className="text-teal-700">
              ✓ Professional power • Advanced features • Team collaboration
            </span>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 p-3 rounded">
            <span className="text-blue-700">
              ✓ Enterprise control • API access • Direct email support
            </span>
          </div>
        )}
      </div>

      {/* Dramatic Risk Reversal Section */}
      <div className="border-t pt-6">
        <div className="bg-gradient-to-r from-blue-50 to-green-50 border-2 border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-bold text-center text-blue-900 mb-4">
            🛡️ ZERO RISK GUARANTEE - We Remove ALL Your Fears
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-white p-3 rounded border">
              <div className="font-bold text-green-700 mb-2">💰 30-Day Money Back Guarantee</div>
              <div className="text-gray-700">
                Don't like the results? Get every penny back. No questions asked. No hoops to jump
                through.
              </div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="font-bold text-blue-700 mb-2">⚡ Cancel Instantly Anytime</div>
              <div className="text-gray-700">
                One click cancellation. No phone calls. No retention tactics. Cancel in 10 seconds.
              </div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="font-bold text-purple-700 mb-2">🏆 Results in 24 Hours or Refund</div>
              <div className="text-gray-700">
                See dramatic improvements within 24 hours or get a full refund immediately.
              </div>
            </div>
            <div className="bg-white p-3 rounded border">
              <div className="font-bold text-orange-700 mb-2">
                🚀 Outperform Competitors or Refund
              </div>
              <div className="text-gray-700">
                We find 3x more pages than competitors or you get your money back.
              </div>
            </div>
          </div>
          <div className="text-center mt-4 text-xs text-blue-600 font-medium">
            ✅ Secure & Private • ✅ No Spam Ever • ✅ Built by Expert Solopreneur • ✅ Not
            VC-Funded BS
          </div>
        </div>
      </div>
    </>
  );
}

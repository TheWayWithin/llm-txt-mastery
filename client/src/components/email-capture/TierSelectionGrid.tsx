/**
 * TierSelectionGrid - Extracted tier selection UI component
 * 
 * Displays the tier options in a grid layout with proper selection handling.
 * Focused on presentation only - business logic handled by parent.
 */

import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { UserTier } from '@shared/schema';

export interface TierSelectionGridProps {
  selectedTier: UserTier | null;
  onTierSelect: (tier: UserTier) => void;
  disabled?: boolean;
}

export function TierSelectionGrid({ selectedTier, onTierSelect, disabled = false }: TierSelectionGridProps) {
  const handleTierClick = (tier: UserTier) => {
    if (!disabled) {
      onTierSelect(tier);
    }
  };

  return (
    <div className="space-y-4">
      <RadioGroup 
        value={selectedTier || ""} 
        onValueChange={(value: UserTier) => onTierSelect(value)}
        className="grid grid-cols-1 md:grid-cols-2 gap-3"
        disabled={disabled}
      >
        {/* Starter Tier */}
        <div 
          className={`relative border-2 border-red-300 rounded-lg bg-red-50 hover:bg-red-100 transition-colors p-4 ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`} 
          onClick={() => handleTierClick('starter')}
        >
          <RadioGroupItem value="starter" id="starter" className="absolute top-4 right-4" disabled={disabled} />
          <div className="absolute -top-3 left-4 bg-red-600 text-white text-xs px-2 py-1 rounded">⚠️ SEVERELY LIMITED</div>
          <div className="pr-8">
            <Label htmlFor="starter" className={`flex items-center space-x-2 mt-2 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
              <img 
                src="/images/tier-free.png" 
                alt="Free Tier" 
                className="w-6 h-6 opacity-60" 
              />
              <span className="font-medium text-lg text-red-700">Free (But Crippled)</span>
            </Label>
            <p className="text-sm text-red-600 mt-2">
              ❌ Only 3 analyses per day (then locked out)<br/>
              ❌ Severely limited to 20 pages only<br/>
              ❌ No AI quality scoring (missing critical content)<br/>
              ❌ Basic HTML extraction only<br/>
              <span className="text-xs font-medium text-red-700 mt-1 block">
                ⚠️ WARNING: AI sees only 20 pages - missing your pricing, features, case studies & what makes you unique!
              </span>
            </p>
          </div>
        </div>

        {/* Coffee Tier */}
        <div 
          className={`relative border-4 border-green-500 rounded-lg bg-gradient-to-br from-green-50 to-orange-50 hover:from-green-100 hover:to-orange-100 transition-colors p-4 shadow-lg ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`} 
          onClick={() => handleTierClick('coffee')}
        >
          <RadioGroupItem value="coffee" id="coffee" className="absolute top-4 right-4" disabled={disabled} />
          <div className="absolute -top-3 left-4 bg-green-600 text-white text-xs px-3 py-1 rounded-full font-bold">🏆 CRUSH YOUR COMPETITION</div>
          <div className="pr-8">
            <Label htmlFor="coffee" className={`flex items-center space-x-2 mt-2 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
              <img 
                src="/images/tier-coffee.png" 
                alt="Coffee Tier" 
                className="w-8 h-8" 
              />
              <span className="font-bold text-xl text-green-800">Coffee Power ($4.95/month)</span>
            </Label>
            <p className="text-sm font-medium text-green-700 mt-2">
              ✅ Go from INVISIBLE to Gen AI → INDEXED & REFERENCED instantly<br/>
              ✅ 100 analyses per month (credits reset monthly)<br/>
              ✅ Keep your LLM.txt file CURRENT - update it as your site evolves<br/>
              ✅ 200 pages per analysis (10x more than free)<br/>
              ✅ AI-powered content scoring (find hidden gems)<br/>
              ✅ Beat competitors who use broken tools<br/>
              <span className="text-xs font-bold text-green-800 mt-2 block bg-green-100 p-2 rounded">
                🚀 All guarantees included - see below for details
              </span>
            </p>
          </div>
        </div>

        {/* Growth Tier */}
        <div 
          className={`relative border rounded-lg hover:bg-slate-50 transition-colors p-4 ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`} 
          onClick={() => handleTierClick('growth')}
        >
          <RadioGroupItem value="growth" id="growth" className="absolute top-4 right-4" disabled={disabled} />
          <div className="pr-8">
            <Label htmlFor="growth" className={`flex items-center space-x-2 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
              <img 
                src="/images/tier-growth.png" 
                alt="Growth Tier" 
                className="w-6 h-6" 
              />
              <span className="font-medium text-lg">Professional Power ($9.95/mo)</span>
            </Label>
            <p className="text-sm text-ai-silver mt-2">
              • Unlimited analyses<br/>
              • 1,000 pages per analysis<br/>
              • Team collaboration<br/>
              • Priority support
            </p>
          </div>
        </div>

        {/* Scale Tier */}
        <div 
          className={`relative border rounded-lg hover:bg-slate-50 transition-colors p-4 ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`} 
          onClick={() => handleTierClick('scale')}
        >
          <RadioGroupItem value="scale" id="scale" className="absolute top-4 right-4" disabled={disabled} />
          <div className="pr-8">
            <Label htmlFor="scale" className={`flex items-center space-x-2 ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
              <img 
                src="/images/tier-scale.png" 
                alt="Scale Tier" 
                className="w-6 h-6" 
              />
              <span className="font-medium text-lg">Agency & API ($19.95/mo)</span>
            </Label>
            <p className="text-sm text-ai-silver mt-2">
              • Full API access<br/>
              • Unlimited pages<br/>
              • Multi-site management<br/>
              • Direct email support
            </p>
          </div>
        </div>
      </RadioGroup>
    </div>
  );
}
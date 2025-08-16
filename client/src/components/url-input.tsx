import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, CheckCircle, Info } from "lucide-react";

interface UrlInputProps {
  onAnalysisStart: (url: string) => void;
  isVisible: boolean;
  prefilledUrl?: string;
}

export default function UrlInput({ onAnalysisStart, isVisible, prefilledUrl }: UrlInputProps) {
  const [url, setUrl] = useState("");
  const [isValid, setIsValid] = useState(false);

  // Set pre-filled URL if provided
  useEffect(() => {
    if (prefilledUrl) {
      setUrl(prefilledUrl);
      validateUrl(prefilledUrl);
    }
  }, [prefilledUrl]);

  const normalizeUrl = (value: string) => {
    // Return empty if no value
    if (!value.trim()) return value;
    
    // If already has protocol, return as-is
    if (/^https?:\/\//.test(value)) {
      return value;
    }
    
    // Auto-prepend https:// for URLs without protocol
    return `https://${value}`;
  };

  const validateUrl = (value: string) => {
    // Normalize the URL first
    const normalizedUrl = normalizeUrl(value);
    
    // Updated pattern to accept URLs with or without protocol
    // Accepts: https://example.com, http://example.com, www.example.com, example.com
    const urlPattern = /^https?:\/\/.+\..+/;
    const valid = urlPattern.test(normalizedUrl);
    setIsValid(valid);
    return valid;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrl(value);
    validateUrl(value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isValid && url) {
      // Use normalized URL for analysis
      const normalizedUrl = normalizeUrl(url);
      onAnalysisStart(normalizedUrl);
    }
  };

  if (!isVisible) return null;

  return (
    <section>
      <Card className="bg-white shadow-sm border border-slate-200">
        <CardContent className="p-6">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-innovation-teal rounded-full flex items-center justify-center mr-3">
              <span className="text-white font-semibold text-sm">1</span>
            </div>
            <h3 className="text-xl font-semibold text-framework-black">Enter Your Website URL</h3>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="website-url" className="text-sm font-medium text-framework-black">
                Website URL
              </Label>
              <div className="relative mt-2">
                <Input
                  id="website-url"
                  type="text"
                  placeholder="www.example.com or https://example.com"
                  value={url}
                  onChange={handleInputChange}
                  className="pr-12 border-slate-300 focus:ring-innovation-teal focus:border-innovation-teal"
                />
                {isValid && (
                  <div className="absolute right-3 top-3">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                )}
              </div>
              <p className="mt-2 text-sm text-ai-silver">
                Enter your website's main URL. Protocol (https://) is optional - we'll add it automatically.
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-ai-silver">
                <Info className="h-4 w-4 text-innovation-teal" />
                <span>Supports HTTP/HTTPS protocols</span>
              </div>
              <Button
                type="submit"
                disabled={!isValid}
                className="bg-innovation-teal hover:bg-innovation-teal/90 text-white"
              >
                <Search className="h-4 w-4 mr-2" />
                Analyze Website
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  );
}

import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Edit, Star } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DiscoveredPage, SelectedPage } from "@shared/schema";

interface ContentReviewProps {
  analysisId: number;
  discoveredPages: DiscoveredPage[];
  onFileGenerated: (fileId: number) => void;
  onStartOver?: () => void;
}

type FilterType = "all" | "high-quality" | "documentation" | "tutorials";

export default function ContentReview({ analysisId, discoveredPages, onFileGenerated, onStartOver }: ContentReviewProps) {
  const { toast } = useToast();
  const [selectedPages, setSelectedPages] = useState<Record<string, boolean>>(() => {
    // Auto-select high quality pages (score >= 5)
    const initial: Record<string, boolean> = {};
    const highQualityPages = discoveredPages.filter(page => page.qualityScore >= 5);
    
    if (highQualityPages.length > 0) {
      // Select pages that meet quality threshold
      discoveredPages.forEach(page => {
        initial[page.url] = page.qualityScore >= 5;
      });
    } else {
      // Fallback: select top 3 highest-scoring pages if none meet threshold
      const sortedPages = [...discoveredPages].sort((a, b) => b.qualityScore - a.qualityScore);
      const topPages = sortedPages.slice(0, Math.min(3, sortedPages.length));
      topPages.forEach(page => {
        initial[page.url] = true;
      });
    }
    
    return initial;
  });

  const [filter, setFilter] = useState<FilterType>("all");
  const [autoSelect, setAutoSelect] = useState(true);

  const generateFileMutation = useMutation({
    mutationFn: async (selectedPagesData: SelectedPage[]) => {
      const response = await apiRequest("POST", "/api/generate-llm-file", {
        analysisId,
        selectedPages: selectedPagesData
      });
      return response.json();
    },
    onSuccess: (data) => {
      console.log("File generated successfully:", data);
      toast({
        title: "Success", 
        description: `Generated LLM.txt file with ${data.pageCount} pages`,
      });
      onFileGenerated(data.id);
    },
    onError: (error) => {
      console.error("File generation failed:", error);
      toast({
        title: "Error",
        description: "Failed to generate LLM.txt file",
        variant: "destructive",
      });
    }
  });

  const filteredPages = useMemo(() => {
    return discoveredPages.filter(page => {
      switch (filter) {
        case "high-quality":
          return page.qualityScore >= 7;
        case "documentation":
          return page.category.toLowerCase().includes("documentation") || 
                 page.category.toLowerCase().includes("docs");
        case "tutorials":
          return page.category.toLowerCase().includes("tutorial") || 
                 page.category.toLowerCase().includes("guide");
        default:
          return true;
      }
    });
  }, [discoveredPages, filter]);

  const selectedCount = Object.values(selectedPages).filter(Boolean).length;

  const handlePageToggle = (url: string, checked: boolean) => {
    setSelectedPages(prev => ({
      ...prev,
      [url]: checked
    }));
  };

  const handleSelectAll = () => {
    const newSelection: Record<string, boolean> = {};
    filteredPages.forEach(page => {
      newSelection[page.url] = true;
    });
    setSelectedPages(prev => ({ ...prev, ...newSelection }));
  };

  const handleAutoSelectToggle = (checked: boolean) => {
    setAutoSelect(checked);
    if (checked) {
      const newSelection: Record<string, boolean> = {};
      discoveredPages.forEach(page => {
        newSelection[page.url] = page.qualityScore >= 5;
      });
      setSelectedPages(newSelection);
    }
  };

  const handleGenerateFile = () => {
    const selectedPagesData: SelectedPage[] = discoveredPages.map(page => ({
      url: page.url,
      title: page.title,
      description: page.description,
      selected: selectedPages[page.url] || false
    }));

    const actuallySelected = selectedPagesData.filter(p => p.selected);
    console.log(`Generating file with ${actuallySelected.length} selected pages from ${discoveredPages.length} total pages`);
    
    generateFileMutation.mutate(selectedPagesData);
  };

  const getCategoryBadgeColor = (category: string) => {
    const categoryLower = category.toLowerCase();
    if (categoryLower.includes("documentation") || categoryLower.includes("docs")) {
      return "bg-blue-100 text-blue-800";
    }
    if (categoryLower.includes("tutorial") || categoryLower.includes("guide")) {
      return "bg-green-100 text-green-800";
    }
    if (categoryLower.includes("api")) {
      return "bg-purple-100 text-purple-800";
    }
    if (categoryLower.includes("legal")) {
      return "bg-gray-100 text-gray-800";
    }
    return "bg-slate-100 text-slate-800";
  };

  const getQualityBadgeColor = (score: number) => {
    if (score >= 8) return "bg-green-100 text-green-800";
    if (score >= 6) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  const getQualityLabel = (score: number) => {
    if (score >= 8) return "High Quality";
    if (score >= 6) return "Medium Quality";
    return "Low Quality";
  };

  return (
    <Card className="bg-white shadow-sm border border-slate-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-innovation-teal rounded-full flex items-center justify-center mr-3">
              <span className="text-white font-semibold text-sm">3</span>
            </div>
            <h3 className="text-xl font-semibold text-framework-black">Expert-Guided Content Review</h3>
          </div>
          <div className="text-sm text-ai-silver">
            {discoveredPages.length} pages analyzed for review
          </div>
        </div>

        {/* Quality Scoring Info */}
        <div className="mb-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start space-x-2">
            <Star className="h-5 w-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-blue-900 mb-1">Quality Scoring Guide</h4>
              <p className="text-sm text-blue-800 mb-2">
                Each page is scored 1-10 based on AI analysis of content relevance, technical depth, 
                SEO optimization, and information architecture for AI understanding.
              </p>
              <div className="flex flex-wrap gap-2 text-xs mb-2">
                <span className="px-2 py-1 bg-green-100 text-green-800 rounded">8-10: High Quality</span>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">5-7: Medium Quality</span>
                <span className="px-2 py-1 bg-red-100 text-red-800 rounded">1-4: Low Quality</span>
              </div>
              <p className="text-xs text-blue-700">
                💡 <strong>Note:</strong> "Pages Analyzed" shows only pages that were successfully fetched and scored. 
                Some discovered pages may be skipped due to access restrictions, errors, or filtering.
              </p>
            </div>
          </div>
        </div>

        {/* Low Quality Content Guidance */}
        {discoveredPages.filter(p => p.qualityScore < 5).length > 0 && (
          <div className="mb-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <div className="flex items-start space-x-2">
              <div className="flex-shrink-0">
                <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">!</span>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-amber-900 mb-2">Low Quality Content Detected</h4>
                <p className="text-sm text-amber-800 mb-2">
                  {discoveredPages.filter(p => p.qualityScore < 5).length} pages received low quality scores. 
                  This typically occurs when pages have:
                </p>
                <ul className="text-xs text-amber-700 mb-2 pl-4 space-y-1">
                  <li>• Minimal or outdated content that provides limited value to AI systems</li>
                  <li>• Poor structure, missing headers, or inadequate information architecture</li>
                  <li>• Historical or archived content not optimized for modern AI understanding</li>
                  <li>• Marketing pages focused on promotion rather than informational content</li>
                  <li>• Technical limitations preventing proper content analysis</li>
                </ul>
                <div className="bg-amber-100 border border-amber-300 rounded p-2 text-xs text-amber-800">
                  <strong>💡 Manual Override Available:</strong> While we recommend focusing on higher-quality pages for optimal 
                  LLM.txt effectiveness, you can manually select low-quality pages if they contain information 
                  important to your specific use case. Consider the trade-off between file size and content value.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* No High Quality Content Warning */}
        {discoveredPages.filter(p => p.qualityScore >= 5).length === 0 && (
          <div className="mb-4 p-4 bg-red-50 rounded-lg border border-red-200">
            <div className="flex items-start space-x-2">
              <div className="flex-shrink-0">
                <div className="w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-bold">⚠</span>
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-red-900 mb-2">Fallback Selection Applied</h4>
                <p className="text-sm text-red-800 mb-2">
                  None of the analyzed pages met our quality threshold (score ≥5). We've automatically selected the 
                  {Math.min(3, discoveredPages.length)} highest-scoring pages to prevent an empty LLM.txt file. This may indicate:
                </p>
                <ul className="text-xs text-red-700 mb-2 pl-4 space-y-1">
                  <li>• The website has minimal content suitable for AI consumption</li>
                  <li>• Pages are primarily visual/interactive rather than text-based</li>
                  <li>• Content structure doesn't align with LLM.txt best practices</li>
                  <li>• Technical access restrictions prevented proper analysis</li>
                </ul>
                <div className="bg-red-100 border border-red-300 rounded p-2 text-xs text-red-800">
                  <strong>📋 Options:</strong> You can proceed with the selected pages, manually adjust selections, 
                  or analyze a different website with more structured, informational content for better results.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="mb-4 grid grid-cols-4 gap-4 text-center">
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="text-lg font-semibold text-framework-black">{discoveredPages.length}</div>
            <div className="text-xs text-ai-silver">Pages Analyzed</div>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <div className="text-lg font-semibold text-green-700">{Object.values(selectedPages).filter(Boolean).length}</div>
            <div className="text-xs text-green-600">Selected</div>
          </div>
          <div className="p-3 bg-red-50 rounded-lg">
            <div className="text-lg font-semibold text-red-700">{discoveredPages.length - Object.values(selectedPages).filter(Boolean).length}</div>
            <div className="text-xs text-red-600">Excluded</div>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="text-lg font-semibold text-blue-700">{discoveredPages.filter(p => p.qualityScore >= 8).length}</div>
            <div className="text-xs text-blue-600">High Quality</div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="mb-6 flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-framework-black">Filter by:</label>
            <Select value={filter} onValueChange={(value: FilterType) => setFilter(value)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Content</SelectItem>
                <SelectItem value="high-quality">High Quality Only</SelectItem>
                <SelectItem value="documentation">Documentation</SelectItem>
                <SelectItem value="tutorials">Tutorials</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="auto-select"
              checked={autoSelect}
              onCheckedChange={handleAutoSelectToggle}
            />
            <label htmlFor="auto-select" className="text-sm text-ai-silver">
              Auto-select high quality content
            </label>
          </div>
        </div>

        {/* Content List */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredPages.map((page) => (
            <div
              key={page.url}
              className="border border-slate-200 rounded-lg p-4 hover:bg-slate-50 transition-colors duration-200"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    checked={selectedPages[page.url] || false}
                    onCheckedChange={(checked) => handlePageToggle(page.url, checked as boolean)}
                    className="mt-1"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-framework-black text-sm">
                        {page.title}
                      </h4>
                      <Badge className={`text-xs ${getQualityBadgeColor(page.qualityScore)}`}>
                        {getQualityLabel(page.qualityScore)}
                      </Badge>
                      <Badge className={`text-xs ${getCategoryBadgeColor(page.category)}`}>
                        {page.category}
                      </Badge>
                    </div>
                    <p className="text-xs text-ai-silver mb-2">{page.url}</p>
                    <p className="text-sm text-ai-silver">{page.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-innovation-teal hover:text-innovation-teal/80"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center space-x-1 text-xs text-ai-silver">
                    <Star className="h-3 w-3 text-yellow-400 fill-current" />
                    <span>{page.qualityScore.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-200">
          <div className="text-sm text-ai-silver">
            <span className="font-medium">{selectedCount}</span> of{" "}
            <span className="font-medium">{discoveredPages.length}</span> pages selected
          </div>
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              onClick={handleSelectAll}
              className="text-ai-silver hover:text-framework-black"
            >
              Select All
            </Button>
            {onStartOver && (
              <Button
                variant="outline"
                onClick={onStartOver}
                className="text-ai-silver hover:text-framework-black border-slate-300"
              >
                Analyze Another Website
              </Button>
            )}
            <Button
              onClick={handleGenerateFile}
              disabled={selectedCount === 0 || generateFileMutation.isPending}
              className="bg-innovation-teal hover:bg-innovation-teal/90 text-white"
            >
              {generateFileMutation.isPending ? "Generating..." : `Generate llms.txt File (${selectedCount} pages)`}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

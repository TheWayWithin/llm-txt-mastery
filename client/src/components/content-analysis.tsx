import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Circle, Loader2 } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { DiscoveredPage } from "@shared/schema";

interface ContentAnalysisProps {
  websiteUrl: string;
  onAnalysisComplete: (analysisId: number, pages: DiscoveredPage[]) => void;
}

interface AnalysisStep {
  id: string;
  label: string;
  progress: number;
}

const analysisSteps: AnalysisStep[] = [
  { id: "sitemap", label: "Discovering sitemap.xml and content structure", progress: 25 },
  { id: "content", label: "Analyzing content quality and relevance", progress: 50 },
  { id: "filtering", label: "Applying intelligent filtering rules", progress: 75 },
  { id: "descriptions", label: "Generating AI-powered descriptions", progress: 100 }
];

export default function ContentAnalysis({ websiteUrl, onAnalysisComplete }: ContentAnalysisProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [analysisId, setAnalysisId] = useState<number | null>(null);

  const startAnalysisMutation = useMutation({
    mutationFn: async ({ url, force = false }: { url: string; force?: boolean }) => {
      // Use real sitemap analysis endpoint
      const response = await apiRequest("POST", "/api/analyze", { url, force });
      return response.json();
    },
    onSuccess: (data) => {
      setAnalysisId(data.analysisId);
      if (data.status === "completed") {
        onAnalysisComplete(data.analysisId, data.discoveredPages);
      }
    },
    onError: (error) => {
      console.error("Analysis failed:", error);
    }
  });

  const { data: analysisData, error } = useQuery({
    queryKey: ["/api/analysis", analysisId],
    enabled: !!analysisId,
    refetchInterval: (data) => {
      // Stop polling when analysis is complete
      return data?.status === "completed" || data?.status === "failed" ? false : 2000;
    },
  });

  useEffect(() => {
    if (websiteUrl) {
      startAnalysisMutation.mutate({ url: websiteUrl });
    }
  }, [websiteUrl]);

  useEffect(() => {
    if (analysisData) {
      if (analysisData.status === "completed") {
        setProgress(100);
        setCurrentStepIndex(analysisSteps.length - 1);
        setTimeout(() => {
          onAnalysisComplete(analysisData.id, analysisData.discoveredPages);
        }, 1000);
      } else if (analysisData.status === "processing") {
        // Simulate progress through steps
        const timer = setInterval(() => {
          setCurrentStepIndex((prev) => {
            if (prev < analysisSteps.length - 1) {
              const newIndex = prev + 1;
              setProgress(analysisSteps[newIndex].progress);
              return newIndex;
            }
            return prev;
          });
        }, 2000);

        return () => clearInterval(timer);
      }
    }
  }, [analysisData, onAnalysisComplete]);

  const getStepIcon = (stepIndex: number) => {
    if (stepIndex < currentStepIndex) {
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    } else if (stepIndex === currentStepIndex) {
      return <Loader2 className="h-5 w-5 text-innovation-teal animate-spin" />;
    } else {
      return <Circle className="h-5 w-5 text-slate-300" />;
    }
  };

  if (error) {
    return (
      <Card className="bg-white shadow-sm border border-red-200">
        <CardContent className="p-6">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center mr-3">
              <span className="text-white font-semibold text-sm">!</span>
            </div>
            <h3 className="text-xl font-semibold text-red-600">Analysis Failed</h3>
          </div>
          <p className="text-red-600">
            {error instanceof Error ? error.message : "Failed to analyze website"}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white shadow-sm border border-slate-200">
      <CardContent className="p-6">
        <div className="flex items-center mb-4">
          <div className="w-8 h-8 bg-innovation-teal rounded-full flex items-center justify-center mr-3">
            <span className="text-white font-semibold text-sm">2</span>
          </div>
          <h3 className="text-xl font-semibold text-framework-black">Systematic Content Analysis</h3>
        </div>

        {/* Progress Indicator */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-ai-silver mb-2">
            <span>Analyzing content...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Analysis Steps */}
        <div className="space-y-4">
          {analysisSteps.map((step, index) => (
            <div
              key={step.id}
              className={`flex items-center space-x-3 text-sm ${
                index <= currentStepIndex ? "opacity-100" : "opacity-50"
              }`}
            >
              {getStepIcon(index)}
              <span
                className={
                  index < currentStepIndex
                    ? "text-framework-black"
                    : index === currentStepIndex
                    ? "text-innovation-teal"
                    : "text-ai-silver"
                }
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

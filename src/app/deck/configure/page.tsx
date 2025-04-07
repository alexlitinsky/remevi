"use client"

import type React from "react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import {
  BookOpen,
  FileText,
  FileIcon as FilePdf,
  FileImage,
  Brain,
  Zap,
  Sparkles,
  Clock,
  ArrowLeft,
  Loader2,
} from "lucide-react"
import { FREEMIUM_LIMITS } from "@/lib/constants"
import { PricingModal } from "@/components/pricing/PricingModal"
import { toast } from "sonner"
import { useSubscription } from "@/contexts/SubscriptionContext"
import { cn } from "@/lib/utils"
import { Difficulty } from "@/types/difficulty"
import { useUploadContext } from "@/contexts/UploadContext"

// TODO: modify these in the future
const QUESTION_RANGES = {
  low: { description: "Brief overview with key concepts" },
  moderate: { description: "Balanced coverage of main topics" },
  high: { description: "Comprehensive deep-dive into the material" },
} as const

type AiModel = "standard" | "advanced"

interface PageRange {
  start: number
  end: number
}

export default function ConfigurePage() {
  const router = useRouter()
  const { file: uploadedFile, metadata: fileMetadata, clearUploadData } = useUploadContext();
  const [difficulty, setDifficulty] = useState<Difficulty>("low")
  const [pageRange, setPageRange] = useState<PageRange>({ start: 1, end: 1 })
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStep, setGenerationStep] = useState('')
  const [generationProgress, setGenerationProgress] = useState(0)
  const [aiModel, setAiModel] = useState<AiModel>("standard")
  const [showPricing, setShowPricing] = useState(false)
  const { subscription, isLoading: isLoadingSubscription } = useSubscription()

  const limits = subscription?.status === "active" ? FREEMIUM_LIMITS.PRO : FREEMIUM_LIMITS.FREE

  useEffect(() => {
    if (isLoadingSubscription) return;

    if (!uploadedFile || !fileMetadata) {
      console.warn("Missing file or metadata in context. Redirecting home.");
      const timer = setTimeout(() => router.push('/'), 100);
      return () => clearTimeout(timer);
    }

    if (fileMetadata.size > limits.maxFileSize) {
      toast.error(`File size (${formatFileSize(fileMetadata.size)}) exceeds plan limit (${formatFileSize(limits.maxFileSize)}).`)
      clearUploadData();
      router.push('/')
      return
    }

    if (fileMetadata.type.includes("pdf") && fileMetadata.pageCount) {
      const maxAllowedPages = limits.maxPages;
      const documentPages = fileMetadata.pageCount;
      const initialEndPage = Math.min(documentPages, maxAllowedPages);
      setPageRange({
        start: 1,
        end: initialEndPage,
      });
    } else {
      setPageRange({ start: 1, end: 1 });
    }
  }, [router, limits, uploadedFile, fileMetadata, clearUploadData, isLoadingSubscription]);

  const handleGenerate = async () => {
    if (!uploadedFile || !fileMetadata) {
      toast.error("File information is missing. Please re-upload.");
      router.push('/');
      return;
    }

    const selectedPageCount = pageRange.end - pageRange.start + 1;
    if (isPDF && selectedPageCount > limits.maxPages) {
      toast.error(`Selected page range (${selectedPageCount}) exceeds your plan limit of ${limits.maxPages} pages.`);
      setShowPricing(true);
      return;
    }

    setIsGenerating(true);
    setGenerationProgress(0);
    let uploadId = '';
    let filePath = '';

    try {
      setGenerationStep("Uploading file...");
      setGenerationProgress(10);
      const formData = new FormData();
      formData.append('file', uploadedFile);

      const uploadResponse = await fetch('/api/temp-upload', {
        method: 'POST',
        body: formData,
      });

      setGenerationProgress(40);

      if (!uploadResponse.ok) {
        const errorJson = await uploadResponse.json().catch(() => ({}));
        throw new Error(errorJson.message || 'Failed to upload file');
      }

      const uploadResult = await uploadResponse.json();
      uploadId = uploadResult.uploadId;
      filePath = uploadResult.filePath;
      setGenerationProgress(50);

      setGenerationStep("Preparing generation...");
      const generatePayload = {
        uploadId: uploadId,
        filePath: filePath,
        metadata: fileMetadata,
        pageRange: fileMetadata.type.includes('pdf') ? pageRange : undefined,
        aiModel,
        difficulty
      };

      const generateResponse = await fetch('/api/generate-chunks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(generatePayload),
      });

      setGenerationProgress(75);

      if (!generateResponse.ok) {
        const errorJson = await generateResponse.json().catch(() => ({}));
        const errorMessage = errorJson.error || 'Failed to start generation';
        if (errorMessage.includes('not available in your plan') || errorMessage.includes('exceeds your plan')) {
          setShowPricing(true);
        }
        throw new Error(errorMessage);
      }

      setGenerationStep("Generation started!");
      setGenerationProgress(100);

      const { deckId } = await generateResponse.json();
      toast.success("Study deck created! Redirecting...");
      router.push(`/deck/${deckId}/session-v2`);
      setTimeout(() => clearUploadData(), 500);

    } catch (error: unknown) {
      console.error('Error during generation process:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
      toast.error(`Error: ${errorMessage}`);
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  const handleCancel = () => {
    clearUploadData();
    router.push('/');
  }

  const getFileIcon = () => {
    if (!fileMetadata) return <FileText className="h-6 w-6" />;
    const fileType = fileMetadata.type;
    if (fileType.includes("pdf")) return <FilePdf className="h-6 w-6 text-red-500" />;
    if (fileType.includes("image")) return <FileImage className="h-6 w-6 text-blue-500" />;
    if (fileType.includes("wordprocessingml")) return <FileText className="h-6 w-6 text-blue-500" />;
    if (fileType.includes("text")) return <FileText className="h-6 w-6 text-gray-500" />;
    return <FileText className="h-6 w-6" />;
  }

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return "0 B";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  if (isLoadingSubscription) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-background to-background/80">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="text-muted-foreground animate-pulse">Loading subscription status...</p>
        </div>
      </div>
    );
  }

  if (!uploadedFile || !fileMetadata) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  const isPDF = fileMetadata?.type.includes("pdf");
  const getEstimatedTime = (difficulty: Difficulty) => {
    switch (difficulty) {
      case 'low':
        return 15;
      case 'moderate':
        return 30;
      case 'high':
        return 45;
      default:
        return 30;
    }
  };

  const estimatedTime = getEstimatedTime(difficulty);

  const handleDifficultyChange = (value: Difficulty) => {
    if (!limits.allowedDifficulties.includes(value)) {
      setShowPricing(true);
      toast.info(`The '${value}' difficulty requires an upgrade.`);
      return;
    }
    setDifficulty(value);
  };

  const handleAiModelChange = (value: AiModel) => {
    if (!limits.allowedAiModels.includes(value)) {
      setShowPricing(true);
      toast.info(`The '${value}' AI model requires an upgrade.`);
      return;
    }
    setAiModel(value);
  };

  const handlePageRangeChange = (start: number, end: number) => {
    setPageRange({
      start: Math.max(1, start),
      end: Math.min(fileMetadata?.pageCount || end, end)
    });
  };

  const pageRangeExceedsLimit = isPDF && (pageRange.end - pageRange.start + 1 > limits.maxPages);

  return (
    <>
      <main className="min-h-screen bg-gradient-to-b from-background to-background/80 py-12 px-4">
        <div className="max-w-3xl mx-auto space-y-6">
          <Card className="border border-primary/10 bg-card/50 backdrop-blur-sm overflow-hidden">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2 mb-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCancel}
                  disabled={isGenerating}
                  className="mr-2 cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Badge variant="outline" className="text-xs font-medium px-2 py-0.5">
                  Configuration
                </Badge>
              </div>
              <CardTitle className="text-2xl md:text-3xl font-bold">Configure Study Session</CardTitle>
              <CardDescription>Customize how your study materials will be generated from your document</CardDescription>
            </CardHeader>

            <CardContent className="space-y-8">
              {/* File Information */}
              <div className="flex items-center p-4 rounded-lg bg-muted/30 border border-muted">
                <div className="mr-4 p-3 rounded-full bg-muted">{getFileIcon()}</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium truncate">{fileMetadata.originalName}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                    <span>{formatFileSize(fileMetadata.size)}</span>
                    {isPDF && fileMetadata.pageCount && <span>{fileMetadata.pageCount} pages</span>}
                    {!isPDF && <span>{fileMetadata.type}</span>}
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                {/* Question Amount */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Question Amount</Label>
                    <Badge variant="secondary" className="font-mono">
                      Dynamic
                    </Badge>
                  </div>

                  <RadioGroup
                    value={difficulty}
                    onValueChange={(value) => handleDifficultyChange(value as Difficulty)}
                    className="grid grid-cols-3 gap-3"
                  >
                    <Label className={cn("cursor-pointer", !limits.allowedDifficulties.includes("low") && "opacity-50 cursor-not-allowed")}>
                      <div className={cn("flex flex-col h-full rounded-lg border p-4 hover:bg-muted/50 transition-colors [&:has([data-state=checked])]:bg-primary/5 [&:has([data-state=checked])]:border-primary/50",
                        !limits.allowedDifficulties.includes("low") && "pointer-events-none")}>
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value="low" id="low" disabled={!limits.allowedDifficulties.includes("low")} />
                          <div className="flex items-center justify-between flex-1">
                            <div className="font-medium">Low</div>
                          </div>
                          <Zap className="h-5 w-5 text-yellow-500" />
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          {QUESTION_RANGES.low.description}
                        </div>
                      </div>
                    </Label>

                    <Label className={cn("cursor-pointer", !limits.allowedDifficulties.includes("moderate") && "opacity-50 cursor-not-allowed")}>
                      <div className={cn("flex flex-col h-full rounded-lg border p-4 hover:bg-muted/50 transition-colors [&:has([data-state=checked])]:bg-primary/5 [&:has([data-state=checked])]:border-primary/50",
                        !limits.allowedDifficulties.includes("moderate") && "pointer-events-none")}>
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value="moderate" id="moderate" disabled={!limits.allowedDifficulties.includes("moderate")} />
                          <div className="flex items-center justify-between flex-1">
                            <div className="font-medium">Moderate</div>
                          </div>
                          <Brain className="h-5 w-5 text-blue-500" />
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          {QUESTION_RANGES.moderate.description}
                        </div>
                        <Badge variant="outline" className="text-xs font-medium px-2 py-0.5 mt-2">
                          Premium
                        </Badge>
                      </div>
                    </Label>

                    <Label className={cn("cursor-pointer", !limits.allowedDifficulties.includes("high") && "opacity-50 cursor-not-allowed")}>
                      <div className={cn("flex flex-col h-full rounded-lg border p-4 hover:bg-muted/50 transition-colors [&:has([data-state=checked])]:bg-primary/5 [&:has([data-state=checked])]:border-primary/50",
                        !limits.allowedDifficulties.includes("high") && "pointer-events-none")}>
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value="high" id="high" disabled={!limits.allowedDifficulties.includes("high")} />
                          <div className="flex items-center justify-between flex-1">
                            <div className="font-medium">High</div>
                          </div>
                          <Sparkles className="h-5 w-5 text-purple-500" />
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          {QUESTION_RANGES.high.description}
                        </div>
                        <Badge variant="outline" className="text-xs font-medium px-2 py-0.5 mt-2">
                          Premium
                        </Badge>
                      </div>
                    </Label>
                  </RadioGroup>
                </div>

                {/* AI Model */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-medium">AI Model</Label>
                    <p className="text-sm text-muted-foreground mt-1">Select which AI model to use for generation</p>
                  </div>

                  <RadioGroup
                    value={aiModel}
                    onValueChange={(value) => handleAiModelChange(value as AiModel)}
                    className="grid grid-cols-2 gap-3"
                  >
                    <Label className={cn("cursor-pointer", !limits.allowedAiModels.includes("standard") && "opacity-50 cursor-not-allowed")}>
                      <div className={cn("flex items-center space-x-3 rounded-lg border p-4 hover:bg-muted/50 transition-colors [&:has([data-state=checked])]:bg-primary/5 [&:has([data-state=checked])]:border-primary/50 h-full",
                        !limits.allowedAiModels.includes("standard") && "pointer-events-none")}>
                        <RadioGroupItem value="standard" id="standard" disabled={!limits.allowedAiModels.includes("standard")} />
                        <div className="flex-1">
                          <div className="font-medium">Standard</div>
                          <div className="text-sm text-muted-foreground mt-0.5">
                            Faster generation, good for most documents
                          </div>
                        </div>
                      </div>
                    </Label>

                    <Label className={cn("cursor-pointer", !limits.allowedAiModels.includes("advanced") && "opacity-50 cursor-not-allowed")}>
                      <div className={cn("flex items-center space-x-3 rounded-lg border p-4 hover:bg-muted/50 transition-colors [&:has([data-state=checked])]:bg-primary/5 [&:has([data-state=checked])]:border-primary/50 h-full",
                        !limits.allowedAiModels.includes("advanced") && "pointer-events-none")}>
                        <RadioGroupItem value="advanced" id="advanced" disabled={!limits.allowedAiModels.includes("advanced")} />
                        <div className="flex-1">
                          <div className="font-medium">Advanced</div>
                          <div className="text-sm text-muted-foreground mt-0.5">
                            Higher quality questions, better for complex topics
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs font-medium px-2 py-0.5">
                          Premium
                        </Badge>
                      </div>
                    </Label>
                  </RadioGroup>
                </div>

                {/* Page Range (for PDFs) */}
                {isPDF && fileMetadata.pageCount && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">Page Range</Label>
                      <Badge variant={pageRangeExceedsLimit ? "destructive" : "secondary"} className="font-mono">
                        {pageRange.end - pageRange.start + 1} pages selected
                      </Badge>
                    </div>

                    <div className="pt-2">
                      <Slider
                        min={1}
                        max={fileMetadata.pageCount}
                        step={1}
                        value={[pageRange.start, pageRange.end]}
                        onValueChange={(values) => {
                          if (values.length === 2) {
                            handlePageRangeChange(values[0], values[1]);
                          }
                        }}
                        className={cn("mt-2", isGenerating && "opacity-50")}
                        disabled={isGenerating}
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-2">
                        <span>Page 1</span>
                        <span>Page {fileMetadata.pageCount}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6 mt-4">
                      <div>
                        <Label className="text-sm">Start Page</Label>
                        <Input
                          type="number"
                          min={1}
                          max={pageRange.end}
                          value={pageRange.start}
                          onChange={(e) => handlePageRangeChange(parseInt(e.target.value) || 1, pageRange.end)}
                          disabled={isGenerating}
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">End Page</Label>
                        <Input
                          type="number"
                          min={pageRange.start}
                          max={fileMetadata.pageCount}
                          value={pageRange.end}
                          onChange={(e) => handlePageRangeChange(pageRange.start, parseInt(e.target.value) || pageRange.start)}
                          disabled={isGenerating}
                          className="mt-1.5"
                        />
                      </div>
                    </div>

                    {fileMetadata.pageCount > FREEMIUM_LIMITS.FREE.maxPages && subscription?.status !== 'active' && (
                      <div className="mt-2 text-sm text-amber-500 flex items-center gap-2">
                        <span>Free plan processes up to {FREEMIUM_LIMITS.FREE.maxPages} pages.</span>
                        <Button variant="link" className="text-blue-500 p-0 h-auto font-medium" onClick={() => setShowPricing(true)}>Upgrade</Button>
                      </div>
                    )}
                    {pageRangeExceedsLimit && (
                      <div className="mt-2 text-sm text-red-500">
                        Selected page range exceeds your plan&apos;s limit of {limits.maxPages} pages. Generation is disabled.
                      </div>
                    )}
                  </div>
                )}

                {/* Estimated Time */}
                <div className="flex items-center p-4 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="mr-4 p-2 rounded-full bg-primary/10">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium">Estimated Study Time</h3>
                    <p className="text-sm text-muted-foreground">
                      Approximately {estimatedTime} minutes to complete this session
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex justify-between pt-2">
              <Button variant="outline" onClick={handleCancel} disabled={isGenerating} className="cursor-pointer">
                Cancel
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || pageRangeExceedsLimit}
                className="gap-2 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {generationStep || `Generating... ${generationProgress}%`}
                  </>
                ) : (
                  <>
                    <BookOpen className="h-4 w-4" />
                    Start Study Session
                  </>
                )}
              </Button>
            </CardFooter>

            {/* Generation Progress */}
            {isGenerating && (
              <div className="px-6 pb-6">
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${generationProgress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  {generationStep || 'Starting generation...'}
                </p>
              </div>
            )}
          </Card>
        </div>
      </main>

      <PricingModal
        open={showPricing}
        onOpenChange={setShowPricing}
        subscription={subscription}
      />
    </>
  );
}

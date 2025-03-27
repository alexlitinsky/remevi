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

interface UploadInfo {
  uploadId: string
  filePath: string
  metadata: {
    originalName: string
    type: string
    size: number
    pageCount?: number
  }
}

// TODO: modify these in the future
const QUESTION_RANGES = {
  low: { min: 1, max: 20, description: "Good for a quick review session" },
  moderate: { min: 20, max: 40, description: "Balanced for thorough learning" },
  high: { min: 40, max: 60, description: "Comprehensive coverage of material" },
} as const

type AiModel = "standard" | "advanced"

interface PageRange {
  start: number
  end: number
}

export default function ConfigurePage() {
  const router = useRouter()
  const [uploadInfo, setUploadInfo] = useState<UploadInfo | null>(null)
  const [difficulty, setDifficulty] = useState<Difficulty>("low")
  const [pageRange, setPageRange] = useState<PageRange>({ start: 1, end: 1 })
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [aiModel, setAiModel] = useState<AiModel>("standard")
  const [showPricing, setShowPricing] = useState(false)
  const { subscription, isLoading } = useSubscription()

  const limits = subscription?.status === "active" ? FREEMIUM_LIMITS.PRO : FREEMIUM_LIMITS.FREE

  useEffect(() => {
    const pendingUploadInfo = localStorage.getItem('pendingUploadInfo')
    if (!pendingUploadInfo) {
      router.push('/')
      return
    }
    const info = JSON.parse(pendingUploadInfo)

    // Check file size limit
    if (info.metadata.size > limits.maxFileSize) {
      toast.error(`File size exceeds ${limits.maxFileSize / (1024 * 1024)}MB limit`)
      router.push('/')
      return
    }

    setUploadInfo(info)

    // Set initial page range based on document and limits
    if (info?.metadata?.pageCount) {
      const maxPages = Math.min(info.metadata.pageCount, limits.maxPages)
      setPageRange({
        start: 1,
        end: maxPages,
      })
    }
  }, [router, limits.maxFileSize, limits.maxPages])

  const handleGenerate = async () => {
    if (!uploadInfo) return

    setIsGenerating(true)
    let progressInterval: NodeJS.Timeout | undefined

    try {
      // Start progress animation
      progressInterval = setInterval(() => {
        setGenerationProgress((prev) => {
          if (prev >= 100) {
            if (progressInterval) clearInterval(progressInterval)
            return 100
          }
          return prev + Math.floor(Math.random() * 10) + 1
        })
      }, 500)

      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uploadId: uploadInfo.uploadId,
          filePath: uploadInfo.filePath,
          metadata: uploadInfo.metadata,
          questionCount: QUESTION_RANGES[difficulty].max,
          pageRange: uploadInfo.metadata.type.includes('pdf') ? pageRange : undefined,
          aiModel,
          difficulty
        }),
      })

      if (!response.ok) {
        const errorMessage = await response.text()
        toast.error(errorMessage)
        if (errorMessage.includes('not available in your plan') || errorMessage.includes('exceeds your plan')) {
          setShowPricing(true)
        }
        return
      }

      const { deckId } = await response.json()
      localStorage.removeItem('pendingUploadInfo')
      router.push(`/deck/${deckId}/session`)
    } catch (error) {
      console.error('Error generating questions:', error)
      toast.error('Failed to generate study materials')
    } finally {
      if (progressInterval) clearInterval(progressInterval)
      setIsGenerating(false)
      setGenerationProgress(0)
    }
  }

  const handleCancel = () => {
    localStorage.removeItem('pendingUploadInfo')
    router.push('/')
  }

  const getFileIcon = () => {
    if (!uploadInfo) return <FileText className="h-6 w-6" />

    const fileType = uploadInfo.metadata.type
    if (fileType.includes("pdf")) return <FilePdf className="h-6 w-6 text-red-500" />
    if (fileType.includes("image")) return <FileImage className="h-6 w-6 text-blue-500" />
    return <FileText className="h-6 w-6 text-green-500" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-background to-background/80">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="text-muted-foreground animate-pulse">Loading subscription status...</p>
        </div>
      </div>
    )
  }

  if (!uploadInfo) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-background to-background/80">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          <p className="text-muted-foreground animate-pulse">Loading document information...</p>
        </div>
      </div>
    )
  }

  const isPDF = uploadInfo?.metadata.type.includes("pdf")
  const estimatedQuestionCount =
    QUESTION_RANGES[difficulty].min +
    Math.floor(Math.random() * (QUESTION_RANGES[difficulty].max - QUESTION_RANGES[difficulty].min))

  const estimatedTime = Math.round(estimatedQuestionCount * 1.5)

  const handleDifficultyChange = (value: Difficulty) => {
    if (!limits.allowedDifficulties.includes(value as any)) {
      setShowPricing(true)
      return
    }
    setDifficulty(value)
  }

  const handleAiModelChange = (value: AiModel) => {
    if (!limits.allowedAiModels.includes(value as any)) {
      setShowPricing(true)
      return
    }
    setAiModel(value)
  }

  const handlePageRangeChange = (start: number, end: number) => {
    if (end - start + 1 > limits.maxPages) {
      toast.error(`Free users can only process up to ${limits.maxPages} pages`)
      setShowPricing(true)
      return
    }
    setPageRange({ start, end })
  }

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
                  className="mr-2"
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
                  <h3 className="font-medium truncate">{uploadInfo.metadata.originalName}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                    <span>{formatFileSize(uploadInfo.metadata.size)}</span>
                    {isPDF && uploadInfo.metadata.pageCount && <span>{uploadInfo.metadata.pageCount} pages</span>}
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                {/* Question Amount */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-medium">Question Amount</Label>
                    <Badge variant="secondary" className="font-mono">
                      ~{estimatedQuestionCount} questions
                    </Badge>
                  </div>

                  <RadioGroup
                    value={difficulty}
                    onValueChange={(value) => handleDifficultyChange(value as any)}
                    className="grid grid-cols-3 gap-3"
                  >
                    <Label className="cursor-pointer">
                      <div className="flex flex-col h-full rounded-lg border p-4 hover:bg-muted/50 transition-colors [&:has([data-state=checked])]:bg-primary/5 [&:has([data-state=checked])]:border-primary/50">
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value="low" id="low" />
                          <div className="flex items-center justify-between flex-1">
                            <div className="font-medium">Low</div>
                            <div className="text-sm">1-20</div>
                          </div>
                          <Zap className="h-5 w-5 text-yellow-500" />
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          {QUESTION_RANGES.low.description}
                        </div>
                      </div>
                    </Label>

                    <Label className={cn("cursor-pointer", !limits.allowedDifficulties.includes("moderate" as any) && "opacity-50")}>
                      <div className="flex flex-col h-full rounded-lg border p-4 hover:bg-muted/50 transition-colors [&:has([data-state=checked])]:bg-primary/5 [&:has([data-state=checked])]:border-primary/50">
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value="moderate" id="moderate" />
                          <div className="flex items-center justify-between flex-1">
                            <div className="font-medium">Moderate</div>
                            <div className="text-sm">20-40</div>
                          </div>
                          <Brain className="h-5 w-5 text-blue-500" />
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          {QUESTION_RANGES.moderate.description}
                        </div>
                      </div>
                    </Label>

                    <Label className={cn("cursor-pointer", !limits.allowedDifficulties.includes("high" as any) && "opacity-50")}>
                      <div className="flex flex-col h-full rounded-lg border p-4 hover:bg-muted/50 transition-colors [&:has([data-state=checked])]:bg-primary/5 [&:has([data-state=checked])]:border-primary/50">
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value="high" id="high" />
                          <div className="flex items-center justify-between flex-1">
                            <div className="font-medium">High</div>
                            <div className="text-sm">40-60</div>
                          </div>
                          <Sparkles className="h-5 w-5 text-purple-500" />
                        </div>
                        <div className="mt-2 text-sm text-muted-foreground">
                          {QUESTION_RANGES.high.description}
                        </div>
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
                    onValueChange={(value) => handleAiModelChange(value as any)}
                    className="grid grid-cols-2 gap-3"
                  >
                    <Label className="cursor-pointer">
                      <div className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-muted/50 transition-colors [&:has([data-state=checked])]:bg-primary/5 [&:has([data-state=checked])]:border-primary/50 h-full">
                        <RadioGroupItem value="standard" id="standard" />
                        <div className="flex-1">
                          <div className="font-medium">Standard</div>
                          <div className="text-sm text-muted-foreground mt-0.5">
                            Faster generation, good for most documents
                          </div>
                        </div>
                      </div>
                    </Label>

                    <Label className={cn("cursor-pointer", !limits.allowedAiModels.includes("advanced" as any) && "opacity-50")}>
                      <div className="flex items-center space-x-3 rounded-lg border p-4 hover:bg-muted/50 transition-colors [&:has([data-state=checked])]:bg-primary/5 [&:has([data-state=checked])]:border-primary/50 h-full">
                        <RadioGroupItem value="advanced" id="advanced" />
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
                {isPDF && uploadInfo.metadata.pageCount && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-medium">Page Range</Label>
                      <Badge variant="secondary" className="font-mono">
                        {pageRange.end - pageRange.start + 1} pages
                      </Badge>
                    </div>

                    <div className="pt-2">
                      <Slider
                        min={1}
                        max={Math.min(uploadInfo.metadata.pageCount, limits.maxPages)}
                        step={1}
                        value={[pageRange.start, pageRange.end]}
                        onValueChange={(values) => {
                          if (values.length === 2) {
                            handlePageRangeChange(values[0], values[1])
                          }
                        }}
                        className="mt-2"
                      />
                      <div className="flex justify-between text-xs text-muted-foreground mt-2">
                        <span>Page 1</span>
                        <span>Page {uploadInfo.metadata.pageCount}</span>
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
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setPageRange({
                              ...pageRange,
                              start: Math.max(1, Math.min(pageRange.end, parseInt(e.target.value) || 1)),
                            })
                          }
                          className="mt-1.5"
                        />
                      </div>
                      <div>
                        <Label className="text-sm">End Page</Label>
                        <Input
                          type="number"
                          min={pageRange.start}
                          max={uploadInfo.metadata.pageCount}
                          value={pageRange.end}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                            setPageRange({
                              ...pageRange,
                              end: Math.max(
                                pageRange.start,
                                Math.min(uploadInfo.metadata.pageCount || 1, parseInt(e.target.value) || pageRange.start),
                              ),
                            })
                          }
                          className="mt-1.5"
                        />
                      </div>
                    </div>

                    {/* Add upgrade prompt if document exceeds free limit */}
                    {uploadInfo.metadata.pageCount > limits.maxPages && (
                      <div className="mt-2 text-sm text-amber-500 flex items-center gap-2">
                        <span>Upgrade to process more than {limits.maxPages} pages</span>
                        <Button
                          variant="link"
                          className="text-blue-500 p-0 h-auto font-medium"
                          onClick={() => setShowPricing(true)}
                        >
                          Learn more
                        </Button>
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
              <Button onClick={handleGenerate} disabled={isGenerating} className="gap-2 cursor-pointer">
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating... {generationProgress}%
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
                  {generationProgress < 30
                    ? "Analyzing document content..."
                    : generationProgress < 60
                      ? "Generating questions and answers..."
                      : generationProgress < 90
                        ? "Creating flashcards..."
                        : "Finalizing your study materials..."}
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
  )
}

import React from "react"
import { cn } from "@/lib/utils"
import { Button } from "./button"
import { Upload } from "lucide-react"

interface FileUploadProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onFileSelect: (file: File) => void
  accept?: string
  buttonText?: string
}

export function FileUpload({
  className,
  onFileSelect,
  accept = ".pdf,.doc,.docx",
  buttonText = "Upload File",
  ...props
}: FileUploadProps) {
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      onFileSelect(file)
    }
  }

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <input
        type="file"
        onChange={handleFileChange}
        accept={accept}
        {...props}
        id="file-upload"
        className="sr-only"
        style={{
          position: "absolute",
          width: "1px",
          height: "1px",
          padding: 0,
          margin: "-1px",
          overflow: "hidden",
          clip: "rect(0,0,0,0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      />
      <label htmlFor="file-upload">
        <Button type="button" variant="outline" asChild>
          <span className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            {buttonText}
          </span>
        </Button>
      </label>
    </div>
  )
} 
"use client";

import React, { useState, useRef } from "react";
import { FileText, Image as ImageIcon, File, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FileUploaderProps {
  onFileSelect: (files: File[]) => void;
  isLoading?: boolean;
  disabled?: boolean;
  maxFiles?: number;
  translations: {
    dropFiles: string;
    supportedFormats: string;
    browseFiles: string;
  };
}

export function FileUploader({
  onFileSelect,
  isLoading,
  disabled,
  maxFiles = 10,
  translations,
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled || isLoading) return;
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled || isLoading) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).slice(0, maxFiles);
      onFileSelect(files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files).slice(0, maxFiles);
      onFileSelect(files);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        "relative rounded-xl border-2 border-dashed transition-all ease-in-out p-12 flex flex-col items-center justify-center gap-4",
        isDragging
          ? "border-primary bg-primary/5 scale-[1.01]"
          : "border-muted-foreground/20 hover:border-muted-foreground/40 bg-muted/30",
        (disabled || isLoading) && "opacity-50 cursor-not-allowed",
      )}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,application/pdf"
        multiple
        disabled={disabled || isLoading}
      />

      <div className="flex items-center gap-4 mb-2">
        <div className="p-3 rounded-lg bg-orange-100 text-orange-600 shadow-sm">
          <FileText className="h-6 w-6" />
        </div>
        <div className="p-3 rounded-lg bg-green-100 text-green-600 shadow-sm">
          <ImageIcon className="h-6 w-6" />
        </div>
        <div className="p-3 rounded-lg bg-primary/10 text-primary shadow-sm">
          <File className="h-6 w-6" />
        </div>
      </div>

      <div className="text-center space-y-1">
        <h3 className="text-xl font-bold tracking-tight text-foreground">
          {translations.dropFiles}
        </h3>
        <p className="text-sm text-muted-foreground">
          {translations.supportedFormats}
        </p>
      </div>

      <Button
        type="button"
        variant="secondary"
        onClick={() => fileInputRef.current?.click()}
        disabled={disabled || isLoading}
        className="mt-2 bg-card text-foreground border shadow-sm hover:bg-primary-600 hover:text-white hover:border-primary-600 transition-all duration-300 ease-in-out flex items-center gap-2 px-10 py-7 text-xl font-extrabold"
      >
        <Upload className="h-6 w-6" />
        {translations.browseFiles}
      </Button>

      {isLoading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] flex items-center justify-center rounded-xl">
          <div className="flex flex-col items-center gap-2">
            <Upload className="h-8 w-8 animate-bounce text-primary" />
            <span className="text-xs font-medium animate-pulse">
              Processing...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

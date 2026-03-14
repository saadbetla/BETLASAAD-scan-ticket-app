import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PhotoCaptureProps {
  onCapture: (photoUrl: string) => void;
  currentPhoto: string | null;
  onRemove: () => void;
}

export function PhotoCapture({ onCapture, currentPhoto, onRemove }: PhotoCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      onCapture(result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">Photo du ticket</label>
      <AnimatePresence mode="wait">
        {currentPhoto ? (
          <motion.div
            key="photo"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative rounded-lg overflow-hidden border border-border"
          >
            <img
              src={currentPhoto}
              alt="Ticket"
              className="w-full h-48 object-cover"
            />
            <div className="absolute top-2 right-2 flex gap-2">
              <Button
                size="icon"
                variant="secondary"
                className="h-8 w-8 rounded-full shadow-lg"
                onClick={() => fileInputRef.current?.click()}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="destructive"
                className="h-8 w-8 rounded-full shadow-lg"
                onClick={onRemove}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-36 rounded-lg border-2 border-dashed border-primary/30 bg-accent/50 flex flex-col items-center justify-center gap-2 hover:border-primary/60 hover:bg-accent transition-colors cursor-pointer"
          >
            <Camera className="h-8 w-8 text-primary" />
            <span className="text-sm text-muted-foreground">
              Prendre en photo ou importer
            </span>
          </motion.button>
        )}
      </AnimatePresence>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}

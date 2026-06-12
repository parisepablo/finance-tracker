"use client";

import { useState, useCallback } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { parseVoiceCharge, VoiceChargeResult } from "@/lib/parse-voice-charge";

interface SpeechRecognitionEvent extends Event {
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionResultList {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  readonly length: number;
  readonly isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  readonly transcript: string;
  readonly confidence: number;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: ((this: SpeechRecognition, ev: Event) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

interface VoiceMicButtonProps {
  categories: { id: string; name: string }[];
  onParsed: (result: Partial<VoiceChargeResult>) => void;
}

export function VoiceMicButton({ categories, onParsed }: VoiceMicButtonProps) {
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Voice input not available");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "es-AR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = () => {
      setIsRecording(false);
      toast.error("Voice input not available");
    };

    recognition.onresult = async (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      try {
        const result = await parseVoiceCharge(transcript, categories);
        onParsed(result);
        if (Object.keys(result).length > 0) {
          toast.success("Voice input processed");
        } else {
          toast.error("Could not parse voice input");
        }
      } catch {
        toast.error("Could not parse voice input");
      }
    };

    recognition.start();
  }, [categories, onParsed]);

  if (typeof window === "undefined") return null;
  if (
    !("SpeechRecognition" in window || "webkitSpeechRecognition" in window)
  ) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={startRecording}
      disabled={isRecording}
      className={
        isRecording
          ? "animate-pulse text-rose-400"
          : "text-zinc-400 hover:text-white"
      }
      aria-label={isRecording ? "Recording..." : "Voice input"}
    >
      {isRecording ? (
        <MicOff className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  );
}

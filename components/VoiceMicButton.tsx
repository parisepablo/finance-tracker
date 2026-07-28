"use client";

import { useState, useCallback } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { parseVoiceCharge, VoiceChargeResult } from "@/lib/parse-voice-charge";
import { UserPaymentContext } from "@/lib/parsers/parse-text-charge";
import { BudgetCategory, CreditCard, PaymentSource } from "@/lib/types";

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
  budgetCategories?: BudgetCategory[];
  cards?: CreditCard[];
  paymentSources?: PaymentSource[];
  defaultCreditCardId?: string | null;
  defaultPaymentSourceId?: string | null;
  defaultBudgetCategoryId?: string | null;
  defaultCurrency?: "ARS" | "USD";
  onParsed: (result: Partial<VoiceChargeResult>) => void;
  className?: string;
}

export function VoiceMicButton({
  categories,
  budgetCategories = [],
  cards = [],
  paymentSources = [],
  defaultCreditCardId,
  defaultPaymentSourceId,
  defaultBudgetCategoryId,
  defaultCurrency,
  onParsed,
  className,
}: VoiceMicButtonProps) {
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = useCallback(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Voice input is not supported on this browser. Try Chrome.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "es-AR";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsRecording(true);
    recognition.onend = () => setIsRecording(false);
    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsRecording(false);
      const messages: Record<string, string> = {
        "not-allowed": "Microphone permission denied.",
        "aborted": "Recording was cancelled.",
        "audio-capture": "No microphone found.",
        "network": "Network error during recording.",
        "no-speech": "No speech detected. Try again.",
        "service-not-allowed": "Voice service not allowed.",
      };
      toast.error(messages[event.error] || `Voice error: ${event.error}`);
    };

    recognition.onresult = async (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0][0].transcript;
      setIsRecording(false);

      const ctx: UserPaymentContext | undefined =
        cards.length > 0 || paymentSources.length > 0
          ? {
              cards,
              paymentSources,
              budgetCategories,
              defaultCreditCardId,
              defaultPaymentSourceId,
              defaultBudgetCategoryId,
              defaultCurrency,
            }
          : undefined;

      try {
        const { result, error, errorMessage } = await parseVoiceCharge(
          transcript,
          categories,
          ctx
        );

        if (error) {
          console.error("Voice parse error:", error, errorMessage);
          // If we have a partial fallback result, still apply it and warn
          if (Object.keys(result).length > 0) {
            onParsed(result);
            toast.success("Voice input parsed (with fallback)");
            return;
          }
          toast.error(errorMessage || "Could not parse voice input");
          return;
        }

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
  }, [
    categories,
    cards,
    paymentSources,
    defaultCreditCardId,
    defaultPaymentSourceId,
    defaultBudgetCategoryId,
    defaultCurrency,
    onParsed,
  ]);

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
      className={cn(
        isRecording
          ? "animate-pulse text-rose-400"
          : "text-zinc-400 hover:text-white",
        className
      )}
      aria-label={isRecording ? "Recording..." : "Voice input"}
      title={isRecording ? "Listening..." : "Tap to speak"}
    >
      {isRecording ? (
        <MicOff className="h-4 w-4" />
      ) : (
        <Mic className="h-4 w-4" />
      )}
    </Button>
  );
}

import { Difficulty } from "@/types/difficulty";
import { AiModel } from "@/types/ai";

export const FREEMIUM_LIMITS = {
  FREE: {
    maxPages: 5,
    maxDecks: 5,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedDifficulties: ["low"] as Difficulty[],
    allowedAiModels: ["standard"] as AiModel[],
  },
  PRO: {
    maxPages: Infinity,
    maxDecks: Infinity,
    maxFileSize: 32 * 1024 * 1024, // 32MB
    allowedDifficulties: ["low", "moderate", "high"] as Difficulty[],
    allowedAiModels: ["standard", "advanced"] as AiModel[],
  },
} as const;

export const SUBSCRIPTION_FEATURES = {
  FREE: {
    title: "Free",
    description: "Get started with basic features",
    features: [
      "Up to 5 pages per document",
      "Up to 5 study decks",
      "Standard AI model",
      "Basic difficulty level",
      "10MB file size limit",
    ],
  },
  PRO: {
    title: "Pro",
    description: "Unlock advanced features",
    features: [
      "Unlimited pages per document",
      "Unlimited study decks",
      "Advanced AI model",
      "All difficulty levels",
      "32MB file size limit",
      "Priority support",
    ],
  },
} as const; 
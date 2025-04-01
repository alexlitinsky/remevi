import { openai } from "@ai-sdk/openai";
import { deepseek } from "@ai-sdk/deepseek";
import { LanguageModelV1 } from "ai";

export const openai4oMiniResponsesProvider = openai.responses("gpt-4o-mini");
export const openai4oResponsesProvider = openai.responses("gpt-4o-2024-08-06");
export const deepseekProvider = deepseek("deepseek-chat") as LanguageModelV1;
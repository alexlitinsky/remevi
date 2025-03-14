import { openai } from "@ai-sdk/openai";
import {fireworks} from "@ai-sdk/fireworks";

export const openaiProvider = openai("gpt-4o-mini");
export const fireworksProvider = fireworks("accounts/fireworks/models/deepseek-r1");
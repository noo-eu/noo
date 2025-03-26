import { Ollama } from "./ollama";
import { OpenAITranslator } from "./openai";

export interface LLM {
  request(
    system: string,
    prompt: string,
  ): Promise<Record<string, string | string[]>>;
}

export function getLLMClient(api: string, model: string): LLM {
  switch (api) {
    case "ollama":
      return new Ollama(model);
    case "openai":
      return new OpenAITranslator(model);
    default:
      throw new Error(`Unknown API: ${api}`);
  }
}

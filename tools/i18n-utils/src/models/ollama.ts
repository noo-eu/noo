import { LLM } from ".";

export class Ollama implements LLM {
  model: string;

  constructor(model = "llama3.1") {
    this.model = model;
  }

  async request(system: string, prompt: string) {
    const ollamaHost = process.env.OLLAMA_HOST ?? "http://localhost:11434";

    const response = await fetch(`${ollamaHost}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        system,
        model: this.model,
        format: "json",
        stream: false,
      }),
    });

    const body = (await response.json()) as { response: string };
    return JSON.parse(body.response);
  }
}

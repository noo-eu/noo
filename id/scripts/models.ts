import OpenAI from "openai";

interface LLM {
  request(
    system: string,
    prompt: string,
  ): Promise<Record<string, string | string[]>>;
}

class Ollama implements LLM {
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

    const body = await response.json();
    return JSON.parse(body.response);
  }
}

class OpenAITranslator implements LLM {
  client: OpenAI;
  model: string;

  constructor(model = "gpt-4o") {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("Missing OPENAI_API_KEY environment variable");
    }

    this.client = new OpenAI();
    this.model = model;
  }

  async request(system: string, prompt: string) {
    const chatCompletion = await this.client.chat.completions.create({
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
      model: this.model,
      response_format: { type: "json_object" },
    });

    const content = chatCompletion.choices[0].message.content!;
    return JSON.parse(content);
  }
}

export function getClient(): LLM {
  // Check if a --model flag is passed
  let model = undefined;
  if (process.argv.includes("--model")) {
    model = process.argv[process.argv.indexOf("--model") + 1];
  }

  let client = new Ollama(model);

  if (
    process.argv.includes("--api") &&
    process.argv[process.argv.indexOf("--api") + 1] === "openai"
  ) {
    client = new OpenAITranslator(model);
  }

  return client;
}

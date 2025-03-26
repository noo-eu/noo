import OpenAI from "openai";
import { LLM } from ".";

export class OpenAITranslator implements LLM {
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

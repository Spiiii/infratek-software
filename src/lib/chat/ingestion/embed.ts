import type { EmbeddingProvider } from "./types.ts";

export function createGeminiEmbeddingProvider(options: {
  apiKey: string;
  model: string;
  dimension: number;
}): EmbeddingProvider {
  if (!options.apiKey.trim()) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is required");
  let callCount = 0;
  const clientPromise = import("@google/genai").then(
    ({ GoogleGenAI }) => new GoogleGenAI({ apiKey: options.apiKey }),
  );

  return {
    get calls() {
      return callCount;
    },
    async embed(input) {
      const client = await clientPromise;
      callCount += 1;
      const response = await client.models.embedContent({
        model: options.model,
        contents: input,
        config: { outputDimensionality: options.dimension },
      });
      const values = response.embeddings?.[0]?.values;
      if (!values || values.length !== options.dimension) {
        throw new Error(`Embedding provider returned an unexpected dimension`);
      }
      return values;
    },
  };
}

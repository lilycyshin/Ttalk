// Gemini 공통: 클라이언트, 모델, JSON 응답 호출. 키(GEMINI_API_KEY)가 없으면 client는 null.
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";

// 모델은 GEMINI_MODEL 환경변수로 바꿀 수 있다.
export const MODEL = process.env.GEMINI_MODEL || "gemini-flash-lite-latest";
// 가라톡처럼 품질보다 값이 중요한 곳: 환경변수와 상관없이 가장 싼 Flash Lite.
export const CHEAP_MODEL = "gemini-flash-lite-latest";

export const geminiClient = () =>
  process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

// Gemini에 넘길 JSON 스키마. $schema 메타 키는 빼고 보낸다.
export function jsonSchemaOf(schema: z.ZodType) {
  const { $schema: _meta, ...rest } = z.toJSONSchema(schema) as Record<string, unknown>;
  return rest;
}

// systemInstruction + 프롬프트로 스키마에 맞는 JSON을 받는다.
export async function generateJson<T extends z.ZodType>(
  ai: GoogleGenAI,
  schema: T,
  system: string,
  contents: string,
): Promise<z.infer<T>> {
  const res = await ai.models.generateContent({
    model: MODEL,
    contents,
    config: { systemInstruction: system, responseMimeType: "application/json", responseJsonSchema: jsonSchemaOf(schema) },
  });
  if (!res.text) throw new Error(`empty response (${res.candidates?.[0]?.finishReason ?? "unknown"})`);
  const parsed = schema.safeParse(JSON.parse(res.text));
  if (!parsed.success) throw new Error("schema mismatch");
  return parsed.data;
}

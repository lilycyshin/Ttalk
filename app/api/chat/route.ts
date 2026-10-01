// 가(라)톡: 점심 자리에서 "카톡하는 척"할 때 친구처럼 답장해 주는 가짜 대화 상대.
// POST { messages: [{ from: "me" | "friend", text }] } → { reply }
import { MODEL, geminiClient } from "@/lib/gemini";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const SYSTEM = `너는 "정대호"다. 사용자의 오래된 친구이고, 사용자는 지금 회사 점심 자리에서 어색해서 카톡하는 척 너랑 대화하고 있다.

규칙:
- 카톡처럼 반말로 짧게 답한다. 보통 한두 문장, 길어도 세 문장.
- 자연스러운 20~30대 말투. "ㅋㅋ", "ㅇㅇ", "헐" 정도는 가끔 써도 되지만 이모지는 쓰지 않는다.
- 대화가 이어지게 가끔 가벼운 질문을 던진다. 사용자가 짧게 보내면 너도 짧게.
- 사용자가 점심이 어색하다고 하면 공감하고 살짝 웃기게 위로한다.
- 개인정보를 묻거나, 위험하거나 불쾌한 얘기는 가볍게 다른 화제로 넘긴다.`;

// 키가 없을 때 쓰는 답장
const CANNED = ["ㅇㅇ 그래서?", "헐 진짜?", "ㅋㅋㅋ 그건 좀 웃기다", "아 그거 나도 봤어", "점심 뭐 먹었어?", "오 대박", "ㄹㅇ 공감"];

type Msg = { from: "me" | "friend"; text: string };

export async function POST(req: Request) {
  let messages: Msg[] = [];
  try {
    const body = await req.json();
    messages = (Array.isArray(body?.messages) ? body.messages : [])
      .filter((m: Msg) => (m?.from === "me" || m?.from === "friend") && typeof m.text === "string")
      .slice(-16)
      .map((m: Msg) => ({ from: m.from, text: m.text.slice(0, 300) }));
  } catch {}
  if (!messages.length || messages[messages.length - 1].from !== "me")
    return Response.json({ error: "bad request" }, { status: 400 });

  const ai = geminiClient();
  if (!ai) return Response.json({ reply: CANNED[Math.floor(Math.random() * CANNED.length)] });

  try {
    const res = await ai.models.generateContent({
      model: MODEL,
      contents: messages.map((m) => ({ role: m.from === "me" ? "user" : "model", parts: [{ text: m.text }] })),
      config: { systemInstruction: SYSTEM, maxOutputTokens: 200 },
    });
    const reply = res.text?.trim();
    if (!reply) throw new Error(`empty (${res.candidates?.[0]?.finishReason ?? "unknown"})`);
    return Response.json({ reply });
  } catch (e) {
    console.error("chat failed:", e);
    return Response.json({ reply: "앗 잠깐 렉 걸림 ㅋㅋ 다시 보내줘" });
  }
}

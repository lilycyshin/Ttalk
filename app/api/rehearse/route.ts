// 스몰토크 생존기 리허설. Gemini가 상대 역할을 하고, 내가 답할 만한 말 3개를 제안한다.
// 내가 REHEARSAL_TURNS번 답하면 마지막 반응과 피드백을 준다.
// POST { scenario, partner, history: [{ from: "me" | "them", text }], introversion?, teamMood? }
import { z } from "zod";
import { generateJson, geminiClient } from "@/lib/gemini";
import { PARTNERS, REHEARSAL_TURNS, SCENARIOS } from "@/lib/scenarios";
import { TEAM_MOODS, TEAM_MOOD_DESC, introvertLevel } from "@/lib/persona";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const Result = z.object({
  line: z.string().describe("상대가 지금 하는 말. 1~2문장. 상황 묘사 없이 대사만"),
  suggestions: z.array(z.string()).describe("내가 이어서 할 만한 자연스러운 답 3개. 각각 한 문장, 서로 다른 방향"),
  feedback: z
    .object({
      score: z.number().describe("스몰토크 점수 1~5"),
      good: z.string().describe("잘한 점 한 문장"),
      tip: z.string().describe("다음에 써먹을 팁 한 문장. 구체적인 예시 멘트 포함"),
    })
    .optional()
    .describe("리허설이 끝났을 때만"),
});

const SYSTEM = `너는 내향적인 직장인의 스몰토크 연습 상대다. 주어진 회사 상황과 상대 역할을 그대로 연기한다.

규칙:
- 상대의 대사는 실제 한국 회사에서 들을 법한 자연스러운 말투. 상대 나이와 관계에 맞춰 존댓말/반말을 정한다.
- 대사는 짧게 1~2문장. 지문이나 괄호 설명은 쓰지 않는다.
- 사용자의 답이 짧거나 어색해도 현실적으로 반응하되, 너무 무안하게 만들지는 않는다.
- suggestions는 사용자가 바로 따라 말할 수 있는 짧은 문장 3개. 하나는 무난한 답, 하나는 질문으로 되묻기, 하나는 살짝 재치 있는 답.
- 이모지는 쓰지 않는다.
- 리허설이 끝날 때는 line에 상대의 마지막 한마디(헤어지는 인사 등)를 쓰고, feedback에 점수와 잘한 점, 팁을 준다. 끝이 아니면 feedback은 비운다.`;

const Msg = z.object({ from: z.enum(["me", "them"]), text: z.string().max(300) });
const Body = z.object({
  scenario: z.enum(SCENARIOS.map((s) => s.id) as [string, ...string[]]),
  partner: z.enum(PARTNERS.map((p) => p.id) as [string, ...string[]]),
  history: z.array(Msg).max(REHEARSAL_TURNS * 2 + 1),
  introversion: z.number().min(0).max(5).optional(), // 1~4 (예전 값은 0~5)
  teamMood: z.enum(TEAM_MOODS).optional(),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "bad request" }, { status: 400 });
  const { scenario, partner, history, introversion, teamMood } = parsed.data;
  const sc = SCENARIOS.find((s) => s.id === scenario)!;
  const pt = PARTNERS.find((p) => p.id === partner)!;
  const myTurns = history.filter((m) => m.from === "me").length;
  const done = myTurns >= REHEARSAL_TURNS;

  const ai = geminiClient();
  if (!ai) return Response.json(offline(myTurns, done));

  const prompt = [
    `상황: ${sc.title} - ${sc.desc}`,
    `상대: ${pt.label} (${pt.desc})`,
    teamMood ? `팀 분위기: ${TEAM_MOOD_DESC[teamMood]}` : "",
    introversion !== undefined ? `사용자 성향: ${introvertLevel(introversion).name} (내향 정도 ${introvertLevel(introversion).level}/4). 높을수록 suggestions를 더 쉽고 짧게.` : "",
    "",
    history.length
      ? `지금까지 대화:\n${history.map((m) => `${m.from === "me" ? "나" : pt.label}: ${m.text}`).join("\n")}`
      : "아직 대화 전이다. 상대가 먼저 자연스럽게 말을 건다(인사나 가벼운 한마디).",
    "",
    done
      ? `사용자가 ${REHEARSAL_TURNS}번 답했다. 리허설을 끝낸다: 마지막 한마디와 feedback을 채워라. suggestions는 빈 배열.`
      : "상대의 다음 대사와 suggestions 3개를 만들어라. feedback은 비운다.",
  ]
    .filter((l) => l !== undefined)
    .join("\n");

  try {
    const r = await generateJson(ai, Result, SYSTEM, prompt);
    return Response.json({
      line: r.line,
      suggestions: done ? [] : r.suggestions.slice(0, 3),
      done,
      feedback: done ? r.feedback ?? null : null,
    });
  } catch (e) {
    console.error("rehearse failed:", e);
    return Response.json({ error: "rehearse unavailable" }, { status: 503 });
  }
}

// Gemini 키가 없을 때(로컬 확인용) 쓰는 고정 흐름
function offline(myTurns: number, done: boolean) {
  const lines = ["아 안녕하세요. 일찍 오셨네요?", "그러게요. 요즘 좀 바쁘시죠?", "아 그렇구나. 주말엔 뭐 하셨어요?"];
  if (done)
    return {
      line: "아 저 먼저 들어가 볼게요. 이따 봬요!",
      suggestions: [],
      done: true,
      feedback: { score: 3, good: "끝까지 대화를 이어갔어요.", tip: "\"주말에 뭐 하셨어요?\"처럼 되묻는 질문 하나만 챙겨도 훨씬 편해져요." },
    };
  return {
    line: lines[myTurns] ?? lines[0],
    suggestions: ["네 안녕하세요!", "요즘 어떻게 지내세요?", "오늘 날씨 진짜 좋네요"],
    done: false,
    feedback: null,
  };
}

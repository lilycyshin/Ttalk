// 관심사별 후보 기사 → 스몰토크 토픽(연령대별 멘트 포함). 관심사마다 작은 호출을 병렬로 보내 빨리 끝낸다.
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import { AGE_GROUPS, INTERESTS, type Topic } from "@/lib/topics";
import type { Candidate, InterestId } from "./sources";

const INTEREST_IDS = INTERESTS.map((i) => i.id) as [InterestId, ...InterestId[]];

const Opener = z.object({
  opener: z.string().describe("점심 자리에서 바로 꺼낼 첫 마디. 한두 문장, 질문형"),
  follow_up: z.string().describe("상대가 반응했을 때 이어갈 한 마디"),
});

const TopicSchema = z.object({
  headline: z.string().describe("카드 제목. 짧은 주제 이름, 15자 이내"),
  summary: z.string().describe("대화 전에 알아둘 사실 1~2문장. 후보 제목에 없는 사실은 쓰지 않는다"),
  interests: z.array(z.enum(INTEREST_IDS)).describe("해당 관심사 1~3개. 요청받은 관심사를 반드시 포함"),
  age_fit: z.array(z.enum(AGE_GROUPS)).describe("이 주제에 반응이 좋을 상대 연령대"),
  source_titles: z.array(z.string()).describe("근거가 된 후보 제목"),
  openers: z.object({ "20s": Opener, "30s": Opener, "40s": Opener, "50s_plus": Opener }),
});
const ResultSchema = z.object({ topics: z.array(TopicSchema) });

const SYSTEM = `너는 내향적인 직장인이 점심시간에 회사 사람들과 가볍게 나눌 스몰토크 주제를 고르는 편집자다.

고르는 기준:
- 누구나 부담 없이 반응할 수 있는 주제만 고른다.
- 제외: 정치 갈등, 사건·사고·범죄·사망, 재난 피해, 종교, 성별·세대 갈등, 특정인 사생활 폭로, 광고성 기사. 후보가 전부 이런 거면 토픽을 0개로 돌려준다.
- 같은 사건은 하나로 합친다.
- interests 태그는 토픽 내용과 실제로 관련 있는 것만 단다.

멘트 규칙:
- 말하는 사람은 20~30대 직장인이다. 실제 2030이 회사에서 쓰는 자연스러운 구어체 해요체로 쓴다 ("~대요", "~던데요", "~더라고요", "은근", "완전" 정도는 괜찮다).
- 딱딱한 문어체·번역투 금지: "~하십니까", "~입니다", "~것 같습니다" 같은 말투는 50s_plus 상대여도 쓰지 않는다. 이모지·ㅋㅋ·과한 신조어도 쓰지 않는다.
- 상대 연령대에 맞춘다. 20s는 또래에게 쓰는 가벼운 말투, 30s·40s는 편한 윗사람에게, 50s_plus는 한참 윗사람에게 예의 있지만 부드러운 해요체.
- 호칭(부장님, 팀장님, 선배님, 과장님 등)은 쓰지 않는다. 바로 본론으로 시작한다.
- 기사 제목을 그대로 읽거나 따옴표로 인용하지 않는다. 기사 내용을 친구한테 말하듯 풀어서 말한다.
  예) 제목 "문근영, 결혼 후 첫 예능 나들이…'남편 자랑'" → "문근영 결혼했다는 기사 보셨어요?"
  예) 제목 "코스피, 美금리 부담에 사흘째 하락" → "요즘 코스피 사흘 연속 떨어졌대요, 주식 하세요?"
- headline은 기사 제목을 줄인 게 아니라 "문근영 결혼", "코스피 사흘째 하락"처럼 짧은 주제 이름으로 쓴다.
- "오늘 아시안게임 보셨어요?"처럼 상대가 한 마디로 답할 수 있는 질문으로 시작한다.
- 의견을 강요하거나 논쟁을 부르는 질문은 하지 않는다 (예: "집값 떨어져야죠?" 금지).
- 후보 제목에 없는 사실(점수, 수치, 이름)을 지어내지 않는다.`;

function buildPrompt(interest: InterestId, cands: Candidate[], date: string, count: number) {
  const label = INTERESTS.find((i) => i.id === interest)!.label;
  const lines = cands.map((c, i) => `${i + 1}. ${c.title}${c.source ? ` (${c.source})` : ""}`);
  return `오늘은 ${date}. 관심사 "${label}"(${interest}) 뉴스 후보다. 여기서 스몰토크 토픽을 최대 ${count}개 골라라.\n\n${lines.join("\n")}`;
}

// 모델은 GEMINI_MODEL 환경변수로 바꿀 수 있다.
const MODEL = process.env.GEMINI_MODEL || "gemini-flash-latest";
// Gemini에 넘길 JSON 스키마. $schema 메타 키는 빼고 보낸다.
const { $schema: _meta, ...RESULT_JSON_SCHEMA } = z.toJSONSchema(ResultSchema);

export async function generateForInterest(
  ai: GoogleGenAI,
  interest: InterestId,
  cands: Candidate[],
  date: string,
  count = 3,
): Promise<Topic[]> {
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: buildPrompt(interest, cands, date, count),
    config: {
      systemInstruction: SYSTEM,
      responseMimeType: "application/json",
      responseJsonSchema: RESULT_JSON_SCHEMA,
    },
  });
  if (!res.text) throw new Error(`${interest}: empty response (${res.candidates?.[0]?.finishReason ?? "unknown"})`);
  const parsed = ResultSchema.safeParse(JSON.parse(res.text));
  if (!parsed.success) throw new Error(`${interest}: schema mismatch`);
  // 요청한 관심사 태그가 빠졌으면 붙인다. 앱은 태그로 필터링하므로 빠지면 안 보인다.
  return parsed.data.topics.map((t) => ({
    ...t,
    interests: t.interests.includes(interest) ? t.interests : [interest, ...t.interests],
  }));
}

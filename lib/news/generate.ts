// 관심사별 후보 기사 → 스몰토크 토픽(연령대별 멘트 포함). 관심사마다 작은 호출을 병렬로 보내 빨리 끝낸다.
import type { GoogleGenAI } from "@google/genai";
import { generateJson } from "@/lib/gemini";
import { z } from "zod";
import { AGE_GROUPS, AGE_LABEL, INTERESTS, type AgeGroup, type Topic } from "@/lib/topics";
import type { Candidate, InterestId } from "./sources";
import { cluster } from "./similar";

const INTEREST_IDS = INTERESTS.map((i) => i.id) as [InterestId, ...InterestId[]];

const TopicSchema = z.object({
  headline: z.string().describe("카드 제목. 짧은 주제 이름, 15자 이내"),
  summary: z
    .string()
    .describe("무슨 일인지 2~3문장으로 구체적으로(누가, 무엇을, 수치). 같은 사건의 후보 제목 여러 개를 종합한다. 후보 제목·내용에 없는 사실은 쓰지 않는다"),
  background: z
    .string()
    .describe("이 주제를 잘 모르는 사람을 위한 배경 설명 2문장. 일반 상식 수준만 쓰고, 오늘 기사에 대한 새 사실(수치, 날짜, 발언)은 지어내지 않는다"),
  interests: z.array(z.enum(INTEREST_IDS)).describe("해당 관심사 1~3개. 요청받은 관심사를 반드시 포함"),
  age_fit: z.array(z.enum(AGE_GROUPS)).describe("이 주제에 반응이 좋을 상대 연령대"),
  keyword: z
    .string()
    .describe("사람들이 네이버에 실제로 검색하는 단어 하나. 띄어쓰기 없는 2~8자 명사로, 인물·작품·브랜드 이름이나 대표 키워드 (예: 제니, 문근영, 가을야구, 코스피, 아이폰18). 문장이나 여러 단어 조합은 쓰지 않는다"),
  source_titles: z.array(z.string()).describe("근거가 된 후보 제목. 후보 목록의 제목을 글자 그대로 옮긴다"),
  // 화면엔 같이 먹는 사람 중 가장 윗사람에게 하는 멘트 하나만 쓴다. 그 하나만 받아서 출력을 줄인다.
  opener: z.string().describe("점심 자리에서 바로 꺼낼 첫 마디. 한두 문장, 질문형. 프롬프트에 적힌 상대에게 하는 말투"),
});
const ResultSchema = z.object({ topics: z.array(TopicSchema) });

const SYSTEM = `너는 내향적인 직장인이 점심시간에 회사 사람들과 가볍게 나눌 스몰토크 주제를 고르는 편집자다.

고르는 기준:
- 누구나 부담 없이 반응할 수 있는 주제만 고른다.
- 제외: 정치 갈등, 사건·사고·범죄·사망, 재난 피해, 종교, 성별·세대 갈등, 특정인 사생활 폭로, 광고성 기사. 후보가 전부 이런 거면 토픽을 0개로 돌려준다.
- 서울에서 일하는 직장인 기준이다. 서울이 아닌 다른 지역 소식은 뺀다. 전국 공통 화제는 괜찮다.
- 같은 사건은 하나로 합친다.
- 요청받은 관심사와 실제로 관련 있는 기사만 고른다. 검색에 걸렸어도 주제가 다른 기사(예: 야구 관심사인데 정치·연예 기사)는 뺀다.
- interests 태그는 토픽 내용과 실제로 관련 있는 것만 단다.

멘트 규칙:
- 말하는 사람은 20~30대 직장인이다. 실제 2030이 회사에서 쓰는 자연스러운 구어체 해요체로 쓴다 ("~대요", "~던데요", "~더라고요", "은근", "완전" 정도는 괜찮다).
- 딱딱한 문어체·번역투 금지: "~하십니까", "~입니다", "~것 같습니다" 같은 말투는 50s_plus 상대여도 쓰지 않는다. 이모지·ㅋㅋ·과한 신조어도 쓰지 않는다.
- 상대 연령대에 맞춘다. 20s는 또래에게 쓰는 가벼운 말투, 30s·40s는 편한 윗사람에게, 50s_plus는 한참 윗사람에게 예의 있지만 부드러운 해요체.
- 호칭(부장님, 팀장님, 선배님, 과장님 등)은 쓰지 않는다. 바로 본론으로 시작한다.
- 기사 제목을 그대로 읽거나 따옴표로 인용하지 않는다. 기사 내용을 친구한테 말하듯 풀어서 말한다.
- "~기사 보셨어요?", "~뉴스 보셨어요?"처럼 기사나 뉴스 자체를 말하지 않는다. 직접 보고 들은 일처럼 일어난 일을 말한다.
  예) 제목 "광화문 하늘에 사람 있어요" → "광화문에서 오늘 공중쇼 한 거 보셨어요?"
  예) 제목 "문근영, 결혼 후 첫 예능 나들이…'남편 자랑'" → "문근영 결혼하고 예능 나왔던데 보셨어요?"
  예) 제목 "코스피, 美금리 부담에 사흘째 하락" → "요즘 코스피 사흘 연속 떨어졌대요, 주식 하세요?"
- headline은 기사 제목을 줄인 게 아니라 "문근영 결혼", "코스피 사흘째 하락"처럼 짧은 주제 이름으로 쓴다.
- "오늘 아시안게임 보셨어요?"처럼 상대가 한 마디로 답할 수 있는 질문으로 시작한다.
- 의견을 강요하거나 논쟁을 부르는 질문은 하지 않는다 (예: "집값 떨어져야죠?" 금지).
- 후보 제목과 내용에 없는 사실(점수, 수치, 이름)을 지어내지 않는다.`;

// 범위가 헷갈리기 쉬운 관심사는 무엇까지 넣는지 적어 준다.
const SCOPE: Partial<Record<InterestId, string>> = {
  tech_it:
    "AI·IT는 인공지능(챗GPT 같은 AI 서비스, AI 기업), IT 서비스·앱, 스마트폰·전자기기, 반도체·빅테크 소식만이다. 식품·화장품·패션 같은 일반 신제품, IT와 상관없는 기업 소식은 고르지 않는다. 고를 게 없으면 적게 골라도 된다.",
};

function buildPrompt(
  interest: InterestId,
  cands: Candidate[],
  date: string,
  count: number,
  ages: AgeGroup[],
) {
  const label = INTERESTS.find((i) => i.id === interest)!.label;
  const scope = SCOPE[interest] ? `\n${SCOPE[interest]}` : "";
  const now = `${date} ${new Date().toLocaleTimeString("ko-KR", { timeZone: "Asia/Seoul", hour: "2-digit", minute: "2-digit" })}`;
  const lines = cands.map((c, i) => {
    const head = `${i + 1}. ${c.title}${c.source ? ` (${c.source})` : ""}`;
    return c.description ? `${head}\n   내용: ${c.description}` : head;
  });
  // 같이 먹는 사람 연령대가 관심 가질 만한 기사를 우선 고르게 하고, 멘트는 그중 가장 윗사람에게 하는 말투로.
  const speakTo = ages.length ? ages[ages.length - 1] : "30s";
  const who = ages.length
    ? `\n오늘 같이 점심 먹는 사람: ${ages.map((a) => AGE_LABEL[a]).join(", ")}. 이 연령대가 실제로 관심 갖고 반응할 만한 기사를 우선 골라라.`
    : "";
  const tone = `\nopener는 ${AGE_LABEL[speakTo]}(${speakTo}) 상대에게 하는 말투로 쓴다.`;
  return `지금은 ${now}. 모든 후보는 최근 24시간 기사다. 관심사 "${label}"(${interest}) 뉴스 후보다. 여기서 스몰토크 토픽을 ${count}개 골라라. 제외 기준에 걸리지 않는 후보가 있으면 반드시 ${count}개를 채운다. 같은 사건은 합치되, 다른 사건은 작은 소식이라도 따로 토픽으로 만든다.${scope}${who}${tone}\n\n${lines.join("\n")}`;
}

// 한 번 부를 때 만들게 하는 토픽 수. 출력이 길수록 느리니 작게 나눠 동시에 부른다.
const PER_CALL = 4;

export async function generateForInterest(
  ai: GoogleGenAI,
  interest: InterestId,
  cands: Candidate[],
  date: string,
  count = 5,
  ages: AgeGroup[] = [],
): Promise<Topic[]> {
  // 후보 기사를 작은 묶음으로 나눠 동시에 부른다. 한 번에 많이 쓰게 하면 느리다 (출력 길이에 비례).
  const calls = Math.max(1, Math.min(Math.ceil(count / PER_CALL), Math.ceil(cands.length / 3)));
  // 같은 사건 기사끼리는 한 묶음에 넣어 모델이 하나로 합치게 하고, 사건 단위로 번갈아 나눈다.
  // (사건이 여러 묶음에 흩어지면 묶음마다 같은 토픽을 따로 만들어 중복이 생긴다)
  const events = cluster(cands, (c) => c.title);
  const chunks: Candidate[][] = Array.from({ length: calls }, () => []);
  events.forEach((g, i) => chunks[i % calls].push(...g));
  const each = Math.ceil(count / calls);
  const results = await Promise.allSettled(
    chunks.map((chunk) => generateJson(ai, ResultSchema, SYSTEM, buildPrompt(interest, chunk, date, each, ages))),
  );
  const ok = results.flatMap((r) => (r.status === "fulfilled" ? r.value.topics : []));
  if (!ok.length) {
    const failed = results.find((r): r is PromiseRejectedResult => r.status === "rejected");
    throw new Error(`${interest}: ${failed?.reason instanceof Error ? failed.reason.message : failed?.reason}`);
  }
  // 묶음 사이에 같은 사건이 겹치면 하나만. 멘트는 모든 연령 칸에 같은 걸 넣는다 (화면은 한 칸만 씀).
  const seen = new Set<string>();
  return ok
    .filter((t) => {
      const key = t.source_titles[0] ?? t.headline;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(({ opener, ...t }) => ({
      ...t,
      openers: Object.fromEntries(AGE_GROUPS.map((a) => [a, { opener, follow_up: "" }])) as Topic["openers"],
      // 요청한 관심사 태그가 빠졌으면 붙인다. 앱은 태그로 필터링하므로 빠지면 안 보인다.
      interests: t.interests.includes(interest) ? t.interests : [interest, ...t.interests],
    }));
}

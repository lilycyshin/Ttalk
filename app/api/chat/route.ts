// 가(라)톡: 점심 자리에서 "카톡하는 척"할 때 친구처럼 답장해 주는 가짜 대화 상대. AI 없이 미리 써 둔 답장에서 고른다.
// POST { messages: [{ from: "me" | "friend", text }] } → { reply }
export const dynamic = "force-dynamic";

type Msg = { from: "me" | "friend"; text: string };

// 보낸 말에 따라 고르는 답장. 위에서부터 처음 맞는 것.
const RULES: [RegExp, string[]][] = [
  [/점심|밥|먹|메뉴/, ["점심 뭐 먹는데?", "오 맛있겠다 ㅋㅋ", "나도 배고프다 ㄹㅇ", "거기 맛있냐?"]],
  [/어색|힘들|피곤|회사|팀장|부장|퇴근|야근/, ["ㅋㅋㅋ 고생한다 진짜", "헐 버텨라 조금만", "퇴근하고 얘기하자 ㅋㅋ", "아 그거 완전 공감"]],
  [/\?|뭐해|머해|뭐함/, ["나? 그냥 있지 ㅋㅋ", "음 글쎄 너는?", "ㅇㅇ 아마 그럴걸", "몰라 ㅋㅋ 왜?"]],
  [/ㅋㅋ|ㅎㅎ|웃/, ["ㅋㅋㅋㅋ 아 웃기네", "ㅋㅋㅋ 미쳤다", "아 진짜 ㅋㅋㅋ"]],
  [/헐|대박|진짜|실화/, ["ㄹㅇ 나도 놀람", "헐 그니까", "실화냐 ㅋㅋ"]],
];
const ANY = ["ㅇㅇ 그래서?", "헐 진짜?", "ㅋㅋㅋ 그건 좀 웃기다", "아 그거 나도 봤어", "오 대박", "ㄹㅇ 공감", "그니까 말이야", "아 그랬구나", "ㅋㅋ 계속 말해봐"];

// 토스 미니앱에서 부를 때 브라우저가 먼저 보내는 확인 요청. 허용 헤더는 next.config.ts에서 붙는다.
export function OPTIONS() {
  return new Response(null, { status: 204 });
}

export async function POST(req: Request) {
  let messages: Msg[] = [];
  try {
    const body = await req.json();
    messages = (Array.isArray(body?.messages) ? body.messages : []).filter(
      (m: Msg) => (m?.from === "me" || m?.from === "friend") && typeof m.text === "string",
    );
  } catch {}
  if (!messages.length || messages[messages.length - 1].from !== "me")
    return Response.json({ error: "bad request" }, { status: 400 });

  const last = messages[messages.length - 1].text;
  const pool = RULES.find(([re]) => re.test(last))?.[1] ?? ANY;
  // 최근에 한 답장은 다시 안 한다.
  const recent = new Set(messages.filter((m) => m.from === "friend").slice(-4).map((m) => m.text));
  const fresh = pool.filter((r) => !recent.has(r));
  const from = fresh.length ? fresh : ANY.filter((r) => !recent.has(r));
  return Response.json({ reply: from[Math.floor(Math.random() * from.length)] ?? "ㅇㅇ" });
}

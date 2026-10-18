// 기사 제목에서 짧은 키워드를 뽑는다 (AI 없이). 실검처럼 목록에 키워드만 보여주고, 누르면 기사 제목이 나온다.
// 같은 사건 기사가 여러 개면 제목들에 공통으로 많이 나오는 단어, 하나뿐이면 제목 앞쪽의 주어("문근영, ..." → 문근영).
const SPLIT = /[\s,…·:;!?"'‘’“”`\[\]()<>「」『』【】~|/=+]+|\.{2,}/;

// 어디에나 붙는 말이라 키워드로 쓰면 무슨 얘긴지 모르는 단어
const STOP = new Set(
  "오늘 내일 어제 올해 지난 최근 이번 다음 단독 속보 종합 포토 영상 사진 인터뷰 공개 발표 출시 개최 진행 참석 위해 대한 관련 통해 이유 사람 가장 최고 처음 결국 역대 국내 한국 서울 기자 뉴스 무슨 이렇게 이런 그리고 가능 확인 우리 모두 정말 진짜 이제 다시 계속 하루 이후 직후 앞두고 맞아 따르면 화제 근황 눈길 시선 관심 등장 예정 전망 기대 대박 충격 결과 소식 이슈 이야기 모습 사이 때문 지금"
    .split(" "),
);
// 맨 끝 조사를 뗀다. 남는 게 두 글자 이상일 때만.
const JOSA = /(에서|으로|에게|까지|부터|처럼|보다|이다|은|는|이|가|을|를|의|에|도|로|와|과|만)$/;
const KEEP = new Set(["고양이", "어린이", "놀이", "아이", "강아지"]);

function clean(word: string) {
  let w = word.trim();
  if (!KEEP.has(w) && w.length >= 3) {
    const m = w.match(JOSA);
    if (m && w.length - m[0].length >= 2) w = w.slice(0, -m[0].length);
  }
  return w;
}

// 서술어("낸다", "받는데", "같은")는 키워드가 아니다
const PREDICATE = /(다|는데|하고|했고|하며|해서|하면|있는|없는|하는|되는|받는|같은|높은|낮은|새로운|이런|저런|어떤)$/;

// 키워드로 쓸 만한 단어인지: 두 글자 이상, 숫자로 시작하거나 금액·면적 같은 단위가 아니고, 흔한 말이나 서술어가 아닌 것
const usable = (w: string) =>
  w.length >= 2 &&
  w.length <= 12 &&
  /[가-힣A-Za-z]/.test(w) &&
  !/^\d|[억만원%㎡]$/.test(w) &&
  !STOP.has(w) &&
  !PREDICATE.test(w);

export const words = (title: string) => title.split(SPLIT).map(clean).filter(usable);

// 제목 맨 앞이 "주어, ..." 꼴이면 쉼표 앞을 키워드로 (두 단어까지)
function subject(title: string) {
  const head = title.split(/[,…]|\.{2,}|\s[-–]\s/)[0].replace(/["'‘’“”]/g, "").trim();
  if (head.length >= 2 && head.length <= 12 && head.split(/\s+/).length <= 2 && head !== title.trim()) return head;
  return null;
}

// taken: 이미 다른 항목이 쓴 키워드. 겹치면 다음 후보를 쓴다 (실검 채우기용. 키워드별 탭은 같은 키워드면 합친다).
export function keywordOf(titles: string[], taken = new Set<string>()): string {
  const first = titles[0];
  const cands: string[] = [];
  if (titles.length > 1) {
    // 여러 제목에 같이 나오는 단어일수록, 같으면 첫 제목에서 앞에 나오는 단어 먼저
    const df = new Map<string, number>();
    for (const t of titles) for (const w of new Set(words(t))) df.set(w, (df.get(w) ?? 0) + 1);
    const order = words(first);
    const common = [...df.entries()]
      .filter(([, n]) => n > 1)
      .sort((a, b) => b[1] - a[1] || order.indexOf(a[0]) - order.indexOf(b[0]))
      .map(([w]) => w);
    // 두 글자 이하("LG")면 첫 제목에서 바로 뒤 단어까지 붙인 걸 먼저 ("LG 트윈스")
    for (const w of common) {
      const next = order[order.indexOf(w) + 1];
      if (w.length <= 2 && next && order.includes(w)) cands.push(`${w} ${next}`);
      cands.push(w);
    }
  }
  const s = subject(first);
  if (s) cands.push(s);
  const ws = words(first);
  // 앞 단어가 두 글자 이하면 다음 단어까지 붙인다 ("LG 트윈스")
  if (ws[0] && ws[0].length <= 2 && ws[1]) cands.push(`${ws[0]} ${ws[1]}`);
  cands.push(...ws);
  if (ws.length >= 2) cands.push(`${ws[0]} ${ws[1]}`);
  const pick = cands.find((c) => !taken.has(c.replace(/\s+/g, "")));
  const out = pick ?? (first.length > 12 ? `${first.slice(0, 12).trim()}…` : first);
  taken.add(out.replace(/\s+/g, ""));
  return out;
}

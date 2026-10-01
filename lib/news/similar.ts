// 같은 사건을 다룬 기사·토픽인지 제목으로 가늠한다. 언론사마다 제목이 조금씩 달라서 글자 그대로 비교하면 못 거른다.
// 공백·기호를 뗀 두 글자 조각(bigram)이 얼마나 겹치는지(작은 쪽 기준)로 잰다.
const norm = (s: string) => s.toLowerCase().replace(/[^0-9a-z가-힣]/g, "");

function bigrams(s: string) {
  const t = norm(s);
  const out = new Set<string>();
  for (let i = 0; i < t.length - 1; i++) out.add(t.slice(i, i + 2));
  return out;
}

export function similarity(a: string, b: string) {
  const A = bigrams(a);
  const B = bigrams(b);
  if (!A.size || !B.size) return 0;
  let common = 0;
  for (const x of A) if (B.has(x)) common++;
  return common / Math.min(A.size, B.size);
}

// 이 정도 겹치면 같은 사건으로 본다.
export const SAME_EVENT = 0.5;
export const isSameEvent = (a: string, b: string) => similarity(a, b) >= SAME_EVENT;

// 비슷한 제목끼리 묶는다. 입력 순서를 지키고, 묶음마다 첫 항목이 대표.
export function cluster<T>(items: T[], title: (x: T) => string): T[][] {
  const groups: T[][] = [];
  for (const x of items) {
    const g = groups.find((g) => g.some((y) => isSameEvent(title(x), title(y))));
    if (g) g.push(x);
    else groups.push([x]);
  }
  return groups;
}

"use client";
import { useState } from "react";
import Mascot from "./Mascot";
import Typewriter from "./Typewriter";
import { AGE_GROUPS, AGE_LABEL, INTERESTS, type AgeGroup, type Profile } from "@/lib/topics";

// 관심사는 최대 이만큼만 고를 수 있다.
const MAX_INTERESTS = 3;

// 0: 내 연령대, 1: 같이 먹는 사람, 2: 관심사
const STEPS = [
  { title: "연령대가 어떻게 되세요?", sub: "말투 맞출 때만 써요", bubble: "오늘 점심시간엔 또 뭔 얘기를 해볼까요?" },
  { title: "오늘 어떤 분이랑 식사하세요?", sub: "여러 명이면 다 골라주세요", bubble: "같이 먹는 분에 따라 뉴스를 골라볼게요" },
  { title: "요즘 관심 있는 거 골라주세요", sub: "최대 3개까지 골라주세요", bubble: "아는 얘기 나와야 덜 어색하잖아요" },
];

// steps: 이번에 물어볼 단계들. 처음엔 [0,1,2], 매일은 [1], 키워드만 바꿀 땐 [2].
export default function Onboarding({
  initial,
  steps = [0, 1, 2],
  onDone,
}: {
  initial?: Profile | null;
  steps?: number[];
  onDone: (p: Profile) => void;
}) {
  const [pos, setPos] = useState(0);
  const [myAge, setMyAge] = useState<AgeGroup | null>(initial?.myAge ?? null);
  const [targetAges, setTargetAges] = useState<AgeGroup[]>(initial?.targetAges ?? []);
  const [interests, setInterests] = useState<string[]>((initial?.interests ?? []).slice(0, MAX_INTERESTS));
  // 같이 먹는 사람을 고를 때 캐릭터 반응. 없으면 단계 기본 말풍선.
  const [reaction, setReaction] = useState<string | null>(null);
  const step = steps[pos];
  const isLast = pos === steps.length - 1;
  const s = STEPS[step];

  const toggleIn = <T,>(xs: T[], x: T) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]);
  const goTo = (n: number) => {
    setReaction(null);
    setPos(n);
  };
  const finish = () =>
    myAge && targetAges.length > 0 && interests.length > 0 && onDone({ myAge, targetAges: sortAges(targetAges), interests });
  const next = () => (isLast ? finish() : goTo(pos + 1));
  const toggleInterest = (id: string) =>
    setInterests((xs) => (xs.includes(id) || xs.length < MAX_INTERESTS ? toggleIn(xs, id) : xs));
  // 내 연령대: 고른 버튼 색이 바뀐 걸 잠깐 보여주고 넘어간다.
  const pickMyAge = (a: AgeGroup) => {
    setMyAge(a);
    setTimeout(() => goTo(pos + 1), 350);
  };
  const toggleTarget = (a: AgeGroup) => {
    const adding = !targetAges.includes(a);
    setTargetAges((xs) => toggleIn(xs, a));
    if (adding && myAge) setReaction(ageReaction(myAge, a));
  };

  return (
    <main className="screen">
      {steps.length > 1 ? (
        <div className="dots" aria-label={`${pos + 1} / ${steps.length} 단계`}>
          {steps.map((_, i) => (
            <span key={i} className={i <= pos ? "dot on" : "dot"} />
          ))}
        </div>
      ) : (
        <div className="dots-spacer" />
      )}

      <Mascot size={100} say={reaction ?? s.bubble} />
      <h1 className="title">
        <Typewriter text={s.title} />
      </h1>
      <p className="sub">{s.sub}</p>

      {step === 0 && (
        <div className="grid2">
          {AGE_GROUPS.map((a) => (
            <button
              key={a}
              className={myAge === a ? "btn big selected" : "btn big"}
              onClick={() => pickMyAge(a)}
              aria-pressed={myAge === a}
            >
              {AGE_LABEL[a]}
            </button>
          ))}
        </div>
      )}

      {step === 1 && (
        <>
          <div className="grid2">
            {AGE_GROUPS.map((a) => (
              <button
                key={a}
                className={targetAges.includes(a) ? "btn big selected" : "btn big"}
                onClick={() => toggleTarget(a)}
                aria-pressed={targetAges.includes(a)}
              >
                {AGE_LABEL[a]}
              </button>
            ))}
          </div>
          <div className="bottom">
            <button className="btn primary wide" disabled={targetAges.length === 0} onClick={next}>
              {targetAges.length === 0 ? "한 분 이상 골라주세요" : isLast ? "오늘 뉴스 보기" : "다음"}
            </button>
          </div>
        </>
      )}

      {step === 2 && (
        <>
          <div className="chips">
            {INTERESTS.map((i) => (
              <button
                key={i.id}
                className={interests.includes(i.id) ? "chip on" : "chip"}
                onClick={() => toggleInterest(i.id)}
                disabled={!interests.includes(i.id) && interests.length >= MAX_INTERESTS}
                aria-pressed={interests.includes(i.id)}
              >
                {i.label}
              </button>
            ))}
          </div>
          <div className="bottom">
            <button className="btn primary wide" disabled={interests.length === 0} onClick={next}>
              {interests.length === 0 ? "하나는 골라주세요" : `시작할게요 (${interests.length}/${MAX_INTERESTS})`}
            </button>
          </div>
        </>
      )}

      {pos > 0 && (
        <button className="link" onClick={() => goTo(pos - 1)}>
          이전으로
        </button>
      )}
    </main>
  );
}

const sortAges = (xs: AgeGroup[]) => AGE_GROUPS.filter((a) => xs.includes(a));

// 내 연령대와 비교한 한마디
function ageReaction(mine: AgeGroup, target: AgeGroup) {
  const d = AGE_GROUPS.indexOf(target) - AGE_GROUPS.indexOf(mine);
  if (d === 0) return "동기점 좋죠!";
  if (d > 0) return "오늘 점심은 쉽지 않겠네요";
  return "영크크에게 무시당하지 맙시다!";
}

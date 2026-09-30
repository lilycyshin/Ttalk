"use client";
import { useState } from "react";
import Mascot from "./Mascot";
import { AGE_GROUPS, AGE_LABEL, INTERESTS, type AgeGroup, type Profile } from "@/lib/topics";

const STEPS = [
  { title: "연령대가 어떻게 되세요?", sub: "말투 맞출 때만 써요", bubble: "오늘 점심시간엔 또 뭔 얘기를 해볼까요?" },
  { title: "오늘 어떤 분이랑 식사하세요?", sub: "여러 명이면 다 골라주세요", bubble: "같이 먹는 사람 나이에 맞춰 말투 바꿔드려요" },
  { title: "요즘 관심 있는 거 골라주세요", sub: "여러 개 골라도 돼요", bubble: "아는 얘기 나와야 덜 어색하잖아요" },
];

export default function Onboarding({ initial, onDone }: { initial?: Profile | null; onDone: (p: Profile) => void }) {
  const [step, setStep] = useState(0);
  const [myAge, setMyAge] = useState<AgeGroup | null>(initial?.myAge ?? null);
  const [targetAges, setTargetAges] = useState<AgeGroup[]>(initial?.targetAges ?? []);
  const [interests, setInterests] = useState<string[]>(initial?.interests ?? []);
  // 2단계에서 방금 고른 상대 연령대에 대한 캐릭터 반응. 없으면 단계 기본 말풍선.
  const [reaction, setReaction] = useState<string | null>(null);
  const s = STEPS[step];

  const toggleIn = <T,>(xs: T[], x: T) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]);
  const goTo = (n: number) => {
    setReaction(null);
    setStep(n);
  };
  const toggleTarget = (a: AgeGroup) => {
    const adding = !targetAges.includes(a);
    setTargetAges((xs) => toggleIn(xs, a));
    if (adding && myAge) setReaction(ageReaction(myAge, a));
  };

  return (
    <main className="screen">
      <div className="dots" aria-label={`${step + 1} / 3 단계`}>
        {STEPS.map((_, i) => (
          <span key={i} className={i <= step ? "dot on" : "dot"} />
        ))}
      </div>

      <Mascot size={100} say={reaction ?? s.bubble} />
      <h1 className="title">{s.title}</h1>
      <p className="sub">{s.sub}</p>

      {step === 0 && (
        <div className="grid2">
          {AGE_GROUPS.map((a) => (
            <button
              key={a}
              className={myAge === a ? "btn big selected" : "btn big"}
              onClick={() => {
                setMyAge(a);
                goTo(1);
              }}
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
            <button className="btn primary wide" disabled={targetAges.length === 0} onClick={() => goTo(2)}>
              {targetAges.length === 0 ? "한 분은 골라주세요" : "다음"}
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
                onClick={() => setInterests((xs) => toggleIn(xs, i.id))}
                aria-pressed={interests.includes(i.id)}
              >
                {i.label}
              </button>
            ))}
          </div>
          <div className="bottom">
            <button
              className="btn primary wide"
              disabled={interests.length === 0 || !myAge || targetAges.length === 0}
              onClick={() => myAge && onDone({ myAge, targetAges: sortAges(targetAges), interests })}
            >
              {interests.length === 0 ? "하나는 골라주세요" : `시작할게요 (${interests.length}개)`}
            </button>
          </div>
        </>
      )}

      {step > 0 && (
        <button className="link" onClick={() => goTo(step - 1)}>
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

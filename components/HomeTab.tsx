"use client";
import Mascot from "./Mascot";
import Credit from "./Credit";
import { introvertLevel } from "@/lib/persona";
import type { Profile } from "@/lib/topics";

type Go = (tab: "trends" | "keywords" | "talk") => void;

const ACTIONS: { tab: Parameters<Go>[0]; label: string }[] = [
  { tab: "trends", label: "실시간 트렌드에서 스몰톡 할 만한 거 찾아보기" },
  { tab: "keywords", label: "키워드별 점심시간 스몰톡 주제 추천받기" },
  { tab: "talk", label: "친구와 카톡하는 척하기" },
];

// 홈 탭: 인사와 기능 바로가기 버튼.
export default function HomeTab({ profile, go }: { profile: Profile; go: Go }) {
  const level = introvertLevel(profile.introversion ?? 0);

  return (
    <>
      <section className="hero">
        <Mascot say="오늘도 같이 살아남아 봐요" src={level.image} />
        <h1 className="title">{profile.nickname || level.name}님, 안녕하세요</h1>
      </section>

      <div className="home-actions">
        {ACTIONS.map((a) => (
          <button key={a.tab} className="btn wide home-action" onClick={() => go(a.tab)}>
            {a.label}
          </button>
        ))}
      </div>
      <Credit />
    </>
  );
}

"use client";
import Mascot from "./Mascot";
import Credit from "./Credit";
import { introvertLevel } from "@/lib/persona";
import type { Profile } from "@/lib/topics";

type Go = (tab: "trends" | "keywords" | "talk") => void;

const ACTIONS: { tab: Parameters<Go>[0]; title: string; desc: string }[] = [
  { tab: "trends", title: "실시간 트렌드 보기", desc: "지금 뜨는 얘기로 스몰톡 거리 찾기" },
  { tab: "keywords", title: "점심 얘깃거리 추천받기", desc: "같이 먹는 분과 관심사에 맞춘 주제" },
  { tab: "talk", title: "카톡하는 척하기", desc: "어색할 땐 친구랑 대화하는 척" },
];

// 홈 탭: 인사와 기능 바로가기 (토스처럼 텍스트만, 위아래로).
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
          <button key={a.tab} className="home-row" onClick={() => go(a.tab)}>
            <span className="home-row-text">
              <b>{a.title}</b>
              <span>{a.desc}</span>
            </span>
            <span className="home-row-arrow" aria-hidden>
              ›
            </span>
          </button>
        ))}
      </div>
      <Credit />
    </>
  );
}

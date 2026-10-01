"use client";
import Mascot from "./Mascot";
import Credit from "./Credit";
import TabIcon from "./TabIcon";
import { introvertLevel } from "@/lib/persona";
import type { Profile } from "@/lib/topics";

type Go = (tab: "trends" | "keywords" | "talk") => void;

const ACTIONS: { tab: Parameters<Go>[0]; title: string; desc: string }[] = [
  { tab: "trends", title: "실시간 트렌드", desc: "스몰톡 거리 찾기" },
  { tab: "keywords", title: "키워드 주제", desc: "점심 얘깃거리 추천" },
  { tab: "talk", title: "카톡하는 척", desc: "어색할 땐 폰 보기" },
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
          <button key={a.tab} className="home-tile" onClick={() => go(a.tab)}>
            <span className="home-tile-icon">
              <TabIcon name={a.tab} />
            </span>
            <b>{a.title}</b>
            <span>{a.desc}</span>
          </button>
        ))}
      </div>
      <Credit />
    </>
  );
}

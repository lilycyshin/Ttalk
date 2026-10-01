"use client";
import { useRef, useState } from "react";
import HomeTab from "./HomeTab";
import Trends from "./Trends";
import KeywordNews from "./KeywordNews";
import GaraTalk from "./GaraTalk";
import TabIcon from "./TabIcon";
import Credit from "./Credit";
import type { Profile } from "@/lib/topics";

const TABS = [
  { id: "home", label: "홈" },
  { id: "trends", label: "실검" },
  { id: "keywords", label: "키워드별" },
  { id: "talk", label: "가라톡" },
] as const;
type TabId = (typeof TABS)[number]["id"];

// 상단 로고·성향 재설정 + 탭 내용 + 하단 아이콘 탭 바. 앱을 열면 항상 실검부터.
// 가라톡은 전체 화면으로 덮고, 뒤로가기를 누르면 직전 탭으로 돌아간다.
export default function AppShell({
  profile,
  fresh,
  onSave,
  onReset,
}: {
  profile: Profile;
  fresh: boolean;
  onSave: (p: Profile) => void;
  onReset: () => void;
}) {
  const [tab, setTab] = useState<TabId>("trends");
  const [prev, setPrev] = useState<TabId>("trends");
  const mainRef = useRef<HTMLElement>(null);
  const go = (id: TabId) => {
    if (id === "talk") setPrev(tab === "talk" ? prev : tab);
    setTab(id);
    mainRef.current?.scrollTo(0, 0);
  };

  if (tab === "talk") return <GaraTalk onBack={() => setTab(prev)} />;

  return (
    <div className="app">
      <main className="screen home" ref={mainRef}>
        <header className="status">
          <span className="brand">내향인 생존하기</span>
          <button className="btn small" onClick={onReset}>
            성향 재설정
          </button>
        </header>
        {tab === "home" && <HomeTab profile={profile} />}
        {tab === "trends" && <Trends />}
        {tab === "keywords" && <KeywordNews profile={profile} fresh={fresh} onSave={onSave} />}
        <Credit />
      </main>

      <nav className="tabbar" aria-label="메뉴">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? "tab-btn on" : "tab-btn"}
            onClick={() => go(t.id)}
            aria-current={tab === t.id ? "page" : undefined}
            aria-label={t.label}
            title={t.label}
          >
            <TabIcon name={t.id} />
          </button>
        ))}
      </nav>
    </div>
  );
}

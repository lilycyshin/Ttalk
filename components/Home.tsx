"use client";
import { useMemo } from "react";
import { useFeed } from "@/lib/feed";
import { api } from "@/lib/api";
import { AGE_LABEL, pickKeywords, type KeywordPool, type Profile } from "@/lib/topics";
import Mascot from "./Mascot";
import KeywordList from "./KeywordList";
import { sceneImage } from "@/lib/persona";

// 키워드별 탭: 실검처럼 키워드 목록, 누르면 기사 제목. 같이 먹는 사람 연령대가 네이버에서 많이 검색하는 순.
export default function Home({ profile, onEditKeywords }: { profile: Profile; onEditKeywords: () => void }) {
  // 서버가 1시간마다 미리 만들어 둔 관심사 전체 풀을 받아서(앱을 열 때 미리 받아 둠) 내 관심사에 맞게 여기서 고른다.
  // 키워드를 다시 골라도 새로 받지 않고 바로 바뀐다.
  const { data, error, retry } = useFeed<KeywordPool & { generatedAt?: string }>(api("/api/today"));
  // 예전 버전이 받아 둔 데이터(items 없음)는 없는 걸로 친다. 뒤에서 새로 받으면 바뀐다.
  const pool = data?.items ? data : null;

  const date = pool?.date ?? new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  const picks = useMemo(() => (pool ? pickKeywords(pool, profile) : []), [pool, profile]);
  // 연령대 점수가 붙어 있을 때만 "OO대가 많이 검색하는 순" 안내
  const byAge = picks.some((p) => p.ages);
  const who = profile.targetAges.map((a) => AGE_LABEL[a]).join("·");

  return (
    <>
      <section className="hero">
        <Mascot say={cheer(pool ? picks.length : null)} src={sceneImage(profile.introversion ?? 2, "news")} />
        <p className="date">{formatDate(date)}</p>
        <div className="keywords">
          <button className="btn small" onClick={onEditKeywords}>
            키워드 다시 선택
          </button>
        </div>
      </section>

      {error && !pool && (
        <div className="empty">
          <p>뉴스를 못 가져왔어요.</p>
          <button className="btn" onClick={retry}>
            다시 시도
          </button>
        </div>
      )}
      {!pool && !error && <p className="empty">뉴스 가져오는 중…</p>}
      {pool && picks.length === 0 && (
        <div className="empty">
          <p>오늘은 고른 관심사에 맞는 뉴스가 없어요.</p>
          <button className="btn" onClick={onEditKeywords}>
            키워드 다시 선택
          </button>
        </div>
      )}

      {picks.length > 0 && <KeywordList items={picks} />}
      {pool?.generatedAt && picks.length > 0 && (
        <p className="note">
          {byAge && `${who}가 네이버에서 많이 검색하는 순 · `}
          {updatedHour(pool.generatedAt)}시 업데이트 · 1시간마다 바뀌어요
        </p>
      )}
    </>
  );
}

// "2026-10-07T03:12:00Z" → "12" (한국 시간)
const updatedHour = (iso: string) =>
  String(new Date(iso).toLocaleString("en-US", { timeZone: "Asia/Seoul", hour: "numeric", hourCycle: "h23" }));

// 캐릭터 말풍선: 오늘 챙겨온 키워드 개수에 따라 바뀐다.
function cheer(count: number | null) {
  if (count === null) return "오늘 할 말 쥐어짜는 중…";
  if (count === 0) return "오늘은 딱 맞는 게 없네요";
  return `오늘 얘깃거리 ${count}개 챙겨왔어요`;
}

function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00+09:00`);
  return d.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short", timeZone: "Asia/Seoul" });
}

"use client";
import { useMemo, useState } from "react";
import { useFeed } from "@/lib/feed";
import { pickForUser, type Daily, type Profile } from "@/lib/topics";
import Mascot from "./Mascot";
import { sceneImage } from "@/lib/persona";

// 뉴스 탭
export default function Home({ profile, onEditKeywords }: { profile: Profile; onEditKeywords: () => void }) {
  // 서버가 3시간마다 미리 만들어 둔 관심사 전체 풀을 받아서(앱을 열 때 미리 받아 둠) 내 관심사·같이 먹는 사람에 맞게 여기서 고른다.
  // 키워드를 다시 골라도 새로 받지 않고 바로 바뀐다.
  const { data: daily, error, retry } = useFeed<Daily & { generatedAt?: string }>("/api/today");
  // "상세 보기"로 펼친 카드들
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const date = daily?.date ?? new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
  const picks = useMemo(() => (daily ? pickForUser(daily, profile) : []), [daily, profile]);
  const toggle = (key: string) => setOpen((o) => ({ ...o, [key]: !o[key] }));

  return (
    <>

      <section className="hero">
        <Mascot say={cheer(daily ? picks.length : null)} src={sceneImage(profile.introversion ?? 2, "news")} />
        <p className="date">{formatDate(date)}</p>
        <div className="keywords">
          <button className="btn small" onClick={onEditKeywords}>
            키워드 다시 선택
          </button>
        </div>
      </section>

      {error && !daily && (
        <div className="empty">
          <p>뉴스를 못 가져왔어요.</p>
          <button className="btn" onClick={retry}>
            다시 시도
          </button>
        </div>
      )}
      {!daily && !error && <p className="empty">뉴스 가져오는 중…</p>}
      {daily && picks.length === 0 && (
        <div className="empty">
          <p>{profile.targetAges.length > 1 ? "오늘은 고른 관심사로 다 같이 얘기할 만한 뉴스가 없어요." : "오늘은 고른 관심사에 맞는 뉴스가 없어요."}</p>
          <button className="btn" onClick={onEditKeywords}>키워드 다시 선택</button>
        </div>
      )}

      <ol className="cards">
        {picks.map((p) => {
          const expanded = !!open[p.headline];
          return (
            <li key={p.headline} className="card">
              <div className="card-head">
                <span className="tag">{p.tag}</span>
                <span className="card-title">{p.headline}</span>
              </div>
              <p className="opener">“{p.opener}”</p>

              {expanded && (
                <div className="more">
                  <p className="summary">{p.summary}</p>
                  {p.background && <p className="background">{p.background}</p>}
                  {p.links.length > 0 && (
                    <ul className="links">
                      {p.links.map((l) => (
                        <li key={l.url}>
                          <a href={l.url} target="_blank" rel="noopener noreferrer">
                            {l.title}
                          </a>
                          {l.source && <span> · {l.source}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <button
                className={expanded ? "btn wide-sm primary" : "btn wide-sm"}
                onClick={() => toggle(p.headline)}
                aria-expanded={expanded}
              >
                {expanded ? "접기" : "상세 보기"}
              </button>
            </li>
          );
        })}
      </ol>
      {daily?.generatedAt && picks.length > 0 && (
        <p className="note">{updatedHour(daily.generatedAt)}시 업데이트 · 3시간마다 바뀌어요</p>
      )}
    </>
  );
}

// "2026-10-07T03:12:00Z" → "12" (한국 시간)
const updatedHour = (iso: string) =>
  String(new Date(iso).toLocaleString("en-US", { timeZone: "Asia/Seoul", hour: "numeric", hourCycle: "h23" }));

// 캐릭터 말풍선: 오늘 챙겨온 토픽 개수에 따라 바뀐다.
function cheer(count: number | null) {
  if (count === null) return "오늘 할 말 쥐어짜는 중…";
  if (count === 0) return "오늘은 딱 맞는 게 없네요";
  return `오늘 얘깃거리 ${count}개 챙겨왔어요`;
}

function formatDate(iso: string) {
  const d = new Date(`${iso}T00:00:00+09:00`);
  return d.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short", timeZone: "Asia/Seoul" });
}

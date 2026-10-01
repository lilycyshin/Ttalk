"use client";
import { useEffect, useState } from "react";

type Trend = {
  keyword: string;
  why?: string;
  startedAt?: string;
  news: { title: string; url: string; source: string }[];
};
type Badge = { text: string; kind: "new" | "up" | "down" } | null;

// 순위 변화: 이 기기에서 지난 시간대에 본 순위와 비교한다 (구글 트렌드는 지금 순위만 준다).
const STORE_KEY = "smalltalk.trends.rank.v1";
type Store = { hour: string; list: string[]; prev?: string[] };

function compare(hour: string, trends: Trend[]): Record<string, Badge> {
  const list = trends.map((t) => t.keyword);
  let prev: string[] | undefined;
  try {
    const saved: Store | null = JSON.parse(localStorage.getItem(STORE_KEY) ?? "null");
    // 같은 시간대에 다시 열면 그 전 시간대와 비교, 새 시간대면 마지막으로 본 목록과 비교
    prev = saved?.hour === hour ? saved.prev : saved?.list;
    localStorage.setItem(STORE_KEY, JSON.stringify({ hour, list, prev } satisfies Store));
  } catch {}

  const badges: Record<string, Badge> = {};
  trends.forEach((t, i) => {
    if (!prev) {
      // 비교할 기록이 없으면: 2시간 안에 새로 뜬 검색어만 NEW
      const fresh = t.startedAt && Date.now() - Date.parse(t.startedAt) < 2 * 3600_000;
      badges[t.keyword] = fresh ? { text: "NEW", kind: "new" } : null;
      return;
    }
    const was = prev.indexOf(t.keyword);
    if (was < 0) badges[t.keyword] = { text: "NEW", kind: "new" };
    else if (was - i >= 3) badges[t.keyword] = { text: "급상승", kind: "up" };
    else if (was > i) badges[t.keyword] = { text: `▲${was - i}`, kind: "up" };
    else if (was < i) badges[t.keyword] = { text: `▼${i - was}`, kind: "down" };
    else badges[t.keyword] = null;
  });
  return badges;
}

// 실검 탭: 지금 많이 검색되는 키워드 TOP 10. 1시간마다 바뀐다.
// 키워드를 누르면 기사 요약과 출처 기사 1개가 펼쳐진다.
export default function Trends() {
  const [trends, setTrends] = useState<Trend[] | null>(null);
  const [badges, setBadges] = useState<Record<string, Badge>>({});
  const [hour, setHour] = useState("");
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    setError(false);
    setTrends(null);
    setOpen(null);
    fetch("/api/trends")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d: { trends: Trend[]; hour: string }) => {
        setTrends(d.trends);
        setHour(d.hour);
        setBadges(compare(d.hour, d.trends));
      })
      .catch(() => setError(true));
  }, [attempt]);

  return (
    <>
      <section className="hero">
        <h1 className="title">실시간 검색어</h1>
      </section>

      {error && (
        <div className="empty">
          <p>검색어를 못 가져왔어요.</p>
          <button className="btn" onClick={() => setAttempt((n) => n + 1)}>
            다시 시도
          </button>
        </div>
      )}
      {!trends && !error && <p className="empty">검색어 모으는 중…</p>}

      {trends && (
        <ol className="trends">
          {trends.map((t, i) => {
            const expanded = open === t.keyword;
            const source = t.news[0];
            const badge = badges[t.keyword];
            return (
              <li key={t.keyword} className="trend">
                <button className="trend-row" onClick={() => setOpen(expanded ? null : t.keyword)} aria-expanded={expanded}>
                  <span className="rank">{i + 1}</span>
                  <span className="trend-body">
                    <span className="trend-head">
                      <b>{t.keyword}</b>
                      {badge && <span className={`trend-badge ${badge.kind}`}>{badge.text}</span>}
                    </span>
                    {t.why && <span className={expanded ? "trend-why full" : "trend-why"}>{t.why}</span>}
                  </span>
                </button>
                {expanded && source && (
                  <div className="trend-more">
                    <a className="trend-source" href={source.url} target="_blank" rel="noopener noreferrer">
                      {source.title}
                      {source.source && <span> · {source.source}</span>}
                    </a>
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
      <p className="note">구글 트렌드 기준 · {hour ? `${hour.slice(11)}시 업데이트 · ` : ""}1시간마다 바뀌어요</p>
    </>
  );
}

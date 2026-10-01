"use client";
import { useEffect, useState } from "react";

type Trend = { keyword: string; why?: string; news: { title: string; url: string; source: string }[] };

// 실검 탭: 지금 많이 검색되는 키워드 TOP 10.
// 키워드를 누르면 기사 요약과 출처 기사 1개가 펼쳐진다.
export default function Trends() {
  const [trends, setTrends] = useState<Trend[] | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    setError(false);
    setTrends(null);
    setOpen(null);
    fetch("/api/trends")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setTrends(d.trends))
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
            return (
              <li key={t.keyword} className="trend">
                <button className="trend-row" onClick={() => setOpen(expanded ? null : t.keyword)} aria-expanded={expanded}>
                  <span className="rank">{i + 1}</span>
                  <span className="trend-body">
                    <b>{t.keyword}</b>
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
      <p className="note">구글 트렌드 기준 · 10분마다 바뀌어요</p>
    </>
  );
}

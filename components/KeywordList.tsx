"use client";
import { useState } from "react";

export type ListItem = {
  keyword: string;
  news: { title: string; url: string; source: string }[];
  tag?: string; // 키워드별 탭: 관심사 이름
  badge?: { text: string; kind: "new" | "up" | "down" } | null; // 실검 탭: 순위 변화
};

// 실검·키워드별 탭 공통 목록: 순위와 키워드만 보이고, 누르면 관련 기사 제목이 펼쳐진다 (누르면 원문).
export default function KeywordList({ items }: { items: ListItem[] }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <ol className="trends">
      {items.map((t, i) => {
        const expanded = open === t.keyword;
        return (
          <li key={t.keyword} className="trend">
            <button className="trend-row" onClick={() => setOpen(expanded ? null : t.keyword)} aria-expanded={expanded}>
              <span className="rank">{i + 1}</span>
              <span className="trend-body">
                <span className="trend-head">
                  <b>{t.keyword}</b>
                  {t.badge && <span className={`trend-badge ${t.badge.kind}`}>{t.badge.text}</span>}
                </span>
              </span>
              {t.tag && <span className="tag">{t.tag}</span>}
            </button>
            {expanded && t.news.length > 0 && (
              <ul className="trend-more">
                {t.news.map((n) => (
                  <li key={n.url}>
                    <a className="trend-source" href={n.url} target="_blank" rel="noopener noreferrer">
                      {n.title}
                      {n.source && <span> · {n.source}</span>}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ol>
  );
}

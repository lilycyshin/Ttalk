// 하단 탭 아이콘. 단순한 선 아이콘 (24px, currentColor).
const PATHS: Record<string, React.ReactNode> = {
  // 집
  home: <path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" />,
  // 상승 그래프
  trends: (
    <>
      <path d="M4 17l5-5 4 3 7-8" />
      <path d="M15 7h5v5" />
    </>
  ),
  // 밥그릇과 젓가락 (같이 먹는 사람 맞춤 뉴스)
  keywords: (
    <>
      <path d="M4 12h16a8 8 0 0 1-16 0z" />
      <path d="M9 20h6" />
      <path d="M13 9l6-6M10 9l6-6" />
    </>
  ),
  // 말풍선
  talk: <path d="M12 5c4.4 0 8 2.7 8 6s-3.6 6-8 6c-.9 0-1.7-.1-2.5-.3L6 18.5l.8-3.1C5.1 14.3 4 12.7 4 11c0-3.3 3.6-6 8-6z" />,
  // 게임패드
  game: (
    <>
      <rect x="3" y="8" width="18" height="10" rx="4" />
      <path d="M8 11v4M6 13h4" />
      <circle cx="15.5" cy="12" r=".8" />
      <circle cx="17.5" cy="14" r=".8" />
    </>
  ),
};

export default function TabIcon({ name }: { name: keyof typeof PATHS | string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="26"
      height="26"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {PATHS[name]}
    </svg>
  );
}

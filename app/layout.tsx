import type { Metadata, Viewport } from "next";
import RegisterSW from "@/components/RegisterSW";
import "./globals.css";

export const metadata: Metadata = {
  title: "내향인 생존하기",
  description: "내향인을 위한 오늘의 점심 스몰토크",
  appleWebApp: { capable: true, title: "내향인 생존하기", statusBarStyle: "default" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

// 앱처럼 화면 크기 고정: 확대·축소 막기. viewportFit cover로 아이폰 홈 바 영역(safe-area)을 계산에 넣는다.
// resizes-content: 안드로이드에서 키보드가 올라오면 화면 높이 자체가 줄어든다 (가라톡 상단 고정).
export const viewport: Viewport = {
  themeColor: "#FFFFFF",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  interactiveWidget: "resizes-content",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
      </head>
      <body>
        {children}
        <RegisterSW />
      </body>
    </html>
  );
}

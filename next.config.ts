import type { NextConfig } from "next";

// AIT=1이면 토스 앱인토스 번들용 정적 빌드(out/). 그 외엔 Vercel용 기본 빌드.
const ait = process.env.AIT === "1";

const nextConfig: NextConfig = ait
  ? { output: "export", images: { unoptimized: true } }
  : {
      // 토스 앱 안의 미니앱(다른 주소)에서 이 서버의 /api를 부를 수 있게 허용.
      async headers() {
        return [
          {
            source: "/api/:path*",
            headers: [
              { key: "Access-Control-Allow-Origin", value: "*" },
              { key: "Access-Control-Allow-Methods", value: "GET, POST, OPTIONS" },
              { key: "Access-Control-Allow-Headers", value: "Content-Type" },
            ],
          },
        ];
      },
    };
export default nextConfig;

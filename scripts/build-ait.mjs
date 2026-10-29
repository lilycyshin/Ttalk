// 토스 앱인토스용 .ait 번들 만들기: npm run build:ait
// 정적 빌드에는 API(app/api)를 넣을 수 없어서 잠깐 옆으로 치워 두고 빌드한 뒤 되돌린다.
// 앱은 Vercel 서버(API_BASE)의 /api를 부른다.
import { execSync } from "node:child_process";
import { existsSync, renameSync, rmSync } from "node:fs";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "https://dailysmalltalk.vercel.app";
const API = "app/api";
const PARKED = ".ait-api-parked";

if (existsSync(PARKED)) throw new Error(`${PARKED}가 남아 있어요. app/api로 되돌린 뒤 다시 실행하세요.`);
rmSync("out", { recursive: true, force: true });
renameSync(API, PARKED);
try {
  execSync("next build", {
    stdio: "inherit",
    env: { ...process.env, AIT: "1", NEXT_PUBLIC_API_BASE: API_BASE },
  });
} finally {
  renameSync(PARKED, API);
}
rmSync("out/sw.js", { force: true });
execSync("ait build", { stdio: "inherit" });

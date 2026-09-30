// 사용법: npx tsx src/run.ts            (라이브 RSS 수집 + Claude 생성, ANTHROPIC_API_KEY 필요)
//        npx tsx src/run.ts --fixture  (저장된 후보로 생성만)
//        npx tsx src/run.ts --prompt   (API 호출 없이 프롬프트만 출력)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { collect, type Candidate } from "./sources";
import { generateDaily, buildPrompt, SYSTEM } from "./generate";

const date = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" });
const cands: Candidate[] = process.argv.includes("--fixture") || process.argv.includes("--prompt")
  ? JSON.parse(readFileSync(new URL("../fixtures/candidates-2026-09-30.json", import.meta.url), "utf8"))
  : await collect();
console.error(`candidates: ${cands.length}`);

if (process.argv.includes("--prompt")) {
  console.log(SYSTEM + "\n\n---\n\n" + buildPrompt(cands, date, 12));
} else {
  const { daily, usage } = await generateDaily(cands, date);
  mkdirSync("out", { recursive: true });
  writeFileSync(`out/daily-${date}.json`, JSON.stringify(daily, null, 2));
  const cost = (usage.input_tokens * 4 + usage.output_tokens * 20) / 1e6;
  console.error(`topics: ${daily.topics.length}, tokens in/out: ${usage.input_tokens}/${usage.output_tokens}, ~$${cost.toFixed(3)}`);
}

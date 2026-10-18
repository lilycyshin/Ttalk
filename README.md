# 내향인 생존하기 (프론트엔드)

Next.js 15 App Router, 설치 가능한 웹앱(PWA). DB·로그인 없음, 프로필은 브라우저 localStorage.

```
npm i
npm run dev      # http://localhost:3000
npm run build
```

- `app/page.tsx` 프로필 없으면 온보딩, 있으면 홈
- `components/Onboarding.tsx` 3단계: 내 연령대 → 같이 먹는 사람 연령대(여러 개) → 관심사. 2단계에서 내 나이와 비교한 말풍선 반응
- `components/Home.tsx` 캐릭터 말풍선, 고른 관심사에 맞는 토픽 카드(다음 멘트, 추가 정보), 상대 연령대가 여럿이면 모두에게 맞는 토픽만, 가장 윗사람 말투로
- `components/Mascot.tsx` 캐릭터 (`public/character.png`)
- `lib/topics.ts` 관심사·연령대 목록과 개인화 필터. `pipeline/src/generate.ts`와 값이 같아야 함
- `public/data/today.json` 오늘의 토픽. 지금은 9/30 샘플, 3번 스레드에서 매일 자동 생성으로 교체
- `app/manifest.ts`, `public/sw.js`, `public/icons/` PWA 설치용

Vercel: GitHub 저장소 import만 하면 설정 없이 빌드됨.

## 미리 갱신 (Gemini 비용 줄이기)
`/api/today`(관심사 전체 토픽 풀)와 `/api/trends`(실검)는 서버가 만들어 둔 걸 바로 준다. 오래되면 가진 걸 먼저 주고 뒤에서 새로 만든다: 실검은 50분, 토픽 풀은 2시간 50분.
Gemini 호출: 토픽 풀은 관심사당 1번(17번), 실검은 1번. 하루 약 120~150번이라 무료 티어 안에 드는 걸 목표로 한다. 가라톡(`/api/chat`)은 메시지마다 1번.
`.github/workflows/refresh.yml`이 한국 시간 6~23시 매시 7분과 배포 직후에 두 주소를 불러 깨운다 (Vercel Hobby Cron은 하루 1번이라 GitHub Actions 사용).
앱은 열 때 두 데이터를 미리 받아 두고(`lib/feed.ts`) 관심사·연령대 고르기는 `pickForUser`로 앱에서 한다.

## pipeline/
매일 토픽을 만드는 파이프라인 프로토타입(RSS 수집 → Claude로 토픽·멘트 생성). 앱 빌드와 별개 패키지. 자세한 건 `pipeline/README.md`.

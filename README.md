# 내향인 생존하기 (프론트엔드)

Next.js 15 App Router, 설치 가능한 웹앱(PWA). DB·로그인 없음, 프로필은 브라우저 localStorage.

```
npm i
npm run dev      # http://localhost:3000
npm run build
```

- `app/page.tsx` 프로필 없으면 온보딩, 있으면 홈
- `components/Onboarding.tsx` 3단계: 내 연령대 → 같이 먹는 사람 연령대(여러 개) → 관심사. 2단계에서 내 나이와 비교한 말풍선 반응
- `components/Home.tsx` 키워드별 탭: 고른 관심사의 뉴스 키워드 목록, 누르면 기사 제목 (`components/KeywordList.tsx`, 실검 탭과 같은 모양)
- `components/Mascot.tsx` 캐릭터 (`public/character.png`)
- `lib/topics.ts` 관심사·연령대 목록과 관심사 필터(`pickKeywords`)
- `public/data/today.json` 오늘의 토픽. 지금은 9/30 샘플, 3번 스레드에서 매일 자동 생성으로 교체
- `app/manifest.ts`, `public/sw.js`, `public/icons/` PWA 설치용

Vercel: GitHub 저장소 import만 하면 설정 없이 빌드됨.

## 1시간마다 미리 갱신 (AI 없음)
`/api/today`(키워드별 탭: 관심사 전체 뉴스를 같은 사건끼리 묶고 제목에서 키워드를 뽑은 풀)와 `/api/trends`(실검)는 서버가 만들어 둔 걸 바로 준다. 만든 지 50분이 지나면 가진 걸 먼저 주고 뒤에서 새로 만든다.
두 탭 모두 키워드만 보이고 누르면 기사 제목. 키워드 뽑기는 `lib/news/keyword.ts`. 가라톡(`/api/chat`)은 미리 써 둔 답장. 외부 유료 API는 쓰지 않는다.
`.github/workflows/refresh.yml`이 매시 7분과 배포 직후에 두 주소를 불러 깨운다 (Vercel Hobby Cron은 하루 1번이라 GitHub Actions 사용).
앱은 열 때 두 데이터를 미리 받아 두고(`lib/feed.ts`) 관심사·연령대 고르기는 `pickForUser`로 앱에서 한다.

## pipeline/
매일 토픽을 만드는 파이프라인 프로토타입(RSS 수집 → Claude로 토픽·멘트 생성). 앱 빌드와 별개 패키지. 자세한 건 `pipeline/README.md`.

## 토스 앱인토스 번들

`npm run build:ait` → 루트에 `introvert-survival.ait`가 생긴다. 앱인토스 콘솔에 올리거나 `npm run deploy:ait`(API 키 필요)로 올린다.
번들은 정적 파일만 담고, 데이터는 Vercel 서버(https://dailysmalltalk.vercel.app/api)에서 받는다. 앱 이름은 `apps-in-toss.config.ts`의 `appName`을 콘솔에 등록한 이름과 맞춘다.

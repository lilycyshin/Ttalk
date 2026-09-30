# 점심토크 (프론트엔드)

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

## pipeline/
매일 토픽을 만드는 파이프라인 프로토타입(RSS 수집 → Claude로 토픽·멘트 생성). 앱 빌드와 별개 패키지. 자세한 건 `pipeline/README.md`.

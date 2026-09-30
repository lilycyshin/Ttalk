# 스몰토크 파이프라인 프로토타입

하루 1회: 무료 RSS 수집 → Claude가 토픽 12개 선별·태깅·연령대별 멘트 생성 → JSON 저장.
개인화(관심사·상대 연령대)는 앱에서 `src/pick.ts`로 필터만 한다. 사용자 수와 무관하게 LLM 호출은 하루 1번.

## 소스 (2026-09-30 확인)
| 소스 | 키 | 상태 |
|---|---|---|
| 구글 트렌드 RSS `trends.google.com/trending/rss?geo=KR` | 없음 | 동작. 실시간 검색어 10개 + 관련 기사 제목 |
| 경향 전체 `khan.co.kr/rss/rssdata/total_news.xml` | 없음 | 동작. 당일 기사 |
| 한경 `hankyung.com/feed/{realestate,sports,entertainment}` | 없음 | 동작. 단 스포츠는 8월, 연예는 1주 전 기사라 36시간 신선도 필터 필수. economy/it/life 피드는 같은 규칙의 URL로 넣었지만 미확인 |
| 네이버 검색 API | 무료 키(하루 25,000회) | 이 환경에서 미검증. 스포츠·연예 보강용 후보 |
| 연합뉴스, 동아, 매경, 구글뉴스 | - | 이 샌드박스에서 차단/robots 불가. Vercel에선 될 수 있으니 배포 후 재확인 |

## 실행
```
npm i
npm run prompt          # API 호출 없이 프롬프트 확인
ANTHROPIC_API_KEY=... npm run daily:fixture   # 저장된 후보로 생성
ANTHROPIC_API_KEY=... npm run daily           # 라이브 수집 + 생성 → out/daily-YYYY-MM-DD.json
```

## 파일
- `src/sources.ts` 피드 목록, RSS 파서, 신선도 필터
- `src/generate.ts` 관심사/연령대 목록, 출력 스키마(zod), 시스템 프롬프트, Claude 호출 (claude-opus-5-5, effort low, structured output)
- `src/pick.ts` 앱용 개인화 필터
- `fixtures/candidates-2026-09-30.json` 오늘 수집한 후보 24건
- `out/sample-2026-09-30.json` 프롬프트를 따라 만든 샘플 (API 키 없어 수작업, 형식은 실제와 동일)

## 비용 추정 (claude-opus-5-5, $4/$20 per MTok)
입력 약 8K 토큰, 출력 약 9K 토큰(생각 포함) → 하루 약 $0.2, 월 약 $6. Haiku 4.5로 바꾸면 월 약 $1.5지만 멘트 품질은 비교 필요.

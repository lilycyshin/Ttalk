// 토스 앱인토스 번들은 정적 파일만 들어가서 API가 없다. 그땐 Vercel 서버의 API를 부른다 (NEXT_PUBLIC_API_BASE).
// 웹(Vercel)에서는 비어 있어서 같은 사이트의 /api를 그대로 부른다.
export const api = (path: string) => (process.env.NEXT_PUBLIC_API_BASE ?? "") + path;

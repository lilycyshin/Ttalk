import { defineConfig } from "@apps-in-toss/web-framework/config";

// appName은 앱인토스 콘솔에 등록한 앱 이름과 같아야 업로드된다.
export default defineConfig({
  appName: "introvert-survival",
  brand: {
    primaryColor: "#3182F6",
  },
  permissions: [],
  webBundleDir: "out",
});

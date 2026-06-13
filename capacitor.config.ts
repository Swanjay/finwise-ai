import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.finwise.ai",
  appName: "FinWise",
  webDir: "out",
  server: {
    androidScheme: "https",
    url: "https://finwise-ai-teal.vercel.app",
    cleartext: false,
  },
};

export default config;

import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.finwise.ai",
  appName: "FinWise",
  webDir: "out",
  server: {
    androidScheme: "https",
    url: "https://finwise.my.id",
    cleartext: false,
  },
};

export default config;

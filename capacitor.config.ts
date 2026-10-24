import type { CapacitorConfig } from "@capacitor/cli";

// Capacitor native shell for Android (iOS later). This Next.js app is
// server-rendered and CANNOT run from bundled static files, so the shell
// loads the deployed HTTPS backend (server.url) and reuses the same UI,
// API, and Better Auth session cookies as the web app.
//
// server.url must be the public production site. Do not point it at
// localhost or a login-walled preview. Do not put secrets here: all keys
// stay server-side in backend environment variables.
const config: CapacitorConfig = {
  appId: "com.emergencycare.app",
  appName: "FirstLink",
  // Local fallback bundle for `cap sync` validation only. At runtime the
  // shell loads server.url below.
  webDir: "capacitor-web",
  server: {
    url: "https://firstlink.vercel.app",
    cleartext: false,
  },
};

export default config;

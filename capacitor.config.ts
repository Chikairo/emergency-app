import type { CapacitorConfig } from "@capacitor/cli";

// Capacitor native shell for Android (iOS later). This Next.js app is
// server-rendered and CANNOT run from bundled static files, so the shell
// loads the deployed HTTPS backend (server.url) and reuses the same UI,
// API, and Better Auth session cookies as the web app.
//
// REQUIRED before `npx cap add android`: deploy the backend over HTTPS and
// set server.url below. Do not point it at localhost: that only works on
// the developer's machine. Do not put secrets here: all keys stay
// server-side in backend environment variables.
const config: CapacitorConfig = {
  appId: "com.emergencycare.app",
  appName: "Emergency Care",
  // Local fallback bundle for `cap sync` validation only. At runtime the
  // shell loads server.url below: this Next.js app is server-rendered and
  // cannot run from bundled static files.
  webDir: "capacitor-web",
  server: {
    url: "https://firstlink.vercel.app",
    cleartext: false,
  },
};

export default config;

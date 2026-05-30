import { mkdir, copyFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { defineConfig } from "vite";

const staticFiles = [
  "script.js",
  "data.js",
  "auth.js",
  "auth-page.js",
  "forgot-password.js",
  "verify-page.js",
  "reset-password.js",
  "admin.js",
  "yonetim.js",
  "profile-page.js",
  "blog-page.js",
  "cookie-consent.js",
  "supabase-config.js",
  "supabase-service.js",
  "icons.js",
  "qr-tools.js",
  ".htaccess",
];

function copyStaticJsFiles() {
  let outDir = "dist";

  return {
    name: "copy-static-js-files",
    configResolved(config) {
      outDir = config.build.outDir;
    },
    async writeBundle() {
      for (const file of staticFiles) {
        const from = resolve(process.cwd(), file);
        const to = resolve(process.cwd(), outDir, file);
        await mkdir(dirname(to), { recursive: true });
        await copyFile(from, to);
      }
    },
  };
}

export default defineConfig({
  plugins: [copyStaticJsFiles()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), "index.html"),
        admin: resolve(process.cwd(), "admin.html"),
        yonetim: resolve(process.cwd(), "yonetim.html"),
        login: resolve(process.cwd(), "login.html"),
        forgotPassword: resolve(process.cwd(), "forgot-password.html"),
        register: resolve(process.cwd(), "register.html"),
        verify: resolve(process.cwd(), "verify.html"),
        resetPassword: resolve(process.cwd(), "reset-password.html"),
        profile: resolve(process.cwd(), "profile.html"),
        blog: resolve(process.cwd(), "blog.html"),
        cookies: resolve(process.cwd(), "cookies.html"),
        privacy: resolve(process.cwd(), "privacy.html"),
        kvkk: resolve(process.cwd(), "kvkk.html"),
        terms: resolve(process.cwd(), "terms.html"),
      },
    },
  },
});

import { mkdir, copyFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { defineConfig } from "vite";

const staticFiles = [
  "script.js",
  "data.js",
  "auth.js",
  "auth-page.js",
  "verify-page.js",
  "admin.js",
  "profile-page.js",
  "supabase-config.js",
  "supabase-service.js",
  "icons.js",
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
        login: resolve(process.cwd(), "login.html"),
        register: resolve(process.cwd(), "register.html"),
        verify: resolve(process.cwd(), "verify.html"),
        profile: resolve(process.cwd(), "profile.html"),
        privacy: resolve(process.cwd(), "privacy.html"),
        kvkk: resolve(process.cwd(), "kvkk.html"),
        terms: resolve(process.cwd(), "terms.html"),
      },
    },
  },
});

import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), "index.html"),
        admin: resolve(process.cwd(), "admin.html"),
        login: resolve(process.cwd(), "login.html"),
        register: resolve(process.cwd(), "register.html"),
        profile: resolve(process.cwd(), "profile.html"),
      },
    },
  },
});

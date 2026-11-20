import { defineConfig } from "vite";

export default defineConfig({
  publicDir: false,
  build: {
    rollupOptions: {
      input: [
        "index.html",
        "about.html",
        "gallery.html",
        "feedback.html",
        "contact.html",
        "project.html"
      ]
    }
  }
});

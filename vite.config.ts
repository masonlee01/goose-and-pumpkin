import { defineConfig } from 'vite';

export default defineConfig({
  // Relative links, so the game works both on your own computer AND on the
  // public GitHub Pages address, without us having to hard-code the web address.
  base: './',

  build: {
    // Vite normally puts its own built files in dist/assets, which would
    // collide with OUR pictures in public/assets. So we send Vite's files to
    // dist/bundle instead and leave dist/assets entirely to the artwork.
    assetsDir: 'bundle',

    // The game engine is about 1.2MB on its own, which is completely normal for
    // a game. Without this, every single build prints a scary yellow warning
    // about it, which is not a useful thing to be shouted at about.
    chunkSizeWarningLimit: 2000,
  },

  server: {
    open: true, // pop the browser open automatically when you run: npm run dev
  },
});

export {};

declare module 'astro' {
  interface AstroGlobal {
    currentLocale: string;
  }
}

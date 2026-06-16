/// <reference types="astro/client" />
/// <reference types="navigation-api-types" />

declare namespace App {
  interface Locals {
    canTranslate: boolean;
    isTranslating: boolean;
    isIOS: boolean;
  }
}

interface Navigation {
  readonly activation?: {
    readonly entry: NavigationHistoryEntry;
    readonly from: NavigationHistoryEntry | null;
    readonly navigationType: 'push' | 'reload' | 'replace' | 'traverse';
  };
}

interface Window {
  navigation: Navigation;
}

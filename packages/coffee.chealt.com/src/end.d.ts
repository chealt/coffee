/// <reference types="astro/client" />
/// <reference types="navigation-api-types" />

interface CollectionItemImage {
  src: string;
  srcSmall: string;
  srcMedium: string;
  filename: string;
  status: 'processing';
}

interface Collection {
  id: string;
  name: string;
}

interface CollectionItemDetails {
  brewingMethod: string;
  currency: string;
  isDecaf: boolean;
  originCountry: string;
  originRegion: string;
  price: number;
  pricePerGram: number;
  processingMethod: string;
  roaster: string;
  roastingDate: string;
  roastingLevel: string;
  'tasteNoteIds[]': string[];
  'varieties[]': string[];
  weight: number;
}

declare namespace App {
  interface Locals {
    authenticationOptions: string;
    canTranslate: boolean;
    collectionItem: {
      id: string;
      details?: CollectionItemDetails;
      extractedDetails?: CollectionItemDetails;
      images: CollectionItemImage[];
      inCollections: string[];
      isFavorite?: boolean;
      review?: {
        acidity: number;
        aftertaste: string;
        aroma: string;
        balance: string;
        body: string;
        break: string;
        cleanCup: string;
        dry: string;
        flavour: string;
        intensity: string;
        level: string;
        like: 'like' | 'dislike';
        overall: string;
        strength: number;
        sweetness: number;
        uniformity: string;
      };
    };
    collections: Collection[];
    currency: string;
    feedback: string;
    getSignedUrl: string;
    imageUploadUrls: { small: string; medium: string; original: string };
    isTranslating: boolean;
    isIOS: boolean;
    registrationOptions: string;
    shouldAuthenticate: boolean;
    username: string;
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

/// <reference types="astro/client" />
/// <reference types="navigation-api-types" />

interface Passkey {
  credentialId: string;
  deviceType: string;
  transports: string[];
}

interface CollectionItemImage {
  src: string;
  srcSmall: string;
  srcMedium: string;
  filename: string;
  status: 'processing';
}

interface Collection {
  id: string;
  isBuiltIn: Boolean;
  items: CollectionItem[];
  name: string;
  weight: number;
}

interface CollectionItem {
  id: string;
  cover: {
    srcSmall: string;
    srcMedium: string;
    src: string;
  };
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
}

interface CollectionItemDetails {
  brewDate: string;
  brewingMethod: string;
  currency: string;
  daysFrozen: number;
  daysSinceRoasting: number;
  defrostDate: string;
  frozenDate: string;
  isBrewed: string;
  isDecaf: string;
  isStillFrozen: boolean;
  originCountry: string;
  originFarm: string;
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
    collectionItem: CollectionItem;
    collections: Collection[];
    collectionsControls: {
      showAge: string;
    };
    currency: string;
    feedback: string;
    getSignedUrl: string;
    imageUploadUrls: { small: string; medium: string; original: string };
    isTranslating: boolean;
    isYouPage: boolean;
    loggedInUser: { userID; username };
    passkeys: Passkey[];
    registrationOptions: string;
    settings: {
      currency: string;
      isTranslating?: 'on' | 'off';
      language: string;
      newCoffeeNotification?: 'on' | 'off';
    };
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

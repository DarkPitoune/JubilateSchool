/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface Window {
  umami?: {
    track(event: string, data?: Record<string, unknown>): void;
  };
}

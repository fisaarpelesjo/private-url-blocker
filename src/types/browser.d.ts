declare namespace Browser {
  interface Runtime {
    getURL(path: string): string;
  }

  interface StorageChange<T = unknown> {
    oldValue?: T;
    newValue?: T;
  }

  type StorageChanges = Record<string, StorageChange>;

  interface StorageArea {
    get(keys?: string | string[] | Record<string, unknown> | null): Promise<Record<string, unknown>>;
    set(items: Record<string, unknown>): Promise<void>;
    remove(keys: string | string[]): Promise<void>;
  }

  interface Storage {
    sync: StorageArea;
    onChanged: {
      addListener(callback: (changes: StorageChanges, areaName: string) => void): void;
    };
  }

  interface WebRequestDetails {
    url: string;
    type: string;
  }

  interface BlockingResponse {
    cancel?: boolean;
    redirectUrl?: string;
  }

  interface WebRequest {
    onBeforeRequest: {
      addListener(
        callback: (details: WebRequestDetails) => BlockingResponse | Promise<BlockingResponse>,
        filter: { urls: string[] },
        extraInfoSpec: string[]
      ): void;
    };
  }

  interface Downloads {
    download(options: { url: string; filename: string; saveAs?: boolean }): Promise<number>;
  }
}

declare const browser: {
  runtime: Browser.Runtime;
  storage: Browser.Storage;
  webRequest: Browser.WebRequest;
  downloads?: Browser.Downloads;
};

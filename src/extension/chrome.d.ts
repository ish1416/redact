// Minimal typing for the slice of the extension API this content script uses.
// Keeping it local means the landing page build never carries @types/chrome.
declare namespace chrome {
  namespace storage {
    interface StorageArea {
      get(keys?: string | string[] | Record<string, unknown> | null): Promise<Record<string, unknown>>;
      set(items: Record<string, unknown>): Promise<void>;
    }
    const sync: StorageArea;
    const onChanged: {
      addListener(
        callback: (changes: Record<string, { newValue?: unknown }>, area: string) => void,
      ): void;
    };
  }
  namespace runtime {
    interface MessageSender {
      tab?: { id?: number };
    }
    const onMessage: {
      addListener(
        callback: (
          message: unknown,
          sender: MessageSender,
          respond: (value?: unknown) => void,
        ) => void,
      ): void;
    };
  }
}

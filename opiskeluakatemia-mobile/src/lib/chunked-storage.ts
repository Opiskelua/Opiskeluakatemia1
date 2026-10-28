/** Minimal storage contract used by Supabase auth. */
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}
export interface SecureBackend {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

// Some iOS versions reject keychain values above ~2 KB, and a Supabase session is larger.
const CHUNK_SIZE = 1800;
const MAX_CHUNKS = 64;
const storageKey = (key: string) => key.replace(/[^A-Za-z0-9._-]/g, '_');

/**
 * Stores the Supabase session in the iOS Keychain / Android Keystore in chunks.
 * A session left in AsyncStorage by an earlier app version is moved on first read.
 */
export function createChunkedSecureStorage(secure: SecureBackend, legacy: KeyValueStorage): KeyValueStorage {
  const queues = new Map<string, Promise<unknown>>();
  // Serialize operations per key so overlapping writes cannot interleave chunks.
  const serial = <T>(key: string, task: () => Promise<T>) => {
    const next = (queues.get(key) ?? Promise.resolve()).catch(() => undefined).then(task);
    queues.set(key, next);
    void next.finally(() => { if (queues.get(key) === next) queues.delete(key); }).catch(() => undefined);
    return next;
  };
  const count = async (key: string) => {
    const value = Number(await secure.getItemAsync(`${key}.n`));
    return Number.isInteger(value) && value > 0 && value <= MAX_CHUNKS ? value : 0;
  };
  const read = async (key: string) => {
    const total = await count(key);
    if (!total) return null;
    const parts = await Promise.all(Array.from({ length: total }, (_, index) => secure.getItemAsync(`${key}.${index}`)));
    return parts.every((part): part is string => typeof part === 'string') ? parts.join('') : null;
  };
  const write = async (key: string, value: string) => {
    const parts = value.match(new RegExp(`[\\s\\S]{1,${CHUNK_SIZE}}`, 'g')) ?? [''];
    if (parts.length > MAX_CHUNKS) throw new Error('Session value is too large for secure storage.');
    const previous = await count(key);
    for (const [index, part] of parts.entries()) await secure.setItemAsync(`${key}.${index}`, part);
    await secure.setItemAsync(`${key}.n`, String(parts.length));
    for (let index = parts.length; index < previous; index++) await secure.deleteItemAsync(`${key}.${index}`);
  };
  const remove = async (key: string) => {
    const previous = await count(key);
    await secure.deleteItemAsync(`${key}.n`);
    for (let index = 0; index < previous; index++) await secure.deleteItemAsync(`${key}.${index}`);
  };
  return {
    getItem: rawKey => serial(storageKey(rawKey), async () => {
      const key = storageKey(rawKey);
      const value = await read(key);
      if (value !== null) return value;
      const old = await legacy.getItem(rawKey);
      if (old === null) return null;
      await write(key, old);
      await legacy.removeItem(rawKey);
      return old;
    }),
    setItem: (rawKey, value) => serial(storageKey(rawKey), async () => {
      await write(storageKey(rawKey), value);
      await legacy.removeItem(rawKey);
    }),
    removeItem: rawKey => serial(storageKey(rawKey), async () => {
      await remove(storageKey(rawKey));
      await legacy.removeItem(rawKey);
    }),
  };
}

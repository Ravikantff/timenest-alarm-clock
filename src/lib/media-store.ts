// IndexedDB blob store for ringtones, alarm images and background images.
const DB = "timenest-media";
const STORE = "blobs";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB unavailable"));
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const r = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(r.result);
    t.onerror = () => reject(t.error ?? r.error);
    t.onabort = () => reject(t.error ?? new Error("Storage write aborted"));
  });
}

export async function putBlob(blob: Blob): Promise<string> {
  const id = crypto.randomUUID();
  await tx("readwrite", (s) => s.put(blob, id));
  return id;
}
export const getBlob = (id: string) => tx<Blob | undefined>("readonly", (s) => s.get(id));
export const deleteBlob = (id: string) => tx("readwrite", (s) => s.delete(id)).catch(() => undefined);

export function storageErrorMessage(e: unknown) {
  const name = (e as { name?: string })?.name;
  if (name === "QuotaExceededError") return "Your browser ran out of storage space for this file. Try a smaller file or free up space.";
  return "This browser couldn't save the file (private browsing may block storage).";
}

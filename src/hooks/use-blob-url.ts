import { useEffect, useState } from "react";
import { getBlob } from "@/lib/media-store";

/** Resolves a stored blob id (or a live File) to an object URL. */
export function useBlobUrl(source: string | Blob | null | undefined) {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    let made: string | null = null;
    setUrl(null);
    if (!source) return;
    const load = typeof source === "string" ? getBlob(source) : Promise.resolve(source);
    load
      .then((b) => {
        if (!alive || !b) return;
        made = URL.createObjectURL(b);
        setUrl(made);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
      if (made) URL.revokeObjectURL(made);
    };
  }, [source]);
  return url;
}

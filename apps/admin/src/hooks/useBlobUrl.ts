import { useEffect, useState } from 'react';

/** Creates an object URL for a file/blob and revokes it on change or unmount. */
export function useBlobUrl(source: File | Blob | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!source) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(source);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [source]);

  return url;
}

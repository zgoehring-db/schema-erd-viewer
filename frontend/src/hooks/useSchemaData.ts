import { useState, useEffect } from 'react';
import type { ERDData } from '../types';

interface CatalogItem {
  name: string;
}

export function useCatalogs() {
  const [catalogs, setCatalogs] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/catalogs')
      .then((r) => r.json())
      .then(setCatalogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return { catalogs, loading };
}

export function useSchemas(catalog: string) {
  const [schemas, setSchemas] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!catalog) {
      setSchemas([]);
      return;
    }
    setLoading(true);
    fetch(`/api/catalogs/${catalog}/schemas`)
      .then((r) => r.json())
      .then(setSchemas)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [catalog]);

  return { schemas, loading };
}

export function useERDData(catalog: string, schema: string) {
  const [data, setData] = useState<ERDData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!catalog || !schema) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    fetch(`/api/catalogs/${catalog}/schemas/${schema}/erd`)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load ERD data: ${r.statusText}`);
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [catalog, schema]);

  return { data, loading, error };
}

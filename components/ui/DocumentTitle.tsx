'use client';

import { useEffect } from 'react';

/**
 * Titulek záložky pro stránku 404. V HTML ze serveru je správně, ale po
 * hydrataci ho Next přepíše titulkem nadřazeného layoutu — nastavit znovu.
 */
export function DocumentTitle({ title }: { title: string }) {
  useEffect(() => {
    document.title = title;
  }, [title]);
  return null;
}

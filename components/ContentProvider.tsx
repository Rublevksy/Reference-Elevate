'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { FALLBACK_PROJECTS, type Project } from '@/lib/content/projects';
import { site } from '@/content/site';

type Content = { projects: Project[]; contactEmail: string };

const ContentContext = createContext<Content>({ projects: FALLBACK_PROJECTS, contactEmail: site.email });

/** Obsah z databáze (projekty, kontakt) pro klientské sekce. */
export function ContentProvider({ value, children }: { value: Content; children: ReactNode }) {
  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export const useProjects = () => useContext(ContentContext).projects;
export const useContactEmail = () => useContext(ContentContext).contactEmail;

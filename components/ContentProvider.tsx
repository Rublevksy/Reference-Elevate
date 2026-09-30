'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { FALLBACK_PROJECTS, type Project } from '@/lib/content/projects';
import { site } from '@/content/site';

export type ContentValue = {
  projects: Project[];
  contactEmail: string;
  city: string;
  social: { label: string; href: string }[];
};

const ContentContext = createContext<ContentValue>({
  projects: FALLBACK_PROJECTS,
  contactEmail: site.email,
  city: site.city,
  social: [...site.social],
});

/** Obsah z databáze (projekty, kontakt, sítě) pro klientské sekce. */
export function ContentProvider({ value, children }: { value: ContentValue; children: ReactNode }) {
  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export const useProjects = () => useContext(ContentContext).projects;
export const useContactEmail = () => useContext(ContentContext).contactEmail;
export const useSiteContact = () => useContext(ContentContext);

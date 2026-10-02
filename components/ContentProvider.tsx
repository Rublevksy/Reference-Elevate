'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { FALLBACK_PROJECTS, type Project } from '@/lib/content/projects';
import { site } from '@/content/site';
import type { SocialLink } from '@/lib/social';
import type { Industry } from '@/lib/content/gallery';

export type ContentValue = {
  projects: Project[];
  contactEmail: string;
  city: string;
  /** sítě a messengery z administrace (WhatsApp, Instagram…) */
  social: SocialLink[];
  /** obory z administrace (formulář „Obor podnikání" + galerie ukázek) */
  industries: Industry[];
};

const ContentContext = createContext<ContentValue>({
  projects: FALLBACK_PROJECTS,
  contactEmail: site.email,
  city: site.city,
  social: [],
  industries: [],
});

/** Obsah z databáze (projekty, kontakt, sítě) pro klientské sekce. */
export function ContentProvider({ value, children }: { value: ContentValue; children: ReactNode }) {
  return <ContentContext.Provider value={value}>{children}</ContentContext.Provider>;
}

export const useProjects = () => useContext(ContentContext).projects;
export const useContactEmail = () => useContext(ContentContext).contactEmail;
export const useSiteContact = () => useContext(ContentContext);
export const useIndustries = () => useContext(ContentContext).industries;

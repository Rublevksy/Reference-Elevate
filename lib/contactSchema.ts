import { z } from 'zod';

export type ContactMessages = {
  needs: string;
  name: string;
  email: string;
  message: string;
  site: string;
  consent: string;
};

/** Neutrální hlášky pro server; klient si schéma postaví s překlady. */
export const serverMessages: ContactMessages = {
  needs: 'Select at least one service.',
  name: 'Enter your name.',
  email: 'Check the e-mail format.',
  message: 'The message is too long.',
  site: 'The address is too long.',
  consent: 'Consent is required.',
};

export const makeContactSchema = (m: ContactMessages) =>
  z.object({
    needs: z.array(z.string()).min(1, m.needs),
    budget: z.string().optional(),
    timeline: z.string().optional(),
    currentSite: z.string().trim().max(200, m.site).optional().or(z.literal('')),
    name: z.string().trim().min(2, m.name).max(80),
    email: z.string().trim().email(m.email),
    phone: z.string().trim().max(40).optional().or(z.literal('')),
    message: z.string().trim().max(2000, m.message).optional().or(z.literal('')),
    consent: z.literal(true, { message: m.consent }),
    /**
     * Honeypot — skryté pole, které vyplní jen robot.
     * Schválně ho neodmítáme validací: API se tváří, že je vše v pořádku,
     * ale nic neodešle. Robot se tak nedozví, že prohrál.
     */
    website: z.string().max(200).optional(),
  });

export const contactSchema = makeContactSchema(serverMessages);
export type ContactInput = z.infer<typeof contactSchema>;

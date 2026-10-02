import type { Company } from '../types';
import localLogoIds from './local-logos.json';

const localLogos = new Set(localLogoIds);
export function companyLogoSources(company: Company): string[] {
  const sources = localLogos.has(company.id) ? [`/logos/${company.id}.png`] : [];
  // The YC index uses a relative "missing.png" path when no logo is supplied.
  if (/^https?:\/\//.test(company.logo)) sources.push(company.logo);
  return sources;
}

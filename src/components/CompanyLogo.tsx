import { useState } from 'react';
import type { Company } from '../types';
import { companyLogoSources } from '../lib/logo-source';
export default function CompanyLogo({ company }: { company: Company }) {
  const [stage, setStage] = useState(0);
  const source=companyLogoSources(company)[stage];
  return source ? <img src={source} alt="" draggable={false} onError={() => setStage(s => s + 1)} /> : <span className="logo-fallback" aria-hidden="true">{company.name.slice(0, 2)}</span>;
}

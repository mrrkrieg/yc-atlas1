import type { Company } from '../types';
import { batchCode, safeWebsite } from '../lib/universe';
import CompanyLogo from './CompanyLogo';
import Icon from './Icon';
export default function Inspector({ company, onClose, onBatch }: { company: Company; onClose: () => void; onBatch: (batch: string) => void }) {
  const website = safeWebsite(company.website);
  return <aside className="inspector panel" aria-label={`${company.name} company details`}>
    <button className="close-button" onClick={onClose} aria-label="Close company details"><Icon name="close" size={17}/></button>
    <div className="company-heading"><div className="inspector-logo"><CompanyLogo key={company.id} company={company}/></div><div><h2>{company.name}</h2><p>{company.description || 'Discover this company in the YC directory.'}</p></div></div>
    <div className="company-badges"><button className="batch-badge" onClick={() => onBatch(company.batch)} aria-label={`Explore ${company.batch}`}>{batchCode(company.batch)}</button><span className={`company-status ${company.status.toLowerCase()}`}><i/>{company.status}</span></div>
    <div className="divider"/>
    <dl className="company-meta"><div><dt>BATCH</dt><dd><button onClick={() => onBatch(company.batch)}>{company.batch}</button></dd></div><div><dt>LOCATION</dt><dd>{company.location || 'Not listed'}</dd></div><div><dt>INDUSTRY</dt><dd>{company.industry}</dd></div></dl>
    {website ? <a className="website-button" href={website} target="_blank" rel="noopener noreferrer">Visit website<Icon name="arrow" size={18}/></a> : <div className="no-website">Website not listed</div>}
    <a className="yc-company-link" href={`https://www.ycombinator.com/companies/${encodeURIComponent(company.slug)}`} target="_blank" rel="noopener noreferrer">View on Y Combinator<Icon name="arrow" size={15}/></a>
  </aside>;
}

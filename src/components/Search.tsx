import { useEffect, useRef, useState } from 'react';
import type { Company } from '../types';
import { batchCode, companyPriority } from '../lib/universe';
import Icon from './Icon';
import CompanyLogo from './CompanyLogo';
export default function Search({ companies, onSelect }: { companies: Company[]; onSelect: (company: Company) => void }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const normalized = query.trim().toLowerCase();
  const results = (normalized ? companies.filter(c => `${c.name} ${c.description} ${c.tags.join(' ')}`.toLowerCase().includes(normalized)).sort((a,b) => Number(b.name.toLowerCase().startsWith(normalized)) - Number(a.name.toLowerCase().startsWith(normalized)) || companyPriority(b) - companyPriority(a)) : companies.filter(c => ['Stripe','Airbnb','Dropbox','Coinbase','Supabase'].includes(c.name))).slice(0, 8);
  function pick(company: Company) { onSelect(company); setOpen(false); setQuery(''); input.current?.blur(); }
  useEffect(() => {
    function keyboard(e: KeyboardEvent) { if (e.key === '/' && !['INPUT','TEXTAREA','SELECT'].includes((e.target as HTMLElement).tagName)) { e.preventDefault(); input.current?.focus(); } }
    function outside(e: PointerEvent) { if (!container.current?.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('keydown', keyboard); document.addEventListener('pointerdown', outside);
    return () => { document.removeEventListener('keydown', keyboard); document.removeEventListener('pointerdown', outside); };
  }, []);
  return <div className="search" ref={container}>
    <Icon name="search" size={19} />
    <input ref={input} aria-label="Find a company" role="combobox" aria-expanded={open} aria-controls="company-results" aria-autocomplete="list" aria-activedescendant={open && results[index] ? `result-${results[index].id}` : undefined} value={query} placeholder="Find a company…" onFocus={() => setOpen(true)} onChange={e => {setQuery(e.target.value); setIndex(0); setOpen(true);}} onKeyDown={e => {
      if (e.key === 'Escape') { setOpen(false); input.current?.blur(); e.stopPropagation(); }
      if (e.key === 'ArrowDown') { e.preventDefault(); setIndex(i => Math.min(results.length-1, i+1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setIndex(i => Math.max(0, i-1)); }
      if (e.key === 'Enter' && open && results[index]) { e.preventDefault(); pick(results[index]); }
    }} />
    <kbd>/</kbd>
    {open && <div className="search-results panel" id="company-results" role="listbox" aria-label="Company results">
      <div className="search-caption">{normalized ? `${results.length}${results.length === 8 ? '+' : ''} matches` : 'A few familiar stars'}</div>
      {results.map((c,i) => <button role="option" aria-selected={index === i} id={`result-${c.id}`} key={c.id} className={`search-result ${index === i ? 'highlighted' : ''}`} onMouseEnter={() => setIndex(i)} onClick={() => pick(c)}>
        <div className="result-logo"><CompanyLogo company={c} /></div><span><strong>{c.name}</strong><small>{c.description}</small></span><span className="result-batch">{batchCode(c.batch)}</span>
      </button>)}
      {!results.length && <div className="empty-search">No companies found. Try a name or an industry.</div>}
      <div className="search-footer"><span><kbd>↑</kbd><kbd>↓</kbd> to navigate</span><span><kbd>↵</kbd> to explore</span></div>
    </div>}
  </div>;
}

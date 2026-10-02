import type { Batch } from '../types';
import Icon from './Icon';
type Props = { batches: Batch[]; industries: string[]; batch: string; industry: string; connections: boolean; labels: boolean; count: number; onBatch: (value: string) => void; onIndustry: (value: string) => void; onConnections: () => void; onLabels: () => void; onSurprise: () => void; mobileOpen: boolean; onToggle: () => void };
export default function Explorer(p: Props) {
  return <>
    <button className="mobile-explorer icon-button" onClick={p.onToggle} aria-label="Toggle explorer" aria-expanded={p.mobileOpen}><Icon name="filter" /></button>
    <aside className={`explorer-wrap ${p.mobileOpen ? 'mobile-open' : ''}`}>
      <div className="explorer panel">
        <h1>Explore the universe</h1><p className="explorer-description">Every batch. A new constellation.</p>
        <div className="divider" />
        <label className="field"><span>BATCH</span><div className="select-wrap"><select value={p.batch} onChange={e => p.onBatch(e.target.value)} aria-label="Batch"><option value="all">All batches</option>{[...p.batches].reverse().map(b => <option key={b.name} value={b.name}>{b.name} · {b.companies.length}</option>)}</select><Icon name="chevron" size={16}/></div></label>
        <label className="field"><span>INDUSTRY</span><div className="select-wrap"><select value={p.industry} onChange={e => p.onIndustry(e.target.value)} aria-label="Industry"><option value="all">All industries</option>{p.industries.map(i => <option key={i}>{i}</option>)}</select><Icon name="chevron" size={16}/></div></label>
        <div className="divider" />
        <label className="toggle-row"><span>Show connections</span><button className="toggle" role="switch" aria-label="Show connections" aria-checked={p.connections} onClick={p.onConnections}><span /></button></label>
        <label className="toggle-row"><span>Company labels</span><button className="toggle" role="switch" aria-label="Company labels" aria-checked={p.labels} onClick={p.onLabels}><span /></button></label>
        <button className="surprise-button" onClick={p.onSurprise} disabled={!p.count}><Icon name="shuffle"/>Surprise me</button>
      </div>
      <div className="directory-count"><span className="orange-dot" />{p.count.toLocaleString()} companies · {p.batch === 'all' ? `${p.batches.length} batches` : p.batches.find(b => b.name === p.batch)?.code}</div>
    </aside>
  </>;
}

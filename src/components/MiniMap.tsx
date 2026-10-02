import type { Batch } from '../types';
export default function MiniMap({ batches, active, onBatch }: { batches: Batch[]; active: string; onBatch: (name:string) => void }) {
  const columns=Math.ceil(batches.length/3);
  const positions=batches.map((_,i)=>{const row=Math.floor(i/columns),column=i%columns;return {x:14+(row%2?columns-1-column:column)*272/Math.max(columns-1,1),y:18+row*27};});
  return <div className="minimap panel"><span>ALL {batches.length} BATCHES · SELECT TO TRAVEL</span><svg viewBox="0 0 300 90" aria-label="Batch navigation map">
    <path d={positions.map(({x,y},i)=>`${i?'L':'M'}${x} ${y}`).join(' ')} fill="none" stroke="#465061" strokeWidth=".7" strokeDasharray="2 3"/>
    {batches.map((b,i) => {const {x,y}=positions[i];return <g key={b.name} role="button" tabIndex={0} aria-label={`Travel to ${b.name}`} onClick={()=>onBatch(b.name)} onKeyDown={e=>{if(e.key==='Enter'||e.key===' ') {e.preventDefault();onBatch(b.name);}}} className="minimap-batch"><title>{b.name} · {b.companies.length} companies</title><circle cx={x} cy={y} r="8" fill="transparent"/><circle cx={x} cy={y} r={active===b.name?3.8:2.8} fill={b.color}/>{active===b.name&&<circle cx={x} cy={y} r="7" fill="none" stroke="#ff7628"/>}</g>;})}
  </svg></div>;
}

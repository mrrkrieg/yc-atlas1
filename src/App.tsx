import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Company, Dataset, SceneApi } from './types';
import { buildUniverse } from './lib/universe';
import Icon from './components/Icon';
import Search from './components/Search';
import Explorer from './components/Explorer';
import Inspector from './components/Inspector';
import Universe from './components/Universe';
import MiniMap from './components/MiniMap';
import FlightControls from './components/FlightControls';

export default function App() {
  const [data,setData]=useState<Dataset|null>(null);
  const [error,setError]=useState(false);
  const [batch,setBatch]=useState('all'),[industry,setIndustry]=useState('all');
  const [connections,setConnections]=useState(true),[labels,setLabels]=useState(true);
  const [selected,setSelected]=useState<Company|null>(null),[flight,setFlight]=useState(false),[help,setHelp]=useState(false),[mobileOpen,setMobileOpen]=useState(false);
  const [speed,setSpeed]=useState(0),[fullScreen,setFullScreen]=useState(false);
  const [notice,setNotice]=useState('');
  const scene=useRef<SceneApi|null>(null);
  const app=useRef<HTMLDivElement>(null);
  const universe=useMemo(()=>buildUniverse(data?.companies||[]),[data]);
  const industries=useMemo(()=>Array.from(new Set(data?.companies.map(c=>c.industry)||[])).sort(),[data]);
  const filtered=useMemo(()=>data?.companies.filter(c=>(batch==='all'||c.batch===batch)&&(industry==='all'||c.industry===industry))||[],[data,batch,industry]);
  useEffect(()=>{const abort=new AbortController();fetch('/data/companies.json',{signal:abort.signal}).then(r=>{if(!r.ok)throw new Error();return r.json();}).then((d:Dataset)=>{setData(d);setSelected(d.companies.find(c=>c.name==='Stripe')||null);}).catch(e=>{if(e.name!=='AbortError')setError(true);});return()=>abort.abort();},[]);
  useEffect(()=>{const onFullScreen=()=>setFullScreen(!!document.fullscreenElement);document.addEventListener('fullscreenchange',onFullScreen);return()=>document.removeEventListener('fullscreenchange',onFullScreen);},[]);
  useEffect(()=>{if(!notice)return;const timeout=setTimeout(()=>setNotice(''),4000);return()=>clearTimeout(timeout);},[notice]);
  const selectCompany=useCallback((company:Company)=>{setSelected(company);setMobileOpen(false);},[]);
  function searchCompany(company:Company){setBatch('all');setIndustry('all');selectCompany(company);scene.current?.focusCompany(company.id);}
  function travelBatch(value:string){setBatch(value);setFlight(false);setSelected(null);setMobileOpen(false);if(value==='all')scene.current?.reset();else scene.current?.focusBatch(value);}
  function changeIndustry(value:string){setIndustry(value);setFlight(false);setSelected(null);setMobileOpen(false);}
  function reset(){setBatch('all');setIndustry('all');setFlight(false);setSelected(null);setMobileOpen(false);scene.current?.reset();}
  function surprise(){if(!filtered.length)return;const random=filtered[Math.floor(Math.random()*filtered.length)];selectCompany(random);scene.current?.focusCompany(random.id);}
  async function fullscreen(){try{if(document.fullscreenElement)await document.exitFullscreen();else await app.current?.requestFullscreen();}catch{setNotice('Fullscreen is unavailable in this browser. You can expand the preview panel.');}}
  const park=useCallback(()=>{setFlight(false);setSelected(null);},[]);
  function startFlight(){setBatch('all');setIndustry('all');setSelected(null);setMobileOpen(false);setHelp(false);setFlight(true);scene.current?.startFlight();}
  const inspecting=flight&&selected!==null;
  return <div ref={app} className={`atlas-app ${flight&&!inspecting?'flight-active':''} ${inspecting?'flight-inspecting':''}`}>
    <header className="topbar"><a className="brand" href="/" aria-label="YC Atlas home"><span className="brand-mark">Y</span><strong>YC Atlas</strong></a><span className="brand-separator"/><span className="tagline">A universe of startups</span>
      {data&&<Search companies={data.companies} onSelect={searchCompany}/>}<div className="header-actions"><a href="https://www.ycombinator.com/companies" target="_blank" rel="noopener noreferrer">YC directory<Icon name="arrow" size={15}/></a><button className="help-button" aria-label="Flight controls" onClick={()=>{park();setHelp(true);}}><Icon name="help" size={19}/></button></div>
    </header>
    <main className="map-shell">
      {data?<><Universe batches={universe.batches} nodes={universe.nodes} batch={batch} industry={industry} connections={connections} labels={labels} selected={selected} flight={flight} api={scene} onSelect={selectCompany} onPark={park} onTelemetry={setSpeed}/>
        <Explorer batches={universe.batches} industries={industries} batch={batch} industry={industry} connections={connections} labels={labels} count={filtered.length} onBatch={travelBatch} onIndustry={changeIndustry} onConnections={()=>setConnections(v=>!v)} onLabels={()=>setLabels(v=>!v)} onSurprise={surprise} mobileOpen={mobileOpen} onToggle={()=>setMobileOpen(v=>!v)}/>
        {selected&&<Inspector key={selected.id} company={selected} onClose={flight?startFlight:()=>setSelected(null)} onResume={flight?startFlight:undefined} onBatch={travelBatch}/>}<MiniMap batches={universe.batches} active={batch==='all'?(selected?.batch||'Summer 2009'):batch} onBatch={travelBatch}/>
        {!filtered.length&&<div className="no-results panel"><h2>No stars in this constellation</h2><p>Try a different batch or industry.</p><button className="surprise-button" onClick={reset}>Reset filters</button></div>}
        <div className="navigation-toolbar panel"><span className="mouse-hint"><Icon name="mouse" size={23}/><span>{inspecting?'Flight paused':flight?'Move mouse to look':'Drag to orbit'}</span></span><span className="toolbar-divider"/><span className="scroll-hint"><Icon name="mouse" size={23}/><span>{inspecting?'Position saved':flight?'Scroll to fly':'Scroll to zoom'}</span></span><span className="toolbar-divider secondary-divider"/><span className="key-hint"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd></span>Fly</span><span className="toolbar-divider"/><button className={`flight-button ${flight?'active':''}`} onClick={inspecting?startFlight:flight?park:startFlight}><Icon name="flight"/>{inspecting?'Resume flight':flight?'Park the ship':'Enter flight'}</button></div>
        {flight&&<div className="flight-availability panel" role="status">{universe.batches.length} batches · {data.companies.length.toLocaleString()} companies <span>{inspecting?'Flight paused · Close details to resume · Esc to exit':'Aim with the crosshair · Click to explore · Esc to exit'}</span></div>}
        <div className="view-controls panel"><button className="icon-button" aria-label="Zoom in" onClick={()=>scene.current?.zoom(-140)}><Icon name="plus"/></button><button className="icon-button" aria-label="Zoom out" onClick={()=>scene.current?.zoom(140)}><Icon name="minus"/></button><button className="icon-button" aria-label="Reset view" onClick={reset}><Icon name="home" size={17}/></button><button className="icon-button" aria-label={fullScreen?'Exit fullscreen':'Enter fullscreen'} onClick={fullscreen}><Icon name="expand" size={17}/></button></div>
        <footer className="statusbar"><a href="https://github.com/yc-oss/api" target="_blank" rel="noopener noreferrer" title={`Public YC directory snapshot · ${data.updated}`}>INDEPENDENT PROJECT · DATA FROM YC</a><div className="compass" aria-hidden="true"><div>{Array.from({length:19},(_,i)=><i key={i} className={i===6?'north':''}/>)}</div><span>W</span><span className="north">N</span><span>E</span><span>S</span></div><span className="mode-status">{inspecting?'PAUSED · FLIGHT':flight?<><i/>{speed} U/S · FLIGHT</>:batch==='all'?'OVERVIEW':batch.toUpperCase()}</span></footer>
      </>:<div className="loading-state"><span className="brand-mark">Y</span><h1>{error?'The universe could not load':'Mapping the universe'}</h1><p>{error?'Check your connection and reload to try again.':'Connecting companies, one constellation at a time.'}</p>{error&&<button className="surprise-button" onClick={()=>window.location.reload()}>Try again</button>}</div>}
      {notice&&<div className="notice panel" role="status">{notice}</div>}
    </main>
    {help&&<FlightControls onClose={()=>setHelp(false)} onFly={startFlight}/>}
  </div>;
}

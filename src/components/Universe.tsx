import { useEffect, useMemo, useRef, useState } from 'react';
import type { Batch, Camera, Company, SceneApi, SceneNode } from '../types';
import { lookCamera, moveCamera, project, seeded, viewCenter } from '../lib/universe';
import { LogoCache } from '../lib/logo-cache';
import CompanyLogo from './CompanyLogo';

type Props = { batches: Batch[]; nodes: SceneNode[]; batch: string; industry: string; connections: boolean; labels: boolean; selected: Company | null; flight: boolean; api: React.RefObject<SceneApi | null>; onSelect: (company: Company) => void; onPark: () => void; onTelemetry: (speed: number) => void };
const initialCamera: Camera = { x: 0, y: 0, z: 1300, yaw: 0, pitch: 0 };
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

export default function Universe(props: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const labels = useRef(new Map<number, HTMLButtonElement>());
  const latest = useRef(props);
  latest.current = props;
  const [hovered, setHovered] = useState<Company | null>(null);
  const hoverPosition = useRef({ x:0, y:0 });
  const tooltip = useRef<HTMLDivElement>(null);
  const logoNodes = useMemo(() => {
    if(props.flight)return [];
    const all = props.nodes.filter(n => props.batch !== 'all' ? n.batch.name === props.batch : n.featured);
    const visible = all.filter(n => props.industry === 'all' || n.company.industry === props.industry).slice(0,120);
    const selected = props.nodes.find(n => n.company.id === props.selected?.id);
    return selected && !visible.some(n => n.company.id === selected.company.id) ? [...visible,selected] : visible;
  },[props.nodes,props.batch,props.industry,props.selected,props.flight]);

  useEffect(()=>{
    if(!props.flight&&document.pointerLockElement===canvas.current)document.exitPointerLock();
    if(!props.flight){setHovered(null);if(canvas.current)canvas.current.style.cursor='grab';}
  },[props.flight]);

  useEffect(() => {
    const el = canvas.current!, container = root.current!;
    const ctx = el.getContext('2d')!;
    const camera = { ...initialCamera };
    let target: Camera | null = null, width=0, height=0, frame=0, previous=0, lastTelemetry=0;
    let dragging = false, dragDistance = 0, px=0, py=0, speed=0, hoveredId: number | null=null;
    let locked=false, mouseReady=false, mouseX=0, mouseY=0, lastLogoRequest=-Infinity;
    const logos = new LogoCache();
    const keys = new Set<string>();
    let pointCache: { node: SceneNode; x:number; y:number; size:number; depth:number }[] = [];
    const random=seeded(1946);
    const stars=Array.from({length:1150},()=>({x:random(),y:random(),r:random()*.95+.25,a:random()*.5+.1,phase:random()*7}));
    const glowSprites=new Map<string,HTMLCanvasElement>();
    function glowSprite(color:string){
      const cached=glowSprites.get(color);if(cached)return cached;
      const sprite=document.createElement('canvas');sprite.width=64;sprite.height=64;
      const context=sprite.getContext('2d')!;const rgb=[1,3,5].map(i=>parseInt(color.slice(i,i+2),16)).join(',');
      const gradient=context.createRadialGradient(32,32,0,32,32,32);
      gradient.addColorStop(0,`rgba(${rgb},.7)`);gradient.addColorStop(.14,`rgba(${rgb},.28)`);gradient.addColorStop(.45,`rgba(${rgb},.06)`);gradient.addColorStop(1,`rgba(${rgb},0)`);
      context.fillStyle=gradient;context.fillRect(0,0,64,64);glowSprites.set(color,sprite);return sprite;
    }
    const nodeById = new Map(props.nodes.map(n => [n.company.id,n]));
    const groups = new Map(props.batches.map(b => [b.name,props.nodes.filter(n => n.batch.name===b.name)]));
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function resize() {
      width=container.clientWidth;height=container.clientHeight;
      const dpr=Math.min(window.devicePixelRatio||1,2);
      el.width=Math.round(width*dpr);el.height=Math.round(height*dpr);
      ctx.setTransform(dpr,0,0,dpr,0,0);
    }
    const observer=new ResizeObserver(resize);observer.observe(container);resize();
    function goTo(next: Camera) { keys.clear(); if(reducedMotion) Object.assign(camera,next);else target=next; }
    props.api.current={
      reset:()=>goTo({...initialCamera}),
      zoom:(amount)=>{target=null;camera.z=clamp(camera.z+amount,-6000,7000);},
      focusBatch:(name)=>{
        const b=props.batches.find(b=>b.name===name);if(!b)return;
        goTo({x:b.position.x,y:b.position.y,z:b.position.z+Math.max(b.radius*2.1,500),yaw:0,pitch:0});
      },
      focusCompany:(id)=>{
        const node=nodeById.get(id);if(!node)return;
        goTo({x:node.position.x,y:node.position.y,z:node.position.z+650,yaw:0,pitch:0});
      },
      startFlight:()=>{
        target=null;keys.clear();mouseReady=false;dragging=false;container.classList.remove('dragging');
        hoverPosition.current=viewCenter(width,height,true);
        hoveredId=null;setHovered(null);el.focus({preventScroll:true});
        // A fixed crosshair remains the only cursor if an embed denies native lock.
        delete container.dataset.pointerLockError;
        const lockFailed=(error:unknown)=>{container.dataset.pointerLockError=error instanceof Error?error.name:'unavailable';};
        try { const request=el.requestPointerLock?.();request?.catch(lockFailed); } catch(error) { lockFailed(error); }
      },
    };
    function allowed(node: SceneNode) { const p=latest.current;return p.flight||((p.batch==='all'||node.batch.name===p.batch)&&(p.industry==='all'||node.company.industry===p.industry)); }
    function keyDown(e: KeyboardEvent) {
      if(e.key==='Escape'){
        if(e.defaultPrevented)return;
        keys.clear();dragging=false;mouseReady=false;container.classList.remove('dragging');
        if(latest.current.flight)e.preventDefault();
        if(document.pointerLockElement===el)document.exitPointerLock();
        latest.current.onPark();return;
      }
      const tag=(e.target as HTMLElement).tagName;
      if(['INPUT','SELECT','TEXTAREA'].includes(tag)||document.querySelector('dialog[open]'))return;
      const key=e.key.toLowerCase();
      if(latest.current.flight&&['w','a','s','d','q','e','shift','arrowup','arrowdown','arrowleft','arrowright'].includes(key)){
        e.preventDefault();target=null;
        if(!e.repeat&&!keys.has(key)){
          const tap=(e.shiftKey?650:260)/60;
          const forward=Number(key==='w')-Number(key==='s'),right=Number(key==='d')-Number(key==='a'),up=Number(key==='q')-Number(key==='e');
          moveCamera(camera,forward,right,up,tap);
        }
        keys.add(key);
      }
    }
    function keyUp(e: KeyboardEvent){keys.delete(e.key.toLowerCase());}
    function captureEscape(e: KeyboardEvent){
      if(e.key==='Escape'&&latest.current.flight)keyDown(e);
    }
    function blur(){keys.clear();dragging=false;mouseReady=false;container.classList.remove('dragging');}
    function pointerLockChange(){
      const wasLocked=locked;locked=document.pointerLockElement===el;mouseReady=false;
      if(wasLocked&&!locked){keys.clear();latest.current.onPark();}
    }
    function aim(){return latest.current.flight?viewCenter(width,height,true):hoverPosition.current;}
    function updateHover(){
      const position=aim();
      if(latest.current.flight)hoverPosition.current=position;
      const point=pointCache.find(p=>Math.hypot(p.x-position.x,p.y-position.y)<Math.max(p.size+3,7));
      const id=point?.node.company.id??null;
      if(id!==hoveredId){hoveredId=id;setHovered(point?.node.company??null);}
      el.style.cursor=latest.current.flight?'none':point?'pointer':'grab';
    }
    function mouseMove(e: MouseEvent){
      if(!latest.current.flight){mouseReady=false;return;}
      if(locked){lookCamera(camera,e.movementX,e.movementY);hoverPosition.current=aim();}
      else {
        if(mouseReady)lookCamera(camera,e.clientX-mouseX,e.clientY-mouseY);
        mouseX=e.clientX;mouseY=e.clientY;mouseReady=true;
      }
      target=null;
    }
    function pointerDown(e: PointerEvent){if(e.button!==0)return;
      if(latest.current.flight&&e.pointerType!=='touch')return;
      dragging=true;dragDistance=0;px=e.clientX;py=e.clientY;el.setPointerCapture(e.pointerId);container.classList.add('dragging');
    }
    function pointerMove(e: PointerEvent){
      if(!latest.current.flight){const bounds=el.getBoundingClientRect();hoverPosition.current={x:e.clientX-bounds.left,y:e.clientY-bounds.top};}
      if(dragging){const dx=e.clientX-px,dy=e.clientY-py;dragDistance+=Math.abs(dx)+Math.abs(dy);target=null;
        if(latest.current.flight){lookCamera(camera,dx,dy);}
        else {camera.x-=dx*(camera.z/Math.max(width*.69,1));camera.y+=dy*(camera.z/Math.max(height,1));camera.yaw=clamp(camera.yaw-dx*.0003,-.55,.55);}
        px=e.clientX;py=e.clientY;return;
      }
      updateHover();
    }
    function pointerUp(e: PointerEvent){
      if(e.button!==0)return;
      const click=latest.current.flight&&!dragging||dragging&&dragDistance<5;
      dragging=false;container.classList.remove('dragging');if(el.hasPointerCapture(e.pointerId))el.releasePointerCapture(e.pointerId);
      if(click){const position=aim();const p=pointCache.find(p=>Math.hypot(p.x-position.x,p.y-position.y)<Math.max(p.size+3,8));if(p)latest.current.onSelect(p.node.company);}
    }
    function wheel(e: WheelEvent){e.preventDefault();target=null;
      if(latest.current.flight)moveCamera(camera,1,0,0,-e.deltaY*.65);
      else camera.z=clamp(camera.z+e.deltaY*.8,-6000,7000);
    }
    function leave(){if(!latest.current.flight&&!dragging){mouseReady=false;hoveredId=null;setHovered(null);}}
    el.addEventListener('pointerdown',pointerDown);el.addEventListener('pointermove',pointerMove);el.addEventListener('pointerup',pointerUp);el.addEventListener('pointercancel',blur);el.addEventListener('pointerleave',leave);el.addEventListener('wheel',wheel,{passive:false});
    window.addEventListener('keydown',keyDown);window.addEventListener('keyup',keyUp);window.addEventListener('blur',blur);
    window.addEventListener('keydown',captureEscape,true);
    document.addEventListener('mousemove',mouseMove);document.addEventListener('pointerlockchange',pointerLockChange);

    function render(time:number){
      const dt=Math.min((time-previous)/1000||.016,.05);previous=time;
      const p=latest.current;
      if(target){const ease=reducedMotion?1:1-Math.exp(-dt*6);for(const key of ['x','y','z','yaw','pitch'] as const)camera[key]+=(target[key]-camera[key])*ease;if(Math.abs(target.z-camera.z)<.1)target=null;}
      if(p.flight){
        const acceleration=keys.has('shift')?650:260;
        const forward=Number(keys.has('w'))-Number(keys.has('s')),right=Number(keys.has('d'))-Number(keys.has('a')),up=Number(keys.has('q'))-Number(keys.has('e'));
        speed=acceleration*Math.hypot(forward,right,up);
        moveCamera(camera,forward,right,up,acceleration*dt);
        camera.yaw+=(Number(keys.has('arrowleft'))-Number(keys.has('arrowright')))*dt*.6;
        camera.pitch=clamp(camera.pitch+(Number(keys.has('arrowdown'))-Number(keys.has('arrowup')))*dt*.6,-1.1,1.1);
      }else {keys.clear();speed=0;logos.pause();}
      if(time-lastTelemetry>250){lastTelemetry=time;p.onTelemetry(Math.round(speed));}
      ctx.clearRect(0,0,width,height);ctx.fillStyle='#080b10';ctx.fillRect(0,0,width,height);
      stars.forEach(s=>{const twinkle=reducedMotion?1:.82+Math.sin(time*.0004+s.phase)*.18;ctx.globalAlpha=s.a*twinkle;ctx.fillStyle='#a9bdce';ctx.beginPath();ctx.arc((s.x*width-camera.yaw*80+width)%width,(s.y*height+camera.pitch*50+height)%height,s.r,0,Math.PI*2);ctx.fill();if(s.r>1.08){ctx.globalAlpha=.25;ctx.drawImage(glowSprite('#a9bdce'),s.x*width-6,s.y*height-6,12,12);}});ctx.globalAlpha=1;
      const projected=new Map(props.nodes.map(n=>[n.company.id,project(n.position,camera,width,height,p.flight)]));
      const activeBatches=props.batches.filter(b=>p.flight||p.batch==='all'||b.name===p.batch);
      if(p.connections){
        ctx.lineWidth=.6;
        const timelineBatches=activeBatches.filter(b=>p.flight||b.featured||p.batch!=='all'||project(b.position,camera,width,height,p.flight).scale>.7);
        for(let i=1;i<timelineBatches.length;i++){
          const a=project(timelineBatches[i-1].position,camera,width,height,p.flight),b=project(timelineBatches[i].position,camera,width,height,p.flight);
          if(!a.visible||!b.visible)continue;ctx.globalAlpha=.12;ctx.strokeStyle='#5c6f84';ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.quadraticCurveTo((a.x+b.x)/2,(a.y+b.y)/2+80,b.x,b.y);ctx.stroke();
        }
      }
      activeBatches.forEach(batch=>{
        const center=project(batch.position,camera,width,height,p.flight);if(!center.visible)return;
        const alpha=p.flight||batch.featured||p.batch!=='all'||center.scale>.7?.62:.025;
        if(center.x>-400&&center.x<width+400&&center.y>-400&&center.y<height+400){
          const radius=batch.radius*center.scale;
          const glow=ctx.createRadialGradient(center.x,center.y,0,center.x,center.y,Math.max(radius*1.25,1));
          glow.addColorStop(0,`${batch.color}0c`);glow.addColorStop(1,`${batch.color}00`);
          ctx.globalAlpha=1;ctx.fillStyle=glow;ctx.fillRect(center.x-radius*1.3,center.y-radius*1.3,radius*2.6,radius*2.6);
          if(p.connections){
            for(let orbit=0;orbit<3;orbit++){
              ctx.beginPath();let started=false;
              for(let j=0;j<=70;j++){const angle=j/70*Math.PI*2;const pt=project({x:batch.position.x+Math.cos(angle)*batch.radius*(.82+orbit*.12),y:batch.position.y+Math.sin(angle)*batch.radius*(.28+orbit*.09),z:batch.position.z+Math.sin(angle)*batch.radius*.15},camera,width,height,p.flight);
                if(!pt.visible){started=false;continue;}if(!started){ctx.moveTo(pt.x,pt.y);started=true;}else ctx.lineTo(pt.x,pt.y);}
              ctx.globalAlpha=alpha*.36;ctx.strokeStyle=batch.color;ctx.lineWidth=.65;ctx.stroke();
            }
          }
          if((p.flight||batch.featured||p.batch!=='all'||center.scale>.7)&&center.scale>.08&&center.x>8&&center.x<width-8&&center.y>-20&&center.y<height+80){
            ctx.globalAlpha=p.flight||batch.featured||p.batch!=='all'?.95:.36;ctx.fillStyle=batch.color;ctx.font=`500 ${clamp(center.scale*21,10,17)}px "IBM Plex Mono", Consolas, monospace`;
            ctx.textAlign='center';ctx.letterSpacing='2px';ctx.fillText(batch.name.toUpperCase(),center.x,center.y-batch.radius*center.scale*(batch.name==='Summer 2009'?.46:.57)-16);ctx.letterSpacing='0px';
          }
        }
        if(p.connections){const group=groups.get(batch.name)!;ctx.strokeStyle=batch.color;ctx.lineWidth=.5;
          group.forEach((node,i)=>{if(!allowed(node)||i%3!==0)return;const a=projected.get(node.company.id)!,b=projected.get(group[(i+7)%group.length].company.id)!;
            if(!a.visible||!b.visible)return;ctx.globalAlpha=alpha*(p.batch==='all'?.25:.32);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();});
        }
      });
      pointCache=[];
      const visibleNodes=props.nodes.filter(node=>{
        if(!allowed(node))return;
        const pt=projected.get(node.company.id)!;if(!pt.visible||pt.x<-30||pt.x>width+30||pt.y<-30||pt.y>height+30)return;
        return true;
      });
      if(p.flight){
        visibleNodes.sort((a,b)=>projected.get(b.company.id)!.depth-projected.get(a.company.id)!.depth);
        if(time-lastLogoRequest>250){lastLogoRequest=time;logos.request([...visibleNodes].reverse().map(node=>node.company));}
      }
      let loadedLogos=0;
      visibleNodes.forEach(node=>{
        const pt=projected.get(node.company.id)!;
        const focused=node.company.id===p.selected?.id||node.company.id===hoveredId;
        if(p.flight){
          const size=clamp(32*pt.scale,5,42),sprite=logos.get(node.company.id);
          ctx.globalAlpha=1;
          if(sprite){ctx.drawImage(sprite,pt.x-size,pt.y-size,size*2,size*2);loadedLogos++;}
          else {
            ctx.fillStyle='#18212d';ctx.beginPath();ctx.arc(pt.x,pt.y,size,0,Math.PI*2);ctx.fill();
            ctx.fillStyle=node.batch.color;ctx.font=`600 ${Math.max(size*.7,7)}px Inter, sans-serif`;ctx.textAlign='center';ctx.fillText(node.company.name.slice(0,2),pt.x,pt.y+size*.25);
          }
          ctx.strokeStyle=focused?'#ff8b41':node.batch.color;ctx.lineWidth=focused?2:1;ctx.beginPath();ctx.arc(pt.x,pt.y,size,0,Math.PI*2);ctx.stroke();
          if(p.labels&&size>18){ctx.font='500 11px Inter, sans-serif';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#080b10';ctx.strokeText(node.company.name,pt.x,pt.y+size+15);ctx.fillStyle='#e8edf4';ctx.fillText(node.company.name,pt.x,pt.y+size+15);}
          pointCache.push({node,x:pt.x,y:pt.y,size,depth:pt.depth});return;
        }
        if(p.batch==='all'&&node.batch.companies.length>100&&!node.featured&&node.company.id%3!==0)return;
        const size=clamp((node.featured?5:3.3)*pt.scale,1,focused?7:5);
        const alpha=p.batch!=='all'?1:node.batch.featured?.8:pt.scale>.7?.65:.025;
        ctx.globalAlpha=alpha;ctx.drawImage(glowSprite(node.batch.color),pt.x-size*5,pt.y-size*5,size*10,size*10);
        ctx.fillStyle=node.batch.color;ctx.beginPath();ctx.arc(pt.x,pt.y,size,0,Math.PI*2);ctx.fill();ctx.globalAlpha=alpha*.6;ctx.fillStyle='#e8edf4';ctx.beginPath();ctx.arc(pt.x-.3,pt.y-.3,size*.42,0,Math.PI*2);ctx.fill();
        if(focused){ctx.strokeStyle='#ff8b41';ctx.globalAlpha=.9;ctx.lineWidth=1;ctx.beginPath();ctx.arc(pt.x,pt.y,Math.max(size+5,10),0,Math.PI*2);ctx.stroke();}
        pointCache.push({node,x:pt.x,y:pt.y,size,depth:pt.depth});
      });
      pointCache.sort((a,b)=>p.flight?a.depth-b.depth:b.size-a.size);
      if(p.flight)updateHover();
      const occupied:{x:number;y:number;width:number;height:number}[]=[];
      Array.from(labels.current.entries()).sort(([a],[b])=>Number(b===p.selected?.id)-Number(a===p.selected?.id)).forEach(([id,button])=>{
        const node=nodeById.get(id)!,pt=projected.get(id)!;
        const box={x:pt.x,y:pt.y,width:Math.max(clamp(72*pt.scale,33,66),Math.min(node.company.name.length*6.5,160))+6,height:clamp(72*pt.scale,33,66)+24};
        const collision=occupied.some(b=>Math.abs(b.x-box.x)<(b.width+box.width)/2&&Math.abs(b.y-box.y)<(b.height+box.height)/2);
        const visible=allowed(node)&&pt.visible&&pt.x>10&&pt.x<width-10&&pt.y>0&&pt.y<height-45&&(node.batch.featured||p.batch!=='all'||pt.scale>.7)&&(!collision||id===p.selected?.id);
        button.style.display=visible?'flex':'none';
        if(visible){occupied.push(box);button.style.transform=`translate(${pt.x}px,${pt.y}px) translate(-50%,-50%)`;button.style.setProperty('--node-size',`${clamp(72*pt.scale,33,66)}px`);button.style.opacity=String(node.batch.featured||p.batch!=='all'?1:.6);button.style.zIndex=String(Math.round(pt.scale*20));}
      });
      if(p.selected&&width>1000){const pt=projected.get(p.selected.id);if(pt?.visible&&pt.x<width-340){ctx.globalAlpha=.7;ctx.strokeStyle='#ff7628';ctx.lineWidth=.8;ctx.beginPath();ctx.moveTo(pt.x+22,pt.y);ctx.lineTo(width-338,190);ctx.stroke();}}
      ctx.globalAlpha=1;
      if(tooltip.current){tooltip.current.style.left=`${clamp(hoverPosition.current.x+16,10,width-230)}px`;tooltip.current.style.top=`${clamp(hoverPosition.current.y-65,10,height-100)}px`;}
      container.dataset.camera=`${camera.x.toFixed(1)},${camera.y.toFixed(1)},${camera.z.toFixed(1)}`;
      container.dataset.look=`${camera.yaw.toFixed(4)},${camera.pitch.toFixed(4)}`;
      const aimPoint=aim();container.dataset.aim=`${aimPoint.x.toFixed(1)},${aimPoint.y.toFixed(1)}`;
      container.dataset.pointerLock=String(locked);
      container.dataset.flightCompanies=String(p.flight?props.nodes.length:0);
      container.dataset.visibleCompanies=String(pointCache.length);
      container.dataset.loadedLogos=String(loadedLogos);
      frame=requestAnimationFrame(render);
    }
    frame=requestAnimationFrame(render);
    return()=>{cancelAnimationFrame(frame);observer.disconnect();logos.dispose();props.api.current=null;
      if(document.pointerLockElement===el)document.exitPointerLock();
      el.removeEventListener('pointerdown',pointerDown);el.removeEventListener('pointermove',pointerMove);el.removeEventListener('pointerup',pointerUp);el.removeEventListener('pointercancel',blur);el.removeEventListener('pointerleave',leave);el.removeEventListener('wheel',wheel);
      window.removeEventListener('keydown',keyDown);window.removeEventListener('keyup',keyUp);window.removeEventListener('blur',blur);
      window.removeEventListener('keydown',captureEscape,true);
      document.removeEventListener('mousemove',mouseMove);document.removeEventListener('pointerlockchange',pointerLockChange);
    };
  },[props.batches,props.nodes,props.api]);

  return <div ref={root} className={`universe ${props.flight?'flying':''}`} aria-label="Interactive three-dimensional YC company universe" data-mode={props.flight?'flight':'overview'}>
    <canvas ref={canvas} tabIndex={0} aria-label={props.flight?'All-company flight map. Move the mouse to look, W S A D to fly, click a logo for details, Escape to park.':'Company star map. Drag to explore, scroll to zoom. Use the search or batch selector to navigate.'}/>
    <div className="company-label-layer">
      {logoNodes.map(node=><button key={node.company.id} ref={el=>{if(el)labels.current.set(node.company.id,el);else labels.current.delete(node.company.id);}} className={`company-node ${node.company.id===props.selected?.id?'selected':''} ${props.labels?'':'hide-label'}`} style={{'--batch-color':node.batch.color} as React.CSSProperties} onClick={()=>props.onSelect(node.company)} aria-label={`Explore ${node.company.name}`} onMouseEnter={e=>{const bounds=canvas.current!.getBoundingClientRect();hoverPosition.current={x:e.clientX-bounds.left,y:e.clientY-bounds.top};setHovered(node.company);}} onMouseLeave={()=>setHovered(null)}>
        <span className="node-logo"><CompanyLogo company={node.company}/></span><span className="node-name">{node.company.name}</span>
      </button>)}
    </div>
    {hovered&&hovered.id!==props.selected?.id&&<div className="company-tooltip panel" ref={tooltip}><strong>{hovered.name}</strong><span>{hovered.description}</span><small>{hovered.batch} · {hovered.industry}</small></div>}
    {props.flight&&<div className="flight-crosshair" aria-hidden="true"><span/><span/></div>}
  </div>;
}

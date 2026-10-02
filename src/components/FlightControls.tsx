import { useEffect, useRef } from 'react';
import Icon from './Icon';
export default function FlightControls({ onClose, onFly }: { onClose: () => void; onFly: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { const el = dialog.current; el?.showModal(); return () => el?.close(); },[]);
  return <dialog ref={dialog} className="controls-dialog panel" onCancel={onClose} onClick={e => {if(e.target === e.currentTarget) onClose();}}>
    <div className="dialog-heading"><div><span className="dialog-mark">Y</span><h2>Flight controls</h2></div><button className="icon-button" aria-label="Close flight controls" onClick={onClose}><Icon name="close"/></button></div>
    <p>Your next discovery is a short flight away.</p>
    <div className="divider"/><span className="mono-label">FLIGHT</span>
    <div className="control-row"><div><kbd>W</kbd><kbd>S</kbd></div><span>Forward · backward</span></div>
    <div className="control-row"><div><kbd>A</kbd><kbd>D</kbd></div><span>Strafe left · right</span></div>
    <div className="control-row"><div><kbd>Q</kbd><kbd>E</kbd></div><span>Rise · descend</span></div>
    <div className="control-row"><div><kbd>⇧</kbd></div><span>Hold Shift to fly faster</span></div>
    <div className="divider"/><span className="mono-label">EXPLORE</span>
    <div className="control-row"><div><Icon name="mouse"/></div><span>Move the mouse to look around in flight</span></div>
    <div className="control-row"><div><kbd>scroll</kbd></div><span>Zoom in · out</span></div>
    <div className="control-row"><div><kbd>click</kbd></div><span>A company opens its details</span></div>
    <div className="control-row"><div><kbd>Esc</kbd></div><span>Park the ship · release the mouse</span></div>
    <div className="divider"/><p className="connection-note">Connections show shared batches and the cohort timeline.</p>
    <button className="website-button" onClick={()=>{dialog.current?.close();onFly();}}><Icon name="flight"/>Enter the universe</button>
  </dialog>;
}

import type { CSSProperties } from 'react';
type Name = 'search' | 'arrow' | 'close' | 'chevron' | 'shuffle' | 'plus' | 'minus' | 'home' | 'expand' | 'flight' | 'mouse' | 'help' | 'filter' | 'back';
const paths: Record<Name, string> = {
  search: 'M21 21l-5-5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
  arrow: 'M7 17 17 7M7 7h10v10', close: 'm6 6 12 12M6 18 18 6',
  chevron: 'm7 10 5 5 5-5', shuffle: 'M3 7h3c4 0 7 10 11 10h4m-4-4 4 4-4 4M3 17h3c4 0 7-10 11-10h4m-4-4 4 4-4 4',
  plus: 'M12 5v14M5 12h14', minus: 'M5 12h14', home: 'm3 11 9-8 9 8M6 10v11h4v-7h4v7h4V10',
  expand: 'M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5', flight: 'm3 10 18-7-7 18-3-8-8-3Zm8 3 10-10',
  mouse: 'M12 3c-4 0-7 3-7 7v5a7 7 0 0 0 14 0v-5c0-4-3-7-7-7ZM12 3v6M5 10h14',
  help: 'M9 8a3 3 0 1 1 5 2c-2 1-2 2-2 3M12 17h.01', filter: 'M4 6h16M7 12h10M10 18h4', back: 'm14 6-6 6 6 6',
};
export default function Icon({ name, size = 18, style }: { name: Name; size?: number; style?: CSSProperties }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden="true"><path d={paths[name]} /></svg>;
}

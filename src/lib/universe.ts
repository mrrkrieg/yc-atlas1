import type { Batch, Camera, Company, SceneNode, Vec3 } from '../types';

export const palette = ['#fa914e', '#af88f3', '#58bded', '#50c9c2', '#f27e94', '#80bfcf', '#f0b652'];
const showcase: Record<string, { position: Vec3; color: string; radius: number }> = {
  'Summer 2009': { position: { x: 0, y: 40, z: 0 }, color: palette[0], radius: 360 },
  'Summer 2007': { position: { x: -40, y: 425, z: -190 }, color: palette[2], radius: 255 },
  'Winter 2009': { position: { x: -540, y: -310, z: -140 }, color: palette[1], radius: 300 },
  'Summer 2012': { position: { x: 640, y: 310, z: -350 }, color: palette[3], radius: 270 },
  'Summer 2013': { position: { x: 200, y: -350, z: -240 }, color: palette[4], radius: 265 },
  'Summer 2020': { position: { x: 755, y: -160, z: -310 }, color: palette[3], radius: 215 },
  'Winter 2017': { position: { x: -620, y: 300, z: -650 }, color: palette[1], radius: 185 },
  'Summer 2021': { position: { x: 610, y: -680, z: -680 }, color: palette[6], radius: 230 },
};
const favorites = ['Stripe', 'Airbnb', 'Dropbox', 'Coinbase', 'Instacart', 'DoorDash', 'Supabase', 'Brex', 'Reddit', 'Twitch', 'Ginkgo Bioworks', 'Rippling', 'Fivetran', 'Zapier', 'Webflow', 'Replit', 'Retool', 'PostHog', 'Resend', 'Perplexity', 'Meesho', 'Deel', 'Rappi', 'Cruise', 'Algolia'];
export function batchCode(name: string) {
  const [season, year] = name.split(' ');
  return year ? `${season === 'Spring' ? 'X' : season[0]}${year.slice(-2)}` : '—';
}
export function batchOrder(name: string) {
  const [season, year] = name.split(' ');
  return Number(year || 0) * 10 + ({ Winter: 0, Spring: 1, Summer: 2, Fall: 3 }[season] ?? 4);
}
export function companyPriority(company: Company) {
  const favorite = favorites.indexOf(company.name);
  return favorite >= 0 ? 10000 - favorite * 100 : company.top ? 1000 + Math.min(company.team, 500) : Math.min(company.team, 400);
}
export function seeded(seed: number) {
  let value = seed | 0;
  return () => { value = Math.imul(value ^ (value >>> 16), 0x45d9f3b); value = Math.imul(value ^ (value >>> 16), 0x45d9f3b); value ^= value >>> 16; return (value >>> 0) / 4294967296; };
}
export function buildUniverse(companies: Company[]): { batches: Batch[]; nodes: SceneNode[] } {
  const grouped = new Map<string, Company[]>();
  companies.forEach(c => grouped.set(c.batch, [...(grouped.get(c.batch) || []), c]));
  const batches: Batch[] = Array.from(grouped.keys()).sort((a,b) => batchOrder(a) - batchOrder(b)).map((name, i) => {
    const override = showcase[name];
    const angle = i * 2.39996;
    const ring = 1500 + Math.sqrt(i) * 100;
    return {
      name, code: batchCode(name), color: override?.color || palette[i % palette.length],
      position: override?.position || { x: Math.cos(angle) * ring, y: Math.sin(angle) * ring * .58, z: -1100 - (i % 5) * 260 },
      radius: override?.radius || 200 + Math.sqrt(grouped.get(name)!.length) * 4,
      companies: grouped.get(name)!.sort((a,b) => companyPriority(b) - companyPriority(a)), featured: !!override,
    };
  });
  const nodes = batches.flatMap(batch => batch.companies.map((company, i) => {
    const random = seeded(company.id);
    const angle = i * 2.39996 + random() * .4;
    const distance = i === 0 ? 0 : batch.radius * Math.sqrt((i + 2) / (batch.companies.length + 2));
    return {
      company, batch, featured: i < (batch.featured ? 2 : 1),
      position: { x: batch.position.x + (i < 2 ? (i === 0 ? 0 : -batch.radius * .6) : Math.cos(angle) * distance),
        y: batch.position.y + (i < 2 ? (i === 0 ? 0 : -batch.radius * .04) : Math.sin(angle) * distance * .43),
        z: batch.position.z + (random() - .5) * batch.radius * .65 },
    };
  }));
  return { batches, nodes };
}
export function viewCenter(width: number, height: number, flight = false) {
  return flight ? { x: width / 2, y: height / 2 } : { x: width * .49, y: height * (width < 700 ? .32 : .45) };
}
export function project(position: Vec3, camera: Camera, width: number, height: number, flight = false) {
  const x = position.x - camera.x, y = position.y - camera.y, z = position.z - camera.z;
  const cy = Math.cos(camera.yaw), sy = Math.sin(camera.yaw), cp = Math.cos(camera.pitch), sp = Math.sin(camera.pitch);
  const rx = x * cy - z * sy, rz = x * sy + z * cy;
  const ry = y * cp - rz * sp, depth = -(y * sp + rz * cp);
  const focal = Math.min(width * (width < 700 ? .95 : .69), height * 1.04);
  const scale = focal / Math.max(depth, 1);
  const center=viewCenter(width,height,flight);
  return { x: center.x + rx * scale, y: center.y - ry * scale, scale, depth, visible: depth > 35 };
}
export function moveCamera(camera: Camera, forward: number, right: number, up: number, distance: number) {
  const sy = Math.sin(camera.yaw), cy = Math.cos(camera.yaw), cp = Math.cos(camera.pitch);
  camera.x += (-sy * cp * forward + cy * right) * distance;
  camera.z += (-cy * cp * forward - sy * right) * distance;
  camera.y += (up - Math.sin(camera.pitch) * forward) * distance;
}
export function lookCamera(camera: Camera, dx: number, dy: number, sensitivity = .0025) {
  camera.yaw -= dx * sensitivity;
  camera.pitch = Math.max(-1.48, Math.min(1.48, camera.pitch + dy * sensitivity));
}
export function safeWebsite(value: string) {
  try { const url = new URL(value.startsWith('http') ? value : `https://${value}`); return /^(https?:)$/.test(url.protocol) && url.hostname.includes('.') ? url.href : null; } catch { return null; }
}

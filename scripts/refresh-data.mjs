import { mkdir, readFile, writeFile } from 'node:fs/promises';
const source = 'https://yc-oss.github.io/api/companies/all.json';
const raw = process.argv[2] ? JSON.parse(await readFile(process.argv[2], 'utf8')) : await (await fetch(source)).json();
if (!Array.isArray(raw) || raw.length < 1000) throw new Error('Directory response is incomplete; existing snapshot was preserved.');
const companies = raw.map(c => ({ id:c.id, name:c.name, slug:c.slug, logo:c.small_logo_thumb_url || '', website:c.website || '', location:c.all_locations || '', description:c.one_liner || '', batch:c.batch || 'Unspecified', status:c.status || 'Unknown', industry:c.industry || 'Other', tags:c.tags || [], top:!!c.top_company, team:c.team_size || 0 }));
await mkdir('public/data', { recursive:true });
await writeFile('public/data/companies.json', JSON.stringify({ updated:new Date().toISOString().slice(0,10), source, companies }));
console.log(`Saved ${companies.length.toLocaleString()} real companies in ${new Set(companies.map(c=>c.batch)).size} batches.`);

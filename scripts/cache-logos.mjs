import { mkdir, writeFile, readFile } from 'node:fs/promises';
const { companies } = JSON.parse(await readFile('public/data/companies.json','utf8'));
const favorites=['Stripe','Airbnb','Dropbox','Coinbase','Instacart','DoorDash','Supabase','Brex','Reddit','Twitch','Rippling','Fivetran','Zapier','Webflow','Replit','Retool','PostHog','Resend','Deel','Rappi','Cruise','Algolia','Meesho','Ginkgo Bioworks'];
const byBatch=new Map();
for(const company of companies){const list=byBatch.get(company.batch)||[];list.push(company);byBatch.set(company.batch,list);}
const priority=c=>favorites.includes(c.name)?10000-favorites.indexOf(c.name)*100:c.top?1000+Math.min(c.team,500):Math.min(c.team,400);
const selection=[...new Map([...byBatch.values()].flatMap(list=>list.sort((a,b)=>priority(b)-priority(a)).slice(0,2)).concat(companies.filter(c=>favorites.includes(c.name))).map(c=>[c.id,c])).values()];
await mkdir('public/logos',{recursive:true});
const successful=[];
let next=0;
async function worker(){while(next<selection.length){const company=selection[next++];if(!company.logo)continue;try{const response=await fetch(company.logo,{signal:AbortSignal.timeout(12000)});if(!response.ok)continue;const buffer=Buffer.from(await response.arrayBuffer());await writeFile(`public/logos/${company.id}.png`,buffer);successful.push(company.id);}catch{}}}
await Promise.all(Array.from({length:8},worker));
await writeFile('src/lib/local-logos.json',JSON.stringify(successful));
console.log(`Cached ${successful.length} company logos locally.`);

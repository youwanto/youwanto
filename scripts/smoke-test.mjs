// Read-only smoke checks; no accounts, cart writes, credentials or purchases.
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

const target = process.argv[2];
if (!target) throw new Error('Usage: node scripts/smoke-test.mjs https://www.youwanto.com [report.json]');
const origin = new URL(target);
if (!['http:', 'https:'].includes(origin.protocol) || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== '/') {
  throw new Error('Provide a plain HTTP(S) site origin without credentials, paths or query strings.');
}
const results = [];
const request = async path => {
  const response = await fetch(new URL(path, origin), { signal: AbortSignal.timeout(20000), redirect: 'follow' });
  const text = await response.text();
  return { response, text };
};
const check = async (name, fn) => {
  try { await fn(); results.push({name,status:'pass'}); }
  catch(error) { results.push({name,status:'fail',message:error.message}); }
  console.log(`${results.at(-1).status.toUpperCase()} ${name}${results.at(-1).message ? ': '+results.at(-1).message : ''}`);
};
const api = async query => {
  const {response,text} = await request(`/api/products?${query}`);
  assert.equal(response.status,200);
  assert.match(response.headers.get('content-type') ?? '',/application\/json/);
  const data = JSON.parse(text);
  assert.ok(Array.isArray(data.items));
  assert.ok(data.nextCursor === null || typeof data.nextCursor === 'string');
  return data;
};
let sample;
await check('Homepage renders products and one H1',async()=>{
  const {response,text} = await request('/');
  assert.equal(response.status,200);
  assert.match(text,/Latest Products/);
  assert.equal((text.match(/<h1(?:\s|>)/g)??[]).length,1,'Expected one H1');
});
for (const [sort,direction] of [['price-asc',1],['price-desc',-1]]) {
  await check(`${sort}: numeric ordering, currency and two-page uniqueness`,async()=>{
    const first = await api(`sort=${sort}&currency=GBP`);
    assert.ok(first.items.length>0,'Expected seeded inventory');
    const second = first.nextCursor ? await api(`sort=${sort}&currency=GBP&cursor=${encodeURIComponent(first.nextCursor)}`) : {items:[]};
    const rows = [...first.items,...second.items];
    assert.equal(new Set(rows.map(row=>row.id)).size,rows.length,'Duplicate product across pages');
    assert.ok(rows.every(row=>row.currency==='GBP'),'Mixed currency');
    assert.ok(rows.every((row,index)=>index===0||(Number(row.price)-Number(rows[index-1].price))*direction>=0),'Prices out of order');
    assert.ok(first.items.length<=24,'Expected page size <=24');
    sample ??= rows[0];
  });
}
await check('Newest endpoint returns unique products',async()=>{
  const data = await api('sort=newest&currency=GBP');
  assert.equal(new Set(data.items.map(row=>row.id)).size,data.items.length);
  sample ??= data.items[0];
});
await check('Brand filter matches exact brand',async()=>{
  assert.ok(sample?.brand,'No sample brand');
  const data=await api(new URLSearchParams({brand:sample.brand,currency:'GBP'}));
  assert.ok(data.items.length>0);
  assert.ok(data.items.every(row=>row.brand===sample.brand));
});
await check('Price bounds are respected',async()=>{
  const data=await api('minPrice=25&maxPrice=50&currency=GBP');
  assert.ok(data.items.every(row=>Number(row.price)>=25&&Number(row.price)<=50));
});
for(const query of ['minPrice=NaN','minPrice=-1','minPrice=50&maxPrice=10','sort=random','currency=INVALID','cursor=invalid']) {
  await check(`Reject invalid input: ${query}`,async()=>{
    const {response}=await request('/api/products?'+query);
    assert.equal(response.status,400,'Invalid filters must return 400');
  });
}
await check('Product detail renders selected sample',async()=>{
  assert.ok(sample?.slug,'No product sample');
  const {response,text}=await request('/products/'+encodeURIComponent(sample.slug));
  assert.equal(response.status,200);
  assert.match(text,/<h1(?:\s|>)/);
});
for (const path of ['/cart','/sign-in','/sign-up']) {
  await check(`${path}: renders without server error`,async()=>{
    const {response,text}=await request(path);
    assert.equal(response.status,200);
    assert.ok(!text.includes('Application error: a server-side exception'));
  });
}
await check('Unknown product is marked noindex or HTTP 404',async()=>{
  const {response,text}=await request('/products/qa-product-does-not-exist-20261018');
  assert.ok(response.status===404||/<meta[^>]+name="robots"[^>]+content="[^"]*noindex/.test(text),'Missing not-found/noindex response');
});
await check('robots.txt is plain text, not an HTML collection response',async()=>{
  const {response,text}=await request('/robots.txt');
  assert.equal(response.status,200);
  assert.match(response.headers.get('content-type')??'',/text\/plain/);
  assert.match(text,/User-agent:/i);
});
await check('sitemap.xml contains XML URL entries',async()=>{
  const {response,text}=await request('/sitemap.xml');
  assert.equal(response.status,200);
  assert.match(response.headers.get('content-type')??'',/xml/);
  assert.match(text,/<urlset\b|<sitemapindex\b/);
});
const report={target:origin.origin,checkedAt:new Date().toISOString(),scope:'Read-only HTTP smoke tests; does not prove browser interactions, mobile layout, authenticated flows or transactions.',passed:results.filter(row=>row.status==='pass').length,failed:results.filter(row=>row.status==='fail').length,results};
if(process.argv[3]) await writeFile(process.argv[3],JSON.stringify(report,null,2)+'\n');
console.log(`Result: ${report.passed} passed, ${report.failed} failed`);
process.exitCode=report.failed?1:0;

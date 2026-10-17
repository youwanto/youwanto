import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCatalogQuery, catalogPage, CATALOG_PAGE_SIZE, parseCatalogQuery, formatCatalogPrice } from '../lib/catalog.ts';

test('newest is the default and each query has deterministic ordering before pagination', () => {
  for (const [sort, primary] of [['newest', {createdAt:'desc'}], ['price-asc', {price:'asc'}], ['price-desc', {price:'desc'}], ['name-asc', {name:'asc'}]]) {
    const parsed = parseCatalogQuery(new URLSearchParams({sort}));
    assert.deepEqual(buildCatalogQuery(parsed).orderBy, [primary, {id:'asc'}]);
    assert.equal(buildCatalogQuery(parsed).take, CATALOG_PAGE_SIZE + 1);
  }
  assert.equal(parseCatalogQuery(new URLSearchParams()).sort, 'newest');
});
test('category filters match exact paths and descendants without matching sibling prefixes', () => {
  const {where} = buildCatalogQuery(parseCatalogQuery(new URLSearchParams({category:'women/dresses'})));
  assert.deepEqual(where.categories.some.category.OR, [{path:'women/dresses'}, {path:{startsWith:'women/dresses/'}}]);
});
test('one-sided and zero price bounds are retained', () => {
  assert.deepEqual(buildCatalogQuery(parseCatalogQuery(new URLSearchParams('minPrice=15'))).where.price, {gte:15,lte:undefined});
  assert.deepEqual(buildCatalogQuery(parseCatalogQuery(new URLSearchParams('maxPrice=0'))).where.price, {gte:undefined,lte:0});
});
test('invalid prices, currencies, sort values and cursors are rejected', () => {
  for (const query of ['minPrice=NaN','minPrice=Infinity','minPrice=-1','maxPrice=','minPrice=10&maxPrice=1','currency=xxx','sort=random','cursor=invalid']) {
    assert.throws(() => parseCatalogQuery(new URLSearchParams(query)), query);
  }
});
test('currency partition and brand filters are explicit', () => {
  const {where} = buildCatalogQuery(parseCatalogQuery(new URLSearchParams('brand=The+Row&currency=EUR')));
  assert.equal(where.currency,'EUR');
  assert.equal(where.brand,'The Row');
  assert.equal(where.isActive,true);
  assert.equal(formatCatalogPrice(27,'GBP'),'£27');
});
test('cursor continues after the last displayed row', () => {
  const cursor = '00000000-0000-0000-0000-000000000001';
  const query = buildCatalogQuery(parseCatalogQuery(new URLSearchParams({cursor})));
  assert.deepEqual(query.cursor,{id:cursor});
  assert.equal(query.skip,1);
});
test('lookahead row is not displayed and cursor uses the last displayed row', () => {
  const rows = Array.from({length:CATALOG_PAGE_SIZE+1},(_,i)=>({id:String(i)}));
  const page = catalogPage(rows);
  assert.equal(page.items.length,CATALOG_PAGE_SIZE);
  assert.equal(page.nextCursor,String(CATALOG_PAGE_SIZE-1));
  assert.ok(!page.items.some(row=>row.id===String(CATALOG_PAGE_SIZE)));
});
test('empty and exactly full final pages terminate without repeating products', () => {
  assert.deepEqual(catalogPage([]),{items:[],nextCursor:null});
  const rows = Array.from({length:CATALOG_PAGE_SIZE},(_,i)=>({id:String(i)}));
  assert.equal(catalogPage(rows).nextCursor,null);
});

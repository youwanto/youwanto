import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';

const port=Number(process.env.LOCAL_QA_PORT??3137);
const origin=`http://127.0.0.1:${port}`;
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',String(port)],{detached:true,stdio:['ignore','pipe','pipe']});
let logs='';
for(const stream of [child.stdout,child.stderr]) stream.on('data',chunk=>{logs=(logs+chunk).slice(-8000);});
const results=[];
try {
  let ready=false;
  for(let attempt=0;attempt<40;attempt++) {
    if(child.exitCode!==null) throw new Error(`Next.js exited during startup: ${logs}`);
    try { const r=await fetch(origin+'/api/products?sort=invalid',{signal:AbortSignal.timeout(1000)}); if(r.status===400){ready=true;break;} }
    catch { /* Server is not ready yet. */ }
    await new Promise(resolve=>setTimeout(resolve,500));
  }
  assert.ok(ready,`Local API did not become ready: ${logs}`);
  for(const query of ['minPrice=NaN','minPrice=-1','minPrice=50&maxPrice=10','sort=random','currency=INVALID','cursor=invalid']) {
    const response=await fetch(origin+'/api/products?'+query,{signal:AbortSignal.timeout(10000)});
    const body=await response.json();
    assert.equal(response.status,400,query);
    assert.equal(typeof body.error,'string');
    results.push({query,status:response.status,passed:true});
    console.log('PASS 400 '+query);
  }
  const robots=await fetch(origin+'/robots.txt',{signal:AbortSignal.timeout(15000)});
  assert.equal(robots.status,200);
  assert.match(robots.headers.get('content-type')??'',/text\/plain/);
  assert.match(await robots.text(),/User-Agent:/i);
  results.push({path:'/robots.txt',status:200,passed:true});
  console.log('PASS robots.txt');
  if(process.argv[2]) await writeFile(process.argv[2],JSON.stringify({checkedAt:new Date().toISOString(),scope:'Local HTTP API rejection and robots tests without a database.',results},null,2)+'\n');
} finally {
  try { process.kill(-child.pid, 'SIGTERM'); } catch { /* Process already stopped. */ }
}

const {chromium}=require('playwright');
(async()=>{const b=await chromium.launch({channel:process.env.PW_CHANNEL,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1100,height:700}});p.on('pageerror',e=>console.log('PAGEERR',e.message));p.on('console',m=>{if(m.type()==='log')console.log('LOG',m.text())});
await p.route('https://cdn.jsdelivr.net/npm/three@0.149.0/**',r=>{const u=r.request().url().replace('https://cdn.jsdelivr.net/npm/three@0.149.0/','');r.fulfill({path:'node_modules/three/'+u,contentType:'application/javascript'});});
await p.goto('http://localhost:8765/'+(process.argv[3]||'prototype/demo/index.html'));if(!process.argv[3])await p.waitForSelector('#load',{state:'detached',timeout:120000});
const steps=JSON.parse(process.argv[2]);
for(const s of steps){ if(s.mouse){for(const a of s.mouse){if(a[0]==='down'){await p.mouse.move(a[1],a[2]);await p.mouse.down();}else if(a[0]==='move')await p.mouse.move(a[1],a[2],{steps:5});else await p.mouse.up();}}
if(s.click) await p.evaluate(sel=>document.querySelector(sel).click(), s.click); if(s.seat) await p.evaluate(v=>{const e=document.querySelector('#sSeat');e.value=v;e.dispatchEvent(new Event('change'));}, s.seat); if(s.eval) await p.evaluate(s.eval); await p.waitForTimeout(s.wait||7000); await p.screenshot({path:s.n}); }
await b.close();})();

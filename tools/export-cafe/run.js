const { chromium } = require('playwright');
const fs=require('fs');
(async()=>{
 const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const p=await b.newPage({viewport:{width:1200,height:800}});
 p.on('console',m=>{if(m.type()==='error')console.log('ERR',m.text())});p.on('pageerror',e=>console.log('PAGEERR',e.message));
 await p.goto('http://localhost:8765/tools/export-cafe/index.html');await p.waitForFunction('window.ready===true',{timeout:60000});
 console.log(JSON.stringify(await p.evaluate('info()')));
 const views=JSON.parse(process.argv[2]||'[]');
 for(const v of views){await p.evaluate(`view(${JSON.stringify(v.p)},${JSON.stringify(v.t)},${!!v.h},${v.f||50})`);await p.locator('#c').screenshot({path:v.n});}
 if(process.argv[3]){const b64=await p.evaluate('exportGLB()');fs.writeFileSync(process.argv[3],Buffer.from(b64,'base64'));console.log('glb',fs.statSync(process.argv[3]).size);fs.writeFileSync(process.argv[3].replace(/\.glb$/,'.meta.json'),JSON.stringify(await p.evaluate('extra()')));}
 await b.close();
})();

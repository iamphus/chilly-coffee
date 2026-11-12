const {chromium}=require('playwright');const fs=require('fs');const OUT='assets/characters';fs.mkdirSync('tmp',{recursive:true});
(async()=>{const b=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const p=await b.newPage({viewport:{width:1400,height:520}});p.on('pageerror',e=>console.log('PAGEERR',e.message));p.on('console',m=>{if(m.type()==='error')console.log('ERR',m.text())});
await p.goto('http://localhost:8765/tools/export-characters/index.html');await p.waitForFunction('window.ready===true',{timeout:60000});
console.log(JSON.stringify(await p.evaluate('stats()')));
for(const [n,t] of [['Dung',0.2],['Di_Bo',0.22],['Ngoi_Go_Phim',0.1],['Pha_Che',0.8]]){await p.evaluate(`pose('${n}',${t})`);await p.locator('#c').screenshot({path:'tmp/c_'+n+'.png'});}
if(process.argv[2]){fs.mkdirSync(OUT,{recursive:true});const N=await p.evaluate('CHAR_PRESETS.length');for(let i=0;i<N;i++){const r=await p.evaluate(`exportOne(${i})`);fs.writeFileSync(OUT+'/'+r.id+'.glb',Buffer.from(r.b64,'base64'));}console.log(fs.readdirSync(OUT).map(f=>f+':'+fs.statSync(OUT+'/'+f).size).join(' '));}
await b.close();})();

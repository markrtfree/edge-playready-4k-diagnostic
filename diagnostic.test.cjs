const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const code=fs.readFileSync(__dirname+'/diagnose-force.js','utf8');
const PR='com.microsoft.playready.recommendation.3000';
const WV='com.widevine.alpha';
// Browser/CDM boundary double: these tests exercise the actual content script,
// not DRM hardware, Netflix fallback behavior or licenses.
function setup({hw=true,mode='prefer',failUpgrade=false}={}){
 const calls=[], storage=new Map([['netflix-sl3000-mode',mode]]);
 class Navigator{}
 Navigator.prototype.requestMediaKeySystemAccess=async function(k,c){
  calls.push([k,c]);
  if(k===PR && (!hw || (failUpgrade && c[0].label==='real')))throw new DOMException('unsupported','NotSupportedError');
  return {keySystem:k,getConfiguration:()=>c[0]};
 };
 const nav=new Navigator();
 nav.mediaCapabilities={decodingInfo:async q=>({supported:true,smooth:true,powerEfficient:true,keySystemAccess:{keySystem:q.keySystemConfiguration?.keySystem}})};
 const ctx=vm.createContext({Navigator,navigator:nav,window:{},location:{pathname:'/watch/123'},console:{info(){},warn(){},error(){}},DOMException,setTimeout,clearTimeout,localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)}});
 vm.runInContext(code,ctx);
 return {nav,calls,api:ctx.window.NetflixSL3000,ctx,storage};
}
test('prefer mode declines Widevine only after native hardware access succeeds',async()=>{
 const s=setup(); await assert.rejects(s.nav.requestMediaKeySystemAccess(WV,[{}]),{name:'NotSupportedError'});
 assert.equal(s.calls[0][0],PR);assert.ok(!s.calls.some(c=>c[0]===WV));
});
test('hardware unavailable preserves genuine Widevine access',async()=>{
 const s=setup({hw:false});assert.equal((await s.nav.requestMediaKeySystemAccess(WV,[{}])).keySystem,WV);
});
test('compatible mode never blocks Widevine',async()=>{
 const s=setup({mode:'compatible'});assert.equal((await s.nav.requestMediaKeySystemAccess(WV,[{}])).keySystem,WV);
 assert.equal(s.calls.length,1);
});
test('PlayReady upgrade preserves input and encryption fields',async()=>{
 const s=setup();const c=[{label:'real',videoCapabilities:[{contentType:'video/mp4',robustness:'2000',encryptionScheme:'cenc'}]}];
 const before=JSON.stringify(c);const a=await s.nav.requestMediaKeySystemAccess('com.microsoft.playready.recommendation.2000',c);
 assert.equal(a.keySystem,PR);assert.equal(JSON.stringify(c),before);
 assert.equal(a.getConfiguration().videoCapabilities[0].robustness,'3000');
 assert.equal(a.getConfiguration().videoCapabilities[0].encryptionScheme,'cenc');
});
test('failed hardware upgrade retries original PlayReady once',async()=>{
 const s=setup({failUpgrade:true});const k='com.microsoft.playready.recommendation.2000';
 assert.equal((await s.nav.requestMediaKeySystemAccess(k,[{label:'real'}])).keySystem,k);
 assert.equal(s.calls.length,2);
});
test('MediaCapabilities applies the same Widevine preference',async()=>{
 const s=setup();const r=await s.nav.mediaCapabilities.decodingInfo({keySystemConfiguration:{keySystem:WV}});
 assert.equal(r.supported,false);assert.equal(r.keySystemAccess,null);
});
test('local diagnostics are bounded, exportable and mode persists',async()=>{
 const s=setup({mode:'compatible'});assert.ok(s.api,'diagnostic API exists');
 for(let i=0;i<310;i++)await s.nav.requestMediaKeySystemAccess(WV,[{label:'SECRET_CONFIG'}]);
 const report=s.api.report();assert.ok(report.events.length<=300);assert.ok(!JSON.stringify(report).includes('SECRET_CONFIG'));
 s.api.setMode('prefer');assert.equal(s.storage.get('netflix-sl3000-mode'),'prefer');
 assert.throws(()=>s.api.setMode('bad'));assert.equal(typeof s.api.export(),'string');
});
test('reinjection does not double wrap',async()=>{
 const s=setup({mode:'compatible'});const fn=s.nav.requestMediaKeySystemAccess;vm.runInContext(code,s.ctx);
 assert.equal(s.nav.requestMediaKeySystemAccess,fn);
});

test('report separates site request from native access grant',async()=>{
 const s=setup();const k='com.microsoft.playready.recommendation.2000';
 assert.equal(s.api.report().lastAccess,null);
 await s.nav.requestMediaKeySystemAccess(k,[{}]);
 assert.equal(s.api.report().lastAccess.requested,k);
 assert.equal(s.api.report().lastAccess.granted,PR);
 assert.equal(s.api.report().lastAccess.source,'EME');
 const copy=s.api.report();copy.lastAccess.granted='fake';assert.equal(s.api.report().lastAccess.granted,PR);
});
test('hardware probe alone does not claim a playback access grant',async()=>{
 const s=setup();await assert.rejects(s.nav.requestMediaKeySystemAccess(WV,[{}]));
 assert.equal(s.api.report().lastAccess,null);
});
test('fallback reports the real original PlayReady grant',async()=>{
 const s=setup({failUpgrade:true}),k='com.microsoft.playready.recommendation.2000';
 await s.nav.requestMediaKeySystemAccess(k,[{label:'real'}]);
 assert.equal(s.api.report().lastAccess.granted,k);
});
test('MediaCapabilities records actual returned key system',async()=>{
 const s=setup();await s.nav.mediaCapabilities.decodingInfo({keySystemConfiguration:{keySystem:'com.microsoft.playready.recommendation.2000'}});
 assert.equal(s.api.report().lastAccess.granted,PR);
 assert.equal(s.api.report().lastAccess.source,'MediaCapabilities');
});

test('badge is hidden by default and only appears when explicitly enabled',async()=>{
 const s=setup();const nodes=[];
 s.ctx.document={body:{appendChild:n=>nodes.push(n)},fullscreenElement:null,createElement:()=>({style:{},setAttribute(){},isConnected:true}),addEventListener(){}};
 await s.nav.requestMediaKeySystemAccess('com.microsoft.playready.recommendation.2000',[{}]);
 assert.equal(nodes.length,0);
 s.api.showOverlay(true);
 assert.equal(nodes.length,1);assert.match(nodes[0].textContent,/3000/);assert.match(nodes[0].textContent,/2000/);
 assert.match(nodes[0].textContent,/最近/);
 s.api.showOverlay(false);
 assert.equal(nodes[0].style.display,'none');
 await s.nav.requestMediaKeySystemAccess('com.microsoft.playready.recommendation.2000',[{}]);
 assert.equal(nodes[0].style.display,'none');
});

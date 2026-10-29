(() => {
'use strict';
const marker=Symbol.for('netflix-playready-sl3000-diagnostic-v03');
if(window[marker])return;
Object.defineProperty(window,marker,{value:true});
const HW='com.microsoft.playready.recommendation.3000',WV='com.widevine.alpha';
const SW=new Set(['com.microsoft.playready.recommendation','com.microsoft.playready.recommendation.2000']);
const events=[];
let mode='prefer',probe,seq=0;
let lastAccess=null,badge=null,overlayEnabled=false;
function renderAccess(){
 // Diagnostics must never break DRM negotiation, or replace Netflix's own text.
 try{
  if(!overlayEnabled){if(badge)badge.style.display='none';return;}
  if(typeof document==='undefined'||!document.body||!lastAccess)return;
  if(!badge){
   badge=document.createElement('div');
   badge.setAttribute('data-netflix-sl3000-diagnostic','0.3.2');
   badge.style.cssText='position:fixed;right:12px;bottom:92px;z-index:2147483647;max-width:440px;padding:8px 12px;border-radius:6px;background:rgba(0,0,0,.8);color:#b9f6ca;font:12px/1.5 monospace;white-space:pre-wrap;pointer-events:none';
  }
  badge.style.display='block';
  badge.textContent='插件：最近获准的 KeySystem（'+lastAccess.source+'）\n'+lastAccess.granted+'\n站点请求：'+lastAccess.requested+'\n'+lastAccess.time+'\n访问获准不等于当前视频绑定；清晰度以 Netflix 浮层为准';
  const host=document.fullscreenElement||document.body;
  if(badge.parentNode!==host)host.appendChild(badge);
 }catch{}
}
function recordAccess(requested,access,source){
 lastAccess={requested:name(requested),granted:name(access.keySystem),source,time:new Date().toISOString()};
 renderAccess();
}
if(typeof document!=='undefined'){
 document.addEventListener('DOMContentLoaded',renderAccess,{once:true});
 document.addEventListener('fullscreenchange',renderAccess);
}
try{if(localStorage.getItem('netflix-sl3000-mode')==='compatible')mode='compatible';}catch{}
function log(event,data={}){
 const row={time:new Date().toISOString(),event,...data};events.push(row);
 if(events.length>300)events.shift();
 console.info('[Netflix SL3000 v0.3.2]',JSON.stringify(row));
}
const name=k=>SW.has(k)||k===HW||k===WV?k:'other';
const errorName=e=>['NotSupportedError','SecurityError','TypeError','InvalidStateError'].includes(e?.name)?e.name:'Error';
const origEME=navigator.requestMediaKeySystemAccess,mc=navigator.mediaCapabilities,origMC=mc?.decodingInfo;
// Native capability check only. Does not prove HEVC, HDCP, licenses or 4K.
function hardwareAvailable(){
 if(!probe)probe=new Promise(resolve=>{
  let done=false;
  const finish=ok=>{if(done)return;done=true;clearTimeout(timer);log('hardware-probe',{available:ok});resolve(ok);};
  const timer=setTimeout(()=>finish(false),1500);
  Promise.resolve().then(()=>Reflect.apply(origEME,navigator,[HW,[{
   initDataTypes:['cenc'],sessionTypes:['temporary'],
   videoCapabilities:[{contentType:'video/mp4; codecs="avc1.640028"',robustness:'3000'}]
  }]])).then(a=>finish(a.keySystem===HW),()=>finish(false));
 });
 return probe;
}
function upgrade(c){
 if(!c||typeof c!=='object')return c;
 const out={...c};
 for(const t of ['audioCapabilities','videoCapabilities'])
  if(Array.isArray(c[t]))out[t]=c[t].map(x=>x?.robustness==='2000'?{...x,robustness:'3000'}:x);
 return out;
}
async function preferHardware(k){return k===WV&&mode==='prefer'&&await hardwareAvailable()&&mode==='prefer';}
if(typeof origEME==='function'){
 const wrapped=async function(k,configs){
  const id=++seq;log('EME-request',{id,keySystem:name(k)});
  if(await preferHardware(k)){
   log('EME-policy-decline',{id,keySystem:WV,reason:'prefer-playready; site must choose fallback'});
   throw new DOMException('Extension prefers PlayReady. Select compatible mode if playback fails.','NotSupportedError');
  }
  const changed=SW.has(k),next=changed?HW:k;
  try{
   const access=await Reflect.apply(origEME,this,[next,changed&&Array.isArray(configs)?configs.map(upgrade):configs]);
   log('EME-granted',{id,requested:name(k),actual:name(access.keySystem)});
   recordAccess(k,access,'EME');
   return access;
  }catch(e){
   log('EME-failed',{id,keySystem:name(next),error:errorName(e)});
   if(!changed||e?.name!=='NotSupportedError')throw e;
   log('EME-original-fallback',{id,keySystem:name(k)});
   const access=await Reflect.apply(origEME,this,[k,configs]);
   recordAccess(k,access,'EME');
   log('EME-fallback-granted',{id,actual:name(access.keySystem)});return access;
  }
 };
 try{Object.defineProperty(Navigator.prototype,'requestMediaKeySystemAccess',{configurable:true,writable:true,value:wrapped});}
 catch(e){log('hook-failed',{api:'EME',error:errorName(e)});}
}
if(typeof origMC==='function'){
 try{Object.defineProperty(mc,'decodingInfo',{configurable:true,writable:true,value:async function(q){
  const k=q?.keySystemConfiguration?.keySystem;
  if(!k)return Reflect.apply(origMC,this,[q]);
  const id=++seq;log('MC-request',{id,keySystem:name(k)});
  if(await preferHardware(k)){
   log('MC-policy-decline',{id,keySystem:WV});
   return {supported:false,smooth:false,powerEfficient:false,keySystemAccess:null};
  }
  let next=q;
  if(SW.has(k)){
   const keySystemConfiguration={...q.keySystemConfiguration,keySystem:HW};
   for(const t of ['audio','video'])if(keySystemConfiguration[t]?.robustness==='2000')keySystemConfiguration[t]={...keySystemConfiguration[t],robustness:'3000'};
   next={...q,keySystemConfiguration};
  }
  let result;
  try{result=await Reflect.apply(origMC,this,[next]);}catch(e){
   log('MC-failed',{id,error:errorName(e)});
   if(next===q||e?.name!=='NotSupportedError')throw e;
  }
  if(next!==q&&!result?.supported){
   log('MC-original-fallback',{id});result=await Reflect.apply(origMC,this,[q]);
  }
  log('MC-result',{id,supported:result.supported,smooth:result.smooth,powerEfficient:result.powerEfficient});
  if(result.supported&&result.keySystemAccess)recordAccess(k,result.keySystemAccess,'MediaCapabilities');
  return result;
 }});}catch(e){log('hook-failed',{api:'MC',error:errorName(e)});}
}
const report=()=>({version:'0.3.2',mode,lastAccess:lastAccess?{...lastAccess}:null,events:events.map(e=>({...e}))});
Object.defineProperty(window,'NetflixSL3000',{configurable:true,value:Object.freeze({
 report,export:()=>JSON.stringify(report(),null,2),
 showOverlay(value){overlayEnabled=value===true;renderAccess();return overlayEnabled;},
 setMode(value){
  if(!['prefer','compatible'].includes(value))throw new TypeError('Use prefer or compatible');
  mode=value;probe=undefined;
  try{localStorage.setItem('netflix-sl3000-mode',value);}catch{}
  log('mode-changed',{mode,reloadRequired:true});
  return 'Mode saved. Reload to create a new playback session.';
 }
})});
log('installed',{mode});
})();


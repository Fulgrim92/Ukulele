import {parseLrc,lyricLines,validateLyrics} from './lyrics.js';

const ORIGIN='https://lrclib.net';
const normalize=value=>String(value??'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
const aborted=()=>new DOMException('Lyrics lookup paused.','AbortError');
export class LyricAccessError extends Error{}
export class LyricStorageError extends Error{}

export function waitForLyrics(ms,signal){
 if(signal?.aborted)return Promise.reject(aborted());
 return new Promise((resolve,reject)=>{const timer=setTimeout(done,ms);function done(){signal?.removeEventListener('abort',cancel);resolve();}function cancel(){clearTimeout(timer);signal?.removeEventListener('abort',cancel);reject(aborted());}signal?.addEventListener('abort',cancel,{once:true});});
}
export function retryDelay(value,now=Date.now()){
 if(!value)return 0;const seconds=Number(value);return Number.isFinite(seconds)?Math.max(0,seconds*1000):Math.max(0,(Date.parse(value)||now)-now);
}

export class LyricResponseCache{
 constructor(){this.memory=new Map();this.database=null;}
 async open(){
  if(!globalThis.indexedDB)return null;
  if(!this.database)this.database=new Promise(resolve=>{const request=indexedDB.open('four-strings-lyric-cache',1);request.onupgradeneeded=()=>request.result.createObjectStore('responses');request.onsuccess=()=>resolve(request.result);request.onerror=()=>resolve(null);request.onblocked=()=>resolve(null);});
  return this.database;
 }
 async get(key){
  const fallback=this.memory.get(key);try{const db=await this.open();if(!db)return fallback;return await new Promise(resolve=>{const request=db.transaction('responses').objectStore('responses').get(key);request.onsuccess=()=>resolve(request.result??fallback);request.onerror=()=>resolve(fallback);});}catch{return fallback;}
 }
 async set(key,value){
  this.memory.set(key,value);if(this.memory.size>12)this.memory.delete(this.memory.keys().next().value);try{const db=await this.open();if(db)await new Promise(resolve=>{const transaction=db.transaction('responses','readwrite');transaction.objectStore('responses').put(value,key);transaction.oncomplete=resolve;transaction.onerror=resolve;transaction.onabort=resolve;});}catch{}
 }
}

export class LRCLIBBrowserClient{
 constructor({fetcher=globalThis.fetch.bind(globalThis),cache=new LyricResponseCache(),interval=1000,retries=4,timeout=25000,now=Date.now,sleep=waitForLyrics,jitter=Math.random,onWait=()=>{}}={}){
  if(!Number.isFinite(interval)||interval<250||!Number.isInteger(retries)||retries<0||!Number.isFinite(timeout)||timeout<=0)throw Error('Invalid lyric request settings.');
  Object.assign(this,{fetcher,cache,interval,retries,timeout,now,sleep,jitter,onWait});this.lastRequest=null;
 }
 async get(endpoint,params={},options={}){
  const {signal,refresh=false}=options;if(signal?.aborted)throw aborted();
  if(!/^\/api\/(search|get(?:\/\d+)?)$/.test(endpoint))throw Error('Unsupported lyric endpoint.');
  const url=new URL(endpoint,ORIGIN);for(const [key,value]of Object.entries(params).sort())if(value!==undefined&&value!==null&&value!=='')url.searchParams.set(key,String(value));
  const key=url.href,cached=refresh?null:await this.cache.get(key);if(signal?.aborted)throw aborted();if(cached?.expires>this.now())return cached.payload;
  for(let attempt=0;attempt<=this.retries;attempt++){
   if(signal?.aborted)throw aborted();if(this.lastRequest!==null)await this.sleep(Math.max(0,this.interval-(this.now()-this.lastRequest)),signal);
   const controller=new AbortController(),cancel=()=>controller.abort();signal?.addEventListener('abort',cancel,{once:true});if(signal?.aborted)controller.abort();
   const timer=setTimeout(()=>controller.abort(),this.timeout);this.lastRequest=this.now();let response,text='';
   try{response=await this.fetcher(key,{headers:{Accept:'application/json','Lrclib-Client':'FourStringsLyrics/1.1 (https://four-strings-christian.christian-wolf96.chatgpt.site)'},credentials:'omit',redirect:'error',cache:'no-store',signal:controller.signal});if(response.status===200){text=await response.text();if(text.length>5000000)throw Error('The lyric response is too large.');}}
   catch(err){if(signal?.aborted)throw aborted();if(attempt===this.retries)throw Error('Could not reach LRCLIB. Check your connection and try again.');await this.cooldown(attempt,0,signal);continue;}
   finally{clearTimeout(timer);signal?.removeEventListener('abort',cancel);}
   if(response.url&&new URL(response.url).origin!==ORIGIN)throw new LyricAccessError('The lyric provider redirected to another service. Lookup stopped.');
   if([401,403].includes(response.status))throw new LyricAccessError('LRCLIB denied access. Lookup stopped; your saved lyrics are safe.');
   if(response.status===429||response.status>=500&&response.status<=599){const header=response.headers.get('Retry-After'),delay=response.status===429&&!header?60000:retryDelay(header,this.now());await this.cooldown(attempt,delay,signal);if(attempt===this.retries)throw Error('The lyric provider is busy. Resume later.');continue;}
   let payload=null;if(response.status!==404){
    if(response.status!==200)throw Error(`Lyric request failed (HTTP ${response.status}).`);
    if(!response.headers.get('Content-Type')?.toLowerCase().includes('application/json'))throw Error('The lyric provider returned an unreadable response.');
    try{payload=JSON.parse(text);}catch{throw Error('The lyric provider returned invalid data.');}
    if(!payload||typeof payload!=='object')throw Error('The lyric provider returned invalid data.');
   }
   if(signal?.aborted)throw aborted();await this.cache.set(key,{expires:this.now()+(response.status===404?3600000:86400000),payload});return payload;
  }
 }
 async cooldown(attempt,serverDelay,signal){const delay=Math.max(serverDelay,Math.min(60000,1000*2**attempt));const wait=delay+this.jitter()*delay*.3;this.onWait(wait);await this.sleep(wait,signal);}
 async lookup(song,options={}){
  const params={artist_name:song.artist,track_name:song.title,...(song.album?{album_name:song.album}:{}),...(Number.isFinite(song.duration)&&song.duration>=1&&song.duration<=3600?{duration:song.duration}:{})};
  const direct=await this.get('/api/get',params,options);
  if(direct&&!Array.isArray(direct)&&song.album&&Number.isFinite(song.duration)){const result=chooseLyricMatch(song,[direct]);if(['ready','instrumental'].includes(result.status))return result;}
  const {duration,...search}=params;const records=await this.get('/api/search',search,options);return chooseLyricMatch(song,Array.isArray(records)?records:[]);
 }
 async select(song,candidate,options={}){
  if(!Number.isSafeInteger(candidate.id)||candidate.id<0)throw Error('This lyric version has no valid provider ID.');
  const record=await this.get('/api/get/'+candidate.id,{},options);
  if(!record||record.id!==candidate.id||normalize(record.albumName)!==normalize(candidate.albumName)||lyricCandidate(record).duration!==candidate.duration)throw Error('That lyric version changed. Refresh the matches.');
  return chooseLyricMatch(song,[record]);
 }
}

export function lyricCandidate(record){
 return {id:record.id,artistName:String(record.artistName||''),trackName:String(record.trackName||''),albumName:String(record.albumName||''),duration:record.duration!==null&&Number.isFinite(Number(record.duration))&&Number(record.duration)>0?Number(record.duration):null,format:usableLrc(record.syncedLyrics)?'lrc':typeof record.plainLyrics==='string'&&record.plainLyrics.trim()?'txt':'none'};
}
function usableLrc(text){try{return typeof text==='string'&&parseLrc(text).length>0;}catch{return false;}}
function compatible(song,record){
 return record&&typeof record==='object'&&!Array.isArray(record)&&normalize(song.artist)===normalize(record.artistName)&&normalize(song.title)===normalize(record.trackName)&&(!song.album||normalize(song.album)===normalize(record.albumName))&&(!Number.isFinite(song.duration)||Number.isFinite(Number(record.duration))&&Math.abs(song.duration-Number(record.duration))<=2);
}
export function chooseLyricMatch(song,records){
 const valid=records.filter(r=>compatible(song,r)),unique=new Map();
 for(const r of valid){const key=JSON.stringify([normalize(r.albumName),r.duration,r.syncedLyrics??null,r.plainLyrics??null,r.instrumental===true]);if(!unique.has(key))unique.set(key,r);}
 let candidates=[...unique.values()];
 const identities=new Set(candidates.map(r=>JSON.stringify([normalize(r.albumName),r.duration])));
 if(identities.size===1){const timed=candidates.filter(r=>usableLrc(r.syncedLyrics));if(timed.length===1)candidates=timed;}
 if(!candidates.length)return {status:'missing',message:'No exact artist and song version matched.',candidates:[]};
 if(candidates.length>1){const choices=candidates.map(lyricCandidate).filter(c=>c.format!=='none'&&Number.isSafeInteger(c.id)).slice(0,20);return choices.length?{status:'ambiguous',message:'Choose the recording version you want to practice.',candidates:choices}:{status:'missing',message:'The matching versions have no supported lyric text.',candidates:[]};}
 const record=candidates[0];if(record.instrumental===true)return {status:'instrumental',message:'This version is marked instrumental.',candidates:[]};
 const timed=usableLrc(record.syncedLyrics),text=timed?record.syncedLyrics:record.plainLyrics;
 try{
  if(typeof text!=='string'||!lyricLines(text).length)throw Error('No usable lyric text.');
  const config={text,mode:timed?'timed':'manual',startBar:0,barsPerLine:2,...(Number.isFinite(song.bpm)?{timingBpm:song.bpm}:{})};validateLyrics({[song.id]:config});
  return {status:'ready',message:timed?'Timed lyrics saved.':'Plain lyrics saved; use the line arrows.',config,match:lyricCandidate(record),candidates:[]};
 }catch{return {status:'missing',message:'The matching version has no supported lyric text.',candidates:[]};}
}

export function songFingerprint(song){return JSON.stringify([song.artist,song.title,song.album||'',song.duration??null]);}
export function restoreLyricSync(raw,songs){
 let parsed;try{parsed=JSON.parse(raw);}catch{return {};}
 if(!parsed||parsed.version!==1||!parsed.results||typeof parsed.results!=='object')return {};
 const result={};for(const song of songs){const state=parsed.results[song.id];if(!state||state.fingerprint!==songFingerprint(song)||!['ready','missing','ambiguous','instrumental','error','builtin','existing'].includes(state.status))continue;
  result[song.id]={status:state.status,fingerprint:state.fingerprint,message:String(state.message||'').slice(0,300),candidates:Array.isArray(state.candidates)?state.candidates.filter(c=>c&&Number.isSafeInteger(c.id)&&c.id>=0&&typeof c.albumName==='string'&&Number.isFinite(c.duration)).slice(0,20).map(c=>({id:c.id,artistName:String(c.artistName||'').slice(0,300),trackName:String(c.trackName||'').slice(0,300),albumName:c.albumName.slice(0,300),duration:c.duration,format:c.format==='lrc'?'lrc':'txt'})):[]};
 }return result;
}

export async function syncSongbook({songs,client,results,hasLyrics,saveLyrics,persist=()=>{},onProgress=()=>{},signal,retry=false}){
 let errors=0;
 for(let i=0;i<songs.length;i++){
  if(signal?.aborted)throw aborted();const song=songs[i],fingerprint=songFingerprint(song),prior=results[song.id];
  onProgress({index:i,total:songs.length,song,phase:'looking'});
  if(hasLyrics(song.id)||song.builtin){results[song.id]={status:song.builtin?'builtin':prior?.status==='ready'?'ready':'existing',fingerprint,message:song.builtin?'Included with the app.':'Saved lyrics kept.',candidates:[]};persist();onProgress({index:i+1,total:songs.length,song,phase:'saved'});continue;}
  if(prior?.fingerprint===fingerprint&&!retry&&['missing','ambiguous','instrumental'].includes(prior.status)){onProgress({index:i+1,total:songs.length,song,phase:'skipped'});continue;}
  try{
   const match=await client.lookup(song,{signal,refresh:retry});if(signal?.aborted)throw aborted();
   // Recheck saved lyrics after the request in case the user imported or edited another tab.
   if(match.config&&!hasLyrics(song.id)){if(await saveLyrics(song.id,match.config)===false)throw new LyricStorageError('Browser storage is full or unavailable. Export a backup before resuming.');}
   const {config,...state}=match;results[song.id]={...state,fingerprint};errors=0;persist();
  }catch(err){
   if(err.name==='AbortError')throw err;results[song.id]={status:'error',fingerprint,message:err.message,candidates:[]};persist();
   if(err instanceof LyricAccessError||err instanceof LyricStorageError||++errors>=3)throw err;
  }
  onProgress({index:i+1,total:songs.length,song,phase:'saved'});
 }
 return results;
}

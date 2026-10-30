import {test} from 'node:test';
import assert from 'node:assert/strict';
import {LRCLIBBrowserClient,LyricAccessError,LyricStorageError,chooseLyricMatch,syncSongbook,songFingerprint,restoreLyricSync,retryDelay,waitForLyrics} from '../dist/lyric-sync.js';

const song={id:'axis-2',artist:'Synthetic Artist',title:'Practice Dawn',bpm:80};
const record=(changes={})=>({id:1,artistName:song.artist,trackName:song.title,albumName:'Synthetic Album',duration:120,instrumental:false,syncedLyrics:'[00:02]An original line for this test\n[00:06]Four strings guide a gentle rest',plainLyrics:'An original line for this test\nFour strings guide a gentle rest',...changes});
const response=(payload,status=200,headers={})=>new Response(JSON.stringify(payload),{status,headers:{'Content-Type':'application/json',...headers}});
class Cache{constructor(){this.map=new Map();}async get(k){return this.map.get(k);}async set(k,v){this.map.set(k,v);}}
function fixtureClient(replies,options={}){
 let now=0;const calls=[],waits=[];const client=new LRCLIBBrowserClient({cache:new Cache(),now:()=>now,sleep:async(ms,signal)=>{if(signal?.aborted)throw new DOMException('Paused','AbortError');waits.push(ms);now+=ms;},jitter:()=>0,fetcher:async(url,init)=>{calls.push({url,init});const next=replies.shift();if(next instanceof Error)throw next;assert(next,'Unexpected fixture request');return next;},...options});return {client,calls,waits,advance:ms=>{now+=ms;}};
}

test('browser matching keeps live, remix, cover, album and duration identities distinct',()=>{
 assert.equal(chooseLyricMatch(song,[record()]).status,'ready');
 for(const fields of [{artistName:'A Cover Artist'},{trackName:song.title+' (Live)'},{trackName:song.title+' Remix'}])assert.equal(chooseLyricMatch(song,[record(fields)]).status,'missing');
 const specific={...song,album:'Synthetic Album',duration:120};
 assert.equal(chooseLyricMatch(specific,[record({duration:122})]).status,'ready');
 for(const fields of [{albumName:'Other Album'},{duration:123}])assert.equal(chooseLyricMatch(specific,[record(fields)]).status,'missing');
});
test('browser matching prefers timed lyrics for one identity and leaves alternate recordings unresolved',()=>{
 const timed=record(),plain=record({id:2,syncedLyrics:null});
 assert.equal(chooseLyricMatch(song,[plain,timed]).config.mode,'timed');
 assert.equal(chooseLyricMatch(song,[plain]).config.mode,'manual');
 const ambiguous=chooseLyricMatch(song,[timed,record({id:2,albumName:'Another edition'})]);
 assert.equal(ambiguous.status,'ambiguous');assert.equal(ambiguous.candidates.length,2);assert(!JSON.stringify(ambiguous).includes('An original line'));
 assert.equal(chooseLyricMatch(song,[record({instrumental:true,syncedLyrics:null,plainLyrics:null})]).status,'instrumental');
 assert.equal(chooseLyricMatch(song,[record({syncedLyrics:null,plainLyrics:null})]).status,'missing');
 assert.equal(chooseLyricMatch(song,[record({syncedLyrics:null,plainLyrics:null}),record({id:2,albumName:'Other',syncedLyrics:null,plainLyrics:null})]).status,'missing');
});
test('browser API cache, sequential throttle, client identification and refresh work together',async()=>{
 const {client,calls,waits,advance}=fixtureClient([response([]),response([]),response([])]);
 assert.deepEqual(await client.get('/api/search',{track_name:'One & Two'}),[]);
 await client.get('/api/search',{track_name:'One & Two'});assert.equal(calls.length,1);
 await client.get('/api/search',{track_name:'Other'});assert.equal(waits.reduce((a,b)=>a+b,0),1000);
 assert.equal(new URL(calls[0].url).searchParams.get('track_name'),'One & Two');
 assert(calls[0].init.headers['Lrclib-Client'].includes('FourStringsLyrics'));assert.equal(calls[0].init.credentials,'omit');
 await client.get('/api/search',{track_name:'One & Two'},{refresh:true});assert.equal(calls.length,3);
 advance(86400001);client.fetcher=async()=>{calls.push({});return response([]);};await client.get('/api/search',{track_name:'Other'});assert.equal(calls.length,4);
});
test('browser API honors numeric/date Retry-After, retries network failures and caches missing results',async()=>{
 const {client,calls,waits}=fixtureClient([new TypeError('Network'),response({},429,{'Retry-After':'7'}),response([])]);
 await client.get('/api/search',{track_name:'Test'});assert.equal(calls.length,3);assert(waits.some(ms=>ms>=7000));
 assert.equal(retryDelay('Thu, 01 Jan 1970 00:00:09 GMT',0),9000);
 const missing=fixtureClient([response({},404)]);assert.equal(await missing.client.get('/api/get',{}),null);assert.equal(await missing.client.get('/api/get',{}),null);assert.equal(missing.calls.length,1);
});
test('access denial stops immediately, malformed responses are rejected, and final cooldown is honored',async()=>{
 for(const status of [401,403]){const f=fixtureClient([response({},status)]);await assert.rejects(()=>f.client.get('/api/get'),LyricAccessError);assert.equal(f.calls.length,1);}
 const f=fixtureClient([response({},429,{'Retry-After':'11'})],{retries:0});await assert.rejects(()=>f.client.get('/api/get'));assert(f.waits.includes(11000));
 const hiddenHeader=fixtureClient([response({},429)],{retries:0});await assert.rejects(()=>hiddenHeader.client.get('/api/get'));assert(hiddenHeader.waits.includes(60000));
 const html=fixtureClient([new Response('<html>',{headers:{'Content-Type':'text/html'}})]);await assert.rejects(()=>html.client.get('/api/get'),/unreadable/);
});
test('pause and timeout abort pending requests without starting more songs',async()=>{
 const controller=new AbortController();const waiting=waitForLyrics(60000,controller.signal);controller.abort();await assert.rejects(()=>waiting,{name:'AbortError'});
 const {client}=fixtureClient([],{retries:0,timeout:10,fetcher:(_url,{signal})=>new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError'))))});
 await assert.rejects(()=>client.get('/api/get'),/Could not reach/);
});
test('partial metadata forces a search, and a selected version is revalidated before saving',async()=>{
 const f=fixtureClient([response(record()),response([record(),record({id:2,albumName:'Other edition'})]),response(record({id:2,albumName:'Other edition'}))]);
 const result=await f.client.lookup(song);assert.equal(result.status,'ambiguous');assert.equal(f.calls.length,2);
 const selected=await f.client.select(song,result.candidates[1]);assert.equal(selected.status,'ready');assert(f.calls[2].url.includes('/api/get/2'));
 const wrong=fixtureClient([response(record({id:999}))]);await assert.rejects(()=>wrong.client.select(song,result.candidates[1]),/version changed/);
});
test('songbook acquisition skips personal/built-in lyrics, persists progress and resumes unfinished work',async()=>{
 const songs=[{...song,id:'axis-1',builtin:true},{...song,id:'axis-2'},{...song,id:'axis-3'},{...song,id:'axis-4'}],saved={'axis-2':{text:'Personal words'}},results={},calls=[];let writes=0;
 const controller=new AbortController();
 const client={lookup:async s=>{calls.push(s.id);return chooseLyricMatch(s,[record()]);}};
 await assert.rejects(()=>syncSongbook({songs,client,results,signal:controller.signal,hasLyrics:id=>Boolean(saved[id]),saveLyrics:async(id,config)=>{saved[id]=config;if(id==='axis-3')controller.abort();return true;},persist:()=>{writes++;}}),{name:'AbortError'});
 assert.deepEqual(calls,['axis-3']);assert.equal(saved['axis-2'].text,'Personal words');
 await syncSongbook({songs,client,results,hasLyrics:id=>Boolean(saved[id]),saveLyrics:(id,c)=>{saved[id]=c;return true;}});
 assert.deepEqual(calls,['axis-3','axis-4']);assert(writes>=3);assert.equal(results['axis-4'].status,'ready');
});
test('unresolved entries are skipped until retry, and no result is marked saved when storage fails',async()=>{
 const results={[song.id]:{fingerprint:songFingerprint(song),status:'missing'}},calls=[];
 const options={songs:[song],results,client:{lookup:async(s,o)=>{calls.push(o);return chooseLyricMatch(s,[record()]);}},hasLyrics:()=>false,saveLyrics:()=>false};
 await syncSongbook(options);assert.equal(calls.length,0);
 await assert.rejects(()=>syncSongbook({...options,retry:true}),LyricStorageError);assert.equal(calls[0].refresh,true);assert.equal(results[song.id].status,'error');
});
test('resume metadata validates identifiers, fingerprints and candidates without restoring lyric payloads',()=>{
 const raw=JSON.stringify({version:1,results:{[song.id]:{fingerprint:songFingerprint(song),status:'ambiguous',message:'Choose version',candidates:[{id:1,duration:120,albumName:'Test',plainLyrics:'Do not keep this payload'}]},'axis-999':{status:'ready'}}});
 const result=restoreLyricSync(raw,[song]);assert.deepEqual(Object.keys(result),[song.id]);assert(!JSON.stringify(result).includes('Do not keep'));
 assert.deepEqual(restoreLyricSync(raw,[{...song,title:'Different version'}]),{});assert.deepEqual(restoreLyricSync('bad data',[song]),{});
});
test('deleted lyrics are reacquired, and denied access stops a songbook batch after one request',async()=>{
 const results={[song.id]:{status:'ready',fingerprint:songFingerprint(song)}};let calls=0;
 await syncSongbook({songs:[song],results,hasLyrics:()=>false,saveLyrics:()=>true,client:{lookup:async()=>{calls++;return chooseLyricMatch(song,[record()]);}}});assert.equal(calls,1);
 calls=0;await assert.rejects(()=>syncSongbook({songs:[song,{...song,id:'axis-3'}],results:{},hasLyrics:()=>false,saveLyrics:()=>true,client:{lookup:async()=>{calls++;throw new LyricAccessError('Denied');}}}),LyricAccessError);assert.equal(calls,1);
});

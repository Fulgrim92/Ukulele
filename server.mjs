import http from 'node:http';
import {readFile} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
const root = resolve('dist');
const fixtureMode=process.argv.includes('--synthetic-lyrics');
const portOption=process.argv.indexOf('--port');
const mime = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.json':'application/json','.wav':'audio/wav','.png':'image/png'};
const server = http.createServer(async (req,res) => {
  try {
    const url = new URL(req.url,'http://localhost');
    if(fixtureMode&&url.pathname==='/test-lyric-sync.js'){
      const code=`export * from './lyric-sync.js';import {LRCLIBBrowserClient as LiveClient} from './lyric-sync.js';export class LRCLIBBrowserClient extends LiveClient{constructor(options={}){super({...options,interval:250,retries:0,fetcher:async(url,init)=>{const target=new URL(url);const response=await fetch('/__synthetic'+target.pathname+target.search,{signal:init.signal});return {status:response.status,headers:response.headers,url,text:()=>response.text()};}});}}`;
      res.writeHead(200,{'Content-Type':'text/javascript'});res.end(code);return;
    }
    if(fixtureMode&&url.pathname.startsWith('/__synthetic/api/')){
      const path=url.pathname.replace('/__synthetic',''),title=url.searchParams.get('track_name')||'Fixture title',artist=url.searchParams.get('artist_name')||'Fixture artist';
      const fixture=(id,album='Synthetic test collection')=>({id,trackName:title,artistName:artist,albumName:album,duration:120,instrumental:false,syncedLyrics:'[00:00.00]Synthetic practice words begin here\n[00:04.00]Four strings make the rhythm clear',plainLyrics:'Synthetic practice words begin here\nFour strings make the rhythm clear'});
      let payload=fixture(1),status=200;
      if(path==='/api/search')payload=title.includes('Beautiful')?[fixture(1),fixture(2,'Synthetic alternate version')]:title.includes('Where Is')?[]:[fixture(1)];
      if(path==='/api/get/2')payload={...fixture(2,'Synthetic alternate version'),trackName:'You’re Beautiful',artistName:'James Blunt'};
      if(path==='/api/get/1')payload={...fixture(1),trackName:'You’re Beautiful',artistName:'James Blunt'};
      res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(payload));return;
    }
    const file = resolve(root, '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
    if (!file.startsWith(root + sep)) {res.writeHead(403);res.end('Forbidden');return;}
    let body=await readFile(file);if(fixtureMode&&url.pathname==='/app.js')body=body.toString().replace("from './lyric-sync.js'","from './test-lyric-sync.js'");res.writeHead(200,{'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(body);
  } catch {res.writeHead(404);res.end('Not found');}
});
const port=portOption>=0?Number(process.argv[portOption+1]):Number(process.env.PORT)||4173;
server.listen(port,'127.0.0.1',()=>console.log(`Local: http://127.0.0.1:${port}${fixtureMode?' (synthetic lyrics only)':''}`));

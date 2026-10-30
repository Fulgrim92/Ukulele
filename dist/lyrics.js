export function parseLrc(text){
 if(typeof text!=='string'||text.length>100000)throw Error('Keep song lyrics under 100,000 characters.');
 const cues=[];const offset=Number(text.match(/^\[offset:([+-]?\d+)\]\s*$/mi)?.[1]||0)/1000;
 for(const line of text.split(/\r?\n/)){
  const tags=[...line.matchAll(/\[(\d{1,3}):([0-5]\d)(?:[.:](\d{1,3}))?\]/g)];
  if(!tags.length)continue;
  const words=line.replace(/\[\d{1,3}:[0-5]\d(?:[.:]\d{1,3})?\]/g,'').trim();
  for(const tag of tags){const seconds=Number(tag[1])*60+Number(tag[2])+Number('0.'+(tag[3]||'0'))+offset;if(seconds>86400)throw Error('Lyric timing must be within 24 hours.');cues.push({text:words,seconds:Math.max(0,seconds)});}
  if(cues.length>1000)throw Error('Keep song lyrics to 1,000 lines or fewer.');
 }
 return cues.sort((a,b)=>a.seconds-b.seconds);
}
export function lyricSources(song){
 if(!song||song.id==='original')return [];
 const query=[song.artist,song.title].filter(Boolean).join(' '),search=(q)=>'https://www.google.com/search?q='+encodeURIComponent(q);
 const links=[
  {label:'Find a lyric video on YouTube',url:'https://www.youtube.com/results?search_query='+encodeURIComponent(query+' official lyric video')},
  {label:'Find a karaoke backing video',url:'https://www.youtube.com/results?search_query='+encodeURIComponent(query+' karaoke')},
  {label:'Search Musixmatch',url:search('site:musixmatch.com '+query+' lyrics')},
  {label:'Search LRCLIB',url:search('site:lrclib.net '+query)},
  {label:'Search Wikisource',url:'https://en.wikisource.org/w/index.php?search='+encodeURIComponent(song.title)}
 ];
 try{const reference=new URL(song.sourceUrl);if(reference.protocol==='https:')links.unshift({label:reference.hostname.endsWith('ukutabs.com')?'Open UkuTabs chart & lyrics':'Open song reference',url:reference.href});}catch{}
 return links;
}
export function lyricLines(text){
 if(typeof text!=='string'||text.length>100000)throw Error('Keep song lyrics under 100,000 characters.');
 const cues=parseLrc(text);if(cues.length)return cues.map(c=>c.text||'♪');
 const lines=text.split(/\r?\n/).map(s=>s.trim()).filter(s=>s&&!/^\[[^\]]+\]$/.test(s));
 if(lines.length>1000)throw Error('Keep song lyrics to 1,000 lines or fewer.');
 return lines;
}
export function lyricTrack(config,bpm=65){
 if(config.mode==='timed')return parseLrc(config.text).map(c=>({text:c.text||'♪',bar:config.startBar+c.seconds*(config.timingBpm??bpm)/240}));
 const lines=lyricLines(config.text);
 return lines.map((text,i)=>({text,bar:config.startBar+i*config.barsPerLine}));
}
export function lyricIndexAtBar(lines,bar){
 let result=-1;for(let i=0;i<lines.length;i++){if(lines[i].bar>bar)break;result=i;}return result;
}
export function lyricFileMatch(filename,songs){
 const clean=s=>s.normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
 const name=clean(filename.replace(/\.(txt|lrc)$/i,'').replace(/^\d{1,3}[ ._-]+/,''));
 const matches=songs.filter(s=>[s.title,[s.artist,s.title].join(' '),[s.title,s.artist].join(' ')].some(v=>clean(v)===name));
 const ids=[...new Set(matches.map(s=>s.id))];return ids.length===1?ids[0]:null;
}
export function prepareLyricCollection(files,songs,saved={}){
 if(!Array.isArray(files)||files.length>100)throw Error('Choose up to 100 lyric files at once.');
 let size=0;const used=new Set();
 return files.map(file=>{
  if(typeof file.text!=='string')return {name:file.name,status:'Could not read file'};
  size+=file.text.length;if(size>1000000)throw Error('Keep each collection under 1 million characters.');
  const id=lyricFileMatch(file.name,songs),song=songs.find(s=>s.id===id);
  if(!/\.(txt|lrc)$/i.test(file.name))return {name:file.name,status:'Use TXT or LRC'};
  if(!id)return {name:file.name,status:'No unique title match'};
  if(saved[id])return {name:file.name,id,title:song.title,status:'Existing lyrics kept'};
  if(used.has(id))return {name:file.name,id,title:song.title,status:'Duplicate song skipped'};
  try{
   const text=file.text.replace(/^\uFEFF/,'').trim(),lines=lyricLines(text);if(!lines.length)throw Error('No lyric lines');
   const config={text,mode:parseLrc(text).length?'timed':'manual',startBar:0,barsPerLine:2,...(song.bpm?{timingBpm:song.bpm}:{})};validateLyrics({[id]:config});used.add(id);
   return {name:file.name,id,title:song.title,status:'Ready',lines:lines.length,config};
  }catch(err){return {name:file.name,id,title:song.title,status:err.message};}
 });
}
export async function loadLyricFolder(files,songs){
 const names=new Map();for(const file of files){const parts=file.webkitRelativePath.split('/');parts.shift();names.set(parts.join('/'),file);}
 const manifestFile=names.get('manifest.json');if(!manifestFile||manifestFile.size>10000000)throw Error('Choose the pipeline output folder containing manifest.json.');
 const manifest=JSON.parse(await manifestFile.text());if(manifest.version!==1||!Array.isArray(manifest.tracks)||manifest.tracks.length>100000)throw Error('Unsupported lyric manifest.');
 const matches=manifest.tracks.filter(t=>t.status==='success'&&typeof t.artist==='string'&&typeof t.title==='string').map(t=>({...t,songId:lyricFileMatch(t.artist+' - '+t.title+'.txt',songs)})).filter(t=>t.songId);
 const counts=new Map();for(const t of matches)counts.set(t.songId,(counts.get(t.songId)||0)+1);
 const contents=[],warnings=[];
 for(const t of matches){
  if(counts.get(t.songId)>1){warnings.push(t.artist+' — '+t.title+': multiple recording versions, skipped');continue;}
  const path=t.lyrics_path;if(typeof path!=='string'||path.split('/').some(p=>p==='..'||p==='')||path.includes('\\'))throw Error('Invalid lyric path in manifest.');
  const file=names.get(path);if(!file){warnings.push(t.title+': lyric file missing');continue;}if(file.size>400000){warnings.push(t.title+': file exceeds 400 KB');continue;}
  contents.push({name:t.artist+' - '+t.title+(t.format==='lrc'?'.lrc':'.txt'),text:await file.text()});
 }
 return {contents,warnings:[...new Set(warnings)]};
}
export function validateLyrics(value){
 if(value===undefined)return undefined;
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length>250)throw Error('Invalid saved lyrics.');
 const result={};
 for(const [id,c] of Object.entries(value)){
  if(!/^(loop|original|axis-\d{1,3}|custom-[a-zA-Z0-9-]{1,90})$/.test(id)||!c||typeof c!=='object'||typeof c.text!=='string'||!['manual','bars','timed'].includes(c.mode)||!Number.isInteger(c.startBar)||c.startBar<0||c.startBar>4095||![1,2,4,8].includes(c.barsPerLine))throw Error('Invalid saved lyric settings.');
  if(c.mode==='timed'&&!parseLrc(c.text).length)throw Error('Timed lyrics need LRC timestamps such as [00:12.50].');
  if(c.timingBpm!==undefined&&(!Number.isFinite(c.timingBpm)||c.timingBpm<20||c.timingBpm>300))throw Error('LRC reference tempo must be between 20 and 300 BPM.');
  lyricLines(c.text);result[id]={text:c.text,mode:c.mode,startBar:c.startBar,barsPerLine:c.barsPerLine,...(c.timingBpm!==undefined?{timingBpm:c.timingBpm}:{})};
 }
 return result;
}

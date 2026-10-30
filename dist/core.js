import {validateLyrics} from './lyrics.js';
export const BASE = ['C','G','Am','F'];
export const PITCHES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
export const escapeHTML = (v) => String(v??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function transpose(chord, semitones) {
  if(chord.includes('+'))return chord.split('+').map(c=>transpose(c,semitones)).join('+');
  const match=/^([A-G])([#b]?)(.*)$/.exec(chord);
  if(!match) return chord;
  let n=PITCHES.indexOf(match[1])+(match[2]==='#'?1:match[2]==='b'?-1:0);
  const suffix=match[3].replace(/\/([A-G][#b]?)$/,(_,bass)=>'/'+transpose(bass,semitones));
  return PITCHES[((n+semitones)%12+12)%12]+suffix;
}
export function chordAtSubdivision(token,subdivision) {
  const chords=token.split('+');
  return chords[Math.min(chords.length-1,Math.floor((((subdivision%8)+8)%8)*chords.length/8))];
}
export function parseSheet(text) {
  const sections=[]; let current=null;
  const push=()=>{if(current?.bars.length)sections.push(current);};
  for (const raw of text.split(/\r?\n/)) {
    const line=raw.trim();if(!line||line.startsWith('#'))continue;
    const head=/^\[([^\]]+)\](?:\s*x(\d+))?$/i.exec(line);
    if(head){push();const repeat=Number(head[2]||1);if(repeat<1||repeat>16)throw Error('Section repeats must be between 1 and 16.');current={name:head[1].slice(0,80),repeat,bars:[]};continue;}
    if(!current)current={name:'Song',repeat:1,bars:[]};
    const [chordPart,...lyrics]=line.split('::');
    const chords=chordPart.replace(/\|/g,' ').split(/\s+/).filter(Boolean);
    if(!chords.length||chords.some(token=>{const parts=token.split('+');return ![1,2,4].includes(parts.length)||parts.some(c=>!/^([A-G][#b]?)(m|maj|min|dim|aug|sus[24]?|add\d+|m?\d+|maj\d+)?(\/[A-G][#b]?)?$/.test(c));}))throw Error('Use chord names such as C G Am F before ::. Use C+G for two half-bar chords, or four chords joined with + for quarter bars. Put words after ::.');
    if(chords.length>32)throw Error('Keep each line to 32 bars or fewer.');
    for(let i=0;i<chords.length;i++)current.bars.push({chord:chords[i],lyric:i===0?lyrics.join('::').trim():''});
  }push();
  if(!sections.length)throw Error('Add a section and at least one chord.');
  const length=sections.reduce((n,s)=>n+s.bars.length*s.repeat,0);
  if(length>4096)throw Error('Song sheets can contain at most 4,096 bars.');
  return sections;
}
export function expandSections(sections) {
  return sections.flatMap((s,section)=>Array.from({length:s.repeat||1},(_,repeat)=>s.bars.map((b,index)=>({...b,section,sectionName:s.name,repeat,index})))).flat();
}
export function dateKey(date=new Date()) {return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function streak(dates,today=new Date()) {
  const keys=new Set(dates);let count=0,d=new Date(today);d.setHours(12,0,0,0);
  if(!keys.has(dateKey(d)))d.setDate(d.getDate()-1);
  while(keys.has(dateKey(d))){count++;d.setDate(d.getDate()-1);}return count;
}
export function detectPitch(samples,sampleRate) {
  let energy=0;for(const x of samples)energy+=x*x;
  if(Math.sqrt(energy/samples.length)<0.012)return null;
  const min=Math.floor(sampleRate/650),max=Math.min(Math.ceil(sampleRate/150),samples.length/2-1);
  let best=0,lag=0;const correlations=[];
  for(let offset=min;offset<=max;offset++){
    let dot=0,a=0,b=0;
    for(let i=0;i<samples.length-max;i++){const x=samples[i],y=samples[i+offset];dot+=x*y;a+=x*x;b+=y*y;}
    const c=dot/Math.sqrt(a*b||1);correlations[offset]=c;
    if(c>best){best=c;lag=offset;}
  }
  if(best<0.85||!lag)return null;
  // Prefer the first strong period peak over a marginally stronger double period.
  for(let offset=min+1;offset<max;offset++){
    if(correlations[offset]>=Math.max(.9,best*.98)&&correlations[offset]>correlations[offset-1]&&correlations[offset]>=correlations[offset+1]){lag=offset;break;}
  }
  const left=correlations[lag-1]??best,right=correlations[lag+1]??best;
  const shift=(left-right)/(2*(left-2*best+right))||0;
  return sampleRate/(lag+Math.max(-1,Math.min(1,shift)));
}
export function validateBackup(value) {
  if(!value||value.version!==1||!Array.isArray(value.completed)||!Array.isArray(value.customSongs)||!Array.isArray(value.sessions))throw Error('This is not a Four Strings backup.');
  if(value.completed.some(x=>!Number.isInteger(x)||x<0||x>7))throw Error('Invalid lesson progress.');
  if(value.customSongs.length>200)throw Error('Too many songs in this backup.');
  const ids=new Set();
  for(const song of value.customSongs){
    if(typeof song.id!=='string'||song.id.length>100||!song.id.startsWith('custom-')||ids.has(song.id)||typeof song.title!=='string'||!song.title.trim()||song.title.length>100||typeof song.artist!=='string'||song.artist.length>100||typeof song.sheet!=='string'||song.sheet.length>100000)throw Error('Invalid song data.');
    ids.add(song.id);parseSheet(song.sheet);
  }
  if(value.sessions.some(s=>!s||!/^\d{4}-\d{2}-\d{2}$/.test(s.date)||!Number.isFinite(s.seconds)||s.seconds<0||s.seconds>86400||typeof s.label!=='string'))throw Error('Invalid practice history.');
  const lyrics=validateLyrics(value.lyricsBySong);
  const lastSource=typeof value.lastPracticeSource==='string'&&/^(loop|original|(axis|acoustic|oldies)-\d{1,3}|custom-[a-zA-Z0-9-]{1,90})$/.test(value.lastPracticeSource)?value.lastPracticeSource:undefined;
  return {version:1,completed:[...new Set(value.completed)],customSongs:value.customSongs.map(s=>({id:s.id,title:s.title,artist:s.artist,sheet:s.sheet})),sessions:value.sessions.map(s=>({date:s.date,seconds:s.seconds,label:s.label.slice(0,200)})),favorites:Array.isArray(value.favorites)?value.favorites.filter(x=>typeof x==='string'):[],lefty:value.lefty===true,goal:[5,10,15,20].includes(value.goal)?value.goal:10,...(lyrics?{lyricsBySong:lyrics}:{}),...(lastSource?{lastPracticeSource:lastSource}:{})};
}

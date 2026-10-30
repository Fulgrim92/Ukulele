import {CHORDS} from './data.js';
import {PITCHES,transpose} from './core.js';
export const OPEN_MIDI=[67,60,64,69]; // high g4, C4, E4, A4; physical strings 4 → 1
const aliases={'A#':'Bb','D#':'Eb','A#m':'Bbm','D#m':'Ebm'};
const shapeCache=new Map();
export function voicingForChord(name,shift=0){
 const target=transpose(name,shift),known=CHORDS[target]||CHORDS[aliases[target]];
 if(known)return [...known.frets];
 if(shapeCache.has(target))return [...shapeCache.get(target)];
 const m=/^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/.exec(target);if(!m)throw Error('Unsupported ukulele chord: '+target);
 const root=PITCHES.indexOf(transpose(m[1],0)),quality=m[2],formula={'':[0,4,7],m:[0,3,7],7:[0,4,7,10],m7:[0,3,7,10],maj7:[0,4,7,11],6:[0,4,7,9],m6:[0,3,7,9],dim:[0,3,6],aug:[0,4,8],sus2:[0,2,7],sus4:[0,5,7],sus:[0,5,7],add9:[0,4,7,2],9:[0,4,10,2],m9:[0,3,10,2]}[quality];
 if(!formula)throw Error('No four-string voicing is available for '+target+'.');
 const tones=[...new Set(formula.map(n=>(n+root)%12))],bass=m[3]?PITCHES.indexOf(transpose(m[3],0)):null;
 if(bass!==null&&!tones.includes(bass)){if(tones.length===4)tones.splice(2,1);tones.push(bass);}
 const choices=OPEN_MIDI.map(open=>Array.from({length:10},(_,f)=>f).filter(f=>tones.includes((open+f)%12)));
 let best=null,bestScore=Infinity;
 for(const a of choices[0])for(const b of choices[1])for(const c of choices[2])for(const d of choices[3]){
  const frets=[a,b,c,d],notes=frets.map((f,i)=>OPEN_MIDI[i]+f),classes=new Set(notes.map(n=>n%12)),held=frets.filter(Boolean),span=held.length?Math.max(...held)-Math.min(...held):0;
  if(tones.some(n=>!classes.has(n))||span>4||(bass!==null&&Math.min(...notes)%12!==bass))continue;
  const score=Math.max(...frets)*2+frets.reduce((n,f)=>n+f,0)*.16+span*.8;
  if(score<bestScore){bestScore=score;best=frets;}
 }
 if(!best)throw Error('No playable four-string voicing was found for '+target+'.');
 shapeCache.set(target,best);return [...best];
}
export function planStrum(name,{time=0,shift=0,up=false}={}){
 const frets=voicingForChord(name,shift),order=up?[3,2,1,0]:[0,1,2,3],strength=[.93,1,.92,.88];
 return order.map((stringIndex,i)=>{const fret=frets[stringIndex],sampleFret=Math.min(4,fret);return {stringIndex,string:4-stringIndex,fret,midi:OPEN_MIDI[stringIndex]+fret,sampleFret,file:`s${4-stringIndex}-f${sampleFret}.wav`,time:time+i*(up?.009:.013),rate:2**((fret-sampleFret)/12),gain:.35*strength[stringIndex]*(up?.82:1)};});
}
export class UkuleleSampler {
 constructor(context){this.context=context;this.buffers=new Map();this.samples=new Map();this.voices=new Set();this.strings=new Map();this.ready=false;this.pending=null;this.output=context.createGain();this.output.gain.value=.9;this.output.connect(context.destination);}
 async load(){
  if(this.ready)return;if(this.pending)return this.pending;
  this.pending=(async()=>{
   const response=await fetch(new URL('assets/ukulele/manifest.json',import.meta.url));if(!response.ok)throw Error('The ukulele recordings could not be loaded. Please try again.');
   const manifest=await response.json();
   await Promise.all(manifest.samples.map(async sample=>{const res=await fetch(new URL('assets/ukulele/'+sample.file,import.meta.url));if(!res.ok)throw Error('A ukulele string recording is unavailable. Please try again.');const buffer=await this.context.decodeAudioData(await res.arrayBuffer());this.buffers.set(sample.file,buffer);this.samples.set(sample.file,sample);}));
   this.ready=true;
  })();
  try{await this.pending;}finally{this.pending=null;}
 }
 playString(stringIndex,fret,time=this.context.currentTime,level=.35){
  if(!this.ready)throw Error('Ukulele recordings are still loading.');
  const sampleFret=Math.max(0,Math.min(4,fret)),file=`s${4-stringIndex}-f${sampleFret}.wav`,buffer=this.buffers.get(file),sample=this.samples.get(file);
  if(!buffer||!sample)throw Error('Missing ukulele string recording.');
  const ctx=this.context,when=Math.max(time,ctx.currentTime+.002),rate=2**((fret-sampleFret)/12-(sample.tuningCents||0)/1200),source=ctx.createBufferSource(),gain=ctx.createGain();
  const previous=this.strings.get(stringIndex);
  if(previous){previous.gain.gain.cancelScheduledValues(when);previous.gain.gain.setTargetAtTime(0,when,.006);try{previous.source.stop(when+.035);}catch{}}
  source.buffer=buffer;source.playbackRate.value=rate;gain.gain.setValueAtTime(0,when);gain.gain.linearRampToValueAtTime(level,when+.0015);source.connect(gain).connect(this.output);
  const voice={source,gain,stringIndex};this.voices.add(voice);this.strings.set(stringIndex,voice);
  source.onended=()=>{source.disconnect();gain.disconnect();this.voices.delete(voice);if(this.strings.get(stringIndex)===voice)this.strings.delete(stringIndex);};
  source.start(when);source.stop(when+buffer.duration/rate+.01);return voice;
 }
 strum(name,time,shift=0,up=false){for(const event of planStrum(name,{time,shift,up}))this.playString(event.stringIndex,event.fret,event.time,event.gain);}
 stop(){for(const voice of this.voices){try{voice.source.stop();}catch{}}this.voices.clear();this.strings.clear();}
}

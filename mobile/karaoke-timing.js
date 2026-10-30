import {parseSheet,expandSections} from '../dist/core.js';
import {lyricLines,parseLrc,validateLyrics} from '../dist/lyrics.js';

const quiet=/\b(intro|instrumental|interlude|solo|turnaround|ending)\b/i;
const clamp=n=>Math.max(0,Math.min(1,n));
export function vocalSegments(sheet){
 const bars=expandSections(parseSheet(sheet)),segments=[];
 for(let i=0;i<bars.length;i++){
  if(quiet.test(bars[i].sectionName))continue;
  const previous=segments.at(-1);
  if(previous&&previous.end===i)previous.end=i+1;else segments.push({start:i,end:i+1});
 }
 return {bars:bars.length,segments:segments.length?segments:[{start:0,end:bars.length}]};
}
export function wordWeight(word){return Math.max(1,(word.toLowerCase().match(/[aeiouy]+/g)||[]).length);}
export function lineWeight(line){return Math.max(1,line.split(/\s+/).reduce((n,w)=>n+wordWeight(w),0));}
export function fitKaraoke(config,song){
 const {bars,segments}=vocalSegments(song.sheet),available=segments.reduce((n,s)=>n+s.end-s.start,0);
 const source=parseLrc(config.text).filter(c=>c.text),words=source.length?source.map(c=>c.text):lyricLines(config.text);
 if(!words.length)throw Error('No sung lines to align');
 const total=words.reduce((n,t)=>n+lineWeight(t),0);
 let starts=[],method='estimated-phrasing';
 if(source.length>1&&source.at(-1).seconds>source[0].seconds){
  const deltas=source.slice(1).map((c,i)=>c.seconds-source[i].seconds).filter(n=>n>0).sort((a,b)=>a-b);
  const tail=deltas[Math.floor(deltas.length/2)]||3;
  const start=source[0].seconds,duration=source.at(-1).seconds-start+tail;
  starts=source.map(c=>(c.seconds-start)/duration);method='cached-lrc-phrasing';
 }else{
  let sum=0;starts=words.map(text=>{const fraction=sum/total;sum+=lineWeight(text);return fraction;});
 }
 function toBar(fraction){
  let distance=clamp(fraction)*available;
  for(const segment of segments){const length=segment.end-segment.start;if(distance<length)return segment.start+distance;distance-=length;}
  return segments.at(-1).end;
 }
 const bpm=song.bpm||config.timingBpm||65;
 const cues=words.map((text,i)=>({text,bar:toBar(starts[i])}));
 const expanded=expandSections(parseSheet(song.sheet));
 const sectionStarts=expanded.flatMap((bar,i)=>(i===0||bar.section!==expanded[i-1].section)&&!quiet.test(bar.sectionName)?[i]:[]);
 // Anchor the first allocated phrase to each vocal section's beginning. This
 // avoids a recording's long break leaving a practice verse without a cue.
 for(const start of sectionStarts){
  const end=expanded.findIndex((bar,i)=>i>start&&bar.section!==expanded[start].section);
  const first=cues.find(c=>c.bar>=start&&c.bar<(end<0?bars:end));
  if(first)first.bar=start;
 }
 // Explicit silent cues avoid carrying a vocal across intros, solos and endings.
 let cursor=0;
 for(const segment of segments){if(segment.start>cursor)cues.push({text:'',bar:cursor});cursor=segment.end;}
 if(cursor<bars)cues.push({text:'',bar:cursor});
 cues.push({text:'',bar:bars});cues.sort((a,b)=>a.bar-b.bar);
 const stamp=bar=>{const hundredths=Math.round(bar*240/bpm*100);return '['+String(Math.floor(hundredths/6000)).padStart(2,'0')+':'+String(Math.floor(hundredths/100)%60).padStart(2,'0')+'.'+String(hundredths%100).padStart(2,'0')+']';};
 const fitted={...config,text:cues.map(c=>stamp(c.bar)+c.text).join('\n'),mode:'timed',startBar:0,timingBpm:bpm};
 validateLyrics({[song.id]:fitted});
 return {config:fitted,metadata:{method,estimated:true,bars,referenceBpm:bpm,sungLines:words.length}};
}
const normalized=config=>lyricLines(config.text).filter(t=>t!=='♪').join(' ').replace(/\s+/g,' ').trim().toLowerCase();
export function mergeKaraokeSeeds(saved,incoming){
 const result={...incoming,...saved};
 for(const [id,seed] of Object.entries(incoming)){
  const prior=saved?.[id];
  if(prior&&prior.mode!=='timed'&&normalized(prior)===normalized(seed))result[id]=seed;
 }
 return result;
}
export function karaokeProgress(lines,bar){
 let index=-1;for(let i=0;i<lines.length;i++){if(lines[i].bar>bar)break;index=i;}
 if(index<0)return {index,progress:0,word:-1};
 const line=lines[index],next=lines[index+1];
 const progress=next?clamp((bar-line.bar)/Math.max(.001,next.bar-line.bar)):0;
 const words=line.text==='♪'?[]:line.text.split(/\s+/),total=words.reduce((n,w)=>n+wordWeight(w),0);
 let sum=0,word=-1;
 for(let i=0;i<words.length;i++){sum+=wordWeight(words[i]);if(progress*total<sum){word=i;break;}}
 return {index,progress,word};
}

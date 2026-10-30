import {karaokeProgress} from './karaoke-timing.js';
let metadata={};
export function setKaraokeMetadata(value){metadata=value||{};}
export function karaokeNote(id,config,bpm){
 return metadata[id]?'Automatic practice timing · follows your tempo and section loops. Line and word timing is estimated for this learning arrangement.':`Imported LRC · follows your practice tempo at a ${config.timingBpm||bpm} BPM reference. Adjust in Edit if this arrangement differs.`;
}
export function paintKaraoke(lines,bar){
 const {index,progress,word}=karaokeProgress(lines,bar),text=lines[index]?.text;
 for(const selector of ['#lyrics-window .lyric-active','#singalong-line']){
  const node=document.querySelector(selector);if(!node)continue;
  node.classList.add('karaoke-current');node.style.setProperty('--line-progress',(progress*100)+'%');
  if(!text||text==='♪')continue;
  const words=text.split(/\s+/),fragment=document.createDocumentFragment();
  words.forEach((value,i)=>{if(i)fragment.append(document.createTextNode(' '));const span=document.createElement('span');span.textContent=value;span.className='karaoke-word'+(i<word?' sung':i===word?' singing':'');fragment.append(span);});
  node.replaceChildren(fragment);
 }
}

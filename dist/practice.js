import {escapeHTML as e,chordAtSubdivision} from './core.js';
import {CHORDS} from './data.js';
const fingerNames={1:'Index',2:'Middle',3:'Ring',4:'Little'};
const colors={1:'#b56544',2:'#71894f',3:'#7e6c9f',4:'#4b8196'};
export function chordShape(name){return CHORDS[name]||CHORDS[({'A#':'Bb','D#':'Eb','A#m':'Bbm','D#m':'Ebm'}[name])];}
export function nextShape(bars,index,subdivision,loop=true){
 if(!bars.length)return null;
 const parts=bars[index].chord.split('+'),segment=Math.floor(subdivision*parts.length/8);
 if(segment+1<parts.length)return parts[segment+1];
 if(index+1<bars.length)return chordAtSubdivision(bars[index+1].chord,0);
 return loop?chordAtSubdivision(bars[0].chord,0):null;
}
export {neckDiagram as fingerDiagram} from './neck-diagram.js';
export function fingerInstructions(name){
 const c=chordShape(name);if(!c)return '';
 const strings=['g','C','E','A'],groups=new Map();
 c.frets.forEach((f,i)=>{if(f){const n=c.fingers[i];if(!groups.has(n))groups.set(n,[]);groups.get(n).push(`${strings[i]}${f}`);}});
 const open=c.frets.map((f,i)=>f===0?strings[i]:null).filter(Boolean);
 return `<div class="placement-list">${[...groups].sort(([a],[b])=>a-b).map(([n,positions])=>`<span><i style="--finger:${colors[n]}">${n}</i><strong>${fingerNames[n]}</strong><span>${positions.map(p=>p[0]+' string · fret '+p.slice(1)).join(' + ')}</span></span>`).join('')}${open.length?`<div class="open-strings">Open strings: <strong>${open.join(' · ')}</strong></div>`:''}</div>`;
}
export const fingerLegend=()=>`<div class="finger-legend" aria-label="Finger number legend">${[1,2,3,4].map(n=>`<span><i style="--finger:${colors[n]}">${n}</i>${fingerNames[n]}</span>`).join('')}</div>`;
export function practiceRange(bars,start=-1,end=start){
 if(start<0)return bars;
 return bars.filter(b=>b.section>=start&&b.section<=Math.max(start,end));
}

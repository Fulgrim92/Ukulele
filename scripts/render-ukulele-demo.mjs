import {readFileSync,writeFileSync} from 'node:fs';
import {planStrum} from '../dist/ukulele-audio.js';
import {readWave,writeWave} from './prepare-ukulele-samples.mjs';
const manifest=JSON.parse(readFileSync('dist/assets/ukulele/manifest.json','utf8')),rate=44100,out=new Float32Array(rate*7),events=['C','G','Am','F'].flatMap((c,i)=>planStrum(c,{time:.15+i*1.25}));
const audio=new Map(manifest.samples.map(s=>[s.file,{...s,...readWave(readFileSync('dist/assets/ukulele/'+s.file))}]));
for(let n=0;n<events.length;n++){
 const event=events[n],sample=audio.get(event.file),start=Math.round(event.time*rate),speed=event.rate*2**(-sample.tuningCents/1200),next=events.slice(n+1).find(e=>e.stringIndex===event.stringIndex),stop=next?Math.round(next.time*rate):out.length;
 for(let i=0;start+i<out.length;i++){
  const pos=i*speed,j=Math.floor(pos);if(j+1>=sample.samples.length)break;
  const absolute=start+i;if(absolute>stop+rate*.035)break;
  const release=absolute>=stop?Math.exp(-(absolute-stop)/(rate*.006)):1,attack=Math.min(1,i/(rate*.0015));
  out[absolute]+=(sample.samples[j]*(1-(pos-j))+sample.samples[j+1]*(pos-j))*event.gain*.9*release*attack;
 }
}
let peak=0;for(const value of out)peak=Math.max(peak,Math.abs(value));if(peak>=1)throw Error('Clipping in demo');
const destination=process.argv[2]||'../ukulele-four-chord-demo.wav';writeFileSync(destination,writeWave(out,rate));console.log(JSON.stringify({destination,peak,duration:out.length/rate,chords:['C','G','Am','F']}));

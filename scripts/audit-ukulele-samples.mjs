import {readFileSync} from 'node:fs';
import {readWave} from './prepare-ukulele-samples.mjs';
import {detectPitch} from '../dist/core.js';
const manifest=JSON.parse(readFileSync('dist/assets/ukulele/manifest.json','utf8'));
for(const sample of manifest.samples){
 const {samples,rate}=readWave(readFileSync('dist/assets/ukulele/'+sample.file));
 const estimates=[.06,.1,.18,.28,.4].map(t=>detectPitch(samples.slice(Math.round(t*rate),Math.round(t*rate)+2048),rate)).filter(Boolean).sort((a,b)=>a-b);
 const frequency=estimates[Math.floor(estimates.length/2)],target=440*2**((sample.midi-69)/12),cents=1200*Math.log2(frequency/target);
 console.log(JSON.stringify({file:sample.file,frequency,cents}));
 if(frequency&&Math.abs(cents)<100)sample.tuningCents=cents;else throw Error('Sample pitch could not be verified: '+sample.file);
}
const {writeFileSync}=await import('node:fs');writeFileSync('dist/assets/ukulele/manifest.json',JSON.stringify(manifest,null,2));

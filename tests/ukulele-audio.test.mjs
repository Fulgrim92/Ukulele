import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {CHORDS} from '../dist/data.js';
import {OPEN_MIDI,voicingForChord,planStrum} from '../dist/ukulele-audio.js';
import {readWave} from '../scripts/prepare-ukulele-samples.mjs';
import {detectPitch,transpose,PITCHES} from '../dist/core.js';
const manifest=JSON.parse(readFileSync(new URL('../dist/assets/ukulele/manifest.json',import.meta.url),'utf8'));
test('all 20 real string recordings have matching checksums and usable, non-clipping audio',()=>{
 assert.equal(manifest.samples.length,20);assert.equal(manifest.license,'CC0-1.0');
 for(const sample of manifest.samples){
  const bytes=readFileSync(new URL('../dist/assets/ukulele/'+sample.file,import.meta.url));assert.equal(createHash('sha256').update(bytes).digest('hex'),sample.sha256);
  const {samples,rate}=readWave(bytes);assert.equal(rate,44100);assert(samples.length>rate);assert(samples.length<=rate*3.1);
  let peak=0;for(const value of samples){assert(Number.isFinite(value));peak=Math.max(peak,Math.abs(value));}assert(peak>.3&&peak<.69);assert(Math.abs(samples.at(-1))<.001);
 }
});
test('recorded string pitches match the intended frets after measured A440 correction',()=>{
 for(const sample of manifest.samples){
  const {samples,rate}=readWave(readFileSync(new URL('../dist/assets/ukulele/'+sample.file,import.meta.url)));
  const pitches=[.06,.1,.18,.28,.4].map(t=>detectPitch(samples.slice(Math.round(t*rate),Math.round(t*rate)+2048),rate)).filter(Boolean).sort((a,b)=>a-b);
  const actual=pitches[Math.floor(pitches.length/2)]*2**(-sample.tuningCents/1200),expected=440*2**((sample.midi-69)/12);
  assert(Math.abs(1200*Math.log2(actual/expected))<3,sample.file);assert(Math.abs(sample.tuningCents)<30);
 }
});
test('each songbook chord strums exactly four strings at the frets shown in its diagram',()=>{
 for(const [name,shape] of Object.entries(CHORDS)){
  const events=planStrum(name,{time:1});assert.equal(events.length,4);assert.deepEqual(events.map(e=>e.string),[4,3,2,1]);
  assert.deepEqual(events.map(e=>e.fret),shape.frets);assert.deepEqual(events.map(e=>e.midi),shape.frets.map((f,i)=>OPEN_MIDI[i]+f));
  assert(events.every(e=>manifest.samples.some(s=>s.file===e.file)));assert(Math.abs(events.at(-1).time-events[0].time-.039)<1e-9);
 }
});
test('unison pitches use different physical string recordings and upstrokes reverse string order',()=>{
 const g=planStrum('G');assert.equal(g[0].midi,g[2].midi);assert.notEqual(g[0].file,g[2].file);
 const a=planStrum('Am');assert.equal(a[0].midi,a[3].midi);assert.notEqual(a[0].file,a[3].file);
 assert.deepEqual(planStrum('G',{up:true}).map(e=>e.string),[1,2,3,4]);
 assert.deepEqual(planStrum('C',{shift:2}).map(e=>e.fret),CHORDS.D.frets);
});
test('every supported transposition uses a playable four-string chord voicing',()=>{
 for(const name of Object.keys(CHORDS))for(let shift=-6;shift<=6;shift++){
  const frets=voicingForChord(name,shift),source=CHORDS[name].frets.map((f,i)=>(OPEN_MIDI[i]+f+shift+120)%12),actual=frets.map((f,i)=>(OPEN_MIDI[i]+f)%12);
  assert.equal(frets.length,4);assert(frets.every(f=>Number.isInteger(f)&&f>=0&&f<=9));assert.deepEqual([...new Set(actual)].sort((a,b)=>a-b),[...new Set(source)].sort((a,b)=>a-b),name+' '+shift);
 }
});

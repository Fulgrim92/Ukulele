import {readFileSync,writeFileSync} from 'node:fs';
import {parseSheet,expandSections} from '../dist/core.js';
const charts=[1,2,3].flatMap(n=>JSON.parse(readFileSync(`references/charts-${n}.json`,'utf8')));
// The A-major alternative source is a transposed chart, not the original recording key.
charts.find(c=>c.id==='axis-4').originalKey='C major';
const ids=new Set(),chords=new Set();
for(const c of charts){
 if(ids.has(c.id))throw Error('Duplicate '+c.id);ids.add(c.id);
 if(!c.sourceUrl?.startsWith('https://')||!c.arrangementNote||!c.practiceKey)throw Error('Missing provenance '+c.id);
 const sections=parseSheet(c.sheet),bars=expandSections(sections);
 if(sections.length<4||bars.length<16)throw Error('Incomplete arrangement '+c.id);
 if(!/ending|outro|coda/i.test(sections.at(-1).name))throw Error('Missing finite ending '+c.id);
 bars.forEach(b=>b.chord.split('+').forEach(chord=>chords.add(chord)));
}
for(let n=1;n<=47;n++)if(n!==44&&!ids.has(`axis-${n}`))throw Error('Missing axis-'+n);
writeFileSync('dist/song-charts.js','// Source-backed independent teaching arrangements. Bar lengths and repeats are authored adaptations, not recording-verified timing.\nexport const SONG_CHARTS='+JSON.stringify(charts,null,2)+';\n');
console.log(JSON.stringify({arrangements:charts.length,uniqueChords:[...chords].sort(),bars:charts.reduce((sum,c)=>sum+expandSections(parseSheet(c.sheet)).length,0)}));

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {BASE,transpose,chordAtSubdivision,parseSheet,expandSections,escapeHTML,dateKey,streak,detectPitch,validateBackup} from '../dist/core.js';
import {CHORDS,CATALOG,LESSONS,ORIGINAL,AULD,PATTERNS} from '../dist/data.js';
import {SONG_CHARTS} from '../dist/song-charts.js';

test('all four ukulele shapes produce the advertised chord tones',()=>{
 const opens=[67,60,64,69],expected={C:[0,4,7],G:[7,11,2],Am:[9,0,4],F:[5,9,0]};
 for(const name of BASE){const c=CHORDS[name];assert.equal(c.frets.length,4);const tones=c.frets.map((f,i)=>(opens[i]+f)%12);assert(tones.every(n=>expected[name].includes(n)));assert.equal(new Set(tones).size,3);}
});
test('catalogue contains 47 unique entries from the official video',()=>{assert.equal(CATALOG.length,47);assert.equal(new Set(CATALOG.map(s=>s.id)).size,47);assert.equal(CATALOG[0].artist,'Journey');assert.equal(CATALOG[46].title,'Scar');});
test('Auld Lang Syne includes five complete verses and five choruses',()=>{const sections=parseSheet(AULD.sheet),bars=expandSections(sections);assert.equal(sections.length,10);assert.equal(bars.length,80);assert.equal(sections.filter(s=>s.name.startsWith('Verse')).length,5);assert.equal(bars.filter(b=>b.lyric).length,40);assert(bars.every(b=>['C','G','F'].includes(b.chord)));assert(AULD.publicDomain);assert.equal(AULD.id,'axis-44');});
test('eight lessons have valid checks and chord references',()=>{assert.equal(LESSONS.length,8);for(const l of LESSONS){assert(l.answers[l.correct]);assert(l.steps.length===3);if(l.chord)assert(CHORDS[l.chord]);}});
test('transposition handles major, minor, flat roots and slash basses',()=>{assert.equal(transpose('C',2),'D');assert.equal(transpose('Am',-2),'Gm');assert.equal(transpose('Bb',2),'C');assert.equal(transpose('G/B',2),'A/C#');assert.equal(transpose('F',-6),'B');assert.equal(transpose('Cmaj7',12),'Cmaj7');});
test('full sheet preserves lyrics, section repeats and ordered bars',()=>{const sections=parseSheet('[Verse]\nC G :: These are my words\nAm F\n[Chorus] x2\nF C G Am');const bars=expandSections(sections);assert.equal(bars.length,12);assert.equal(bars[0].lyric,'These are my words');assert.equal(bars[1].lyric,'');assert.equal(bars[4].sectionName,'Chorus');assert.equal(bars[8].repeat,1);assert.equal(bars[11].chord,'Am');});
test('original is a complete 56-bar four-chord arrangement ending on C',()=>{const sections=parseSheet(ORIGINAL.sheet),bars=expandSections(sections);assert.equal(bars.length,56);assert.equal(sections.length,6);assert.equal(bars.at(-1).chord,'C');assert(bars.every(b=>BASE.includes(b.chord)));assert(bars.some(b=>b.lyric.includes('little every day')));});
test('sheet parser handles plain and extended chords and rejects malformed input',()=>{assert.equal(parseSheet('Cmaj7 Dm7 G7 C/E')[0].bars.length,4);for(const s of ['', 'hello these are lyrics','[Verse] x0\nC','[Verse] x17\nC','[Empty]'])assert.throws(()=>parseSheet(s));});
test('sheet limits prevent unreasonable playback expansion',()=>{assert.throws(()=>parseSheet('C '.repeat(33)));assert.throws(()=>parseSheet(Array.from({length:9},(_,i)=>`[Section ${i}] x16\n${'C '.repeat(32)}`).join('\n')));});
test('HTML escapes untrusted song and lyric content',()=>{assert.equal(escapeHTML('<script>"x"&\'</script>'),'&lt;script&gt;&quot;x&quot;&amp;&#39;&lt;/script&gt;');});
test('date keys and streak cross month boundaries and permit a practice yesterday',()=>{assert.equal(dateKey(new Date(2026,9,29)),'2026-10-29');assert.equal(streak(['2026-09-29','2026-09-30','2026-10-01'],new Date(2026,9,1)),3);assert.equal(streak(['2026-10-27','2026-10-28'],new Date(2026,9,29)),2);assert.equal(streak(['2026-10-26'],new Date(2026,9,29)),0);});
test('pitch detector recognizes all four open strings at 44.1 and 48 kHz',()=>{for(const sr of [44100,48000])for(const frequency of [261.626,329.628,391.995,440]){const samples=Float32Array.from({length:2048},(_,i)=>.25*Math.sin(2*Math.PI*frequency*i/sr)+.06*Math.sin(4*Math.PI*frequency*i/sr));const found=detectPitch(samples,sr);assert(found);assert(Math.abs(1200*Math.log2(found/frequency))<5,`${frequency} detected as ${found}`);}});
test('pitch detector ignores silence',()=>assert.equal(detectPitch(new Float32Array(2048),48000),null));
test('backup validation round-trips user sheets and rejects malformed data',()=>{const backup={version:1,completed:[0,1],sessions:[{date:'2026-10-29',seconds:42,label:'Practice'}],customSongs:[{id:'custom-test',title:'Mine',artist:'Me',sheet:'[Verse]\nC G Am F'}],favorites:['original'],goal:15,lefty:true};const result=validateBackup(JSON.parse(JSON.stringify(backup)));assert.deepEqual(result,backup);assert.throws(()=>validateBackup({...backup,completed:[9]}));assert.throws(()=>validateBackup({...backup,sessions:[{date:'today',seconds:-1,label:'bad'}]}));assert.throws(()=>validateBackup({...backup,customSongs:[{id:'original'}]}));assert.throws(()=>validateBackup({...backup,customSongs:[backup.customSongs[0],backup.customSongs[0]]}));});
test('strumming patterns follow the indicated 4/4 subdivisions',()=>{assert.deepEqual(PATTERNS.island.hits,[0,2,3,5,6,7]);for(const p of Object.values(PATTERNS)){assert.equal(p.display.length,8);assert.deepEqual(p.display.map((v,i)=>v==='·'?null:i).filter(v=>v!==null),p.hits);}});
test('split bars allocate exactly two or four equal chords within four beats',()=>{
 assert.deepEqual(Array.from({length:8},(_,s)=>chordAtSubdivision('F+G',s)),['F','F','F','F','G','G','G','G']);
 assert.deepEqual(Array.from({length:8},(_,s)=>chordAtSubdivision('C+G+Am+F',s)),['C','C','G','G','Am','Am','F','F']);
 assert.equal(transpose('C+G+Am+F',2),'D+A+Bm+G');
 assert.equal(transpose('C/E+G/B',2),'D/F#+A/C#');
 const sheet=parseSheet('[Chorus]\nC+G Am F+G C+G+Am+F');assert.equal(expandSections(sheet).length,4);
 assert.throws(()=>parseSheet('C+G+Am'));assert.throws(()=>parseSheet('C+Nope'));
});
test('every medley song has a complete, attributed, finite learning arrangement',()=>{
 assert.equal(SONG_CHARTS.length,46);const ids=new Set(SONG_CHARTS.map(s=>s.id));assert.equal(ids.size,46);
 for(let i=1;i<=47;i++){if(i===44)continue;assert(ids.has('axis-'+i));}
 for(const song of SONG_CHARTS){
  const sections=parseSheet(song.sheet),bars=expandSections(sections);
  assert(sections.length>=4);assert(bars.length>=16);assert(/ending|outro|coda/i.test(sections.at(-1).name));
  assert(song.sourceUrl.startsWith('https://'));assert(song.sourceTitle);assert(song.practiceKey);assert(song.arrangementNote);
  for(const bar of bars)for(const chord of bar.chord.split('+'))assert(CHORDS[chord],`${song.id}: no fingering for ${chord}`);
 }
 assert(SONG_CHARTS.find(s=>s.id==='axis-6').sheet.includes('F G C+G'));
 assert(SONG_CHARTS.find(s=>s.id==='axis-19').artistOverride.includes('Jill Colucci'));
});
test('all extra ukulele fingerings contain the required chord tones',()=>{
 const expected={A:[9,1,4],Am7:[9,0,4,7],Bb:[10,2,5],Bm:[11,2,6],D:[2,6,9],D7:[2,6,9,0],Dm:[2,5,9],Dm7:[2,5,9,0],E:[4,8,11],E7:[4,8,11,2],Eb:[3,7,10],Em:[4,7,11],G7:[7,11,2,5],Gm:[7,10,2]};
 for(const [name,tones] of Object.entries(expected)){
  const shape=CHORDS[name],actual=shape.frets.map((f,i)=>([67,60,64,69][i]+f)%12);
  assert.deepEqual([...new Set(actual)].sort((a,b)=>a-b),[...tones].sort((a,b)=>a-b),name);
 }
});

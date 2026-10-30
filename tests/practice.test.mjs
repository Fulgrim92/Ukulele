import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nextShape,fingerDiagram,chordShape,practiceRange} from '../dist/practice.js';
import {lyricLines,lyricTrack,lyricIndexAtBar,validateLyrics,parseLrc,lyricSources,prepareLyricCollection,lyricFileMatch,loadLyricFolder} from '../dist/lyrics.js';
import {validateBackup} from '../dist/core.js';

test('upcoming shape follows half-bar and quarter-bar changes before advancing the bar',()=>{
 const bars=[{chord:'C+G'},{chord:'Am+F+C+G'}];
 assert.equal(nextShape(bars,0,0),'G');assert.equal(nextShape(bars,0,4),'Am');
 assert.equal(nextShape(bars,1,0),'F');assert.equal(nextShape(bars,1,2),'C');assert.equal(nextShape(bars,1,4),'G');
 assert.equal(nextShape(bars,1,6,true),'C');assert.equal(nextShape(bars,1,6,false),null);assert.equal(nextShape([],0,0),null);
});
test('finger display preserves correct strings and fingering in either orientation',()=>{
 const right=fingerDiagram('G'),left=fingerDiagram('G',true);
 assert(right.includes('C string fret 2, finger 1'));assert(right.includes('E string fret 3, finger 3'));assert(left.includes('left handed'));
 assert(right.indexOf('>g</text>')<right.indexOf('>A</text>'));assert(left.indexOf('>A</text>')<left.indexOf('>g</text>'));
 assert(fingerDiagram('Bb').includes('data-barre="1"'));
 assert.equal((right.match(/data-string=/g)||[]).length,4);assert(right.includes('data-part="nut"'));assert(right.includes('headstock and nut shown'));
 assert.equal(chordShape('A#'),chordShape('Bb'));assert(fingerDiagram('C#').includes('No finger diagram saved'));
});
test('plain lyric text accepts stanza spacing and skips standalone section headings',()=>{
 assert.deepEqual(lyricLines('[Verse 1]\nOur own first line\n\nOur own second line\r\n[Chorus]\r\nA third line'),['Our own first line','Our own second line','A third line']);
 assert.throws(()=>lyricLines('x'.repeat(100001)));assert.throws(()=>lyricLines('line\n'.repeat(1001)));
});
test('optional lyric follow uses configured bars and preserves the instrumental lead-in',()=>{
 const lines=lyricTrack({text:'First test line\nSecond test line\nFinal test line',startBar:4,barsPerLine:2});
 assert.deepEqual(lines.map(l=>l.bar),[4,6,8]);assert.equal(lyricIndexAtBar(lines,3),-1);assert.equal(lyricIndexAtBar(lines,4),0);assert.equal(lyricIndexAtBar(lines,5),0);assert.equal(lyricIndexAtBar(lines,6),1);assert.equal(lyricIndexAtBar(lines,99),2);assert.equal(lyricIndexAtBar([],0),-1);
});
test('lyrics settings validate against malformed keys, oversized text and impossible spacing',()=>{
 const config={text:'A personal lyric cue',mode:'manual',startBar:0,barsPerLine:2};
 assert.deepEqual(validateLyrics({'axis-6':config}),{'axis-6':config});assert.equal(validateLyrics(undefined),undefined);
 for(const c of [{...config,startBar:-1},{...config,barsPerLine:3},{...config,mode:'unknown'},{...config,text:null}])assert.throws(()=>validateLyrics({'axis-6':c}));
 assert.throws(()=>validateLyrics(JSON.parse('{"__proto__":{"text":"bad"}}')));
});
test('backup round-trips saved per-song lyrics and last source while preserving old backup support',()=>{
 const backup={version:1,completed:[],sessions:[],customSongs:[],favorites:[],lefty:false,goal:10,lyricsBySong:{'axis-6':{text:'Original test words',mode:'bars',startBar:2,barsPerLine:4}},lastPracticeSource:'axis-6'};
 assert.deepEqual(validateBackup(JSON.parse(JSON.stringify(backup))),backup);
 const {lyricsBySong,lastPracticeSource,...legacy}=backup;assert.deepEqual(validateBackup(legacy),legacy);
});

test('LRC imports sort repeated timestamps, apply millisecond offsets and retain instrumental cues',()=>{
 const text='[ar:Test artist]\n[offset:-500]\n[00:12.50][00:24.50]Our test refrain\n[00:00.20]\n[00:04.500]Our opening line';
 assert.deepEqual(parseLrc(text),[{text:'',seconds:0},{text:'Our opening line',seconds:4},{text:'Our test refrain',seconds:12},{text:'Our test refrain',seconds:24}]);
 assert.deepEqual(lyricLines(text),['♪','Our opening line','Our test refrain','Our test refrain']);
 assert.deepEqual(parseLrc('Plain text\n[Verse]'),[]);
 assert.throws(()=>parseLrc('[00:01]line\n'.repeat(1001)));
});

test('timed karaoke uses practice time at different tempos and survives backup restore',()=>{
 const config={text:'[00:04]Our first line\n[00:08]Our second line',mode:'timed',startBar:1,barsPerLine:2};
 assert.deepEqual(lyricTrack(config,60).map(l=>l.bar),[2,3]);
 assert.deepEqual(lyricTrack(config,120).map(l=>l.bar),[3,5]);
 assert.equal(lyricIndexAtBar(lyricTrack(config,60),1.9),-1);
 assert.deepEqual(validateLyrics({'axis-6':config}),{'axis-6':config});
 assert.throws(()=>validateLyrics({'axis-6':{...config,text:'No timestamps'}}));
 const scaled={...config,timingBpm:120};assert.deepEqual(lyricTrack(scaled,60),lyricTrack(scaled,120));
 assert.deepEqual(validateLyrics({'axis-6':scaled}),{'axis-6':scaled});
 assert.throws(()=>validateLyrics({'axis-6':{...config,timingBpm:0}}));
});

test('song source searches encode user titles safely and never interpolate a destination host',()=>{
 const title='Title & spaces # <test>',artist='A/B?C';
 const links=lyricSources({title,artist,id:'axis-6'});assert.equal(links.length,5);
 for(const link of links){const url=new URL(link.url);assert.equal(url.protocol,'https:');assert(['www.youtube.com','www.google.com','en.wikisource.org'].includes(url.hostname));assert(!link.url.includes('<test>'));}
 assert.equal(new URL(links[0].url).searchParams.get('search_query'),artist+' '+title+' official lyric video');
 assert.deepEqual(lyricSources({id:'original'}),[]);
 assert.equal(lyricSources({id:'axis-2',title:'Test',sourceUrl:'https://ukutabs.com/j/james-blunt/youre-beautiful/'})[0].label,'Open UkuTabs chart & lyrics');
 assert.equal(lyricSources({id:'axis-2',title:'Test',sourceUrl:'javascript:alert(1)'}).length,5);
});

test('collection matching handles track numbers, accents, duplicate titles and existing user lyrics',()=>{
 const songs=[{id:'axis-2',title:'You’re Beautiful',artist:'James Blunt'},{id:'axis-3',title:'Écho',artist:'Test Artist'}];
 assert.equal(lyricFileMatch("02 - James Blunt - You're Beautiful.lrc",songs),'axis-2');
 assert.equal(lyricFileMatch('Echo.txt',songs),'axis-3');
 assert.equal(lyricFileMatch('Echo.txt',[...songs,{id:'axis-4',title:'Echo',artist:'Another artist'}]),null);
 const entries=prepareLyricCollection([{name:"You're Beautiful.lrc",text:'[00:02]Our original test line'},{name:'Echo.txt',text:'Our second test line'},{name:'Unknown.txt',text:'Unmatched'}],songs,{'axis-3':{text:'Keep my words'}});
 assert.equal(entries[0].config.mode,'timed');assert.equal(entries[1].status,'Existing lyrics kept');assert.equal(entries[2].status,'No unique title match');
 assert.throws(()=>prepareLyricCollection(Array(101).fill({}),songs));
});

test('runtime folder loader reads manifest-selected files and rejects ambiguous recordings and traversal',async()=>{
 const songs=[{id:'axis-2',artist:'Test Artist',title:'Test Song'}];
 const file=(path,text)=>({webkitRelativePath:'output/'+path,size:text.length,text:async()=>text});
 const track={id:'test',status:'success',artist:'Test Artist',title:'Test Song',format:'lrc',lyrics_path:'artist/album/song/lyrics.lrc'};
 const files=[file('manifest.json',JSON.stringify({version:1,tracks:[track]})),file(track.lyrics_path,'[00:02]An original test line')];
 const loaded=await loadLyricFolder(files,songs);assert.equal(loaded.contents.length,1);assert.equal(prepareLyricCollection(loaded.contents,songs)[0].id,'axis-2');
 const ambiguous=await loadLyricFolder([file('manifest.json',JSON.stringify({version:1,tracks:[track,{...track,id:'another'}]}))],songs);
 assert.equal(ambiguous.contents.length,0);assert.equal(ambiguous.warnings.length,1);
 await assert.rejects(()=>loadLyricFolder([file('manifest.json',JSON.stringify({version:1,tracks:[{...track,lyrics_path:'../bad.lrc'}]}))],songs));
});

test('section practice connects consecutive sections while preserving original lyric bar positions',()=>{
 const bars=[{section:0,songBar:0,chord:'C'},{section:0,songBar:1,chord:'G'},{section:1,songBar:2,chord:'Am'},{section:2,songBar:3,chord:'F'}];
 assert.deepEqual(practiceRange(bars,0,1).map(b=>b.songBar),[0,1,2]);
 assert.deepEqual(practiceRange(bars,1,1).map(b=>b.songBar),[2]);
 assert.deepEqual(practiceRange(bars,-1),bars);
 assert.equal(nextShape(practiceRange(bars,0,1),2,7,true),'C');
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fitKaraoke,vocalSegments,karaokeProgress,mergeKaraokeSeeds} from '../mobile/karaoke-timing.js';
import {packageAndroidApp} from '../mobile/package-app.mjs';
import {lyricTrack,lyricLines} from '../dist/lyrics.js';
const song={id:'axis-1',bpm:60,sheet:'[Intro]\nC G\n[Verse]\nC G Am F\n[Instrumental link]\nC G\n[Chorus]\nC G Am F\n[Ending]\nC G'};
const config={text:'One small chord\nFour quiet strings\nA new practice day',mode:'manual',startBar:0,barsPerLine:2};
test('automatic plain-text karaoke covers the vocal ranges and leaves instrumental gaps silent',()=>{
 const fitted=fitKaraoke(config,song),track=lyricTrack(fitted.config);
 assert.equal(fitted.config.mode,'timed');assert.equal(fitted.metadata.estimated,true);
 assert.equal(fitted.metadata.method,'estimated-phrasing');
 assert.deepEqual(vocalSegments(song.sheet),{bars:14,segments:[{start:2,end:6},{start:8,end:12}]});
 assert.equal(track.find(t=>t.text==='One small chord').bar,2);
 assert.equal(track.find(t=>t.text==='A new practice day').bar,8);
 assert(track.filter(t=>t.text!=='♪').every(t=>t.bar>=2&&t.bar<12&&!(t.bar>=6&&t.bar<8)));
 assert.deepEqual(track.filter(t=>t.text==='♪').map(t=>t.bar),[0,6,12,14]);
 assert.deepEqual(lyricLines(fitted.config.text).filter(t=>t!=='♪'),lyricLines(config.text));
});
test('cached LRC phrasing is fitted to practice bars without changing on tempo reduction',()=>{
 const source={...config,mode:'timed',text:'[00:10]One small chord\n[00:13]Four quiet strings\n[00:22]A new practice day'};
 const fitted=fitKaraoke(source,song);
 assert.equal(fitted.metadata.method,'cached-lrc-phrasing');
 assert.deepEqual(lyricTrack(fitted.config,35),lyricTrack(fitted.config,160));
 assert(lyricTrack(fitted.config).at(-1).bar<=14.001);
});
test('line and word progress advance, pause at a fixed bar, and reset on section loops',()=>{
 const lines=[{bar:2,text:'One small chord'},{bar:6,text:'Four quiet strings'},{bar:10,text:'♪'}];
 assert.equal(karaokeProgress(lines,1).index,-1);
 assert.equal(karaokeProgress(lines,2).word,0);
 assert.equal(karaokeProgress(lines,4).word,1);
 assert.deepEqual(karaokeProgress(lines,4),karaokeProgress(lines,4));
 assert.equal(karaokeProgress(lines,7).index,1);
 assert.equal(karaokeProgress(lines,2).progress,0);
 assert.equal(karaokeProgress(lines,10).word,-1);
});
test('upgrading an installed APK enables unchanged imports and keeps edited words and timing',()=>{
 const incoming=fitKaraoke(config,song).config;
 assert.equal(mergeKaraokeSeeds({'axis-1':config},{'axis-1':incoming})['axis-1'],incoming);
 const edited={...config,text:'My own changed words'};
 assert.equal(mergeKaraokeSeeds({'axis-1':edited},{'axis-1':incoming})['axis-1'],edited);
 const adjusted={...incoming,startBar:3};
 assert.equal(mergeKaraokeSeeds({'axis-1':adjusted},{'axis-1':incoming})['axis-1'],adjusted);
});
test('the phone adapter integrates with the real playback clock and rejects changed integration points',async()=>{
 const source=await fs.readFile(new URL('../dist/app.js',import.meta.url),'utf8');
 const packaged=packageAndroidApp(source);
 assert(packaged.includes('paintKaraoke(lyrics.lines,b.songBar+sub/8)'));
 assert(packaged.includes('e(karaokeNote(studio.source,config,studio.bpm))'));
 assert.throws(()=>packageAndroidApp('changed source'));
});

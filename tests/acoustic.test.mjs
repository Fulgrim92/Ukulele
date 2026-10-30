import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {ACOUSTIC_SONGS} from '../dist/acoustic.js';
import {OLDIES_SONGS} from '../dist/oldies.js';
import {CATALOG,CHORDS,ORIGINAL} from '../dist/data.js';
import {parseSheet,expandSections,validateBackup} from '../dist/core.js';
import {prepareLyricCollection,validateLyrics} from '../dist/lyrics.js';
import {syncSongbook,restoreLyricSync} from '../dist/lyric-sync.js';
import {fitKaraoke} from '../mobile/karaoke-timing.js';
test('the acoustic collection adds twelve distinct songs without changing the 47-song Axis collection',()=>{
 assert.equal(ACOUSTIC_SONGS.length,12);assert.equal(CATALOG.length,47);
 assert.equal(new Set([ORIGINAL,...CATALOG,...ACOUSTIC_SONGS].map(s=>s.id)).size,60);
 for(const artist of ['Ed Sheeran','Noah Rinker','Hozier'])assert.equal(ACOUSTIC_SONGS.filter(s=>s.artist===artist).length,3);
 assert.equal(ACOUSTIC_SONGS.filter(s=>s.artist==='Noah Kahan').length,1);
});
test('every acoustic song has finite sections, attribution and playable four-string chord shapes',()=>{
 for(const song of ACOUSTIC_SONGS){
  const sections=parseSheet(song.sheet),bars=expandSections(sections);
  assert(sections.length>=6);assert(bars.length>=32);assert(/ending/i.test(sections.at(-1).name));
  assert.equal(song.collection,'acoustic');assert.equal(song.arrangement,true);assert(song.sourceUrl.startsWith('https://'));assert(song.arrangementNote.includes('teaching choices'));
  for(const bar of bars)for(const chord of bar.chord.split('+'))assert(CHORDS[chord],song.title+' '+chord);
  assert.equal(fitKaraoke({text:'An original test phrase\nFour small strings ring',mode:'manual',startBar:0,barsPerLine:2},song).config.mode,'timed');
 }
});
test('acoustic lyrics import, backup and practice-source selection survive validation',()=>{
 const song=ACOUSTIC_SONGS.find(s=>s.artist==='Hozier');
 const entries=prepareLyricCollection([{name:song.artist+' - '+song.title+'.lrc',text:'[00:02]An original test phrase'}],ACOUSTIC_SONGS);
 assert.equal(entries[0].id,song.id);
 const lyricsBySong=validateLyrics({[song.id]:entries[0].config});
 const data={version:1,completed:[],customSongs:[],sessions:[],favorites:[song.id],lefty:false,goal:10,lyricsBySong,lastPracticeSource:song.id};
 assert.deepEqual(validateBackup(data),data);
});
test('download lists cover all new identities and preserve the legacy Axis list',async()=>{
 for(const [name,songs] of [['axis',CATALOG],['acoustic',ACOUSTIC_SONGS],['songbook',[...CATALOG,...ACOUSTIC_SONGS,...OLDIES_SONGS]]]){
  const {tracks}=JSON.parse(await fs.readFile(new URL(`../lyrics_pipeline/examples/${name}-song-list.json`,import.meta.url),'utf8'));
  assert.deepEqual(tracks.map(s=>s.app_id),songs.map(s=>s.id));assert(tracks.every(t=>t.artist&&t.title&&!('lyrics' in t)));
 }
});
test('synthetic acoustic acquisition saves new IDs and resumes without repeating requests',async()=>{
 let calls=0;const saved={},results={};
 const client={lookup:async song=>{calls++;return {status:'ready',config:{text:'[00:02]Only synthetic words for testing',mode:'timed',startBar:0,barsPerLine:2},candidates:[]};}};
 const options={songs:ACOUSTIC_SONGS,client,results,hasLyrics:id=>Boolean(saved[id]),saveLyrics:(id,config)=>{validateLyrics({[id]:config});saved[id]=config;return true;}};
 await syncSongbook(options);assert.equal(calls,12);assert.equal(Object.keys(saved).length,12);
 await syncSongbook(options);assert.equal(calls,12);
 assert.equal(Object.keys(restoreLyricSync(JSON.stringify({version:1,results}),ACOUSTIC_SONGS)).length,12);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {OLDIES_SONGS,OLDIES_EXISTING_IDS,isOldie} from '../dist/oldies.js';
import {ACOUSTIC_SONGS} from '../dist/acoustic.js';
import {CATALOG,ORIGINAL,CHORDS} from '../dist/data.js';
import {parseSheet,expandSections,validateBackup} from '../dist/core.js';
import {prepareLyricCollection,validateLyrics} from '../dist/lyrics.js';
import {planStrum} from '../dist/ukulele-audio.js';
import {syncSongbook,restoreLyricSync} from '../dist/lyric-sync.js';
import {fitKaraoke} from '../mobile/karaoke-timing.js';
const all=[ORIGINAL,...CATALOG,...ACOUSTIC_SONGS,...OLDIES_SONGS];
test('Oldies adds twelve distinct songs and reuses two existing classics without duplicates',()=>{
 assert.equal(OLDIES_SONGS.length,12);assert.equal(all.length,72);assert.equal(new Set(all.map(s=>s.id)).size,72);
 assert.equal(all.filter(isOldie).length,14);
 for(const artist of ['U2','The Beatles','Queen'])assert.equal(OLDIES_SONGS.filter(s=>s.artist===artist).length,3);
 const identities=all.map(s=>(s.artist+' '+s.title).toLowerCase().replace(/[^a-z0-9]/g,''));assert.equal(new Set(identities).size,72);
});
test('oldies arrangements have attributed finite forms and four-string voicings for every chord',()=>{
 for(const song of OLDIES_SONGS){
  const sections=parseSheet(song.sheet),bars=expandSections(sections);
  assert(sections.length>=6);assert(bars.length>=32);assert(/ending/i.test(sections.at(-1).name));
  assert(song.sourceUrl.startsWith('https://'));assert(song.arrangementNote.includes('not a recording transcription'));
  for(const token of bars.flatMap(b=>b.chord.split('+'))){assert(CHORDS[token],song.title+' '+token);assert.equal(planStrum(token).length,4);}
  assert.equal(fitKaraoke({text:'Our original test verse\nFour small strings ring',mode:'manual',startBar:0,barsPerLine:2},song).config.mode,'timed');
 }
 assert(OLDIES_SONGS.find(s=>s.title==='Blackbird').arrangementNote.includes('changing meters'));
});
test('oldies file import and backup preserve new IDs, timed lyrics, favorites and practice selection',()=>{
 const song=OLDIES_SONGS[0];
 const [match]=prepareLyricCollection([{name:song.artist+' - '+song.title+'.lrc',text:'[00:02]Our original test verse'}],all);
 assert.equal(match.id,song.id);
 const saved={version:1,completed:[],customSongs:[],sessions:[],favorites:[song.id],lefty:false,goal:10,lyricsBySong:validateLyrics({[song.id]:match.config}),lastPracticeSource:song.id};
 assert.deepEqual(validateBackup(JSON.parse(JSON.stringify(saved))),saved);
});
test('oldies and complete download lists are exhaustive and do not duplicate reused songs',async()=>{
 const oldies=JSON.parse(await fs.readFile(new URL('../lyrics_pipeline/examples/oldies-song-list.json',import.meta.url),'utf8')).tracks;
 const complete=JSON.parse(await fs.readFile(new URL('../lyrics_pipeline/examples/songbook-song-list.json',import.meta.url),'utf8')).tracks;
 assert.equal(oldies.length,14);assert.equal(complete.length,71);
 assert.deepEqual(oldies.map(s=>s.app_id),[...OLDIES_EXISTING_IDS,...OLDIES_SONGS.map(s=>s.id)]);
 assert.equal(new Set(complete.map(s=>s.app_id)).size,71);assert(complete.every(s=>s.title&&s.artist&&!('lyrics' in s)));
});
test('synthetic Oldies lyric lookup skips existing classics, saves new tracks and resumes',async()=>{
 let calls=0;const saved=Object.fromEntries(OLDIES_EXISTING_IDS.map(id=>[id,true])),results={};
 const songs=all.filter(isOldie),client={lookup:async()=>{calls++;return {status:'ready',config:{text:'[00:02]Our original synthetic test line',mode:'timed',startBar:0,barsPerLine:2},candidates:[]};}};
 const options={songs,client,results,hasLyrics:id=>Boolean(saved[id]),saveLyrics:(id,c)=>{validateLyrics({[id]:c});saved[id]=c;return true;}};
 await syncSongbook(options);assert.equal(calls,12);assert.equal(Object.keys(saved).length,14);
 await syncSongbook(options);assert.equal(calls,12);assert.equal(Object.keys(restoreLyricSync(JSON.stringify({version:1,results}),songs)).length,14);
});

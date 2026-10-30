import {validateBackup} from './core.js';
import {validateLyrics} from './lyrics.js';

try{
 const response=await fetch('./private-lyrics.json');
 if(!response.ok)throw Error('Private imports unavailable');
 const incoming=validateLyrics(await response.json());
 const raw=localStorage.getItem('four-strings-v1');
 const saved=raw?validateBackup(JSON.parse(raw)):{version:1,completed:[],customSongs:[],sessions:[],favorites:[],lefty:false,goal:10};
 // Updates seed new songs while preserving the player's edits and progress.
 saved.lyricsBySong={...incoming,...saved.lyricsBySong};
 validateBackup(saved);
 localStorage.setItem('four-strings-v1',JSON.stringify(saved));
}catch(error){console.warn('Optional phone lyric imports were not loaded:',error.message);}
await import('./app.js');

import fs from 'node:fs';
import {CATALOG} from '../dist/data.js';
import {SONG_CHARTS} from '../dist/song-charts.js';
const charts=new Map(SONG_CHARTS.map(s=>[s.id,s]));
const tracks=CATALOG.map(s=>{const c=charts.get(s.id)||{};return {app_id:s.id,artist:c.artistOverride||s.artist,title:c.titleOverride||s.title,album:'',duration:null};});
fs.mkdirSync('lyrics_pipeline/examples',{recursive:true});
fs.writeFileSync('lyrics_pipeline/examples/axis-song-list.json',JSON.stringify({tracks},null,2)+'\n');
console.log(`Exported ${tracks.length} song identities. No lyrics included. Album/duration are filled automatically when using a local audio library instead.`);

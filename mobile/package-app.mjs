export function packageAndroidApp(source){
 const clock="refreshLyrics(lyricIndexAtBar(lyrics.lines,b.songBar+sub/8));";
 const note="`LRC timing uses ${config.timingBpm||studio.bpm} BPM as its reference and follows your practice tempo after count-in. Adjust in Edit if this recording or arrangement differs.`";
 if(!source.includes(clock)||!source.includes(note))throw Error('The app karaoke integration points changed; review the mobile build adapter.');
 return "import {paintKaraoke,karaokeNote,prepareLiveKaraoke} from './karaoke-ui.js';\n"+source
  .replace('function storeSyncedLyrics(id,config){','function storeSyncedLyrics(id,config){config=prepareLiveKaraoke(config,getSong(id));')
  .replace(clock,"{refreshLyrics(lyricIndexAtBar(lyrics.lines,b.songBar+sub/8));paintKaraoke(lyrics.lines,b.songBar+sub/8);}")
  .replace(note,'e(karaokeNote(studio.source,config,studio.bpm))');
}

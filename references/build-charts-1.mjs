import {writeFileSync} from 'node:fs';

const p=(name,chords,repeat=1,cue='')=>`[${name}]${repeat>1?' x'+repeat:''}\n${chords}${cue?' :: '+cue:''}`;
const chart=(id,bpm,sourceUrl,sourceTitle,practiceKey,originalKey,note,parts)=>({id:`axis-${id}`,sheet:parts.join('\n'),sourceUrl,sourceTitle,practiceKey,originalKey,bpm,arrangementNote:`Independent beginner accompaniment in ${practiceKey}. ${note} Bar lengths, section repetitions, and the finite ending are teaching choices; this is not an exact recording transcription. Words in the chart are original coaching cues, not song lyrics.`});
const loop='C G Am F';
const rows=[];
rows.push(chart(1,75,'https://spytunes.com/dont-stop-believin-chords/','Spy Tunes · Don’t Stop Believin’ harmonic analysis','C major','E major','Power-chord and bass-line decorations are reduced to open triads. The Em change and the contrasting F/C section are retained.',[
 p('Intro','C G Am F C G Em F',1,'Hear the difference between Am and Em.'),
 p('Verse 1','C G Am F C G Em F',2,'Use soft, even downstrokes.'),p('Instrumental link','C G Am F C G Em F'),p('Verse 2','C G Am F C G Em F'),
 p('Contrasting section 1','F F C C F F C C F F C C F F G G',1,'Keep counting through the long chord holds.'),
 p('Verse 3','C G Am F C G Em F',2),p('Contrasting section 2','F F C C F F C C F F C C F F G G'),
 p('Solo accompaniment','C G Am F C G Em F'),p('Final chorus','C G Am F C G Em F',3,'Build gradually, then finish together.'),p('Ending','F G C C')
]));
rows.push(chart(2,65,'https://ukutabs.com/j/james-blunt/youre-beautiful/','UkuTabs · You’re Beautiful','C major','E-flat major','The verse uses the repeated tonic rather than the medley loop. Am7 and the F/G chorus movement are retained.',[
 p('Intro','C C Am7 F',2),p('Verse 1','C C Am7 F',2,'Let each chord ring; keep the wrist loose.'),p('Verse 1 turnaround','F G'),
 p('Chorus 1','F G Am7 G F G C C F G C+G Am7 F G Am7 Am7 F G C C',1,'A plus sign splits one bar into equal chord lengths.'),
 p('Instrumental link','C C Am7 F'),p('Verse 2','C C Am7 F',2),p('Chorus 2','F G Am7 G F G C C F G C+G Am7 F G Am7 Am7 F G C C'),
 p('Bridge','F Am7 F G F G',1,'Play fewer strokes to create space.'),
 p('Final chorus','F G Am7 G F G C C F G C+G Am7 F G C+G Am7 F G Am7 Am7 F G C C'),p('Ending','F G C C')
]));
rows.push(chart(3,75,'https://ukutabs.com/b/black-eyed-peas/where-is-the-love/','UkuTabs · Where Is the Love','C major','F major','The recurring I–V–vi–IV harmony is transposed from F. Rap passages are organized into practice-length verse blocks.',[
 p('Intro',loop,2),p('Rap verse 1',loop,8,'Keep a quiet pulse underneath the spoken rhythm.'),p('Sung pre-chorus 1',loop,2),p('Chorus 1',loop,4,'Keep the same tempo when the melody opens up.'),
 p('Rap verse 2',loop,8),p('Sung pre-chorus 2',loop,2),p('Chorus 2',loop,4),p('Bridge',loop,4,'Thin the strum, then rebuild.'),p('Final chorus',loop,4),p('Outro',loop,2),p('Ending','F G C C')
]));
rows.push(chart(4,70,'https://ukulelecheats.com/alphaville-forever-young-ukulele-chords/','Ukulele Cheats · Forever Young in C','C major','A major','Dm is kept in the verse and chorus; it is not replaced with Am. Small connecting flourishes are omitted.',[
 p('Intro','C G Am F G Dm F Am+G C'),p('Verse 1','C G Am F G Dm F Am+G'),p('Verse 2','C G Am F G Dm F Am+G'),p('Verse 3','C G Am F G Dm F Am+G'),
 p('Chorus 1','C G Am F G Dm F G C G Am F G Dm F+G C',1,'Prepare Dm before the next downbeat.'),p('Interlude','C G F G'),
 p('Verse 4','C G Am F G Dm F Am+G'),p('Verse 5','C G Am F G Dm F Am+G'),p('Verse 6','C G Am F G Dm F Am+G'),
 p('Chorus 2','C G Am F G Dm F G C G Am F G Dm F+G C'),p('Instrumental chorus','C G Am F G Dm F G'),p('Final chorus','C G Am F G Dm F G',2),p('Ending','F G C C')
]));
rows.push(chart(5,70,'https://ukutabs.com/j/jason-mraz/im-yours/','UkuTabs · I’m Yours','C major','B major','D7 is retained for the expanded verse and bridge. Optional suspended and passing chords are reduced to the core accompaniment.',[
 p('Intro',loop,2),p('Verse 1',loop,4,'Use a relaxed island strum.'),p('Chorus 1',loop,2),p('Verse 2',loop,2),p('Verse 2 extension','C G Am F D7 D7'),
 p('Chorus 2',loop,4),p('Bridge','C G Am G F F D7 D7',2,'Keep D7 light; do not rush its resolution.'),p('Instrumental link','C G Am G F F D7 D7'),
 p('Verse 3',loop,4),p('Final chorus',loop,4),p('Final extension','D7 D7'),p('Outro',loop,4),p('Ending','F G C C')
]));
rows.push(chart(6,80,'https://ukutabs.com/t/train/hey-soul-sister/','UkuTabs · Hey, Soul Sister','C major','E major','All four foundation chords work, but the chorus has its own order and several split-bar changes. Practice without capo in C; a capo on 4 restores the recording’s key.',[
 p('Intro',loop,1,'Keep the hand moving through the rests.'),p('Verse 1','C G Am F C G Am F+G',2),
 p('Chorus 1','F G C+G F G C+G F G',2,'The chorus begins on F, not C.'),p('Post-chorus',loop),
 p('Verse 2','C G Am F C G Am F+G',2),p('Chorus 2','F G C+G F G C+G F G',2),
 p('Bridge','C G Am F C G Am F+G',1,'Start quietly and gradually add energy.'),
 p('Final chorus','F G C+G F G C+G F G',2),p('Chorus tag','F G C+G F G G'),p('Outro','C G Am F+G',2),p('Ending','C C')
]));
rows.push(chart(7,75,'https://ukutabs.com/t/the-calling/wherever-you-will-go/','UkuTabs · Wherever You Will Go','C major','D major','The main loop is transposed down two semitones; the bridge retains Em rather than forcing four-chord harmony. Picking figures and inversions are omitted.',[
 p('Intro',loop),p('Verse 1',loop,2,'Pick or brush lightly.'),p('Pre-chorus 1',loop,2),p('Chorus 1',loop,2),
 p('Verse 2',loop,2),p('Pre-chorus 2',loop,2),p('Chorus 2',loop,2),p('Bridge','Am F G Em Am F G Em',1,'Give the Em change time to settle.'),
 p('Quiet verse',loop,2),p('Final chorus',loop,4),p('Outro','Am F G G C C')
]));
rows.push(chart(8,65,'https://ukutabs.com/e/elton-john/can-you-feel-the-love-tonight/','UkuTabs · Can You Feel the Love Tonight','C major','B-flat major','The adult Elton John ballad arrangement is used as the harmonic reference. Dm7, D and borrowed Bb remain; inversions are simplified to root-position names.',[
 p('Intro','C G F C F C G+C Dm7+C'),p('Verse 1A','F C F C F C Dm7 G',1,'Use gentle single strums.'),p('Verse 1B','F C F C F Am Bb G'),
 p('Chorus 1A','C G Am F C F D G F C Am+C F Dm+C F D G'),p('Chorus 1B','C G Am F C F D G F C Am+C F Dm+C F F C'),
 p('Interlude','C G F C F C G+C Dm7+C'),p('Verse 2A','F C F C F C Dm G'),p('Verse 2B','F C F C F Am Bb G'),
 p('Chorus 2A','C G Am F C F D G F C Am+C F Dm+C F D G'),p('Chorus 2B','C G Am F C F D G F C Am+C F Dm+C F F C'),
 p('Outro','F C Am+C F Dm+C F F C'),p('Ending','F G C C')
]));
rows.push(chart(9,75,'https://www.ukulele-tabs.com/uke-songs/akon/dont-matter-uke-tab-2514.html','Ukulele Tabs · Don’t Matter','C major','A major','The intro uses the medley family, but the main sung accompaniment moves through C–Em–F–G. The bridge is an original practice-length contrast based on the same harmony.',[
 p('Intro',loop),p('Opening chorus','C Em F G',4,'Listen to the Em colour rather than substituting G.'),p('Verse 1','C Em F G',6),p('Chorus 1','C Em F G',4),
 p('Verse 2','C Em F G',6),p('Chorus 2','C Em F G',4),p('Bridge','C Em F G',4,'Drop to one brush per bar.'),p('Final chorus','C Em F G',4),p('Outro','C Em F G',2),p('Ending','F G C C')
]));
rows.push(chart(10,75,'https://spytunes.com/take-me-home-country-roads-chords/','Spy Tunes · Take Me Home, Country Roads','C major','A major','The bridge’s borrowed Bb and G7 are kept after transposition. The source’s brief 2/4 link is regularized to 4/4 for this player; this accompaniment will not align bar-for-bar with the recording.',[
 p('Intro','C C'),p('Verse 1','C C Am Am G G F+C C',2,'Use a gentle country pulse.'),p('Chorus 1','C C G G Am Am F F C C G G F F C C'),
 p('Verse 2','C C Am Am G G F+C C',2),p('Chorus 2','C C G G Am Am F F C C G G F F C C'),
 p('Bridge','Am+G C C F+C G G Am Bb F+C C G G7',1,'Bb is the borrowed chord; keep the count steady.'),
 p('Final chorus','C C G G Am Am F F C C G G F F C C',2),p('Outro','G C G C'),p('Ending','C C')
]));
rows.push(chart(11,80,'https://ukutabs.com/l/lady-gaga/paparazzi/','UkuTabs · Paparazzi','A minor','C minor','The verse is centred on Am, and the chorus moves to F–C–Dm–Bb. This keeps the original tonal contrast, so it requires more than four chords.',[
 p('Intro','Am Am Am Am'),p('Verse 1A','Am Am Am Am F F Am Am'),p('Verse 1B','Am Am Am Am F F Dm Dm'),
 p('Chorus 1','F C Dm Bb F C Dm Bb F C Dm Am F C Dm Bb',1,'Let the chorus sound brighter than the verse.'),p('Interlude','Am Am Am Am'),
 p('Verse 2A','Am Am Am Am F F Am Am'),p('Verse 2B','Am Am Am Am F F Dm Dm'),p('Chorus 2','F C Dm Bb F C Dm Bb F C Dm Am F C Dm Bb'),
 p('Bridge','Am Am Am Am',2,'Use short controlled strokes.'),p('Final chorus','F C Dm Bb F C Dm Bb F C Dm Am F C Dm Bb'),p('Ending','Am Am Am Am')
]));
rows.push(chart(12,75,'https://ukutabs.com/u/u2/with-or-without-you/','UkuTabs · With or Without You','C major','D major','The repeating four-chord harmony is preserved. Sections describe the gradual build rather than forcing a standard pop verse/chorus form; the long fade is given a finite ending.',[
 p('Intro',loop,4,'Let the harmony unfold slowly.'),p('Verse 1',loop,4),p('First refrain',loop,2),p('Verse 2',loop,2),p('Refrain 2',loop,2),
 p('Build 1',loop,4,'Add a little more strumming energy.'),p('Verse 3',loop,2),p('Build 2',loop,2),p('Main refrain',loop,4),p('Wordless bridge accompaniment',loop,2),
 p('Final refrain',loop,4),p('Outro',loop,4),p('Ending','F C C C')
]));
rows.push(chart(13,80,'https://ukutabs.com/t/the-last-goodnight/pictures-of-you/','UkuTabs · Pictures of You','C major','D major','The verse holds the tonic longer than the chorus. Dm is retained in the contrasting middle section after transposition.',[
 p('Intro','C C Am F'),p('Verse 1','C C Am F',4,'Keep the held C moving with light strums.'),p('Chorus 1',loop,4),
 p('Verse 2','C C Am F',2),p('Verse 2 lift','C Am F Am'),p('Chorus 2',loop,4),
 p('Bridge','Dm Am F C+G',2,'Make the Dm change softly, then grow.'),p('Verse 3','C C Am F',2),p('Final chorus',loop,6),p('Outro',loop,2),p('Ending','F G C C')
]));
rows.push(chart(14,75,'https://songparts.com/songs/maroon-5/she-will-be-loved','Songparts · She Will Be Loved harmonic section analysis','A minor / C major','C minor / E-flat major','The verse alternates Am/G, while the chorus opens on C. F is retained in chorus and bridge resolutions, rather than flattening all sections to a single loop.',[
 p('Intro','Am G',2),p('Verse 1','Am G',8,'Keep a soft alternating pulse.'),p('Chorus 1','C G Am G C G Am F',2,'Hear the brighter C at the chorus entrance.'),
 p('Verse 2','Am G',8),p('Chorus 2','C G Am G C G Am F',2),p('Bridge','G Am G Am G Am G F G Am G G',1,'Thin out the rhythm before the final chorus.'),
 p('Short verse return','Am G',2),p('Final chorus','C G Am G C G Am F',3),p('Outro','C G Am F',4),p('Ending','F G C C')
]));
rows.push(chart(15,65,'https://ukutabs.com/t/the-beatles/let-it-be/','UkuTabs · Let It Be','C major','C major','The familiar descending F–Em–Dm–C cadence and expanded instrumental turnaround are retained. Melody, piano fills and guitar solos are not reproduced.',[
 p('Intro','C G Am F C G F+Em Dm+C'),p('Verse 1','C G Am F C G F+Em Dm+C',2,'Split-bar changes land evenly within the four beats.'),
 p('Chorus 1','Am G F C C G F+Em Dm+C'),p('Verse 2','C G Am F C G F+Em Dm+C',2),p('Chorus 2','Am G F C C G F+Em Dm+C',2),
 p('Instrumental turnaround','F+Em Dm+C Bb+A G F C',2),p('Solo accompaniment','C G Am F C G F+Em Dm+C',2),
 p('Chorus 3','Am G F C C G F+Em Dm+C'),p('Verse 3','C G Am F C G F+Em Dm+C',2),p('Final chorus','Am G F C C G F+Em Dm+C',3),p('Ending','F+Em Dm+C C C')
]));
rows.push(chart(16,65,'https://www.gotaukulele.com/2012/11/no-woman-no-cry-bob-marley-ukulele.html','Got A Ukulele · No Woman No Cry harmonic lesson','C major','C major','The main four-chord verse is kept, with the different C/F/C/G/C chorus cadence. This is a finite, slower singalong arrangement; live and studio versions have different forms and tempos.',[
 p('Intro','C G Am F C F+C G+C C'),p('Opening chorus','C G Am F C F+C G+C C',2,'Keep the quick changes relaxed.'),
 p('Verse 1',loop,8,'Use gentle offbeat strokes.'),p('Chorus 1','C G Am F C F+C G+C C',2),p('Verse 2',loop,8),
 p('Reassurance section',loop,4,'Gradually open up the strumming.'),p('Chorus 2','C G Am F C F+C G+C C',2),p('Instrumental accompaniment',loop,4),
 p('Final chorus','C G Am F C F+C G+C C',2),p('Ending','F C G C')
]));

writeFileSync(new URL('./charts-1.json',import.meta.url),JSON.stringify(rows,null,2)+'\n');
console.log(JSON.stringify(rows.map(r=>({id:r.id,sections:(r.sheet.match(/^\[/gm)||[]).length,source:r.sourceUrl})),null,2));

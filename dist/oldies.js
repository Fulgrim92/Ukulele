// Independently authored, regular 4/4 practice accompaniments, with finite endings.
// Harmony references inform the chord families. No commercial lyric text or melody is bundled.
const section=(name,chords,repeat=1,cue='')=>`[${name}]${repeat>1?' x'+repeat:''}\n${chords}${cue?' :: '+cue:''}`;
const song=(n,title,artist,bpm,key,url,parts,note,difficulty)=>({
 id:'oldies-'+n,title,artist,bpm,practiceKey:key,sourceUrl:url,sourceTitle:'Harmonic reference · '+title,
 collection:'oldies',type:'full',arrangement:true,artIndex:59+n,color:['peach','lavender','mint','yellow'][n%4],difficulty,
 sheet:parts.join('\n'),arrangementNote:note+' Original ukulele teaching accompaniment in regular 4/4. Bar counts, repeats and ending are authored practice choices, not a recording transcription. Add your own lyric file; automatic practice timing is estimated.'
});
export const OLDIES_EXISTING_IDS=['axis-12','axis-15']; // Existing U2 / Beatles entries; never duplicate their storage IDs.
export const isOldie=s=>s.collection==='oldies'||OLDIES_EXISTING_IDS.includes(s.id);
export const OLDIES_SONGS=[
 song(1,'One','U2',72,'A minor','https://www.ukulele-tabs.com/uke-songs/u2/one-uke-tab-11703.html',[
  section('Intro','Am Dsus2 F G',2),section('Verse 1','Am Dsus2 F G',4,'Keep the two open strings ringing in Dsus2.'),section('Chorus 1','C Am F C',4),section('Verse 2','Am Dsus2 F G',4),section('Chorus 2','C Am F C',4),section('Bridge','C Am F C',2),section('Final chorus','C Am F C',4),section('Ending','F G C C')
 ],'Keeps the suspended D verse color; Fmaj7 is reduced to the familiar F triad. Electric-guitar textures are omitted.','One gentle new shape'),
 song(2,'All I Want Is You','U2',72,'C major','https://www.ukulele-tabs.com/uke-songs/u2/all-i-want-is-you-uke-tab-404.html',[
  section('Intro','C F C F',2),section('Verse 1','C F C F',4),section('Chorus 1','Am F C F',4),section('Verse 2','C F C F',4),section('Chorus 2','Am F C F',4),section('Instrumental link','C F C F',2),section('Final chorus','Am F C F',4),section('Outro','C F C F',2),section('Ending','F G C C')
 ],'Transposes the A/D/F#m guitar-shape family to C/F/Am. The orchestral outro becomes a short strummed ending.','Core shapes'),
 song(3,"I Still Haven’t Found What I’m Looking For",'U2',76,'C major','https://ukutabs.com/u/u2/i-still-havent-found-what-im-looking-for/',[
  section('Intro','C C F C',2),section('Verse 1','C C C C F F C C',2),section('Chorus 1','G F C C',2),section('Verse 2','C C C C F F C C',2),section('Chorus 2','G F C C',2),section('Verse 3','C C C C F F C C',2),section('Final chorus','G F C C',4,'Let the G-to-F change settle before returning to C.'),section('Ending','F G C C')
 ],'A three-shape C-major gospel-folk accompaniment. Delayed guitar figures and layered vocals are omitted.','Three core shapes'),
 song(4,'Yesterday','The Beatles',65,'F major','https://ukutabs.com/t/the-beatles/yesterday/',[
  section('Intro','F F'),section('Verse 1','F Em+A7 Dm C Bb C F F Dm G7 Bb F'),section('Verse 2','F Em+A7 Dm C Bb C F F Dm G7 Bb F'),section('Bridge 1','Em A7 Dm C Bb Gm C F'),section('Verse 3','F Em+A7 Dm C Bb C F F Dm G7 Bb F'),section('Bridge 2','Em A7 Dm C Bb Gm C F'),section('Final verse','F Em+A7 Dm C Bb C F F Dm G7 Bb F'),section('Ending','Dm G7 Bb F')
 ],'Retains the A7-to-Dm pull. Em7 is reduced to Em. The original uneven phrase lengths are regularized into four-beat practice bars; this is a harmony study rather than the exact vocal form.','Gentle tempo · extra shapes'),
 song(5,'Hey Jude','The Beatles',70,'C major','https://ukutabs.com/t/the-beatles/hey-jude/',[
  section('Verse 1','C G G7 C F C G C',2),section('Verse 2','C G G7 C F C G C',2),section('Bridge 1','F Dm Am Dm G G7 C C',2),section('Verse 3','C G G7 C F C G C',2),section('Bridge 2','F Dm Am Dm G G7 C C',2),section('Final verse','C G G7 C F C G C',2),section('Singalong coda','C Bb F C',6,'Build gradually without speeding up.'),section('Ending','F G C C')
 ],'Transposes the F-major family to C. The Bb in the coda is retained as a stretch shape; the long recorded fade is replaced with a finite ending.','Add G7, Dm and Bb'),
 song(6,'Blackbird','The Beatles',68,'G major','https://ukutabs.com/t/the-beatles/blackbird/',[
  section('Intro','G Am G C'),section('Verse 1','G Am G C C D Em C G Am D G',2),section('Verse 2','G Am G C C D Em C G Am D G',2),section('Bridge 1','F C D G F C D D',2),section('Instrumental link','G Am G C',2),section('Bridge 2','F C D G F C D D',2),section('Final verse','G Am G C C D Em C G Am D G',2),section('Ending','C D G G')
 ],'A simplified strummed harmony cover. Moving bass notes, guitar counterpoint and changing meters are deliberately replaced with regular 4/4; this does not teach the original picking part.','Harmony study · Em and D'),
 song(7,'Love of My Life','Queen',65,'C major','https://ukutabs.com/q/queen/love-of-my-life/',[
  section('Intro','C Am Dm G',2),section('Verse 1','C Am Dm G C Em F C',2),section('Refrain 1','F G C Am Dm G C C',2),section('Verse 2','C Am Dm G C Em F C',2),section('Refrain 2','F G C Am Dm G C C',2),section('Bridge','Am Em F C Dm G C G',2,'Play one quiet stroke per bar before restoring the strum.'),section('Instrumental link','C Am Dm G',2),section('Final refrain','F G C Am Dm G C C',2),section('Ending','Dm G C C')
 ],'An acoustic-style C-major triad reduction. Inversions, diminished passing harmony and the piano/harp part are omitted. Phrasing is regularized to 4/4 practice bars.','Slow stretch · Dm and Em'),
 song(8,'Who Wants to Live Forever','Queen',65,'E minor','https://ukutabs.com/q/queen/who-wants-to-live-forever/',[
  section('Intro','Em Em Em Em'),section('Verse 1','Am D7 Em Em D A G A D D',2),section('Chorus 1','D C G Am C Bm Am Em',2),section('Verse 2','Am D7 Em Em D A G A D D',2),section('Chorus 2','D C G Am C Bm Am Em',2),section('Bridge','Em C Em C D D C C',2),section('Final chorus','D C G Am C Bm Am Em',3),section('Ending','C D Em Em')
 ],'Retains the minor mood and contrasting major A chord. Suspended voicings are reduced to major triads, and orchestral holds are regularized to four-beat bars.','Beyond four chords'),
 song(9,'These Are the Days of Our Lives','Queen',72,'C major','https://ukutabs.com/q/queen/these-are-the-days-of-our-lives/',[
  section('Intro','C F C F',2),section('Verse 1','C F C F Am G F C',2),section('Pre-chorus 1','Dm G Am F',2),section('Chorus 1','C F C F Am G F C',2),section('Verse 2','C F C F Am G F C',2),section('Pre-chorus 2','Dm G Am F',2),section('Chorus 2','C F C F Am G F C',2),section('Solo accompaniment','C F Am G',2),section('Final chorus','C F C F Am G F C',2),section('Ending','F G C C')
 ],'A soft C-major accompaniment. Suspensions, slash bass notes and percussion details are reduced to familiar triads.','One extra shape: Dm'),
 song(10,'Wish You Were Here','Pink Floyd',72,'G major','https://ukutabs.com/p/pink-floyd/wish-you-were-here/',[
  section('Intro','Em G Em G Em A Em A G G',2),section('Verse 1','C D Am G D C Am G',2),section('Instrumental link','Em G Em A G G',2),section('Verse 2','C D Am G D C Am G',2),section('Refrain','C D Am G D C Am G',2),section('Solo accompaniment','Em G Em A',3),section('Final refrain','C D Am G D C Am G',2),section('Ending','C D G G')
 ],'Keeps the G/Em/A instrumental family and C/D/Am/G vocal contrast. The iconic picked riff becomes held chord shapes; no lead melody is transcribed.','Relaxed strum · Em, D and A'),
 song(11,'Tears in Heaven','Eric Clapton',65,'C major','https://ukutabs.com/e/eric-clapton/tears-in-heaven/',[
  section('Intro','C G Am F C G C C'),section('Verse 1','C G Am F C G C C',2),section('Refrain 1','Am Em F C Dm G C C',2),section('Verse 2','C G Am F C G C C',2),section('Refrain 2','Am Em F C Dm G C C',2),section('Bridge','Bb F G C Bb F G G',2),section('Instrumental link','C G Am F C G C C',2),section('Final verse','C G Am F C G C C',2),section('Ending','Dm G C C')
 ],'Transposed from the A-major family to C. The bridge is condensed and passing bass/dominant decorations are reduced; this is a strummed teaching adaptation.','Slow stretch · Bb, Dm and Em'),
 song(12,'Father and Son','Cat Stevens',72,'G major','https://ukutabs.com/c/cat-stevens/father-and-son/',[
  section('Intro','G C G C',2),section('Verse 1','G D C Am G Em Am D',2),section('Verse 2','G D C Am G Em Am D',2),section('Contrasting verse 1','G Bm C Am G Em Am D',2,'Keep the pulse steady while changing the vocal intensity.'),section('Instrumental link','G D C Am G Em Am D',2),section('Verse 3','G D C Am G Em Am D',2),section('Contrasting verse 2','G Bm C Am G Em Am D',2),section('Outro','C D G G',2),section('Ending','C D G G')
 ],'Retains the G-major family and Bm contrast between the two perspectives. Sus/add-note guitar colors and fills are omitted.','Em, D and Bm')
];

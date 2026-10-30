// Independent 4/4 ukulele teaching adaptations. No commercial lyrics or melody notation.
// Each token is a practice bar; lengths, repeats and endings are authored learning choices.
const part=(name,chords,repeat=1,cue='')=>`[${name}]${repeat>1?' x'+repeat:''}\n${chords}${cue?' :: '+cue:''}`;
const tune=(id,title,artist,bpm,key,url,sections,note,difficulty='Core shapes')=>({
 id:'acoustic-'+id,title,artist,bpm,practiceKey:key,sourceUrl:url,sourceTitle:'Harmonic reference · '+title,
 collection:'acoustic',type:'full',arrangement:true,artIndex:47+id,color:['mint','peach','lavender','yellow'][id%4],difficulty,
 sheet:sections.join('\n'),arrangementNote:note+' Independent high-g ukulele accompaniment in regular 4/4. Section lengths, repeats and ending are teaching choices, not a recording transcription. Coaching cues are original; add your own lyric file for singing.'
});
export const ACOUSTIC_SONGS=[
 tune(1,'Photograph','Ed Sheeran',72,'C major','https://ukutabs.com/e/ed-sheeran/photograph-two/',[
  part('Intro','C Am G F'),part('Verse 1','C Am G F',4,'Let the open strings ring between changes.'),part('Pre-chorus 1','Am F C G',2),part('Chorus 1','C G Am F',4),part('Verse 2','C Am G F',4),part('Pre-chorus 2','Am F C G',2),part('Chorus 2','C G Am F',4),part('Bridge','Am F C G',2,'Keep the same pulse while playing more softly.'),part('Final chorus','C G Am F',4),part('Ending','F G C C')
 ],'Transposed from the reference E-major family to C. Uses only your foundation shapes; guitar picking and decorations are omitted.'),
 tune(2,'The A Team','Ed Sheeran',72,'G major','https://ukutabs.com/e/ed-sheeran/the-a-team/',[
  part('Intro','G Em C G'),part('Verse 1','G G Em Em C C G G',2),part('Chorus 1','Am C G D',4,'Move from Am to C with the smallest possible lift.'),part('Post-chorus 1','Em C G G',2),part('Verse 2','G G Em Em C C G G',2),part('Chorus 2','Am C G D',4),part('Bridge','Am C Em D',2),part('Final chorus','Am C G D',4),part('Ending','Em C G G')
 ],'Transposed from A to G. Minor-seventh colors are reduced to minor triads. Add Em and D to the foundation vocabulary.','Two extra shapes'),
 tune(3,'Thinking Out Loud','Ed Sheeran',70,'C major','https://ukutabs.com/e/ed-sheeran/thinking-out-loud/',[
  part('Intro','C C F G'),part('Verse 1','C C F G',4),part('Pre-chorus 1','Dm G Am Em F G C C',2),part('Chorus 1','C C F G',4,'Use quiet downstrokes before adding the offbeats.'),part('Verse 2','C C F G',4),part('Pre-chorus 2','Dm G Am Em F G C C',2),part('Chorus 2','C C F G',4),part('Instrumental link','C C F G',2),part('Final chorus','C C F G',4),part('Ending','F G C C')
 ],'Transposed from D to C. The moving bass is reduced to held C; Dm and Em preserve contrast in the pre-chorus. The original groove is simplified to even eighth notes.','Two extra shapes'),
 tune(4,'Save My Soul','Noah Rinker',70,'C major','https://arkjuander.com/lyrics-and-chords/save-my-soul-noah-rinker',[
  part('Intro','Am C F C F C G G'),part('Verse 1','Am C F C F C G G',2),part('Chorus 1','Am G F F Am G F F',2,'Let the F chord settle before returning to Am.'),part('Verse 2','Am C F C F C G G',2),part('Chorus 2','Am G F F Am G F F',2),part('Verse 3','Am C F C F C G G',2),part('Final chorus','Am G F F Am G F F',2),part('Outro','Am C F G'),part('Ending','C C C C')
 ],'A four-foundation-shape study retaining the minor opening and F/G resolution. Guitar and harmonica figures are omitted.'),
 tune(5,'Red Bandana','Noah Rinker',76,'C major / A minor','https://www.gotabs.com/noah-rinker/red-bandana-chords',[
  part('Intro','Am C F F',2),part('Verse 1','Am C F F',4),part('Instrumental link','Am C F F',2),part('Verse 2','Am C F F',3),part('Turnaround','Am G F F'),part('Chorus 1','F C G G F C G Am G F C G',2),part('Solo accompaniment','F C G G Am C F F',2),part('Verse 3','C C F F Am C F F',2),part('Final chorus','F C G G F C G Am G F C G',2),part('Ending','F G C C')
 ],'Uses the reference capo-shape harmony without a ukulele capo. Am7 is reduced to Am; the G turn and F/C/G chorus remain. This practice key differs from the capoed recording.'),
 tune(6,'Wherever I Go','Noah Rinker',68,'G major / E minor','https://www.gotabs.com/noah-rinker/wherever-i-go-chords',[
  part('Intro','Em C G G',2),part('Verse 1','Em C G G',4),part('Pre-chorus 1','D Em G C',2),part('Chorus 1','Em C G G',4),part('Verse 2','Em C G G',4),part('Pre-chorus 2','D Em G C',2),part('Chorus 2','Em C G G',4),part('Bridge','C D Em G',2,'Make Em clear before increasing your strum volume.'),part('Final chorus','Em C G G',4),part('Ending','C D Em Em')
 ],'Retains Em/C/G and the D pre-chorus turn. The reference uses capo and detuned guitar; the ukulele stays in standard tuning at a different concert pitch.','Em and D'),
 tune(7,'Like Real People Do','Hozier',72,'G major','https://ukutabs.com/h/hozier/like-real-people-do/',[
  part('Intro','G G C G'),part('Verse 1','G C Em C',4),part('Chorus 1','G C G Em G C Em C',2),part('Verse 2','G C Em C',4),part('Chorus 2','G C G Em G C Em C',2),part('Final chorus','G C G Em G C D G',2),part('Ending','C D G G')
 ],'An open-chord accompaniment retaining the G/C/Em motion and final D resolution. The guitar thumb-and-finger pattern is replaced by gentle ukulele strums.','Em and D'),
 tune(8,'Work Song','Hozier',68,'C major','https://ukutabs.com/h/hozier/work-song/',[
  part('Intro','C Dm C Dm',2),part('Verse 1','C Dm C C',4),part('Chorus 1','Am G C Dm',4),part('Verse 2','C Dm C C',4),part('Chorus 2','Am G C Dm',4),part('Verse 3','C Dm C C',4),part('Final chorus','Am G C Dm',4,'Keep the pulse calm; let the harmony carry the intensity.'),part('Ending','Am G C C')
 ],'Transposed up two semitones from Bb/Cm/Gm/F to C/Dm/Am/G. Dm is the one additional shape; vocal harmonies and claps are omitted.','One extra shape'),
 tune(9,'Someone New','Hozier',78,'G major','https://ukutabs.com/h/hozier/someone-new/',[
  part('Intro','G Bm C D',2),part('Verse 1','G Bm C D Em D Bm C',2),part('Pre-chorus 1','C Bm Em D Bm C C D'),part('Chorus 1','G Bm C D',4),part('Verse 2','G Bm C D Em D Bm C',2),part('Pre-chorus 2','C Bm Em D Bm C C D'),part('Chorus 2','G Bm C D',4),part('Bridge','Am Bm Em Em C D G G',2),part('Final chorus','G Bm C D',4),part('Ending','C D G G')
 ],'A stretch arrangement with Bm barre practice. C7 is reduced to C and B7 to Bm; those reductions soften the original dominant color.','Beyond four chords'),
 tune(10,'Riptide','Vance Joy',80,'A minor','https://ukutabs.com/v/vance-joy/riptide/',[
  part('Intro','Am G C C',2),part('Verse 1','Am G C C',4),part('Pre-chorus 1','Am G C C',2),part('Chorus 1','Am G C C',4),part('Verse 2','Am G C C',4),part('Chorus 2','Am G C C',4),part('Bridge','Am G C F',4,'Add F without letting the right hand lose its pulse.'),part('Final chorus','Am G C C',4),part('Ending','Am G C C')
 ],'Retains the Am/G/C family. Fmaj7 in the bridge is simplified to the familiar F shape. Begin with downstrokes, then use the island strum.'),
 tune(11,'Stick Season','Noah Kahan',80,'C major','https://ukutabs.com/n/noah-kahan/stick-season/',[
  part('Intro','C G Am F',2),part('Verse 1','C G Am F',4),part('Chorus 1','C G Am F',4),part('Verse 2','C G Am F',4),part('Chorus 2','C G Am F',4),part('Bridge','C G Am F',4,'Reduce the volume while keeping all four beats moving.'),part('Final chorus','C G Am F',4),part('Ending','F G C C')
 ],'Transposed from the A/E/F#m/D family to C/G/Am/F. This uses all four foundation shapes. Detailed vocal rhythm and guitar accents are omitted.'),
 tune(12,'Let Her Go','Passenger',70,'G major','https://ukutabs.com/p/passenger/let-her-go/',[
  part('Intro','C D Em Em C D Em D',2),part('Chorus 1','C G D Em C G D D',2),part('Verse 1','Em C D Bm Em C D D',2),part('Chorus 2','C G D Em C G D D',2),part('Verse 2','Em C D Bm Em C D D',2),part('Chorus 3','C G D Em C G D D',2),part('Instrumental link','Em C D Bm',2),part('Final chorus','C G D Em C G D D',2),part('Ending','C D G G')
 ],'A strummed G-major accompaniment retaining the chorus opening and minor verse contrast. The picked introduction becomes a chord study.','Em, D and Bm')
];

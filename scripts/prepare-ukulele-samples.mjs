import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const roots=[67,60,64,69],names=[['G4','Ab4','A4','Bb4','B4'],['C4','Db4','D4','Eb4','E4'],['E4','F4','Gb4','G4','Ab4'],['A4','Bb4','B4','C5','Db5']];
const SOURCE_COMMIT='b27cf72d4916ebba6fcef0b21e3f6050bab2727e';
export function readWave(bytes){
 if(bytes.toString('ascii',0,4)!=='RIFF'||bytes.toString('ascii',8,12)!=='WAVE')throw Error('Not a WAV file');
 let format,pcm;
 for(let at=12;at+8<=bytes.length;){const id=bytes.toString('ascii',at,at+4),length=bytes.readUInt32LE(at+4),start=at+8;
  if(id==='fmt ')format={encoding:bytes.readUInt16LE(start),channels:bytes.readUInt16LE(start+2),rate:bytes.readUInt32LE(start+4),bits:bytes.readUInt16LE(start+14)};
  if(id==='data')pcm=bytes.subarray(start,start+length);at=start+length+(length%2);
 }
 if(!format||!pcm)throw Error('Missing WAV data');
 const {encoding,channels,rate,bits}=format,step=bits/8;if(![1,3].includes(encoding)||![16,24,32].includes(bits))throw Error('Unsupported WAV encoding');
 const frames=pcm.length/(step*channels),samples=new Float32Array(frames);
 for(let i=0;i<frames;i++)for(let c=0;c<channels;c++){const at=(i*channels+c)*step;let v;
  if(encoding===3&&bits===32)v=pcm.readFloatLE(at);else if(bits===16)v=pcm.readInt16LE(at)/32768;else if(bits===24)v=pcm.readIntLE(at,3)/8388608;else v=pcm.readInt32LE(at)/2147483648;
  samples[i]+=v/channels;
 }
 return {samples,rate,format};
}
export function writeWave(samples,rate){
 const b=Buffer.alloc(44+samples.length*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVE',8);b.write('fmt ',12);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(rate,24);b.writeUInt32LE(rate*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(samples.length*2,40);samples.forEach((v,i)=>b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,v))*32767),44+i*2));return b;
}
if(process.argv[1]&&import.meta.url.endsWith(process.argv[1].replaceAll('\\','/').split('/').at(-1))){
 mkdirSync('dist/assets/ukulele',{recursive:true});mkdirSync('references/ukulele-recordings',{recursive:true});const manifest=[];
 for(let string=0;string<4;string++)for(let fret=0;fret<5;fret++){
  const original=`${4-string}-${names[string][fret]}.wav`,path='references/ukulele-recordings/'+original;
  if(!existsSync(path)){const response=await fetch(`https://raw.githubusercontent.com/francoiswnel/Ukulele/${SOURCE_COMMIT}/Ukulele/Samples/${original}`);if(!response.ok)throw Error('Unable to fetch CC0 sample '+original);writeFileSync(path,Buffer.from(await response.arrayBuffer()));}
  const raw=readFileSync(path),{samples,rate,format}=readWave(raw);
  // Trim only silence before the first pluck, retaining 2ms of pre-attack.
  let start=0;while(start<samples.length&&Math.abs(samples[start])<.004)start++;start=Math.max(0,start-Math.round(rate*.002));
  const length=Math.min(samples.length-start,Math.round(rate*3.1)),out=samples.slice(start,start+length);
  let dc=0;for(const n of out)dc+=n;dc/=out.length;
  let peak=0;for(let i=0;i<out.length;i++){out[i]-=dc;peak=Math.max(peak,Math.abs(out[i]));}
  const gain=.68/(peak||1),fade=Math.round(rate*.045);
  for(let i=0;i<out.length;i++)out[i]*=gain*Math.min(1,i/(rate*.0006),(out.length-1-i)/fade);
  const file=`s${4-string}-f${fret}.wav`,wav=writeWave(out,rate);writeFileSync('dist/assets/ukulele/'+file,wav);
  manifest.push({stringIndex:string,string:4-string,fret,midi:roots[string]+fret,file,sourceFile:original,sourceSha256:createHash('sha256').update(raw).digest('hex'),sha256:createHash('sha256').update(wav).digest('hex'),sampleRate:rate,frames:out.length,duration:out.length/rate,trimmedFrames:start,sourceFormat:format});
 }
 const commit=SOURCE_COMMIT;
 writeFileSync('dist/assets/ukulele/manifest.json',JSON.stringify({instrument:'Kala KA-CE concert ukulele',creator:'François W. Nel',source:'https://github.com/francoiswnel/Ukulele',sourceCommit:commit,license:'CC0-1.0',processing:'Leading silence trimmed, mono mix, DC removal, peak level matched, maximum 3.1s with 45ms end fade. No source code from the upstream patch is used.',samples:manifest},null,2));
 console.log(JSON.stringify({samples:manifest.length,formats:[...new Set(manifest.map(s=>JSON.stringify(s.sourceFormat)))],size:manifest.reduce((n,s)=>n+44+s.frames*2,0),durations:manifest.map(s=>s.duration.toFixed(2))}));
}

import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {CATALOG,ORIGINAL} from '../dist/data.js';
import {loadLyricFolder,prepareLyricCollection} from '../dist/lyrics.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const output=path.join(root,'.android-web');
// Copy over the generated files without touching the web application's source.
await fs.mkdir(output,{recursive:true});
await fs.cp(path.join(root,'dist'),output,{recursive:true});
let configs={};
const flag=process.argv.indexOf('--lyrics');
if(flag!==-1){
 if(!process.argv[flag+1])throw Error('--lyrics requires a pipeline import folder');
 const source=path.resolve(process.argv[flag+1]);
 const files=[];
 async function walk(dir){
  for(const entry of await fs.readdir(dir,{withFileTypes:true})){
   if(entry.name.startsWith('.'))continue;
   const absolute=path.join(dir,entry.name);
   if(entry.isSymbolicLink())throw Error('Symlinks are not supported in lyric imports');
   if(entry.isDirectory())await walk(absolute);
   else if(entry.name==='manifest.json'||/\.(lrc|txt)$/i.test(entry.name)){
    const info=await fs.stat(absolute);
    if(info.size>10000000)throw Error('Input file is too large');
    files.push({name:entry.name,webkitRelativePath:'collection/'+path.relative(source,absolute).split(path.sep).join('/'),size:info.size,text:()=>fs.readFile(absolute,'utf8')});
   }
  }
 }
 await walk(source);
 const songs=[ORIGINAL,...CATALOG];
 const {contents,warnings}=await loadLyricFolder(files,songs);
 const matches=prepareLyricCollection(contents,songs);
 const errors=matches.filter(x=>!x.config);
 if(warnings.length||errors.length)throw Error('Review lyric import errors before building: '+JSON.stringify({warnings,errors}));
 configs=Object.fromEntries(matches.map(x=>[x.id,x.config]));
}
// Always replace this file so a later build without --lyrics contains no prior texts.
await fs.writeFile(path.join(output,'private-lyrics.json'),JSON.stringify(configs));
await fs.copyFile(path.join(root,'mobile','bootstrap.js'),path.join(output,'mobile-bootstrap.js'));
await fs.copyFile(path.join(root,'mobile','mobile.css'),path.join(output,'mobile.css'));
let html=await fs.readFile(path.join(output,'index.html'),'utf8');
html=html.replace('width=device-width,initial-scale=1','width=device-width,initial-scale=1,viewport-fit=cover')
 .replace('</head>','<link rel="stylesheet" href="mobile.css"></head>')
 .replace(/src="app\.js(?:\?[^\"]*)?"/,'src="mobile-bootstrap.js"');
if(!html.includes('src="mobile-bootstrap.js"'))throw Error('Could not locate the app entry point');
await fs.writeFile(path.join(output,'index.html'),html);
console.log(`Android assets prepared; ${Object.keys(configs).length} private lyric imports. Generated files are Git-ignored.`);

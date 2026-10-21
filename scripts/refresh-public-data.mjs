import {mkdir,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
import {shanghaiDate} from '../online.mjs';

const directory=path.resolve(process.argv[2] || 'data');
await mkdir(directory,{recursive:true});
const requests=[];
for(const [name,tag] of Object.entries({'tv-any':'国产剧'})){
  const url=new URL('https://movie.douban.com/j/search_subjects');
  url.search=new URLSearchParams({type:'tv',tag,sort:'time',page_limit:'24',page_start:'0'});
  requests.push({name,url,valid:body=>Array.isArray(body?.subjects)&&body.subjects.length>0});
}
for(const [latitude,longitude] of [[29.60,103.48],[29.55,103.77],[31.88,120.56],[31.30,120.59],[31.23,121.47]]){
  const url=new URL('https://api.open-meteo.com/v1/forecast');
  url.search=new URLSearchParams({latitude,longitude,current:'temperature_2m,weather_code',timezone:'Asia/Shanghai'});
  requests.push({name:`weather-${latitude.toFixed(2).replace('.','_')}-${longitude.toFixed(2).replace('.','_')}`,url,valid:body=>Number.isFinite(body?.current?.temperature_2m)&&Number.isInteger(body?.current?.weather_code)&&typeof body.current.time==='string'});
}
for(const country of ['CN','']){
  const url=new URL('https://api.tvmaze.com/schedule/web');
  if(country)url.searchParams.set('country',country);
  url.searchParams.set('date',shanghaiDate());
  requests.push({name:country?'schedule-cn':'schedule-global',url,valid:Array.isArray});
}
const results=[];
// A small bounded queue avoids bursts against public data sources.
for(let i=0;i<requests.length;i+=3){
  await Promise.all(requests.slice(i,i+3).map(async({name,url,valid})=>{
    try{
      const headers={Accept:'application/json','User-Agent':'Mozilla/5.0'};
      if(url.hostname==='movie.douban.com')headers.Referer='https://movie.douban.com/tv/';
      const response=await fetch(url,{headers,signal:AbortSignal.timeout(15000)});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const body=await response.json();
      if(!valid(body))throw new Error('Invalid response');
      const data={collectedAt:new Date().toISOString(),requestURL:url.href,body};
      const target=path.join(directory,`${name}.json`);
      await writeFile(target+'.tmp',JSON.stringify(data));await rename(target+'.tmp',target);
      results.push({name,updated:true});
    }catch(error){results.push({name,updated:false,error:String(error.message).slice(0,100)});}
  }));
}
console.log(JSON.stringify({updated:results.filter(x=>x.updated).length,total:results.length,results}));
if(!results.some(x=>x.updated))process.exitCode=1;

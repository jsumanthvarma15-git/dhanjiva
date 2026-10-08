const {chromium,webkit}=require('@playwright/test');
const assert=require('node:assert/strict');
(async()=>{for(const [name,engine] of Object.entries({chromium,webkit})){
const browser=await engine.launch();const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
await page.waitForFunction(()=>document.querySelector('video')?.readyState>=2);
const bands=await page.locator('[data-scroll-scrub-band]').evaluateAll(ns=>ns.map(n=>({top:n.getBoundingClientRect().top+scrollY,height:n.offsetHeight})));
let result=[];
for(let i=0;i<bands.length;i++){
const samples=[];
for(const f of [.15,.35,.6,.85]){
await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),bands[i].top+bands[i].height*f);
await page.waitForFunction(i=>document.querySelector('.scroll-scrub').dataset.activeSection===String(i),i);
await page.waitForTimeout(650);
samples.push(await page.locator('[data-scroll-scrub-layer]').nth(i).evaluate(n=>({time:n.querySelector('video')?.currentTime,painted:n.dataset.videoPainted,width:n.querySelector('video')?.videoWidth})));
}
assert(samples.every(s=>s.width===1910&&s.painted==='true'),JSON.stringify(samples));
assert(samples.at(-1).time>samples[0].time+.3,JSON.stringify(samples));
result.push({chapter:i,samples});
}
await page.screenshot({path:`/tmp/dhanjiva-transitions-${name}.png`});
console.log(JSON.stringify({engine:name,result}));await browser.close();
}})().catch(e=>{console.error(e);process.exit(1)});

const {chromium,webkit}=require('@playwright/test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const reports=[];
 for(const [engine,width,height] of [['chromium',320,568],['chromium',390,844],['chromium',768,1024],['chromium',844,390],['chromium',1440,900],['webkit',390,844]]){
  const browser=await ({chromium,webkit}[engine]).launch({headless:true});
  const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:2,isMobile:width<900,hasTouch:width<900});
  await context.addInitScript(()=>{Object.defineProperty(navigator,'deviceMemory',{get:()=>2});window.__raf=0;const raf=window.requestAnimationFrame;window.requestAnimationFrame=fn=>raf.call(window,t=>{window.__raf++;fn(t)});});
  const page=await context.newPage();const errors=[];const media=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('.mp4'))media.push(r.url())});
  const response=await page.goto((process.env.BASE_URL || 'http://127.0.0.1:4173/'),{waitUntil:'networkidle'});assert.equal(response.status(),200);
  await page.waitForFunction(()=>document.querySelector('video')?.readyState>=2);
  assert.equal(await page.locator('video').first().evaluate(v=>v.videoWidth),1910,'HD default');
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false,`${engine} ${width} overflow`);
  await page.screenshot({path:`/tmp/dhanjiva-${engine}-${width}.png`});
  if(width<=900){await page.getByRole('button',{name:'Open navigation'}).click();await page.getByRole('navigation',{name:'Main navigation'}).getByRole('link',{name:'Tools',exact:true}).click();await page.waitForTimeout(250);assert.equal(await page.getByRole('button',{name:'Open navigation'}).getAttribute('aria-expanded'),'false');}
  await page.evaluate(()=>scrollTo({top:250,behavior:'instant'}));await page.waitForTimeout(700);
  await page.waitForFunction(()=>[...document.querySelectorAll('video')].some(v=>v.currentTime>0.05));
  let maxVideos=0;
  for(const y of [800,2000,3600,5200,2500,300]){await page.evaluate(y=>scrollTo({top:y,behavior:'instant'}),y);await page.waitForTimeout(150);maxVideos=Math.max(maxVideos,await page.locator('video').count())}
  assert(maxVideos<=2);
  await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await page.getByLabel('Animation quality').selectOption('light');
  await page.waitForFunction(()=>document.querySelector('video')?.videoWidth===960);
  await page.getByLabel('Animation quality').selectOption('high');await page.waitForFunction(()=>document.querySelector('video')?.videoWidth===1910);
  await page.evaluate(()=>scrollTo({top:document.body.scrollHeight,behavior:'instant'}));await page.waitForTimeout(800);assert.equal(await page.locator('video').count(),0);
  const count=await page.evaluate(()=>window.__raf);await page.waitForTimeout(400);const idle=(await page.evaluate(()=>window.__raf))-count;assert(idle<=1);
  assert.equal(errors.length,0,errors.join('\n'));
  reports.push({engine,width,height,overflow,highQualityWidth:1910,lightWidth:960,maxVideos,idleCallbacks:idle,errors});
  await browser.close();
 }
 const browser=await chromium.launch();const context=await browser.newContext({reducedMotion:'reduce',viewport:{width:390,height:844}});const page=await context.newPage();const media=[];page.on('request',r=>{if(r.url().includes('.mp4'))media.push(r.url())});await page.goto((process.env.BASE_URL || 'http://127.0.0.1:4173/'),{waitUntil:'networkidle'});assert.equal(media.length,0);await page.getByLabel('Your name').fill('Test User');await page.getByLabel('Work email').fill('test@example.com');await page.getByLabel('Hospital or organisation').fill('Test Hospital');await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Request access'}).click();await page.getByRole('alert').waitFor();assert.match(await page.getByRole('alert').innerText(),/temporarily unavailable/);reports.push({reducedMotion:true,videoRequests:media.length,unconfiguredForm:'clear error, no false success'});await browser.close();
 fs.writeFileSync('/tmp/dhanjiva-browser-report.json',JSON.stringify(reports,null,2));console.log(JSON.stringify(reports));
})().catch(e=>{console.error(e);process.exit(1)});

async page => {
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
  await page.goto('http://127.0.0.1:4180/Sources/Aperture/Resources/Web/index.html');
  await page.waitForFunction(()=>document.querySelector('video')?.currentTime>1);
  return await page.evaluate(async()=>{
    const video=document.querySelector('video');
    const timeline=gsap.globalTimeline.getChildren(false,false,true).find(t=>'handoff' in t.labels);
    try {
      video.pause();
      await new Promise(r=>setTimeout(r,300));
      const before=timeline.time();
      await new Promise(r=>setTimeout(r,1000));
      if(Math.abs(timeline.time()-before)>.05) throw Error('Overlay outruns paused movie');
      return {movieClockVerified:true};
    } finally { Aperture.dispose(); }
  });
}

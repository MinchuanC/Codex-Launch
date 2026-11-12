// Run through Playwright's browser_run_code tool; the existing local server serves this repository.
async page => {
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('http://127.0.0.1:4180/Sources/Aperture/Resources/Web/index.html');
  await page.evaluate(()=>{
    window.lifecycleMessages=[];
    window.webkit={messageHandlers:{aperture:{postMessage:m=>lifecycleMessages.push(m)}}};
    Aperture.present({surface:'startup',presentationToken:'live-motion'});
  });
  try {
    await page.waitForFunction(()=>{
      const video=document.querySelector('.assembly-field video');
      return document.querySelector('.assembly-field').dataset.renderer==='film' && video?.readyState>=2 && !video.paused && video.currentTime>.2;
    },null,{timeout:4000});
    await page.evaluate(()=>{window.lifecycleVideo=document.querySelector('.assembly-field video');});
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(()=>lifecycleMessages.some(m=>m.action==='finished'));
    const result=await page.evaluate(()=>({
      renderer:document.querySelector('.assembly-field').dataset.renderer,
      videos:document.querySelectorAll('video').length,
      mediaReleased:lifecycleVideo.paused && !lifecycleVideo.hasAttribute('src') && !lifecycleVideo.isConnected,
      completions:lifecycleMessages.filter(m=>m.action==='finished')
    }));
    if(result.renderer!=='svg' || result.videos!==0 || !result.mediaReleased || result.completions.length!==1 || result.completions[0].token!=='live-motion') {
      throw Error('Live reduced-motion change failed: '+JSON.stringify(result));
    }
    return result;
  } finally {
    await page.evaluate(()=>{Aperture.dispose();delete window.webkit;});
    await page.emulateMedia({reducedMotion:'no-preference'});
  }
}

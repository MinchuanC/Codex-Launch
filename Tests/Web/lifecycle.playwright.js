// Run through Playwright's browser_run_code tool; the existing local server serves this repository.
async page => {
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('http://127.0.0.1:4179/Sources/Aperture/Resources/Web/index.html');
  await page.evaluate(()=>{
    window.lifecycleMessages=[];
    window.webkit={messageHandlers:{aperture:{postMessage:m=>lifecycleMessages.push(m)}}};
    Aperture.present({surface:'startup',presentationToken:'live-motion'});
  });
  const initial=await page.evaluate(()=>document.querySelector('.assembly-field').dataset.renderer);
  if(initial!=='webgl') throw Error('WebGL startup did not render before preference change');
  try {
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(()=>lifecycleMessages.some(m=>m.action==='finished'));
    const result=await page.evaluate(()=>({
      renderer:document.querySelector('.assembly-field').dataset.renderer,
      canvases:document.querySelectorAll('canvas').length,
      completions:lifecycleMessages.filter(m=>m.action==='finished')
    }));
    if(result.renderer!=='svg' || result.canvases!==0 || result.completions.length!==1 || result.completions[0].token!=='live-motion') {
      throw Error('Live reduced-motion change failed: '+JSON.stringify(result));
    }
    return result;
  } finally {
    await page.evaluate(()=>{Aperture.dispose();delete window.webkit;});
    await page.emulateMedia({reducedMotion:'no-preference'});
  }
}

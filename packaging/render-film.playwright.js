async page => {
  await page.setViewportSize({width:1920,height:1200});
  await page.goto('http://127.0.0.1:4180/packaging/render-machine.html');
  await page.evaluate(()=>window.machineReady);
  const directory='/private/tmp/aperture-continuous-frames';
  // Create this directory before capture.
  for(let i=0;i<960;i++) {
    await page.evaluate(time=>renderAt(time),i/60);
    await page.screenshot({path:`${directory}/frame-${String(i).padStart(4,'0')}.png`});
  }
  return {frames:960,width:1920,height:1200,fps:60};
}

// Verify deterministic offline rendering through the continuous shot and final dive.
async page => {
  await page.setViewportSize({width:1920,height:1200});
  await page.goto('http://127.0.0.1:4180/packaging/render-machine.html');
  await page.evaluate(()=>machineReady);
  const frames=[],states=[];
  for(const time of [0,4.19,4.2,9.39,9.4,12,15,12]) {
    states.push(await page.evaluate(t=>renderAt(t),time));
    frames.push((await page.screenshot()).toString('base64'));
  }
  if(frames[5]!==frames[7]) throw Error('Rendering depends on frame order');
  if(new Set(frames.slice(0,7)).size!==7) throw Error('Repeated pose at different times');
  for(const [a,b] of [[1,2],[3,4]]) {
    const distance=Math.hypot(...states[a].camera.map((v,i)=>v-states[b].camera[i]));
    if(distance>.1) throw Error('Camera cuts instead of moving continuously');
  }
  const approach=await page.evaluate(()=>renderAt(14.8)),entry=await page.evaluate(()=>renderAt(15.4)),exit=await page.evaluate(()=>renderAt(15.95));
  if(!(approach.camera[2]>9 && entry.camera[2]<2 && exit.camera[2]<-8 && exit.fov>70 && entry.coreScale<.01)) throw Error('Final dive does not pass through the open core');
  if(await page.locator('video').count()) throw Error('The core still depends on a video insert');
  return {deterministic:true,uniquePoses:7,continuousCamera:true,coreDive:true,videoInserts:0};
}

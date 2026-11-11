(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const surfaces = [...document.querySelectorAll('[data-surface]')];
  const vanes = [...document.querySelectorAll('.vane')];
  $('.assembly-field').dataset.renderer='svg';
  const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
  let context = null, startup = null, scene = null, current = null, generation = 0;
  const send = (action, token) => window.webkit?.messageHandlers?.aperture?.postMessage(action==='finished' ? {action, token:token ?? current?.presentationToken} : {action});
  const reduced = options => !!options.reducedMotion || reducedQuery.matches;
  function clearMotion() {
    startup?.kill(); startup = null;
    scene?.dispose(); scene = null;
    context?.revert(); context = null;
  }
  function createStartupTimeline(options = {}) {
    const tl = gsap.timeline({paused:true});
    if (reduced(options) || options.quiet) {
      tl.set(vanes, {clearProps:'transform,opacity,visibility'},0);
      tl.set(['.assembly-field','.stage-header','.stage-footer','.cut-rule'], {clearProps:'all'},0);
      tl.set('#startup', {autoAlpha:1},0);
      tl.addLabel('resolve',0).addLabel('open',0).addLabel('close',0).addLabel('handoff',0);
      if (!options.quiet) tl.fromTo('#startup',{opacity:0},{opacity:1,duration:0.12,ease:'none'});
      return tl;
    }
    const compact = !!options.compact;
    tl.addLabel('resolve',0)
      .fromTo('#startup',{autoAlpha:0},{autoAlpha:1,duration:0.18,ease:'power2.out'},0)
      .fromTo('.stage-header',{y:6,autoAlpha:0},{y:0,autoAlpha:1,duration:0.3,ease:'power3.out'},0.12)
      .fromTo('.assembly-field',{scale:0.86,autoAlpha:0},{scale:1,autoAlpha:1,duration:0.58,ease:'power3.out'},0.14)
      .fromTo(vanes,{x:72,rotation:-14,autoAlpha:0},{x:0,rotation:0,autoAlpha:1,duration:0.45,stagger:0.024,transformOrigin:'0% 50%',ease:'power3.out'},0.18)
      .addLabel('open',0.65)
      .to(vanes,{x:32,rotation:32,duration:0.4,transformOrigin:'0% 50%',ease:'power2.inOut'},'open')
      .fromTo('.core-cut',{scaleY:0.15,scaleX:1},{scaleY:1.6,scaleX:6,duration:0.42,transformOrigin:'50% 50%',ease:'power2.inOut'},'open')
      .fromTo('.cut-rule',{scaleX:0,autoAlpha:0},{scaleX:1,autoAlpha:1,duration:0.5,ease:'power3.inOut'},0.68)
      .fromTo('.label-bottom',{autoAlpha:0},{autoAlpha:1,duration:0.2},0.9)
      .fromTo('.stage-footer',{autoAlpha:0},{autoAlpha:1,duration:0.2},0.28)
      .addLabel('close',1.18)
      .to(vanes,{x:0,rotation:0,duration:0.36,transformOrigin:'0% 50%',ease:'power2.inOut'},'close')
      .to('.core-cut',{scaleX:1,scaleY:1,duration:0.34,ease:'power2.inOut'},'close')
      .addLabel('handoff',1.56)
      .to('#startup',{autoAlpha:0,duration:0.24,ease:'power2.out'},'handoff');
    if (compact) {
      tl.getChildren(false,true,true).forEach(child => { child.startTime(child.startTime()*0.25); child.duration(child.duration()*0.25); });
      Object.keys(tl.labels).forEach(label => {tl.labels[label] *= 0.25;});
    }
    return tl;
  }
  function present(options) {
    const previous = current;
    const same = previous && previous.surface===options.surface;
    generation++;
    const token = generation;
    clearMotion();
    current = {...options};
    surfaces.forEach(el => { el.hidden = el.id !== options.surface; el.inert = el.hidden; });
    document.body.classList.toggle('is-quiet',!!options.quiet);
    $('[data-action=toggleQuiet]').setAttribute('aria-pressed',String(!!options.quiet));
    context = gsap.context(() => {
      if (options.surface==='startup') {
        startup = createStartupTimeline(options);
        if(!reduced(options) && !options.quiet && document.visibilityState==='visible') {
          scene=window.ApertureScene?.create($('.assembly-field')) ?? null;
          scene?.timeline(startup);
          startup.eventCallback('onUpdate',()=>scene?.render());
        }
        startup.eventCallback('onComplete',() => {
          if(token!==generation) return;
          scene?.dispose(); scene=null;
          send('finished',options.presentationToken);
        });
        startup.play();
      } else if (!reduced(options) && !options.quiet && document.visibilityState==='visible') {
        const target=options.surface==='deck' ? '#deck' : '#tab';
        // Keep controls visible when macOS throttles a nonactivating panel's animation frames.
        gsap.fromTo(target,{x:options.surface==='deck'?8:3,scale:options.surface==='deck'?.97:1,transformOrigin:'top right'},{x:0,scale:1,duration:options.surface==='deck'?0.22:0.18,ease:'power3.out',clearProps:'transform,transformOrigin'});
      }
    });
    if(options.surface==='deck' && !same) $('#deck button').focus({preventScroll:true});
  }
  function dismiss() {
    generation++;
    clearMotion();
    current=null;
    surfaces.forEach(el => {el.hidden=true; el.inert=true;});
  }
  function setLaunchStatus(status) {
    $('#launch-status').textContent=({opening:'Opening app…',opened:'App opened',failed:'Couldn’t open app',timedOut:'Opening is taking longer',preview:'Opening preview',idle:'Opening app…'})[status] || 'Opening app…';
  }
  function localTween(target, vars) {
    if (!current || current.quiet || reduced(current)) return;
    if (context) context.add(() => gsap.to(target,{...vars,overwrite:'auto'}));
  }
  document.addEventListener('click', event => {
    const button=event.target.closest('[data-action]');
    if (button && !button.closest('[data-surface]').hidden) send(button.dataset.action);
  });
  document.addEventListener('keydown', event => {
    if(event.key==='Escape') { event.preventDefault(); send(current?.surface==='startup'?'skip':'closeDeck'); }
  });
  const tab=$('.tab-button');
  tab.addEventListener('pointerenter',()=>localTween('.mini-rotor',{rotation:8,transformOrigin:'50% 50%',duration:0.16,ease:'power2.out'}));
  tab.addEventListener('pointermove',event=>{
    const r=tab.getBoundingClientRect();
    localTween('.mini-mark',{rotationY:Math.max(-3,Math.min(3,(event.clientX-r.left-r.width/2)/r.width*6)),rotationX:Math.max(-3,Math.min(3,-(event.clientY-r.top-r.height/2)/r.height*6)),duration:0.16,ease:'power2.out'});
  });
  tab.addEventListener('pointerleave',()=>{
    localTween('.mini-rotor',{rotation:0,duration:0.22,ease:'power2.out'});
    localTween('.mini-mark',{rotationX:0,rotationY:0,scale:1,duration:0.22,ease:'power2.out'});
  });
  tab.addEventListener('pointerdown',()=>localTween('.mini-mark',{scale:0.96,duration:0.09,ease:'power2.out'}));
  tab.addEventListener('pointerup',()=>localTween('.mini-mark',{scale:1,duration:0.12,ease:'power2.out'}));
  tab.addEventListener('pointercancel',()=>localTween('.mini-mark',{scale:1,duration:0.12,ease:'power2.out'}));
  reducedQuery.addEventListener('change',()=>{
    if(!current) return;
    const options={...current};
    if(options.surface==='startup') { clearMotion(); context=gsap.context(()=>{const tl=createStartupTimeline({...options,reducedMotion:true});tl.progress(1).kill();}); send('finished'); }
    else present(options);
  });
  document.addEventListener('visibilitychange',()=>{
    if(document.visibilityState==='hidden') { scene?.dispose(); scene=null; }
  });
  window.Aperture={present,dismiss,dispose:dismiss,setLaunchStatus,createStartupTimeline};
  send('ready');
  // The same artwork can be previewed in a browser without a native bridge.
  if(!window.webkit?.messageHandlers?.aperture && window.top===window) present({surface:'startup'});
})();

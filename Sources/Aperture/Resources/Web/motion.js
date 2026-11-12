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
      tl.set(['.program-field','.assembly-field','.stage-header','.stage-footer','.cut-rule'], {clearProps:'all'},0);
      tl.set('#startup', {autoAlpha:1},0);
      tl.addLabel('resolve',0).addLabel('open',0).addLabel('close',0).addLabel('handoff',0);
      if (!options.quiet) tl.fromTo('#startup',{opacity:0},{opacity:1,duration:0.12,ease:'none'});
      return tl;
    }
    tl.addLabel('resolve',0)
      .fromTo('#startup',{autoAlpha:0},{autoAlpha:1,duration:0.42,ease:'power2.out'},0)
      .fromTo('.program-field',{y:14,autoAlpha:0},{y:0,autoAlpha:0.6,duration:1.1,ease:'power2.out'},0.8)
      .fromTo('.program-field span',{x:-18,autoAlpha:0},{x:0,autoAlpha:1,duration:0.7,stagger:0.14,ease:'power3.out'},0.9)
      .to('.program-field',{autoAlpha:0,y:-12,duration:0.7,ease:'power2.inOut'},4.2)
      .fromTo('.program-field',{y:14,autoAlpha:0},{y:0,autoAlpha:0.5,duration:1,ease:'power2.out'},8.2)
      .to('.program-field',{autoAlpha:0,y:-12,duration:0.7,ease:'power2.inOut'},11.2)
      .fromTo('.stage-header',{y:8,autoAlpha:0},{y:0,autoAlpha:1,duration:0.55,ease:'power3.out'},0.28)
      .fromTo('.assembly-field',{autoAlpha:0},{autoAlpha:1,duration:1.1,ease:'power3.out'},0.15)
      .fromTo(vanes,{x:118,rotation:-26,autoAlpha:0},{x:0,rotation:0,autoAlpha:1,duration:0.82,stagger:0.055,transformOrigin:'0% 50%',ease:'power3.out'},0.62)
      .fromTo('.charge-ring',{autoAlpha:0,scale:0.62,rotation:-150,svgOrigin:'0 0'},{autoAlpha:0.78,scale:1.08,rotation:210,duration:3.8,svgOrigin:'0 0',ease:'power2.inOut'},0.8)
      .fromTo('.core-outline',{autoAlpha:0,scale:0.82,svgOrigin:'0 0'},{autoAlpha:1,scale:1,duration:0.8,svgOrigin:'0 0',ease:'power2.out'},1.15)
      .fromTo('.stage-footer',{autoAlpha:0,y:5},{autoAlpha:1,y:0,duration:0.35,ease:'power2.out'},1.2)
      .addLabel('open',2.05)
      .to(vanes,{x:34,rotation:34,scale:1.045,duration:1.12,stagger:0.045,transformOrigin:'0% 50%',ease:'power2.inOut'},'open')
      .fromTo('.core-cut',{scaleY:0.08,scaleX:0.7},{scaleY:2.25,scaleX:2.5,duration:1.15,transformOrigin:'50% 50%',ease:'power2.inOut'},'open+=0.12')
      .fromTo('.cut-rule',{scaleX:0,autoAlpha:0},{scaleX:1,autoAlpha:1,duration:0.9,ease:'power3.inOut'},'open+=0.24')
      .fromTo('.label-bottom',{autoAlpha:0},{autoAlpha:1,duration:0.35,ease:'power2.out'},'open+=0.8')
      .addLabel('settle',12.5)
      .to(vanes,{x:0,rotation:0,scale:1,duration:0.88,stagger:0.035,transformOrigin:'0% 50%',ease:'power2.inOut'},'settle')
      .to('.core-cut',{scaleX:1,scaleY:1,duration:0.8,ease:'power2.inOut'},'settle+=0.12')
      .to('.charge-ring',{autoAlpha:0,scale:1.35,duration:0.55,svgOrigin:'0 0',ease:'power2.in'},'settle+=0.18')
      .to(['.stage-header','.cut-rule'],{autoAlpha:0,duration:0.5,ease:'power2.in'},13.2)
      .addLabel('handoff',15.72)
      .to('#startup',{autoAlpha:0,duration:0.28,ease:'power2.inOut'},'handoff');
    return tl;
  }
  function startScene() {
    if(scene || current?.surface!=='startup' || !startup || startup.progress()>=1 || reduced(current) || current.quiet || document.visibilityState!=='visible') return;
    scene=window.ApertureScene?.create($('.assembly-field'),startup.time(),{
      frame:time=>{ startup?.pause(); startup?.time(time); },
      failed:()=>startup?.play()
    }) ?? null;
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
        startScene();
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
    else startScene();
  });
  window.Aperture={present,dismiss,dispose:dismiss,setLaunchStatus,createStartupTimeline};
  send('ready');
  // The same artwork can be previewed in a browser without a native bridge.
  if(!window.webkit?.messageHandlers?.aperture && window.top===window) present({surface:'startup'});
})();

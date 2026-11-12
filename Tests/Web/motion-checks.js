(async () => {
  const frame = document.getElementById('subject');
  await new Promise(resolve => frame.addEventListener('load', resolve, {once:true}));
  const w = frame.contentWindow;
  const results = {passed:0, failed:0, failures:[]};
  const test = async (name, f) => { try { await f(); results.passed++; } catch(e) { results.failed++; results.failures.push(name + ': ' + e.message); }};
  const assert = (x, m) => { if (!x) throw Error(m); };
  const waitUntil = async (condition, message) => {
    const deadline=performance.now()+4000;
    while(!condition()) {
      if(performance.now()>deadline) throw Error(message);
      await new Promise(resolve=>setTimeout(resolve,30));
    }
  };
  const playingFilm = () => {
    const video=w.document.querySelector('.assembly-field video');
    return w.document.querySelector('.assembly-field').dataset.renderer==='film' && video?.readyState>=2 && !video.paused ? video : null;
  };
  await test('renderer exists', () => assert(w.Aperture, 'missing renderer'));
  if (w.Aperture) {
    const A = w.Aperture, d = w.document;
    await test('six real vanes', () => assert(d.querySelectorAll('.vane').length === 6, 'geometry missing'));
    await test('cancelled press settles the tab', async () => {
      A.present({surface:'tab'});
      const tab=d.querySelector('.tab-button');
      tab.dispatchEvent(new w.PointerEvent('pointerdown',{pointerId:7,pointerType:'mouse',bubbles:true}));
      await new Promise(resolve=>setTimeout(resolve,150));
      tab.dispatchEvent(new w.PointerEvent('pointercancel',{pointerId:7,pointerType:'mouse',bubbles:true}));
      await new Promise(resolve=>setTimeout(resolve,300));
      assert(Math.abs(w.gsap.getProperty('.mini-mark','scaleX')-1)<.001,'cancelled press stays compressed');
      A.dispose();
    });
    await test('opening duration and choreography', () => {
      A.present({surface:'startup'});
      const tl=A.createStartupTimeline({});
      assert(Math.abs(tl.duration()-16)<0.01, 'opening duration');
      assert(tl.labels.resolve < tl.labels.open && tl.labels.open < tl.labels.settle && tl.labels.settle < tl.labels.handoff, 'label order');
      tl.seek(0.01); const initial=d.querySelector('.vane').getAttribute('style');
      tl.seek(0.9); assert(d.querySelector('.vane').getAttribute('style') !== initial, 'vanes never move');
      const slit=d.querySelector('.core-cut').getBoundingClientRect(), assembly=d.querySelector('.assembly').getBoundingClientRect();
      assert(Math.abs((slit.top+slit.bottom)/2-(assembly.top+assembly.bottom)/2)<3, 'central slit leaves optical center');
      tl.seek(15.65);
      assert(Number(w.getComputedStyle(d.getElementById('startup')).opacity)>.99,'handoff fades before the camera enters the core');
      assert(Number(w.getComputedStyle(d.querySelector('.stage-header')).opacity)<.01,'header obscures the final dive');
      tl.seek(15.9);
      const handoffOpacity=Number(w.getComputedStyle(d.getElementById('startup')).opacity);
      assert(handoffOpacity>0 && handoffOpacity<1,'final dive does not transition into the app');
      tl.seek(16); tl.kill();
    });
    await test('bundled film decodes and advances during the opening', async () => {
      try {
        A.present({surface:'startup'});
        await waitUntil(playingFilm,'opening film did not begin playback');
        const video=playingFilm(), initialTime=video.currentTime;
        assert(video.videoWidth===1920 && video.videoHeight===1200,'film dimensions differ from the mastered frame');
        assert(Math.abs(video.duration-16)<.1,'film duration exceeds the opening contract');
        assert(video.muted && video.playsInline,'film is not configured for silent inline playback');
        await waitUntil(()=>video.currentTime>initialTime+.2,'decoded film does not advance');
        A.dismiss();
        assert(video.paused && !video.hasAttribute('src') && !video.isConnected,'dismiss retains media playback or its source');
        assert(!d.querySelector('video') && d.querySelector('.assembly-field').dataset.renderer==='svg','dismiss leaves a film surface');
      } finally { A.dispose(); }
    });
    await test('replay starts a fresh film from the beginning', async () => {
      try {
        A.present({surface:'startup'});
        await waitUntil(playingFilm,'first film did not play');
        const first=playingFilm();
        await waitUntil(()=>first.currentTime>.8,'first film did not advance');
        A.present({surface:'startup'});
        await waitUntil(playingFilm,'replayed film did not play');
        const replay=playingFilm();
        assert(replay!==first && replay.currentTime<.5,'replay resumed the old film position');
        assert(first.paused && !first.hasAttribute('src') && !first.isConnected,'replay retains the previous media resource');
        assert(d.querySelectorAll('video').length===1,'replay leaves multiple videos');
      } finally { A.dispose(); }
    });
    await test('all surfaces omit the removed portrait', () => {
      assert(!d.querySelector('.sam-portrait'),'portrait element remains');
      assert(!/sam-altman|sam-portrait|sam altman/i.test(d.documentElement.outerHTML),'portrait markup or asset reference remains');
      for(const surface of d.querySelectorAll('[data-surface]')) {
        assert(!/sam-altman/i.test(w.getComputedStyle(surface).backgroundImage),'portrait remains in a companion surface');
      }
    });
    await test('code overlay has two finite acts and resets for static modes', () => {
      const field=d.querySelector('.program-field');
      assert(field,'code overlay is missing');
      const visible=()=>{
        const style=w.getComputedStyle(field);
        return style.visibility==='visible' && Number(style.opacity)>.1;
      };
      try {
        A.present({surface:'startup'});
        const tl=w.gsap.globalTimeline.getChildren(false,false,true).find(t=>'handoff' in t.labels);
        tl.pause().seek(0);
        assert(!visible(),'code overlay appears before its first act');
        tl.seek(2.2); assert(visible(),'first code act never appears');
        tl.seek(6); assert(!visible(),'code overlay persists between acts');
        tl.seek(9.4); assert(visible(),'second code act never appears');
        tl.seek(tl.labels.handoff);
        assert(!visible(),'code overlay remains visible during handoff');
        assert(Math.abs(tl.duration()-16)<.01,'overlay extends the opening deadline');
        for(const options of [{reducedMotion:true},{quiet:true}]) {
          A.present({surface:'startup'});
          const active=w.gsap.globalTimeline.getChildren(false,false,true).find(t=>'handoff' in t.labels);
          active.pause().seek(2.2);
          assert(visible(),'overlay did not reset for replay');
          A.present({surface:'startup',...options});
          assert(!visible(),'static mode retains the animated code overlay');
        }
      } finally { A.dispose(); }
    });
    await test('expanding slit remains anchored inside the assembly', () => {
      A.present({surface:'startup'});
      const tl=A.createStartupTimeline({}); tl.seek(0.95);
      const r=d.querySelector('.core-cut').getBoundingClientRect();
      const svg=d.querySelector('.assembly').getBoundingClientRect();
      tl.kill(); assert(r.top>svg.top && r.bottom<svg.bottom, 'slit escaped assembly bounds');
    });
    await test('compact and reduced variants', () => {
      for (const [options,duration] of [[{},16],[{reducedMotion:true},0.12],[{quiet:true},0]]) {
        const tl=A.createStartupTimeline(options); assert(Math.abs(tl.duration()-duration)<0.01,'wrong motion variant'); tl.kill();
      }
    });
    await test('reduced and quiet startup never create a video', () => {
      const original=d.createElement;
      let videos=0;
      d.createElement=function(name,...args) {
        if(String(name).toLowerCase()==='video') videos++;
        return original.call(this,name,...args);
      };
      try {
        A.present({surface:'startup',reducedMotion:true});
        assert(!d.querySelector('video'),'reduced startup creates a video');
        A.present({surface:'startup',quiet:true});
        assert(!d.querySelector('video') && videos===0,'static startup requests video playback');
      } finally { d.createElement=original; A.dispose(); }
    });
    await test('rejected playback keeps SVG usable and still completes', async () => {
      const prototype=w.HTMLMediaElement.prototype, original=prototype.play, messages=[];
      w.webkit={messageHandlers:{aperture:{postMessage:message=>messages.push(message)}}};
      prototype.play=function() { return Promise.reject(new w.DOMException('Playback unavailable','NotAllowedError')); };
      try {
        A.present({surface:'startup',presentationToken:'fallback'});
        await waitUntil(()=>!d.querySelector('video'),'rejected playback retains its video');
        assert(d.querySelector('.assembly-field').dataset.renderer==='svg','playback failure hides fallback');
        const tl=w.gsap.globalTimeline.getChildren(false,false,true).find(x=>'handoff' in x.labels);
        tl.progress(1);
        assert(messages.filter(m=>m.action==='finished' && m.token==='fallback').length===1,'fallback completion missing or duplicated');
      } finally { prototype.play=original; A.dispose(); delete w.webkit; }
    });
    await test('media error reveals SVG and releases the failed film', async () => {
      try {
        A.present({surface:'startup'});
        await waitUntil(playingFilm,'film did not play before the simulated media error');
        const video=playingFilm();
        video.dispatchEvent(new w.Event('error'));
        assert(d.querySelector('.assembly-field').dataset.renderer==='svg' && !d.querySelector('video'),'media failure strands the film surface');
        assert(video.paused && !video.hasAttribute('src'),'failed film retains playback or its source');
      } finally { A.dispose(); }
    });
    await test('dismiss removes interactive hit targets', () => {
      A.present({surface:'deck'}); A.dismiss();
      assert([...d.querySelectorAll('[data-surface]')].every(x => x.hidden), 'surface remains visible');
    });
    await test('replacement keeps one surface', () => {
      for(let i=0;i<12;i++) A.present({surface:i%2?'deck':'tab'});
      assert([...d.querySelectorAll('[data-surface]')].filter(x=>!x.hidden).length===1, 'overlapping surfaces');
    });
    await test('stale film completion cannot destroy a replacement', async () => {
      const messages=[]; w.webkit={messageHandlers:{aperture:{postMessage:m=>messages.push(m)}}};
      try {
        A.present({surface:'startup',presentationToken:'old'});
        const old=w.gsap.globalTimeline.getChildren(false,false,true).find(t=>'handoff' in t.labels).eventCallback('onComplete');
        A.present({surface:'startup',presentationToken:'new'});
        await waitUntil(playingFilm,'replacement film did not play');
        old();
        assert(playingFilm() && d.querySelectorAll('video').length===1,'stale completion destroyed current film');
        assert(!messages.some(m=>m.action==='finished'),'stale completion notified native');
        A.present({surface:'deck'});
        old();
        assert(!d.querySelector('video') && !d.querySelector('#deck').hidden,'interruption left a film or hid controls');
      } finally { A.dispose(); delete w.webkit; }
    });
    await test('opening waits for native visibility and joins the current film time', async () => {
      const original=Object.getOwnPropertyDescriptor(d,'visibilityState');
      try {
        Object.defineProperty(d,'visibilityState',{configurable:true,value:'hidden'});
        A.present({surface:'startup'});
        assert(!d.querySelector('video'),'hidden startup creates media');
        const tl=w.gsap.globalTimeline.getChildren(false,false,true).find(t=>'handoff' in t.labels);
        tl.pause().seek(2);
        Object.defineProperty(d,'visibilityState',{configurable:true,value:'visible'});
        d.dispatchEvent(new w.Event('visibilitychange'));
        await waitUntil(playingFilm,'native visibility never starts the film');
        assert(playingFilm().currentTime>=1.9,'late visibility restarts the camera at frame zero');
      } finally {
        if(original) Object.defineProperty(d,'visibilityState',original); else delete d.visibilityState;
        A.dispose();
      }
    });
    await test('hidden document releases its playing film', async () => {
      const original=Object.getOwnPropertyDescriptor(d,'visibilityState');
      try {
        A.present({surface:'startup'});
        await waitUntil(playingFilm,'film did not play before the visibility change');
        const video=playingFilm();
        Object.defineProperty(d,'visibilityState',{configurable:true,value:'hidden'});
        d.dispatchEvent(new w.Event('visibilitychange'));
        assert(!d.querySelector('video') && d.querySelector('.assembly-field').dataset.renderer==='svg','hidden document retains its film');
        assert(video.paused && !video.hasAttribute('src'),'hidden document retains media playback or its source');
      } finally {
        if(original) Object.defineProperty(d,'visibilityState',original); else delete d.visibilityState;
        A.dispose();
      }
    });
    await test('quiet and teardown stop animation', () => {
      A.present({surface:'tab',quiet:true});
      assert(w.gsap.globalTimeline.getChildren(true,true,true).filter(x=>x.isActive()).length===0,'quiet still animating');
      A.dispose(); assert(w.gsap.globalTimeline.getChildren(true,true,true).length===0,'orphan animation');
    });
    await test('automatic completion carries native presentation identity', () => {
      const messages=[]; w.webkit={messageHandlers:{aperture:{postMessage:m=>messages.push(m)}}};
      A.present({surface:'startup',presentationToken:'presentation-42'});
      const tl=w.gsap.globalTimeline.getChildren(false,false,true).find(x=> 'handoff' in x.labels);
      tl.progress(1);
      assert(messages.filter(m=>m.action==='finished' && m.token==='presentation-42').length===1,'completion lacks a unique native token');
      assert(!d.querySelector('video'),'completion retains the film');
      A.dispose(); delete w.webkit;
    });
    await test('status is truthful', () => {
      A.present({surface:'startup',reducedMotion:true}); A.setLaunchStatus('opening');
      assert(d.getElementById('launch-status').textContent==='Opening app…','pending label');
      A.setLaunchStatus('opened'); assert(d.getElementById('launch-status').textContent==='App opened','completion label'); A.dispose();
    });
  }
  window.apertureTestResults=results;
  document.getElementById('report').textContent=JSON.stringify(results,null,2);
})();

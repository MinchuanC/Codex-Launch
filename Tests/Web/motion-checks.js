(async () => {
  const frame = document.getElementById('subject');
  await new Promise(resolve => frame.addEventListener('load', resolve, {once:true}));
  const w = frame.contentWindow;
  const results = {passed:0, failed:0, failures:[]};
  const test = async (name, f) => { try { await f(); results.passed++; } catch(e) { results.failed++; results.failures.push(name + ': ' + e.message); }};
  const assert = (x, m) => { if (!x) throw Error(m); };
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
      assert(Math.abs(tl.duration()-1.8)<0.01, 'opening duration');
      assert(tl.labels.resolve < tl.labels.open && tl.labels.open < tl.labels.close && tl.labels.close < tl.labels.handoff, 'label order');
      tl.seek(0.01); const initial=d.querySelector('.vane').getAttribute('style');
      tl.seek(0.9); assert(d.querySelector('.vane').getAttribute('style') !== initial, 'vanes never move');
      const slit=d.querySelector('.core-cut').getBoundingClientRect(), assembly=d.querySelector('.assembly').getBoundingClientRect();
      assert(Math.abs((slit.top+slit.bottom)/2-(assembly.top+assembly.bottom)/2)<3, 'central slit leaves optical center');
      tl.seek(1.8); tl.kill();
    });
    await test('opening renders a solid 3D mechanism', () => {
      A.present({surface:'startup'});
      const field=d.querySelector('.assembly-field'), canvas=field.querySelector('canvas');
      assert(field.dataset.renderer==='webgl','opening did not render in WebGL');
      assert(canvas && canvas.width>0 && canvas.height>0,'missing sized 3D canvas');
      A.dismiss();
      assert(!field.querySelector('canvas') && field.dataset.renderer==='svg','dismiss leaves a GPU scene');
    });
    await test('expanding slit remains anchored inside the assembly', () => {
      A.present({surface:'startup'});
      const tl=A.createStartupTimeline({}); tl.seek(0.95);
      const r=d.querySelector('.core-cut').getBoundingClientRect();
      const svg=d.querySelector('.assembly').getBoundingClientRect();
      tl.kill(); assert(r.top>svg.top && r.bottom<svg.bottom, 'slit escaped assembly bounds');
    });
    await test('compact and reduced variants', () => {
      for (const [options,duration] of [[{compact:true},0.45],[{reducedMotion:true},0.12],[{quiet:true},0]]) {
        const tl=A.createStartupTimeline(options); assert(Math.abs(tl.duration()-duration)<0.01,'wrong motion variant'); tl.kill();
      }
    });
    await test('reduced and quiet startup never request a GPU context', () => {
      const prototype=w.HTMLCanvasElement.prototype, original=prototype.getContext;
      let requests=0;
      prototype.getContext=function(type,...args) {
        if(type.includes('webgl')) requests++;
        return original.call(this,type,...args);
      };
      try {
        A.present({surface:'startup',reducedMotion:true});
        assert(!d.querySelector('canvas'),'reduced startup creates a canvas');
        A.present({surface:'startup',quiet:true});
        assert(!d.querySelector('canvas') && requests===0,'static startup requests GPU');
      } finally { prototype.getContext=original; A.dispose(); }
    });
    await test('GPU failure keeps SVG usable and still completes', () => {
      const prototype=w.HTMLCanvasElement.prototype, original=prototype.getContext, messages=[];
      w.webkit={messageHandlers:{aperture:{postMessage:message=>messages.push(message)}}};
      prototype.getContext=function(type,...args) { return type.includes('webgl') ? null : original.call(this,type,...args); };
      try {
        A.present({surface:'startup',presentationToken:'fallback'});
        assert(d.querySelector('.assembly-field').dataset.renderer==='svg' && !d.querySelector('canvas'),'GPU failure hides fallback');
        const tl=w.gsap.globalTimeline.getChildren(false,false,true).find(x=>'handoff' in x.labels);
        tl.progress(1);
        assert(messages.filter(m=>m.action==='finished' && m.token==='fallback').length===1,'fallback completion missing or duplicated');
      } finally { prototype.getContext=original; A.dispose(); delete w.webkit; }
    });
    await test('lost GPU context reveals the SVG fallback', async () => {
      A.present({surface:'startup'});
      const canvas=d.querySelector('canvas'), gl=canvas.getContext('webgl2');
      gl.getExtension('WEBGL_lose_context').loseContext();
      await new Promise(resolve=>setTimeout(resolve,150));
      assert(d.querySelector('.assembly-field').dataset.renderer==='svg' && !d.querySelector('canvas'),'context loss strands the 3D scene');
      A.dispose();
    });
    await test('dismiss removes interactive hit targets', () => {
      A.present({surface:'deck'}); A.dismiss();
      assert([...d.querySelectorAll('[data-surface]')].every(x => x.hidden), 'surface remains visible');
    });
    await test('replacement keeps one surface', () => {
      for(let i=0;i<12;i++) A.present({surface:i%2?'deck':'tab'});
      assert([...d.querySelectorAll('[data-surface]')].filter(x=>!x.hidden).length===1, 'overlapping surfaces');
    });
    await test('stale 3D completion cannot destroy a replacement', () => {
      const messages=[]; w.webkit={messageHandlers:{aperture:{postMessage:m=>messages.push(m)}}};
      try {
        A.present({surface:'startup',presentationToken:'old'});
        const old=w.gsap.globalTimeline.getChildren(false,false,true).find(t=>'handoff' in t.labels).eventCallback('onComplete');
        A.present({surface:'startup',presentationToken:'new'});
        old();
        assert(d.querySelector('.assembly-field').dataset.renderer==='webgl' && d.querySelectorAll('canvas').length===1,'stale completion destroyed current scene');
        assert(!messages.some(m=>m.action==='finished'),'stale completion notified native');
        A.present({surface:'deck'});
        old();
        assert(!d.querySelector('canvas') && !d.querySelector('#deck').hidden,'interruption left a scene or hid controls');
      } finally { A.dispose(); delete w.webkit; }
    });
    await test('hidden document releases its GPU scene', () => {
      A.present({surface:'startup'});
      const original=Object.getOwnPropertyDescriptor(d,'visibilityState');
      try {
        Object.defineProperty(d,'visibilityState',{configurable:true,value:'hidden'});
        d.dispatchEvent(new w.Event('visibilitychange'));
        assert(!d.querySelector('canvas') && d.querySelector('.assembly-field').dataset.renderer==='svg','hidden document retains a GPU scene');
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
      assert(messages.some(m=>m.action==='finished' && m.token==='presentation-42'),'completion lacks native token');
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

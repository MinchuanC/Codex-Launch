(async () => {
  const frame = document.getElementById('subject');
  await new Promise(resolve => frame.addEventListener('load', resolve, {once:true}));
  const w = frame.contentWindow;
  const results = {passed:0, failed:0, failures:[]};
  const test = (name, f) => { try { f(); results.passed++; } catch(e) { results.failed++; results.failures.push(name + ': ' + e.message); }};
  const assert = (x, m) => { if (!x) throw Error(m); };
  test('renderer exists', () => assert(w.Aperture, 'missing renderer'));
  if (w.Aperture) {
    const A = w.Aperture, d = w.document;
    test('six real vanes', () => assert(d.querySelectorAll('.vane').length === 6, 'geometry missing'));
    test('opening duration and choreography', () => {
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
    test('expanding slit remains anchored inside the assembly', () => {
      const tl=A.createStartupTimeline({}); tl.seek(0.95);
      const r=d.querySelector('.core-cut').getBoundingClientRect();
      const svg=d.querySelector('.assembly').getBoundingClientRect();
      tl.kill(); assert(r.top>svg.top && r.bottom<svg.bottom, 'slit escaped assembly bounds');
    });
    test('compact and reduced variants', () => {
      for (const [options,duration] of [[{compact:true},0.45],[{reducedMotion:true},0.12],[{quiet:true},0]]) {
        const tl=A.createStartupTimeline(options); assert(Math.abs(tl.duration()-duration)<0.01,'wrong motion variant'); tl.kill();
      }
    });
    test('dismiss removes interactive hit targets', () => {
      A.present({surface:'deck'}); A.dismiss();
      assert([...d.querySelectorAll('[data-surface]')].every(x => x.hidden), 'surface remains visible');
    });
    test('replacement keeps one surface', () => {
      for(let i=0;i<12;i++) A.present({surface:i%2?'deck':'tab'});
      assert([...d.querySelectorAll('[data-surface]')].filter(x=>!x.hidden).length===1, 'overlapping surfaces');
    });
    test('quiet and teardown stop animation', () => {
      A.present({surface:'tab',quiet:true});
      assert(w.gsap.globalTimeline.getChildren(true,true,true).filter(x=>x.isActive()).length===0,'quiet still animating');
      A.dispose(); assert(w.gsap.globalTimeline.getChildren(true,true,true).length===0,'orphan animation');
    });
    test('automatic completion carries native presentation identity', () => {
      const messages=[]; w.webkit={messageHandlers:{aperture:{postMessage:m=>messages.push(m)}}};
      A.present({surface:'startup',presentationToken:'presentation-42'});
      const tl=w.gsap.globalTimeline.getChildren(false,false,true).find(x=> 'handoff' in x.labels);
      tl.progress(1);
      assert(messages.some(m=>m.action==='finished' && m.token==='presentation-42'),'completion lacks native token');
      A.dispose(); delete w.webkit;
    });
    test('status is truthful', () => {
      A.present({surface:'startup',reducedMotion:true}); A.setLaunchStatus('opening');
      assert(d.getElementById('launch-status').textContent==='Opening app…','pending label');
      A.setLaunchStatus('opened'); assert(d.getElementById('launch-status').textContent==='App opened','completion label'); A.dispose();
    });
  }
  window.apertureTestResults=results;
  document.getElementById('report').textContent=JSON.stringify(results,null,2);
})();

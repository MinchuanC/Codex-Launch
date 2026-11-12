(() => {
  'use strict';
  window.ApertureScene={create(host, startAt=0, playback={}) {
    const video=document.createElement('video');
    let disposed=false, frame=null;
    host.dataset.renderer='svg';
    video.muted=true;
    video.defaultMuted=true;
    video.playsInline=true;
    video.preload='auto';
    video.tabIndex=-1;
    video.setAttribute('aria-hidden','true');

    function dispose() {
      if(disposed) return;
      disposed=true;
      if(frame!==null) video.cancelVideoFrameCallback(frame);
      video.removeEventListener('ended',ended);
      video.removeEventListener('playing',playing);
      video.removeEventListener('loadedmetadata',loaded);
      video.removeEventListener('error',failed);
      video.pause();
      video.removeAttribute('src');
      video.load();
      video.remove();
      host.dataset.renderer='svg';
    }
    function loaded() { video.currentTime=startAt; }
    function playing() {
      if(disposed) return;
      host.dataset.renderer='film';
      playback.frame?.(video.currentTime);
      if(frame===null) frame=video.requestVideoFrameCallback(tick);
    }
    function tick(now, metadata) {
      frame=null;
      if(disposed) return;
      playback.frame?.(metadata.mediaTime);
      if(!disposed) frame=video.requestVideoFrameCallback(tick);
    }
    function ended() { if(!disposed) playback.frame?.(video.duration); }
    function fallback(error) {
      if(disposed) return;
      dispose();
      playback.failed?.();
      console.warn('Aperture: using SVG artwork',error);
    }
    function failed() { fallback(video.error); }
    video.addEventListener('ended',ended);
    video.addEventListener('playing',playing);
    video.addEventListener('loadedmetadata',loaded,{once:true});
    video.addEventListener('error',failed);
    host.appendChild(video);
    video.src='aperture-film.mp4';
    try { video.play().catch(fallback); } catch(error) { fallback(error); }
    // Drive the overlay from decoded media time so slow startup cannot cut off the ending.
    return {dispose};
  }};
})();

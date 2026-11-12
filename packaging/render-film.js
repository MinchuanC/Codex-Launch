(() => {
  const T=ApertureThree.THREE, S=BlackHoleShaders;
  const renderer=new T.WebGLRenderer({antialias:false,preserveDrawingBuffer:true});
  renderer.setPixelRatio(1);renderer.setSize(innerWidth,innerHeight);
  document.body.appendChild(renderer.domElement);
  const target=new T.WebGLRenderTarget(innerWidth,innerHeight,{type:T.HalfFloatType,minFilter:T.LinearFilter,magFilter:T.LinearFilter});
  const scene=new T.Scene(),postScene=new T.Scene(),camera=new T.OrthographicCamera(-1,1,1,-1,0,1);
  const virtual=new T.PerspectiveCamera(),geometry=new T.PlaneGeometry(2,2);
  const uniforms={u_time:{value:0},u_resolution:{value:new T.Vector2(innerWidth,innerHeight)},u_cameraPos:{value:new T.Vector3()},u_cameraDir:{value:new T.Vector3()},u_cameraUp:{value:new T.Vector3()},u_cameraRight:{value:new T.Vector3()},u_spin:{value:.35},u_tilt:{value:.12},u_diskPuffiness:{value:.35},u_turbulence:{value:1.5},u_stepScale:{value:1.1},u_starSize:{value:.6}};
  const material=new T.ShaderMaterial({vertexShader:S.vertexShader,fragmentShader:S.fragmentShader,uniforms,depthTest:false,depthWrite:false});
  scene.add(new T.Mesh(geometry,material));
  const post=new T.ShaderMaterial({vertexShader:S.vertexShader,fragmentShader:S.postFragmentShader,uniforms:{tDiffuse:{value:target.texture},u_resolution:{value:new T.Vector2(innerWidth,innerHeight)},u_bloomThreshold:{value:.9},u_bloomStrength:{value:.12},u_flareStrength:{value:.18},u_aberration:{value:.08},u_master:{value:.7}},depthTest:false,depthWrite:false});
  postScene.add(new T.Mesh(geometry,post));
  const path=new T.CatmullRomCurve3([new T.Vector3(6,3.2,22),new T.Vector3(3,2.4,18),new T.Vector3(-1,1.6,15),new T.Vector3(-4,1.5,18),new T.Vector3(-5,2.3,23)]);
  window.renderAt=time=>{
    const t=Math.max(0,Math.min(1,time/6.4));
    virtual.position.copy(path.getPoint(t));
    const reveal=Math.max(0,Math.min(1,(t-.48)/.38));
    virtual.lookAt(-2.8*reveal*reveal*(3-2*reveal),0,0);virtual.updateMatrixWorld();
    const e=virtual.matrixWorld.elements;
    uniforms.u_cameraPos.value.copy(virtual.position);
    uniforms.u_cameraRight.value.set(e[0],e[1],e[2]);uniforms.u_cameraUp.value.set(e[4],e[5],e[6]);uniforms.u_cameraDir.value.set(-e[8],-e[9],-e[10]);
    uniforms.u_time.value=11+time*.5;
    renderer.setRenderTarget(target);renderer.render(scene,camera);renderer.setRenderTarget(null);renderer.render(postScene,camera);
    renderer.getContext().finish();
    return {time,width:renderer.domElement.width,height:renderer.domElement.height};
  };
  renderAt(0);
})();

(() => {
  'use strict';
  const {THREE:T,GLTFLoader,RectAreaLightUniformsLib,RoundedBoxGeometry,EffectComposer,RenderPass,BokehPass,UnrealBloomPass,OutputPass}=ApertureThree;
  const width=1920,height=1200,duration=16;
  const clamp=T.MathUtils.clamp;
  const ramp=(t,start,end)=>{const x=clamp((t-start)/(end-start),0,1);return x*x*(3-2*x);};
  const renderer=new T.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(1);renderer.setSize(width,height);
  renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.info.autoReset=false;
  document.body.appendChild(renderer.domElement);
  const scene=new T.Scene();scene.background=new T.Color(0x030508);scene.fog=new T.FogExp2(0x030508,.012);
  const camera=new T.PerspectiveCamera(42,width/height,.08,150);
  const composer=new EffectComposer(renderer,new T.WebGLRenderTarget(width,height,{type:T.HalfFloatType,samples:4}));
  composer.addPass(new RenderPass(scene,camera));
  const focusPass=new BokehPass(scene,camera,{focus:4,aperture:.00014,maxblur:.004});composer.addPass(focusPass);
  const bloom=new UnrealBloomPass(new T.Vector2(width,height),.18,.45,1.4);composer.addPass(bloom);composer.addPass(new OutputPass());
  const machine=new T.Group();scene.add(machine);
  const objects={jaws:[],doors:[],spokes:[],buses:[],arms:[],radiators:[],practicals:[]};
  let seed=419;
  const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const noise=new Uint8Array(1024*256*4);
  for(let y=0;y<256;y++) for(let x=0;x<1024;x++) {const n=190+random()*35+(y%4)*5,i=(y*1024+x)*4;noise[i]=noise[i+1]=noise[i+2]=n;noise[i+3]=255;}
  const grain=new T.DataTexture(noise,1024,256);grain.wrapS=grain.wrapT=T.RepeatWrapping;grain.repeat.set(2,3);grain.magFilter=T.LinearFilter;grain.minFilter=T.LinearMipmapLinearFilter;grain.generateMipmaps=true;grain.needsUpdate=true;
  const mat={
    body:new T.MeshStandardMaterial({color:0x47515d,metalness:.72,roughness:.48,roughnessMap:grain,bumpMap:grain,bumpScale:.0015}),
    edge:new T.MeshStandardMaterial({color:0x52606b,metalness:.95,roughness:.38}),
    black:new T.MeshStandardMaterial({color:0x090c10,metalness:.65,roughness:.52}),
    rubber:new T.MeshStandardMaterial({color:0x07080a,metalness:0,roughness:.72}),
    brass:new T.MeshStandardMaterial({color:0x564737,metalness:.85,roughness:.44}),
    light:new T.MeshBasicMaterial({color:new T.Color(.008,.012,.016)})
  };
  const geometries=new Map();
  function box(w,h,d,material,parent=machine,x=0,y=0,z=0,bevel=.035) {
    const key=[w,h,d,bevel].join();
    if(!geometries.has(key)) geometries.set(key,new RoundedBoxGeometry(w,h,d,2,Math.min(bevel,w/4,h/4,d/4)));
    const mesh=new T.Mesh(geometries.get(key),material);mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function cylinder(radius,length,material,parent=machine,x=0,y=0,z=0,segments=40) {
    const mesh=new T.Mesh(new T.CylinderGeometry(radius,radius,length,segments),material);mesh.rotation.x=Math.PI/2;mesh.position.set(x,y,z);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function ring(radius,tube,z,material,parent=machine) {
    const mesh=new T.Mesh(new T.TorusGeometry(radius,tube,12,160),material);mesh.position.z=z;mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function turned(points,material,parent=machine) {
    const g=new T.LatheGeometry(points.map(([r,z])=>new T.Vector2(r,z)),160);g.rotateX(Math.PI/2);
    const mesh=new T.Mesh(g,material);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function beam(a,b,radius,material,parent=machine) {
    const start=new T.Vector3(...a),end=new T.Vector3(...b),delta=end.clone().sub(start);
    const mesh=new T.Mesh(new T.CylinderGeometry(radius,radius,delta.length(),12),material);mesh.position.copy(start.add(end).multiplyScalar(.5));mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function cable(points,radius=.04,material=mat.rubber,parent=machine) {
    const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
    const mesh=new T.Mesh(new T.TubeGeometry(curve,40,radius,8,false),material);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  function sector(inner,outer,angle,depth,material,parent) {
    const s=new T.Shape();s.absarc(0,0,outer,-angle/2,angle/2,false);s.lineTo(inner*Math.cos(angle/2),inner*Math.sin(angle/2));s.absarc(0,0,inner,angle/2,-angle/2,true);s.closePath();
    const g=new T.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSegments:2,bevelSize:.025,bevelThickness:.018,curveSegments:32,steps:1});
    const mesh=new T.Mesh(g,material);mesh.castShadow=mesh.receiveShadow=true;parent.add(mesh);return mesh;
  }
  // Deep load-bearing chassis; the visible face is only the front of the machine.
  turned([[1.46,-2.7],[2.52,-2.7],[2.67,-2.5],[2.67,.05],[2.5,.22],[1.47,.22],[1.46,-2.7]],mat.black);
  for(const z of [-2.45,-1.9,-1.3,-.7,.08]) {ring(2.66,.055,z,mat.edge);ring(2.73,.025,z+.11,mat.black);}
  turned([[1.45,.28],[2.8,.28],[2.88,.36],[2.88,.65],[2.78,.76],[1.53,.76],[1.45,.65],[1.45,.28]],mat.body);
  turned([[1.43,.53],[1.53,.53],[1.64,.78],[1.64,.83],[1.54,.83],[1.43,.63],[1.43,.53]],mat.edge);
  ring(2.81,.018,.74,mat.edge);ring(1.47,.018,.7,mat.brass);
  for(let i=0;i<96;i++) {const a=i*Math.PI/48;box(.055,.085,.035,i%8===0?mat.brass:mat.edge,machine,2.71*Math.cos(a),2.71*Math.sin(a),.785,.01).rotation.z=a;}
  for(let i=0;i<24;i++) {const a=(i+.5)*Math.PI/12;const g=new T.Group();g.rotation.z=a;machine.add(g);cylinder(.085,.055,mat.black,g,2.5,0,.8,6);cylinder(.028,.06,mat.edge,g,2.5,0,.83,6);}
  const spinRing=new T.Group();machine.add(spinRing);
  for(let i=0;i<32;i++) {const g=new T.Group();g.rotation.z=i*Math.PI/16;spinRing.add(g);box(.18,.34,.2,mat.body,g,3.03,0,-1.4);box(.025,.26,.21,mat.edge,g,2.95,0,-1.4);}
  ring(3.07,.055,-1.45,mat.black,spinRing);
  // Twelve articulated containment shoes, each with piston, fins, fasteners and loom.
  for(let i=0;i<12;i++) {
    const mount=new T.Group();mount.rotation.z=(i+.5)*Math.PI/6;machine.add(mount);
    const jaw=new T.Group();jaw.position.x=2.25;mount.add(jaw);
    const shell=sector(1.7,2.42,Math.PI/6-.045,.22,mat.body,jaw);shell.geometry.translate(-2.25,0,0);shell.position.z=.9;
    box(.5,.3,.42,mat.black,jaw,-.08,0,.7);box(.42,.025,.24,mat.brass,jaw,-.1,.19,.88);
    for(let k=0;k<2;k++) box(.38,.11,.055,mat.black,jaw,-.06,-.09+k*.18,1.145,.014);
    cylinder(.065,.16,mat.edge,jaw,-.34,.16,1.1,12);cylinder(.065,.16,mat.edge,jaw,-.34,-.16,1.1,12);
    const piston=cylinder(.09,.7,mat.edge,mount,2.55,0,.15);piston.rotation.x=Math.PI/2;
    cylinder(.15,.48,mat.body,mount,2.55,0,-.27);
    cable([[2.3,.18,.45],[2.8,.32,.6],[3.02,.22,-.2],[2.72,.18,-.8]],.035,mat.rubber,mount);
    objects.jaws.push(jaw);
  }
  // Six blast leaves disappear into the armored stator when the chamber unlocks.
  for(let i=0;i<6;i++) {
    const mount=new T.Group();mount.rotation.z=i*Math.PI/3;machine.add(mount);
    const door=new T.Group();mount.add(door);const plate=sector(.015,1.48,Math.PI/3-.012,.1,mat.black,door);plate.position.z=.43;
    const rib=box(.75,.045,.06,mat.body,door,.87,0,.57,.015);rib.rotation.z=.05;
    objects.doors.push(door);
  }
  // Radial power trains are attached to the central vessel through triangulated steel.
  const busColors=[];
  for(let i=0;i<8;i++) {
    const a=i*Math.PI/4,spoke=new T.Group();spoke.rotation.z=a;machine.add(spoke);objects.spokes.push(spoke);
    box(2.8,1.05,1.35,mat.body,spoke,4.0,0,-.9);box(2.6,.52,.14,mat.black,spoke,4.0,0,-.16);
    box(.75,1.35,1.6,mat.black,spoke,4.9,0,-.9);box(.16,1.27,1.58,mat.body,spoke,4.6,0,-.9);
    for(const y of [-.43,.43]) {
      beam([2.7,y,-2.25],[5.7,y,-.7],.065,mat.edge,spoke);
      beam([2.7,y,-.3],[5.7,y,-.7],.065,mat.body,spoke);
      beam([3.1,y,-2.0],[4.0,y,-.5],.04,mat.brass,spoke);
    }
    for(let k=0;k<7;k++) {box(.12,.91,.08,mat.body,spoke,3.0+k*.36,0,-.025,.015);box(.18,.1,.12,mat.black,spoke,3.0+k*.36,.37,-.1,.015);}
    for(let c=0;c<3;c++) cable([[2.6,.48+c*.065,-1.5],[3.5,.8+c*.08,-1.4],[4.7,.7+c*.06,-.7],[5.7,.35+c*.06,-.6]],.035,mat.rubber,spoke);
    const bus=new T.InstancedMesh(new T.BoxGeometry(.18,.035,.035),new T.MeshBasicMaterial({color:0xffffff}),14);
    const dummy=new T.Object3D();
    for(let k=0;k<14;k++) {dummy.position.set(2.88+k*.17,0,.07);dummy.updateMatrix();bus.setMatrixAt(k,dummy.matrix);bus.setColorAt(k,new T.Color(.003,.007,.01));}
    spoke.add(bus);objects.buses.push(bus);busColors.push(new T.Color());
    const end=new T.Group();end.position.set(5.65,0,-.6);spoke.add(end);cylinder(.36,.85,mat.black,end);ring(.34,.025,.43,mat.edge,end);
  }
  // Engineered bay, with perspective rails and practical lights instead of a star field.
  const bay=new T.Group();scene.add(bay);
  turned([[2.65,-5.4],[5.2,-5.4],[5.65,-4.9],[5.65,-2.8],[5.3,-2.35],[3.4,-2.35],[3.1,-1.9],[2.65,-1.9],[2.65,-5.4]],mat.black);
  for(const z of [-5.05,-4.1,-3.15]) {
    turned([[5.52,z-.16],[5.83,z-.16],[5.96,z-.04],[5.96,z+.14],[5.8,z+.27],[5.52,z+.27],[5.52,z-.16]],mat.body);
    ring(5.86,.028,z+.24,mat.edge);
  }
  for(let i=0;i<16;i++) {
    const rib=new T.Group();rib.rotation.z=(i+.5)*Math.PI/8;machine.add(rib);
    box(.6,.42,3.9,mat.body,rib,5.62,0,-3.65,.06);
    box(.8,.64,.32,mat.black,rib,5.62,0,-1.7,.045);
    for(const z of [-2,-3.65,-5.25]) {box(.74,.68,.25,mat.black,rib,5.62,0,z);cylinder(.065,.07,mat.edge,rib,5.62,.2,z+.17,6);}
    cable([[5.0,.22,-1.2],[5.4,.28,-2],[5.3,.3,-4.5],[4.8,.2,-5.2]],.075,mat.rubber,rib);
  }
  for(const x of [-8.5,8.5]) box(1.2,19,2.0,mat.body,bay,x,0,-5.8,.06);
  const backdropMaterial=new T.MeshBasicMaterial({color:0xffffff,toneMapped:false,fog:false});
  const backdropDirection=new T.Vector3();
  const backdrop=new T.Mesh(new T.PlaneGeometry(66,41.25),backdropMaterial);backdrop.position.set(0,0,-30);scene.add(backdrop);
  const loadBackdrop=new T.TextureLoader().loadAsync('assets/chamber-backdrop.png').then(texture=>{texture.colorSpace=T.SRGBColorSpace;backdropMaterial.map=texture;backdropMaterial.needsUpdate=true;});
  for(const x of [-7.4,7.4]) {
    box(.55,13,.8,mat.black,bay,x,.1,-3.3);box(.12,12,.12,mat.edge,bay,x+.35,.1,-2.9);
    for(let y=-5;y<=5;y+=2) {box(1.4,.24,1.3,mat.body,bay,x,y,-3.2);beam([x-.7,y-.8,-3],[x+.7,y+.8,-3],.055,mat.edge,bay);}
    for(const z of [-5,-11,-18]) {box(.4,15,.5,mat.black,bay,x*1.2,0,z);const practical=mat.light.clone();objects.practicals.push(practical);box(.06,6,.06,practical,bay,x*1.2-.25,1,z+.3);}
    beam([x,-6,-3],[x,-6,18],.12,mat.edge,bay);beam([x,6,-3],[x,6,18],.12,mat.edge,bay);
  }
  for(const y of [-6.1,6.1]) {box(15.3,.45,.85,mat.black,bay,0,y,-3.3);for(let x=-6;x<=6;x+=1.5) beam([x,y-.2,-3],[x+.8,y+.2,-2.6],.065,mat.edge,bay);}
  // The power trains feed a physical induction assembly in the same lit 3D space.
  const cavity=new T.Mesh(new T.CircleGeometry(1.46,128),new T.MeshBasicMaterial({color:0x010204,transparent:true}));cavity.position.z=-1.9;machine.add(cavity);
  const coreAssembly=new T.Group();coreAssembly.position.z=.95;machine.add(coreAssembly);
  const fieldMaterial=new T.MeshStandardMaterial({color:0x6b8595,metalness:.85,roughness:.26,emissive:0x8cc7ec,emissiveIntensity:0});
  const gyros=[];
  for(let i=0;i<3;i++) {
    const gyro=new T.Group();coreAssembly.add(gyro);gyros.push(gyro);
    ring(.72+i*.19,.045,0,mat.edge,gyro);
    for(let k=0;k<12;k++) {
      const shoe=new T.Group();shoe.rotation.z=k*Math.PI/6;gyro.add(shoe);
      box(.13,.19,.10,mat.body,shoe,.72+i*.19,0,0,.018);
      box(.018,.11,.11,fieldMaterial,shoe,.72+i*.19,0,0,.005);
    }
  }
  const heart=new T.Mesh(new T.IcosahedronGeometry(.37,3),new T.MeshStandardMaterial({color:0x172b38,metalness:.9,roughness:.24,emissive:0x90d8ff,emissiveIntensity:0}));coreAssembly.add(heart);
  const filament=new T.Mesh(new T.TorusKnotGeometry(.38,.018,240,8,3,5),fieldMaterial);coreAssembly.add(filament);
  const feedMaterial=new T.MeshBasicMaterial({color:0x92d7ff,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false});
  for(let i=0;i<8;i++) {
    const a=i*Math.PI/4, mount=new T.Group();mount.rotation.z=a;machine.add(mount);
    beam([1.43,0,.65],[.47,0,.95],.013,feedMaterial,mount);
    cylinder(.075,.16,mat.brass,mount,1.4,0,.7,12);
  }
  const rotors=[];
  for(let i=0;i<2;i++) {
    const rotor=new T.Group();rotor.position.z=i===0?-.35:-2;machine.add(rotor);rotors.push(rotor);
    const radius=3.45+i*1.35;
    ring(radius,.065,0,mat.edge,rotor);
    for(let k=0;k<24;k++) {
      const blade=new T.Group();blade.rotation.z=k*Math.PI/12;rotor.add(blade);
      box(.32,.5,.18,mat.body,blade,radius,0,0,.035);
      box(.025,.32,.19,fieldMaterial,blade,radius-.1,0,0,.008);
    }
  }
  const particleCount=480,particlePositions=new Float32Array(particleCount*3);
  const particleGeometry=new T.BufferGeometry();particleGeometry.setAttribute('position',new T.BufferAttribute(particlePositions,3));
  const particles=new T.Points(particleGeometry,new T.PointsMaterial({color:0xa4deff,size:.022,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false}));machine.add(particles);
  // An actual open bore carries the final camera dive beyond the induction assembly.
  const tunnel=new T.Mesh(new T.CylinderGeometry(1.42,1.42,22,64,1,true),mat.black);tunnel.material=mat.black.clone();tunnel.material.side=T.DoubleSide;tunnel.rotation.x=Math.PI/2;tunnel.position.z=-10;machine.add(tunnel);
  const tunnelRings=[];
  for(let i=0;i<24;i++) {
    const rotor=new T.Group();rotor.position.z=-2.1-i*.8;machine.add(rotor);tunnelRings.push(rotor);
    ring(1.31,.045,0,mat.edge,rotor);ring(1.25,.012,-.08,fieldMaterial,rotor);
    for(let k=0;k<8;k++) {const fin=new T.Group();fin.rotation.z=k*Math.PI/4;rotor.add(fin);box(.14,.22,.28,mat.body,fin,1.3,0,0,.018);}
  }
  const streakMaterial=new T.MeshBasicMaterial({color:0xa4deff,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false});
  const streaks=new T.InstancedMesh(new T.BoxGeometry(.007,.007,.3),streakMaterial,120),streakDummy=new T.Object3D();streaks.frustumCulled=false;machine.add(streaks);
  const ignition=new T.PointLight(0x92c4e5,0,11,2);ignition.position.set(0,0,2);machine.add(ignition);
  const coreSeamMaterial=new T.MeshStandardMaterial({color:0x425867,metalness:.6,roughness:.3,emissive:0x8cc7ec,emissiveIntensity:0});
  ring(1.455,.016,.79,coreSeamMaterial);
  RectAreaLightUniformsLib.init();
  const key=new T.RectAreaLight(0xd8e6ff,.6,4,9);key.position.set(-5,7,10);key.lookAt(0,0,0);scene.add(key);
  const warm=new T.RectAreaLight(0xffd8ac,.15,3,7);warm.position.set(7,-1,5);warm.lookAt(0,0,0);scene.add(warm);
  const shadowKey=new T.DirectionalLight(0xe8efff,.15);shadowKey.position.set(-6,8,12);shadowKey.castShadow=true;
  shadowKey.shadow.mapSize.set(2048,2048);Object.assign(shadowKey.shadow.camera,{left:-10,right:10,top:10,bottom:-10,near:1,far:40});shadowKey.shadow.bias=-.0001;shadowKey.shadow.normalBias=.025;scene.add(shadowKey);
  const rear=new T.DirectionalLight(0x7898c0,.1);rear.position.set(2,5,-8);scene.add(rear);scene.add(new T.HemisphereLight(0x4d6178,0x17100b,.45));
  const studio=new T.Scene();studio.background=new T.Color(.025,.03,.04);
  for(const [x,y,z,w,h,p] of [[-5,5,6,4,9,5],[6,0,4,2,8,3],[0,8,-4,9,2,5]]) {const card=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:new T.Color(p,p,p),side:T.DoubleSide}));card.position.set(x,y,z);card.lookAt(0,0,0);studio.add(card);}
  const pmrem=new T.PMREMGenerator(renderer),environment=pmrem.fromScene(studio,.04);scene.environment=environment.texture;scene.environmentIntensity=.65;
  studio.traverse(o=>{o.geometry?.dispose();o.material?.dispose();});pmrem.dispose();
  const cameraPath=new T.CatmullRomCurve3([[-4.7,1.6,3.1],[-5,-.5,7],[-.8,-2,12],[5,2.8,16],[0,0,16]].map(v=>new T.Vector3(...v)));
  const targetPath=new T.CatmullRomCurve3([[-2.7,.7,0],[-1.5,0,0],[0,0,-.5],[0,0,-.5],[0,0,-.5]].map(v=>new T.Vector3(...v)));
  const diveEnd=new T.Vector3(0,0,-9),diveTarget=new T.Vector3(0,0,-24);
  function captureJoint(node,kind) {objects[kind].push({node,quaternion:node.quaternion.clone()});}
  const loadHardware=new GLTFLoader().loadAsync('assets/gateway.glb').then(gltf=>{
    const materials=new Set();gltf.scene.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;for(const material of [].concat(o.material)) materials.add(material);}});
    for(const m of materials) {m.color?.multiplyScalar(.12);m.metalness=.25;m.roughness=Math.max(m.roughness,.72);}
    function module(name,size,position,rotation) {
      const source=gltf.scene.getObjectByName(T.PropertyBinding.sanitizeNodeName(name));if(!source) throw new Error('Missing Gateway module: '+name);
      const object=source.clone(true),wrap=new T.Group();wrap.add(object);object.updateMatrixWorld(true);
      const bounds=new T.Box3().setFromObject(object),center=bounds.getCenter(new T.Vector3()),dimensions=bounds.getSize(new T.Vector3());
      object.position.sub(center);wrap.scale.setScalar(size/Math.max(dimensions.x,dimensions.y,dimensions.z));wrap.position.set(...position);wrap.rotation.set(...rotation);machine.add(wrap);
      object.traverse(node=>{if(/Big_Arm_[246]|Little_Arm_[246]/.test(node.name)) captureJoint(node,'arms');if(/radiator/i.test(node.name)) captureJoint(node,'radiators');});return wrap;
    }
    module('Big Arm_1',5.2,[-5.1,-1.4,-.9],[0,.2,.4]);
    module('Little_Arm_1',3.3,[4.8,2.5,-.8],[.2,-.2,2.6]);
    return {nodes:objects.arms.length,radiators:objects.radiators.length};
  });
  const axis=new T.Vector3(0,0,1),jointRotation=new T.Quaternion();
  window.renderAt=async time=>{
    await window.machineReady;
    const t=clamp(time,0,duration);
    const workLights=ramp(t,1.3,7.8);key.intensity=1.8+workLights*2.2;warm.intensity=.3+workLights*.8;shadowKey.intensity=.55+workLights*.75;rear.intensity=.5+workLights*.9;
    objects.practicals.forEach((material,i)=>{const p=ramp(t,2+i*.6,3.2+i*.6);material.color.setRGB(.008+p*.85,.012+p*1.1,.016+p*1.4);});
    const u=ramp(t,0,13.8),dive=Math.pow(clamp((t-12.8)/3.15,0,1),3),release=ramp(t,12.8,14.3);
    const target=targetPath.getPoint(u).lerp(diveTarget,release);
    camera.position.copy(cameraPath.getPoint(u)).lerp(diveEnd,dive);camera.lookAt(target);
    camera.rotateZ(.12*Math.sin(t*.38)*(1-release)+dive*.65);camera.fov=42+dive*30;camera.updateProjectionMatrix();
    backdrop.position.copy(camera.position).addScaledVector(camera.getWorldDirection(backdropDirection),50);backdrop.quaternion.copy(camera.quaternion);
    focusPass.enabled=t<3.5;focusPass.uniforms.focus.value=camera.position.distanceTo(target);focusPass.uniforms.aperture.value=.00012*(1-ramp(t,1.5,3.5));
    objects.jaws.forEach((jaw,i)=>{const p=ramp(t,1.6+i*.055,4+i*.055),lock=ramp(t,8.3,9.2);jaw.position.x=2.25+p*.8-lock*.25;jaw.position.z=p*.28-lock*.18;jaw.rotation.y=-p*.48+lock*.25;});
    objects.doors.forEach((door,i)=>{const p=ramp(t,4.5+i*.09,6.3+i*.09);door.position.x=p*1.7;door.position.z=-p*.36;door.rotation.z=-p*.35;});
    objects.spokes.forEach((spoke,i)=>{const p=ramp(t,4.3+i*.07,6.1+i*.07);spoke.position.z=.65*(1-p);spoke.position.x=Math.cos(i*Math.PI/4)*.65*(1-p);spoke.position.y=Math.sin(i*Math.PI/4)*.65*(1-p);});
    spinRing.rotation.z=.18*t+.12*Math.max(0,t-4)**2;
    rotors.forEach((rotor,i)=>{rotor.rotation.z=(i?1:-1)*(.14*t+.085*Math.max(0,t-5)**2);});
    objects.arms.forEach(({node,quaternion},i)=>{jointRotation.setFromAxisAngle(axis,(i%2?1:-1)*(.6*ramp(t,1+i*.1,4.5+i*.1)-.35*ramp(t,7,10)+.16*Math.sin(t*1.35+i)*ramp(t,2,4)));node.quaternion.copy(quaternion).multiply(jointRotation);});
    objects.radiators.forEach(({node,quaternion},i)=>{jointRotation.setFromAxisAngle(axis,.65*ramp(t,3.8+i*.1,6.2+i*.1));node.quaternion.copy(quaternion).multiply(jointRotation);});
    objects.buses.forEach((bus,i)=>{for(let k=0;k<14;k++){const p=ramp(t,5.7+i*.1+(13-k)*.06,6.1+i*.1+(13-k)*.06);const pulse=.16+.84*Math.pow(.5+.5*Math.sin(t*9+k*.65-i*.4),6);busColors[i].setRGB(.005+p*.7*pulse,.012+p*1.8*pulse,.018+p*2.4*pulse);bus.setColorAt(k,busColors[i]);}bus.instanceColor.needsUpdate=true;});
    const power=ramp(t,6.7,10),surge=1+.16*Math.sin(t*8)+.08*Math.sin(t*19);
    coreAssembly.position.z=-1.25+2.2*ramp(t,6.8,8.8);
    gyros.forEach((gyro,i)=>{const speed=Math.max(0,t-6)*1.6;gyro.rotation.set((.35+i*.65+speed*(.28+i*.09))*(1-release),speed*(i%2?-.55:.45)*(1-release),i+speed*.8);});
    heart.scale.setScalar(1-release*.995);filament.scale.copy(heart.scale);
    heart.rotation.set(t*.3,t*.6,t*.13);heart.material.emissiveIntensity=power*(.45+.18*surge);
    filament.rotation.set(t*.7,-t*.4,t*.3);fieldMaterial.emissiveIntensity=power*(1.4+.5*surge);feedMaterial.opacity=power*(.35+.18*surge);
    for(let i=0;i<particleCount;i++) {
      const lane=i%8,a=lane*Math.PI/4,travel=((i/particleCount+t*(.2+lane*.012))%1),radius=5.1-travel*4.8;
      const scatter=.025+travel*.1,twist=t*4+i*2.4;
      particlePositions[i*3]=Math.cos(a)*radius+Math.sin(twist)*scatter;
      particlePositions[i*3+1]=Math.sin(a)*radius+Math.cos(twist)*scatter;
      particlePositions[i*3+2]=.14+travel*.85;
    }
    cavity.material.opacity=1-ramp(t,12.8,13.5);cavity.visible=cavity.material.opacity>0;
    tunnelRings.forEach((rotor,i)=>{rotor.visible=t>12.8;rotor.rotation.z=(i%2?1:-1)*(.08*t+.025*Math.max(0,t-10)**2);});
    for(let i=0;i<streaks.count;i++) {
      const a=i*2.399963,r=.55+(i%7)*.085,z=2-((i*.173+t*(1.2+release*8))%20);
      streakDummy.position.set(Math.cos(a)*r,Math.sin(a)*r,z);streakDummy.scale.set(1,1,.25+release*2.5);streakDummy.updateMatrix();streaks.setMatrixAt(i,streakDummy.matrix);
    }
    streaks.instanceMatrix.needsUpdate=true;streakMaterial.opacity=release*.55;
    particleGeometry.attributes.position.needsUpdate=true;particles.material.opacity=power*.8;
    coreSeamMaterial.emissiveIntensity=power*1.5;ignition.intensity=power*4*surge;bloom.strength=.18+power*.12;
    renderer.shadowMap.needsUpdate=true;renderer.info.reset();composer.render();renderer.getContext().finish();
    return {camera:camera.position.toArray(),fov:camera.fov,dive,coreScale:heart.scale.x,time:t,width,height,phase:t<3.5?'inspection':t<7.5?'deployment':t<11?'power':'ignition',triangles:renderer.info.render.triangles,drawCalls:renderer.info.render.calls};
  };
  window.machineReady=Promise.all([loadHardware,loadBackdrop]).then(([hardware])=>({width,height,duration,hardware}));
})();

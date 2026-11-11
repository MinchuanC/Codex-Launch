(() => {
  'use strict';
  const {THREE:T,RoomEnvironment,RectAreaLightUniformsLib}=ApertureThree;
  const radians=degrees=>degrees*Math.PI/180;
  window.ApertureScene={create(host) {
    let renderer, environment, studio, pmrem, width=0,height=0,disposed=false;
    const scene=new T.Scene(), rig=new T.Group(), blades=[];
    const camera=new T.PerspectiveCamera(32,1,.1,40);
    scene.add(rig);
    host.dataset.renderer='svg';

    function dispose() {
      if(disposed) return;
      disposed=true;
      host.dataset.renderer='svg';
      renderer?.domElement.removeEventListener('webglcontextlost',contextLost);
      const resources=new Set();
      scene.traverse(object=>{
        if(object.geometry) resources.add(object.geometry);
        if(object.material) for(const material of [].concat(object.material)) resources.add(material);
      });
      for(const resource of resources) resource.dispose();
      environment?.dispose();
      studio?.dispose();
      pmrem?.dispose();
      renderer?.dispose();
      renderer?.forceContextLoss();
      renderer?.domElement.remove();
    }
    function contextLost(event) {
      event.preventDefault();
      dispose();
    }
    function render() {
      if(disposed || document.visibilityState!=='visible') return;
      try {
        if(width!==host.clientWidth || height!==host.clientHeight) {
          width=host.clientWidth; height=host.clientHeight;
          renderer.setSize(width,height);
          camera.aspect=width/height;
          camera.updateProjectionMatrix();
          rig.scale.setScalar(.72*Math.min(1,camera.aspect));
        }
        camera.lookAt(0,0,0);
        renderer.render(scene,camera);
        host.dataset.renderer='webgl';
      } catch(error) {
        dispose();
        console.warn('Aperture: using SVG artwork',error);
      }
    }
    try {
      renderer=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:'low-power'});
      renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
      renderer.setClearColor(0x000000,0);
      // Adapted from Three.js r186 physical-clearcoat and area-light examples (MIT).
      renderer.toneMapping=T.ACESFilmicToneMapping;
      renderer.toneMappingExposure=1.25;
      renderer.domElement.setAttribute('aria-hidden','true');
      renderer.domElement.addEventListener('webglcontextlost',contextLost);
      host.appendChild(renderer.domElement);
      studio=new RoomEnvironment();
      pmrem=new T.PMREMGenerator(renderer);
      environment=pmrem.fromScene(studio,.04);
      scene.environment=environment.texture;
      studio.dispose(); studio=null;
      pmrem.dispose(); pmrem=null;

      const metal=new T.MeshPhysicalMaterial({color:0x454a43,metalness:.9,roughness:.28,clearcoat:1,clearcoatRoughness:.1});
      const edge=new T.MeshStandardMaterial({color:0xb6bca9,metalness:1,roughness:.22});
      const shape=new T.Shape();
      shape.moveTo(.38,.48); shape.lineTo(1.88,1.35); shape.lineTo(2.62,.92); shape.lineTo(1.12,.05); shape.closePath();
      const geometry=new T.ExtrudeGeometry(shape,{depth:.12,bevelEnabled:true,bevelThickness:.025,bevelSize:.025,bevelSegments:2,steps:1});
      geometry.translate(-.58,-.48,0);
      const seatGeometry=new T.CylinderGeometry(.085,.085,.12,20);
      const collar=new T.Mesh(new T.TorusGeometry(.73,.065,12,96),metal);
      collar.position.z=-.12;
      rig.add(collar);
      for(let i=0;i<6;i++) {
        const pivot=new T.Group();
        pivot.rotation.z=i*Math.PI/3;
        const hinge=new T.Group();
        hinge.position.set(.58,.48,0);
        const blade=new T.Mesh(geometry,[metal,edge]);
        hinge.add(blade); pivot.add(hinge);
        const seat=new T.Mesh(seatGeometry,metal);
        seat.rotation.x=Math.PI/2;
        seat.position.set(.58,.48,.13);
        pivot.add(seat);
        rig.add(pivot);
        blades.push(blade);
      }
      RectAreaLightUniformsLib.init();
      const key=new T.RectAreaLight(0xeaf1ff,7,4,5);
      key.position.set(-3,3,5); key.lookAt(0,0,0); scene.add(key);
      const rim=new T.RectAreaLight(0xd7f57a,3,2,4);
      rim.position.set(3,-1,2); rim.lookAt(0,0,0); scene.add(rim);
      camera.position.set(3.4,1.8,10.5);
      render();
      if(disposed) return null;
      return {
        render,dispose,
        timeline(tl) {
          blades.forEach((blade,i)=>{
            tl.fromTo(blade.position,{x:1.18,z:.35+i*.12},{x:0,z:0,duration:.82,ease:'power3.out'},.62+i*.055)
              .fromTo(blade.rotation,{z:radians(-26)},{z:0,duration:.82,ease:'power3.out'},.62+i*.055)
              .to(blade.position,{x:.34,z:.08,duration:1.12,ease:'power2.inOut'},'open+='+i*.045)
              .to(blade.rotation,{z:radians(34),duration:1.12,ease:'power2.inOut'},'open+='+i*.045)
              .to(blade.position,{x:0,z:0,duration:.88,ease:'power2.inOut'},'settle+='+i*.035)
              .to(blade.rotation,{z:0,duration:.88,ease:'power2.inOut'},'settle+='+i*.035);
          });
          tl.to(camera.position,{x:2.2,y:1.2,z:9.5,duration:1.1,ease:'power3.out'},.62)
            .to(camera.position,{x:2.6,y:1.2,z:8.8,duration:1.15,ease:'power2.inOut'},'open')
            .to(key.rotation,{y:key.rotation.y+.65,duration:.8,ease:'power2.inOut'},3.425)
            .to(camera.position,{x:0,y:0,z:10.5,duration:1.1,ease:'power2.inOut'},'settle');
        }
      };
    } catch(error) {
      dispose();
      console.warn('Aperture: using SVG artwork',error);
      return null;
    }
  }};
})();

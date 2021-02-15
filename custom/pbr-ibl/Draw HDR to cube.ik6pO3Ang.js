module.exports = (node, graph) => {
    const { cube: createCube, sphere : createSphere, torus: createTorus } = require("primitive-geometry");
    const { mat4 } = require("pex-math")
  const triggerIn = node.triggerIn("in");
  const triggerOut = node.triggerOut("out");
  const enabledIn = node.in("enabled", true, { connectable: false });

  const texIn = node.in('texture',null)
  const { vec3 } = require("pex-math");
  const { ctx } = graph;

      // attributes: {
      //   aPosition: ctx.vertexBuffer([[-1, -1], [1, -1], [1, 1], [-1, 1]]),
      //   aTexCoord0: ctx.vertexBuffer([[0, 0], [1, 0], [1, 1], [0, 1]])
      // },
      // indices: ctx.indexBuffer([[0, 1, 2], [0, 2, 3]]),

  let uniforms;
  let vertexNeedsUpdating = false;

  let geo = createCube();
  let mat = mat4.create();

  let faceProjectionMatrix = mat4.perspective(mat4.create(), Math.PI/2, 1, 0.1, 1)

// i think positive z is upside down
  let cubemapFaces = [
    {name : ctx.CubemapFace.PositiveX, viewMatrix: mat4.lookAt(mat4.create(),[0.0, 0.0, 0.0], [ 1.0,  0.0,  0.0], [0.0, -1.0,  0.0])},
    {name : ctx.CubemapFace.NegativeX, viewMatrix: mat4.lookAt(mat4.create(),[0.0, 0.0, 0.0], [-1.0,  0.0,  0.0], [0.0, -1.0,  0.0])},
    {name : ctx.CubemapFace.PositiveY, viewMatrix: mat4.lookAt(mat4.create(),[0.0, 0.0, 0.0], [ 0.0,  1.0,  0.0], [0.0,  0.0,  1.0])},
    {name : ctx.CubemapFace.NegativeY, viewMatrix: mat4.lookAt(mat4.create(),[0.0, 0.0, 0.0], [ 0.0, -1.0,  0.0], [0.0,  0.0, -1.0])},
    {name : ctx.CubemapFace.PositiveZ, viewMatrix: mat4.lookAt(mat4.create(),[0.0, 0.0, 0.0], [ 0.0,  0.0,  1.0], [0.0, -1.0,  0.0])},
    {name : ctx.CubemapFace.NegativeZ, viewMatrix: mat4.lookAt(mat4.create(),[0.0, 0.0, 0.0], [ 0.0,  0.0, -1.0], [0.0, -1.0,  0.0])}
  ]



  const cubeTex = ctx.textureCube({
      width: 1024,
      height: 1024,
      min : ctx.Filter.Linear,
      mag : ctx.Filter.Linear,
  });


  function GetPipeline(aLightNum, dLightNum, pLightNum) {
    let vertString = /*glsl*/ `
      attribute vec3 aPosition;
      attribute vec3 aNormal;
      attribute vec3 aDiffuse;
      attribute vec3 aSpecular;

      varying vec3 vNormal;
      varying vec3 fragPos;
      varying vec3 vPositionWorld;

      uniform mat4 uProjectionMatrix;
      uniform mat4 uViewMatrix;
      uniform mat4 uModelMatrix;
      
      

        void main () {        
        vNormal = aNormal;
        vPositionWorld = aPosition;
        gl_Position =  uProjectionMatrix * uViewMatrix * vec4(aPosition, 1.0);
      }
      `;

    let fragString = /*glsl*/`
        precision highp float;     
        varying vec3 vNormal;
        varying vec3 vPositionWorld;
        varying vec3 fragPos;

        uniform sampler2D uTex;

        const vec2 invAtan = vec2(0.1591, 0.3183);
        vec2 SampleSphericalMap(vec3 v)
        {
            vec2 uv = vec2(atan(v.z, v.x), asin(v.y));
            uv *= invAtan;
            uv += 0.5;
            return uv;
        }


        void main(){


          vec2 uv = SampleSphericalMap(normalize(vPositionWorld));
          vec3 color = texture2D(uTex, uv).rgb;
    
           gl_FragColor = vec4(color,1.0);
        }
        `;

    return ctx.pipeline({
      vert: vertString,
      frag: fragString,
      blend: false,
      depthTest: true,
      depthWrite: true,
      //cullFace: ctx.Face.Front,
      
      blendSrcRGBFactor: ctx.BlendFactor.SrcColor,
      blendSrcAlphaFactor: ctx.BlendFactor.One,
      blendDstRGBFactor: ctx.BlendFactor.OneMinusSrcColor,
      blendDstAlphaFactor: ctx.BlendFactor.One,
    });
  }

  const drawCmd = {
    pipeline: GetPipeline(),
    attributes: {
      aPosition: ctx.vertexBuffer(geo.positions),
      aNormal: ctx.vertexBuffer(geo.normals),
    },
    indices: ctx.indexBuffer(geo.cells),
  };

  let needsUpdate = true;

  triggerIn.onTrigger = (props) => {
    const { camera } = props;

    if (enabledIn.value && texIn.value && needsUpdate ) {
      
        uniforms = {
          uModelMatrix: mat,
          uTex: texIn.value,
        };

        cubemapFaces.forEach((face)=>{
          // ctx.submit(drawCmd, {
          //   pass: ctx.pass({
          //     color : {
          //       texture: cubeTex,
          //       target: face.name
          //     },
          //     clearColor: [0, 0, 0, 1],
            
          //   }),
          // });

          uniforms.uProjectionMatrix = faceProjectionMatrix;
          uniforms.uViewMatrix = face.viewMatrix;

          ctx.submit(drawCmd, {
            uniforms,
            pass : ctx.pass({
              color : [{
                texture: cubeTex,
                target: face.name
              }]
            })
          });

          // ctx.submit(drawCmd, {
          //   uniforms,
          //   color : {
          //     texture: cubeTex,
          //     target: face.name
          //   }
          // });
        
        })       
    }
    needsUpdate = false;

    props.environmentCubemap = cubeTex

    triggerOut.trigger(props);
  };

  texIn.onChange = () => { needsUpdate = true}
    node.onDestroy = () => {
    ctx.dispose(cubeTex)
  };
};

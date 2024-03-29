module.exports = (node, graph) => {
  const triggerIn = node.triggerIn("in");
  const triggerOut = node.triggerOut("out");
  const enabledIn = node.in("enabled", true, { connectable: false });

  const { vec3 } = require("pex-math");
  const { ctx } = graph;

  let uniforms;

  let aLightNum = 2;
  let dLightNum = 0;
  let pLightNum = 0;
  let vertexNeedsUpdating = false;
    let shadowDepthTex = graph.ctx.texture2D({
    width: 1024,
    height: 1024,
    pixelFormat: ctx.PixelFormat.Depth,
    encoding: ctx.Encoding.Linear
  })
  let shadowColorTex = graph.ctx.texture2D({
    width: 1024,
    height: 1024,
    pixelFormat: ctx.PixelFormat.RGBA8,
  })
  

  function GetPipeline(aLightNum, dLightNum, pLightNum) {
    let vertString = /*glsl*/ `
      attribute vec3 aPosition;
      attribute vec3 aNormal;
      attribute vec3 aDiffuse;
      attribute vec3 aSpecular;

      varying vec3 vNormal;
      varying vec3 fragPos;

      uniform mat4 uProjectionMatrix;
      uniform mat4 uViewMatrix;
      uniform mat4 uModelMatrix;

        void main () {        
        vNormal = aNormal;
        gl_Position =  uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aPosition, 1.0);
      }
      `;

    let fragString = `
        precision highp float;     
        varying vec3 vNormal;
        varying vec3 vPositionView;
        varying vec3 fragPos;
        void main(){
           gl_FragColor = vec4(vec3(gl_FragCoord.z),1.0);
        }
        `;

    return ctx.pipeline({
      vert: vertString,
      frag: fragString,
      depthTest: true,
      depthWrite: true,
      cullFace: ctx.Face.Front,
      blend: false,
      blendSrcRGBFactor: ctx.BlendFactor.SrcColor,
      blendSrcAlphaFactor: ctx.BlendFactor.One,
      blendDstRGBFactor: ctx.BlendFactor.OneMinusSrcColor,
      blendDstAlphaFactor: ctx.BlendFactor.One,
    });
  }

  const drawCmd = {
    pipeline: GetPipeline(aLightNum, dLightNum, pLightNum),
    attributes: {
      aPosition: ctx.vertexBuffer([]),
      aNormal: ctx.vertexBuffer([]),
      aModelMatrix: ctx.vertexBuffer([]),
    },
    indices: ctx.indexBuffer([]),
  };

  triggerIn.onTrigger = (props) => {
    const { camera, meshes, directionalLights } = props;

    if (enabledIn.value && directionalLights) {
      //console.log(props.ambientLights)


      directionalLights.forEach((light)=>{
        ctx.submit(drawCmd, {
          pass: ctx.pass({
            color: [light.colorTexture],
            depth: light.depthTexture,
            clearColor: [0, 0, 0, 1],
            clearDepth: 1
          }),
        });
      });


      directionalLights.forEach((light) => {
    
        uniforms = {
          uProjectionMatrix: light.projectionMatrix,
          uViewMatrix: light.viewMatrix,
          uModelMatrix: [],
        };

        //console.log(light)


        meshes.forEach((mesh) => {
          uniforms.uModelMatrix = mesh.modelMatrix;

          ctx.update(drawCmd.attributes.aPosition, {
            data: mesh.geo.positions,
          });
          ctx.update(drawCmd.attributes.aNormal, { data: mesh.geo.normals });
          ctx.update(drawCmd.indices, { data: mesh.geo.cells });

          ctx.submit(drawCmd, {
            uniforms,
            pass: light.pass
          });
        });
      });
    }

    triggerOut.trigger(props);
  };
};

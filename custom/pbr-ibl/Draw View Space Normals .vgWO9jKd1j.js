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

  function GetPipeline(aLightNum,dLightNum,pLightNum){
    let vertString = /*glsl*/`
      attribute vec3 aPosition;
      attribute vec3 aNormal;
      attribute vec3 aDiffuse;
      attribute vec3 aSpecular;

      varying vec3 vNormalView;

      uniform mat4 uProjectionMatrix;
      uniform mat4 uViewMatrix;
      uniform mat4 uModelMatrix;

        void main () {        
        vNormalView = normalize(vec3(uViewMatrix * uModelMatrix * vec4(aNormal, 0.0)));


        gl_Position =  uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aPosition, 1.0);
      }
      `

      let fragString = `
        precision highp float;     
        varying vec3 vNormalView;
        varying vec3 vPositionView;
        void main(){
          gl_FragColor = vec4(vNormalView,1.0);
        }
        `

      return ctx.pipeline({
            vert: vertString,
            frag: fragString,
            depthTest: true,
            depthWrite: true,
            cullFace: true,
            blend: false,
            blendSrcRGBFactor: ctx.BlendFactor.SrcColor,
            blendSrcAlphaFactor: ctx.BlendFactor.One,
            blendDstRGBFactor: ctx.BlendFactor.OneMinusSrcColor,
            blendDstAlphaFactor: ctx.BlendFactor.One,
          })
  }



  const drawCmd = {
    pipeline: GetPipeline(aLightNum,dLightNum,pLightNum),
    attributes: {
      aPosition: ctx.vertexBuffer([]),
      aNormal: ctx.vertexBuffer([]),
      aModelMatrix: ctx.vertexBuffer([]),
    },
    indices: ctx.indexBuffer([]),
  };

  triggerIn.onTrigger = (props) => {
    const { camera, meshes } = props;

    if (enabledIn.value) {
      //console.log(props.ambientLights)
      uniforms = {
        uProjectionMatrix: camera.projectionMatrix,
        uViewMatrix: camera.viewMatrix,
        uModelMatrix: [],
      };

      meshes.forEach((mesh) => {
        uniforms.uModelMatrix = mesh.modelMatrix;

        ctx.update(drawCmd.attributes.aPosition, { data: mesh.geo.positions });
        ctx.update(drawCmd.attributes.aNormal, { data: mesh.geo.normals });
        ctx.update(drawCmd.indices, { data: mesh.geo.cells });

        ctx.submit(drawCmd, {
          uniforms,
        });
      });

      
    }

    triggerOut.trigger(props);
  };
};

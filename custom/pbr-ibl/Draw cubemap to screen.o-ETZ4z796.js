module.exports = (node, graph) => {
    const { cube: createCube, sphere : createSphere, torus: createTorus } = require("primitive-geometry");
    const { mat4 } = require("pex-math")
  const triggerIn = node.triggerIn("in");
  const triggerOut = node.triggerOut("out");
  const enabledIn = node.in("enabled", true, { connectable: false });
  const texIn = node.in('texture',null)

  const { vec3 } = require("pex-math");
  const { ctx } = graph;

  let uniforms;
  let vertexNeedsUpdating = false;

  let geo = createCube();
  let mat = mat4.create();

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

        mat4 rotView = mat4(mat3(uViewMatrix)); // remove translation from the view matrix
        vec4 clipPos = uProjectionMatrix * rotView * vec4(vPositionWorld, 1.0);

        gl_Position = clipPos.xyww;
      }
      `;

    let fragString = /*glsl*/`
        precision highp float;     
        varying vec3 vNormal;
        varying vec3 vPositionWorld;
        varying vec3 fragPos;
        uniform samplerCube uTex;

        void main(){
            vec3 envColor = textureCube(uTex, vPositionWorld).rgb;
            envColor = pow(envColor, vec3(1.0/2.2)); 
           gl_FragColor = vec4(envColor,1.0);
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
      aPosition: ctx.vertexBuffer([]),
      aNormal: ctx.vertexBuffer([]),
      aModelMatrix: ctx.vertexBuffer([]),
    },
    indices: ctx.indexBuffer([]),
  };

  triggerIn.onTrigger = (props) => {
    const { camera,environmentCubemap } = props;

    if (enabledIn.value && environmentCubemap) {
        uniforms = {
          uProjectionMatrix: camera.projectionMatrix,
          uViewMatrix: camera.viewMatrix,
          uModelMatrix: mat,
          uTex: environmentCubemap
        };

        ctx.update(drawCmd.attributes.aPosition, {
          data: geo.positions,
        });
        ctx.update(drawCmd.attributes.aNormal, { data: geo.normals });
        ctx.update(drawCmd.indices, { data: geo.cells });

        ctx.submit(drawCmd, {
          uniforms,
        });

    }
    triggerOut.trigger(props);
  };
};

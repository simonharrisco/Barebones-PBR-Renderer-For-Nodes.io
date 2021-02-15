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
  ]

   var verts = [
            // First triangle:
             1.0,  1.0,
            -1.0,  1.0,
            -1.0, -1.0,
            // Second triangle:
            -1.0, -1.0,
             1.0, -1.0,
             1.0,  1.0
        ];



  const texTex = ctx.texture2D({
      width: 1024,
      height: 1024
  });


  function GetPipeline(aLightNum, dLightNum, pLightNum) {
    let vertString = /*glsl*/ `
      attribute vec2 aPosition;
      varying vec2 vTexCoords;
      varying vec2 vPosition;
      const vec2 scale = vec2(0.5, 0.5);

        void main () {        
            vPosition = aPosition;
            vTexCoords  = aPosition * scale + scale; // scale vertex attribute to [0,1] range
            gl_Position = vec4(aPosition, 0.0, 1.0);
      }
      `;

    let fragString = /*glsl*/`
        precision highp float;     
        varying vec2 vTexCoords;
        varying vec2 vPosition;

        uniform sampler2D uTex;

        float roughness = 1.0;
        vec3 localPos = vec3(1.0);
          
         void main(){		

            gl_FragColor = vec4(texture2D(uTex,vTexCoords).rgb,1.0);
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
      aPosition: ctx.vertexBuffer(verts),
    },
    indices: ctx.indexBuffer([[0,1,2],[3,4,5]]),
  };

  let needsUpdate = true;

  triggerIn.onTrigger = (props) => {
    const { camera } = props;

    if (enabledIn.value && texIn.value ) {
      
        uniforms = {
          uTex: props.pfemTex
        };

   

        ctx.submit(drawCmd, {
          uniforms
        });
        
          
    }
    needsUpdate = false;

    //props.environmentCubemap = texTex

    triggerOut.trigger(props);
  };

  texIn.onChange = () => { needsUpdate = true}
};

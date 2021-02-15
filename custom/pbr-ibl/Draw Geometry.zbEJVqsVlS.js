module.exports = (node, graph) => {
  const triggerIn = node.triggerIn("in");
  const triggerOut = node.triggerOut("out");
  const enabledIn = node.in("enabled", true, { connectable: false });

  const { cube: createCube } = require("primitive-geometry");
  const { vec3 } = require("pex-math");
  const { ctx } = graph;

  const geomIn = node.in("geom", null);
  const textureIn = node.in("texture", null);

  const geom = createCube(1);

  const drawCmd = {
    pipeline: ctx.pipeline({
      vert: `
      attribute vec3 aPosition;
      attribute vec2 aTexCoord0;

      varying vec2 vTexCoord0;

      uniform mat4 uProjectionMatrix;
      uniform mat4 uViewMatrix;
      uniform vec3 uScale;

      void main () {        
        vTexCoord0 = aTexCoord0;
        gl_Position = uProjectionMatrix * uViewMatrix * vec4(aPosition * uScale, 1.0);;
      }
      `,
      frag: `
      precision highp float;     

      varying vec2 vTexCoord0;
      uniform sampler2D uTexture;
        
      void main () {          
        gl_FragColor = texture2D(uTexture, vTexCoord0);
      }
      `,
      depthTest: true,
      depthWrite: true,
      cullFace: true,
      blend: true,
      blendSrcRGBFactor: ctx.BlendFactor.Zero,
      blendSrcAlphaFactor: ctx.BlendFactor.One,
      blendDstRGBFactor: ctx.BlendFactor.SrcColor,
      blendDstAlphaFactor: ctx.BlendFactor.One,
    }),
    attributes: {
      aPosition: ctx.vertexBuffer(geom.positions),
      aTexCoord0: ctx.vertexBuffer(geom.uvs),
    },
    indices: ctx.indexBuffer(geom.cells),
  };

  geomIn.onChange = () => {
    const geom = geomIn.value;
    if (!geom) return;

    ctx.update(drawCmd.attributes.aPosition, { data: geom.positions });
    ctx.update(drawCmd.attributes.aTexCoord0, { data: geom.uvs });
    ctx.update(drawCmd.indices, { data: geom.cells });
  };

  triggerIn.onTrigger = (props) => {
    const { camera } = props;

    if (enabledIn.value && textureIn.value) {
      ctx.submit(drawCmd, {
        uniforms: {
          uProjectionMatrix: camera.projectionMatrix,
          uViewMatrix: camera.viewMatrix,
          uTexture: textureIn.value,
          uScale: [1.2, 1, 1.2],
        },
      });
    }
    triggerOut.trigger(props);
  };
};

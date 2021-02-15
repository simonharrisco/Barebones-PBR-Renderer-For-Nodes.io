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
      // attribute float aAO;
      attribute vec3 aNormal;

      varying vec3 vNormalView;
      varying vec3 vPositionView;

      uniform mat4 uProjectionMatrix;
      uniform mat4 uViewMatrix;

      void main () {        
        // vAO = aAO;
        vNormalView = vec3(uViewMatrix * vec4(aNormal, 0.0));
        vec4 positionView = uViewMatrix * vec4(aPosition, 1.0);
        vPositionView = positionView.xyz;
        gl_Position = uProjectionMatrix * positionView;
      }
      `,
      frag: `
      precision highp float;     
      varying vec3 vNormalView;
      varying vec3 vPositionView;
      varying float vAO;
      
      uniform sampler2D uTexture;
        
      vec3 tonemapAces( vec3 x ) {
          float tA = 2.5;
          float tB = 0.03;
          float tC = 2.43;
          float tD = 0.59;
          float tE = 0.14;
          return clamp((x*(tA*x+tB))/(x*(tC*x+tD)+tE),0.0,1.0);
      }
        
      void main () {        
        vec3 e = normalize(vPositionView);
        vec3 N = normalize(vNormalView);
        vec3 r = (reflect(e, N));
        float m = 2.0 * sqrt(r.x * r.x + r.y * r.y + (r.z + 1.0) * (r.z + 1.0));
        vec2 uv = r.xy / m + 0.5;
        vec3 color = texture2D( uTexture, uv ).rgb;     
        gl_FragColor = vec4(color, 1.0);
      }
      `,
      depthTest: true,
      depthWrite: true,
      cullFace: true,
      blend: false,
      blendSrcRGBFactor: ctx.BlendFactor.SrcColor,
      blendSrcAlphaFactor: ctx.BlendFactor.One,
      blendDstRGBFactor: ctx.BlendFactor.OneMinusSrcColor,
      blendDstAlphaFactor: ctx.BlendFactor.One,
    }),
    attributes: {
      aPosition: ctx.vertexBuffer(geom.positions),
      // aAO: ctx.vertexBuffer(geom.positions.map(() => 1)),
      aNormal: ctx.vertexBuffer(geom.normals),
    },
    indices: ctx.indexBuffer(geom.cells),
  };

  geomIn.onChange = () => {
    const geom = geomIn.value;
    if (!geom) return;

    ctx.update(drawCmd.attributes.aPosition, { data: geom.positions });
    ctx.update(drawCmd.attributes.aNormal, { data: geom.normals });
    // ctx.update(drawCmd.attributes.aAO, { data: geom.ao || geom.positions.map(() => 1) })
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
        },
      });
    }
    triggerOut.trigger(props);
  };
};

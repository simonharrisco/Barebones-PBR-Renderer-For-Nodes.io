module.exports = (node, graph) => {
  const {
    cube: createCube,
    sphere: createSphere,
    torus: createTorus,
  } = require("primitive-geometry");
  const { mat4 } = require("pex-math");
  const triggerIn = node.triggerIn("in");
  const triggerOut = node.triggerOut("out");
  const enabledIn = node.in("enabled", true, { connectable: false });

  const texIn = node.in("texture", null);
  const { vec3 } = require("pex-math");
  const { ctx } = graph;

  let uniforms;
  let vertexNeedsUpdating = false;

  var verts = [
    // First triangle:
    1.0,
    1.0,
    -1.0,
    1.0,
    -1.0,
    -1.0,
    // Second triangle:
    -1.0,
    -1.0,
    1.0,
    -1.0,
    1.0,
    1.0,
  ];

  const mipLevels = 5;
  const texSize = 1024;
  const colorTex = ctx.texture2D({
    width: texSize,
    height: texSize,
    pixelFormat: ctx.PixelFormat.RGBA16,
    min: ctx.Filter.Linear,
    mag: ctx.Filter.Linear,
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

    let fragString = /*glsl*/ `
        precision highp float;     
        varying vec2 vTexCoords;
        varying vec2 vPosition;

        uniform sampler2D uTex;
        uniform float uRoughness;

        const vec2 invAtan = vec2(0.1591, 0.3183);
        const float PI = 3.14159265359;

        vec2 SampleSphericalMap(vec3 v)
        {
            vec2 uv = vec2(atan(v.z, v.x), asin(v.y));
            uv *= invAtan;
            uv += 0.5;
            return uv;
        }

        float VanDerCorpus(int n, int base)
        {
            float invBase = 1.0 / float(base);
            float denom   = 1.0;
            float result  = 0.0;

            for(int i = 0; i < 32; ++i)
            {
                if(n > 0)
                {
                    denom   = mod(float(n), 2.0);
                    result += denom * invBase;
                    invBase = invBase / 2.0;
                    n       = int(float(n) / 2.0);
                }
            }
            return result;
        }
        vec2 Hammersley(int i, int N)
        {
            return vec2(float(i)/float(N), VanDerCorpus(i, 2));
        }
        vec3 ImportanceSampleGGX(vec2 Xi, vec3 N, float roughness)
        {
            float a = roughness*roughness;
            float phi = 2.0 * PI * Xi.x;
            float cosTheta = sqrt((1.0 - Xi.y) / (1.0 + (a*a - 1.0) * Xi.y));
            float sinTheta = sqrt(1.0 - cosTheta*cosTheta);
          
            // from spherical coordinates to cartesian coordinates
            vec3 H;
            H.x = cos(phi) * sinTheta;
            H.y = sin(phi) * sinTheta;
            H.z = cosTheta;
          
            // from tangent-space vector to world-space sample vector
            vec3 up        = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
            vec3 tangent   = normalize(cross(up, N));
            vec3 bitangent = cross(N, tangent);
            vec3 sampleVec = tangent * H.x + bitangent * H.y + N * H.z;
            return normalize(sampleVec);
        }  

        float roughness = uRoughness;
             
         void main(){	
             float lat =  (vTexCoords.x * 2.0 * PI)-PI;
             float lon =  vPosition.y/2.0  * PI;
            
            vec3 directionVector = normalize(vec3(
              cos(lon)*cos(lat),
              sin(lon),
              cos(lon)*sin(lat)
            ));	
            vec3 N = normalize(directionVector);    
            vec3 R = N;
            vec3 V = R;
            const int SAMPLE_COUNT = 1024;
            float totalWeight = 0.0;   
            vec3 prefilteredColor = vec3(0.0);     
            for(int i = 0; i < SAMPLE_COUNT; ++i)
            {
                vec2 Xi = Hammersley(i, SAMPLE_COUNT);
                vec3 H  = ImportanceSampleGGX(Xi, N, roughness);
                vec3 L  = normalize(2.0 * dot(V, H) * H - V);

                float NdotL = max(dot(N, L), 0.0);
                if(NdotL > 0.0)
                {
                    prefilteredColor += texture2D(uTex, SampleSphericalMap(L)).rgb * NdotL;        
                    totalWeight      += NdotL;
                }
            }
            prefilteredColor = prefilteredColor / totalWeight;
            gl_FragColor = vec4(prefilteredColor, 1.0);
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
    indices: ctx.indexBuffer([
      [0, 1, 2],
      [3, 4, 5],
    ]),
  };

  let needsUpdate = true;

  triggerIn.onTrigger = (props) => {
    const { camera } = props;

    if (enabledIn.value && texIn.value && needsUpdate) {
      let yAccum = 0;

      let rDivisor = 1 / (mipLevels - 1);
      let roughness = 0;
      for (let i = 1; i <= mipLevels; i++) {
        uniforms = {
          uTex: texIn.value,
          uRoughness: roughness,
        };

        ctx.submit(drawCmd, {
          uniforms,
          pass: ctx.pass({
            color: [colorTex],
          }),
          viewport: [
            0,
            yAccum,
            texSize / Math.pow(2, i - 1),
            texSize / Math.pow(2, i),
          ],
        });

        yAccum += texSize / Math.pow(2, i);
        roughness += rDivisor;
      }
    }
    needsUpdate = false;

    props.pfemTex = colorTex;
    props.pfemMipNumber = mipLevels;

    triggerOut.trigger(props);
  };

  texIn.onChange = () => {
    needsUpdate = true;
  };
  node.onDestroy = () => {
    ctx.dispose(colorTex)
  };
};

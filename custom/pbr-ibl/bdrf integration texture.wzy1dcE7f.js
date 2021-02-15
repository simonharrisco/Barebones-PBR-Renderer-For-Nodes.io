module.exports = (node, graph) => {
    const { cube: createCube, sphere : createSphere, torus: createTorus } = require("primitive-geometry");
    const { mat4 } = require("pex-math")
  const triggerIn = node.triggerIn("in");
  const triggerOut = node.triggerOut("out");
  const enabledIn = node.in("enabled", true, { connectable: false });

  const texIn = node.in('texture',null)
  const { vec3 } = require("pex-math");
  const { ctx } = graph;

  let colorTex = graph.ctx.texture2D({
    width: 1024,
    height: 1024,
    pixelFormat: ctx.PixelFormat.RGBA16,
  })

  let uniforms;
  let vertexNeedsUpdating = false;


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

        const float PI = 3.14159265359;

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
        // ----------------------------------------------------------------------------
        vec2 Hammersley(int i, int N)
        {
            return vec2(float(i)/float(N), VanDerCorpus(i, 2));
        }


        float GeometrySchlickGGX(float NdotV, float roughness)
        {
            float a = roughness;
            float k = (a * a) / 2.0;

            float nom   = NdotV;
            float denom = NdotV * (1.0 - k) + k;

            return nom / denom;
        }
        // ----------------------------------------------------------------------------
        float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness)
        {
            float NdotV = max(dot(N, V), 0.0);
            float NdotL = max(dot(N, L), 0.0);
            float ggx2 = GeometrySchlickGGX(NdotV, roughness);
            float ggx1 = GeometrySchlickGGX(NdotL, roughness);

            return ggx1 * ggx2;
        }  

                  
        vec2 IntegrateBRDF(float NdotV, float roughness)
        {
            vec3 V;
            V.x = sqrt(1.0 - NdotV*NdotV);
            V.y = 0.0;
            V.z = NdotV;

            float A = 0.0;
            float B = 0.0;

            vec3 N = vec3(0.0, 0.0, 1.0);

            const int SAMPLE_COUNT = 1024;
            for(int i = 0; i < SAMPLE_COUNT; ++i)
            {
                vec2 Xi = Hammersley(i, SAMPLE_COUNT);
                vec3 H  = ImportanceSampleGGX(Xi, N, roughness);
                vec3 L  = normalize(2.0 * dot(V, H) * H - V);

                float NdotL = max(L.z, 0.0);
                float NdotH = max(H.z, 0.0);
                float VdotH = max(dot(V, H), 0.0);

                if(NdotL > 0.0)
                {
                    float G = GeometrySmith(N, V, L, roughness);
                    float G_Vis = (G * VdotH) / (NdotH * NdotV);
                    float Fc = pow(1.0 - VdotH, 5.0);

                    A += (1.0 - Fc) * G_Vis;
                    B += Fc * G_Vis;
                }
            }
            A /= float(SAMPLE_COUNT);
            B /= float(SAMPLE_COUNT);
            return vec2(A, B);
        }
        // ----------------------------------------------------------------------------
        void main() 
        {
            vec2 integratedBRDF = IntegrateBRDF(vTexCoords.x, vTexCoords.y);
            gl_FragColor = vec4(integratedBRDF,0.0,1.0);
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

    if (enabledIn.value && needsUpdate  ) {
      
        uniforms = {
          uTex: texIn.value
        };

        ctx.submit(drawCmd, {
          uniforms,
          pass : ctx.pass({
            color : [colorTex]
          })
        });

     
    }
    needsUpdate = false;

    props.brdfTex = colorTex

    triggerOut.trigger(props);
  };

  texIn.onChange = () => { needsUpdate = true}

    node.onDestroy = () => {
    ctx.dispose(colorTex)
  };
};

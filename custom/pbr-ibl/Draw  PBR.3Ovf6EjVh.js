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

  function GetPipeline(aLightNum, dLightNum, pLightNum) {
    let vertString = /*glsl*/ `
      attribute vec3 aPosition;
      attribute vec3 aNormal;
      attribute vec3 aDiffuse;
      attribute vec3 aSpecular;

      uniform vec4 uMaterialAlbedo;
      uniform vec4 uMaterialMetallic;
      uniform vec4 uMaterialRoughness;
      

      varying vec3 vNormalView;
      varying vec3 vPositionView;
      varying vec3 vNormal;
      varying vec3 vNormalWorld;


      varying vec4 vMaterialAlbedo;
      varying vec4 vMaterialMetallic;
      varying vec4 vMaterialRoughness;

      varying mat4 vInverseViewMatrix;

      uniform mat4 uProjectionMatrix;
      uniform mat4 uViewMatrix;
      uniform mat4 uModelMatrix;
      varying vec4 lightCol;
      varying vec3 N,E,L;

      varying vec3 vPositionWorld;

      mat2 inverse(mat2 m) {
        return mat2(m[1][1],-m[0][1],
                  -m[1][0], m[0][0]) / (m[0][0]*m[1][1] - m[0][1]*m[1][0]);
      }

      mat3 inverse(mat3 m) {
        float a00 = m[0][0], a01 = m[0][1], a02 = m[0][2];
        float a10 = m[1][0], a11 = m[1][1], a12 = m[1][2];
        float a20 = m[2][0], a21 = m[2][1], a22 = m[2][2];

        float b01 = a22 * a11 - a12 * a21;
        float b11 = -a22 * a10 + a12 * a20;
        float b21 = a21 * a10 - a11 * a20;

        float det = a00 * b01 + a01 * b11 + a02 * b21;

        return mat3(b01, (-a22 * a01 + a02 * a21), (a12 * a01 - a02 * a11),
                    b11, (a22 * a00 - a02 * a20), (-a12 * a00 + a02 * a10),
                    b21, (-a21 * a00 + a01 * a20), (a11 * a00 - a01 * a10)) / det;
      }

      mat4 inverse(mat4 m) {
        float
            a00 = m[0][0], a01 = m[0][1], a02 = m[0][2], a03 = m[0][3],
            a10 = m[1][0], a11 = m[1][1], a12 = m[1][2], a13 = m[1][3],
            a20 = m[2][0], a21 = m[2][1], a22 = m[2][2], a23 = m[2][3],
            a30 = m[3][0], a31 = m[3][1], a32 = m[3][2], a33 = m[3][3],

            b00 = a00 * a11 - a01 * a10,
            b01 = a00 * a12 - a02 * a10,
            b02 = a00 * a13 - a03 * a10,
            b03 = a01 * a12 - a02 * a11,
            b04 = a01 * a13 - a03 * a11,
            b05 = a02 * a13 - a03 * a12,
            b06 = a20 * a31 - a21 * a30,
            b07 = a20 * a32 - a22 * a30,
            b08 = a20 * a33 - a23 * a30,
            b09 = a21 * a32 - a22 * a31,
            b10 = a21 * a33 - a23 * a31,
            b11 = a22 * a33 - a23 * a32,

            det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;

        return mat4(
            a11 * b11 - a12 * b10 + a13 * b09,
            a02 * b10 - a01 * b11 - a03 * b09,
            a31 * b05 - a32 * b04 + a33 * b03,
            a22 * b04 - a21 * b05 - a23 * b03,
            a12 * b08 - a10 * b11 - a13 * b07,
            a00 * b11 - a02 * b08 + a03 * b07,
            a32 * b02 - a30 * b05 - a33 * b01,
            a20 * b05 - a22 * b02 + a23 * b01,
            a10 * b10 - a11 * b08 + a13 * b06,
            a01 * b08 - a00 * b10 - a03 * b06,
            a30 * b04 - a31 * b02 + a33 * b00,
            a21 * b02 - a20 * b04 - a23 * b00,
            a11 * b07 - a10 * b09 - a12 * b06,
            a00 * b09 - a01 * b07 + a02 * b06,
            a31 * b01 - a30 * b03 - a32 * b00,
            a20 * b03 - a21 * b01 + a22 * b00) / det;
      }

      highp mat4 transpose(in highp mat4 inMatrix) {
          highp vec4 i0 = inMatrix[0];
          highp vec4 i1 = inMatrix[1];
          highp vec4 i2 = inMatrix[2];
          highp vec4 i3 = inMatrix[3];

          highp mat4 outMatrix = mat4(
                      vec4(i0.x, i1.x, i2.x, i3.x),
                      vec4(i0.y, i1.y, i2.y, i3.y),
                      vec4(i0.z, i1.z, i2.z, i3.z),
                      vec4(i0.w, i1.w, i2.w, i3.w)
                      );

          return outMatrix;
      }

      void main () {        
        vMaterialAlbedo = uMaterialAlbedo;
        vMaterialMetallic = uMaterialMetallic;
        vMaterialRoughness = uMaterialRoughness;
        vPositionWorld =  vec4(uModelMatrix * vec4(aPosition, 1.0)).xyz;
        vNormalView = normalize(vec3(uViewMatrix * uModelMatrix * vec4(aNormal, 0.0)));
        vNormalWorld = normalize(vec3(uModelMatrix * vec4(aNormal, 0.0)));

        vNormal = aNormal;

        vInverseViewMatrix = inverse(uViewMatrix);
        vPositionView = vec3(uViewMatrix * uModelMatrix * vec4(aPosition, 1.0)); 
        gl_Position =  uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aPosition, 1.0);
      }
      `;

    let fragString = /*glsl*/ `
        precision highp float;     
        varying vec3 vNormalView;
        varying vec3 vNormal;
        varying vec3 vNormalWorld;
        varying vec3 vPositionView;
        varying vec3 vPositionWorld;
        uniform mat4 uViewMatrix;
        uniform mat4 uModelMatrix;
        uniform vec3 uCameraPositionWorld;

        uniform vec4 uMaterialAlbedo;
        uniform vec4 uMaterialMetallic;
        uniform vec4 uMaterialRoughness;

        uniform samplerCube uIrridianceCubemap;
        uniform sampler2D uPFEMTex;
        uniform sampler2D uBRDFTex;
        uniform float uPFEMMipNumber;

        vec3 color;

        varying vec4 vMaterialAlbedo;
        varying vec4 vMaterialMetallic;
        varying vec4 vMaterialRoughness;

        varying mat4 vInverseViewMatrix;

        const float PI = 3.14159265359;
        const vec2 invAtan = vec2(0.1591, 0.3183);
        vec3 shadowSample = vec3(1.0);

//Normal distribution function: approximates the amount the surface's microfacets are aligned to the halfway vector,
        float DistributionGGX(vec3 N, vec3 H, float roughness){
            float a      = roughness*roughness;
            float a2     = a*a;
            float NdotH  = max(dot(N, H), 0.0);
            float NdotH2 = NdotH*NdotH;
          
            float num   = a2;
            float denom = (NdotH2 * (a2 - 1.0) + 1.0);
            denom = PI * denom * denom;
          
            return num / denom;
        }
//Geometry function: describes the self-shadowing property of the microfacets. When a surface is relatively rough, the surface's microfacets can overshadow other microfacets reducing the light the surface reflects.
        float GeometrySchlickGGX(float NdotV, float roughness){
            float r = (roughness + 1.0);
            float k = (r*r) / 8.0;

            float num   = NdotV;
            float denom = NdotV * (1.0 - k) + k;
          
            return num / denom;
        }
//Fresnel equation: The Fresnel equation describes the ratio of surface reflection at different surface angles.
        float GeometrySmith(vec3 N, vec3 V, vec3 L, float roughness){
            float NdotV = max(dot(N, V), 0.0);
            float NdotL = max(dot(N, L), 0.0);
            float ggx2  = GeometrySchlickGGX(NdotV, roughness);
            float ggx1  = GeometrySchlickGGX(NdotL, roughness);
          
            return ggx1 * ggx2;
        }
        
        vec3 fresnelSchlick(float cosTheta, vec3 F0){
            return F0 + (1.0 - F0) * pow(max(1.0 - cosTheta, 0.0), 5.0);
        } 
        vec3 fresnelSchlickRoughness(float cosTheta, vec3 F0, float roughness)
        {
            return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(max(1.0 - cosTheta, 0.0), 5.0);
        }   
//converts from the gamma to linear colorspace
        vec3 ToLinear(vec3 col){
          return pow(col,vec3(2.2));
        } 
// remaps the high dynamic range to low dynamic range in an aesthetic way
        vec3 tonemapAces( vec3 x ) {
          float tA = 2.5;
          float tB = 0.03;
          float tC = 2.43;
          float tD = 0.59;
          float tE = 0.14;
          return clamp((x*(tA*x+tB))/(x*(tC*x+tD)+tE),0.0,1.0);
       }
// easily sample our hdri based on a target vector direction
        vec2 SampleSphericalMap(vec3 v)
        {
            vec2 uv = vec2(atan(v.z, v.x), asin(v.y));
            uv *= invAtan;
            uv += 0.5;
            return uv;
        }        
        `;

    /// LIGHTING ATTRS
    if (aLightNum) {
      fragString += /*glsl*/ `
            const int NUM_AMBIENT_LIGHTS = ${aLightNum};
            struct uAmbientLight {
              vec4 color;
              float strength;
            };
            uniform uAmbientLight uAmbientLights[NUM_AMBIENT_LIGHTS];
            `;
    }
    if (dLightNum) {
      fragString += /*glsl*/ `
            const int NUM_DIRECTIONAL_LIGHTS = ${dLightNum};
            struct uDirectionalLight {
              
           
              vec3 position;
              vec4 color;
              mat4 viewMatrix;
              mat4 projectionMatrix;
              float near;
              float far;
              float bias;
              float intensity;
            };
            uniform uDirectionalLight uDirectionalLights[NUM_DIRECTIONAL_LIGHTS];
            uniform sampler2D uDirectionalLightsDepthTexture[NUM_DIRECTIONAL_LIGHTS];
          `;
    }

    fragString += /*glsl*/ `
        void main () {       

          //  //PBR STARTS HERE
          //this is worldspace calc.... 

          //world normal
            vec3 N = normalize(vNormalWorld);
          //world camera view vector
            vec3 V = normalize(uCameraPositionWorld - vPositionWorld);
            vec3 F0 = vec3(0.04); 
            
            F0 = mix(F0, ToLinear(vMaterialAlbedo.rgb), ToLinear(vMaterialMetallic.rrr).r);        
          //reflectance equation
            vec3 Lo = vec3(0.0);    

            color = vec3(0.0);
        `;
    if (dLightNum) {
      fragString += /*glsl*/ `
          for(int x = 0; x < NUM_DIRECTIONAL_LIGHTS; x++){

            //vPositonWorld.
            //from world space
            //to clips space
            vec4 positionLightView = uDirectionalLights[x].viewMatrix * vec4(vPositionWorld,1); 
            float positionDistanceToLight = -positionLightView.z - uDirectionalLights[x].bias;
            vec4 positionLightClip = uDirectionalLights[x].projectionMatrix * positionLightView; 
            // w coord
            positionLightClip = positionLightClip / positionLightClip.w;
            //to uv space
            vec2 positionLightUV = positionLightClip.xy * 0.5 + 0.5;
            float sampleValue = 0.3;
            sampleValue = texture2D(uDirectionalLightsDepthTexture[x],positionLightUV).x;
            float readDepth = (sampleValue *  (uDirectionalLights[x].far - uDirectionalLights[x].near)) + uDirectionalLights[x].near;
            
            if(positionDistanceToLight > readDepth){
              shadowSample = vec3(0.0);
            }
                
            // calculate per-light radiance
                vec3 L = normalize(uDirectionalLights[x].position - vPositionWorld);
                vec3 H = normalize(V + L);
              //  float distance    = length(uDirectionalLights[x].position - vPositionWorld);
              //  float attenuation = 1.0 / (distance * distance);
              //  because directional light attenuation = 1;

              // this code was taken from the point light code, the light should attenuate as your move further away, directional lights dont
              // behave this way so I just use the same code as a proxy for intensity.
              float attenuation = uDirectionalLights[x].intensity ;
              vec3 radiance     = uDirectionalLights[x].color.rgb * attenuation;


                //cook-torrance brdf
                float NDF = DistributionGGX(N, H, ToLinear(uMaterialRoughness.rrr).r);        
                float G   = GeometrySmith(N, V, L, ToLinear(uMaterialRoughness.rrr).r);      
                vec3 F    = fresnelSchlick(max(dot(H, V), 0.0), F0);       
                
                vec3 kS = F;
                vec3 kD = vec3(1.0) - kS;
                kD *= 1.0 - ToLinear(vMaterialMetallic.rgb).r;	   
                
                vec3 numerator    = NDF * G * F;
                float denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0);
                vec3 specular     = numerator / max(denominator, 0.001);  
                    
                // add to outgoing radiance Lo
                float NdotL = max(dot(N, L), 0.0);                
    
                Lo += (kD * ToLinear(uMaterialAlbedo.rgb) / PI + specular) * radiance * NdotL * shadowSample; 
               
             }  
          

            //IRRIDIANCE MAP STUFF

            //vec3 ambient = vec3(0.03) * ToLinear(uMateria lAlbedo.rgb) * 0.0 ; //* ao;
            vec3 F =  fresnelSchlickRoughness(max(dot(N, V), 0.0), F0, ToLinear(uMaterialRoughness.rrr).r); 
            vec3 kS = F;
            vec3 kD = 1.0 - kS;
            kD *= 1.0 - ToLinear(uMaterialMetallic.rrr).r;	  

            vec3 irradiance = textureCube(uIrridianceCubemap,N).rgb;
            vec3 diffuse    = irradiance *  ToLinear(uMaterialAlbedo.rgb);
                
            vec3 Ref = normalize(reflect(normalize(vPositionView), vNormalView));   
            vec3 R = normalize(vec4(vInverseViewMatrix * vec4(Ref,0)).rgb);
            vec3 prefilteredColor;

            float roughness = ToLinear(uMaterialRoughness.rrr).r - 0.0001;
            float mipNumber = uPFEMMipNumber;

            float mipDivisor = 1.0 / (uPFEMMipNumber-1.0);
            float mipMult = floor(roughness/mipDivisor);

            const float MAX_SUPPORTED_MIPS = 10.0;
            // PFEM value 1 -----
            float yOffset1 = 0.0;
            for(float x = 0.0; x < MAX_SUPPORTED_MIPS; x++){
              if(x < mipMult){
                yOffset1 += 1.0/(pow(2.0,(x+1.0)));
              }
            }
            vec2 reflectUV1 = vec2(
              SampleSphericalMap(R).x/(max(pow(2.0,mipMult),1.0)),
              (SampleSphericalMap(R).y/pow(2.0,mipMult+1.0)) + yOffset1
            );
            vec3 prefilteredColor1 = texture2D(uPFEMTex, reflectUV1).rgb;  
            // PFEM value 2 -----
            mipMult += 1.0;
            float yOffset2 = 0.0;
            for(float x = 0.0; x < MAX_SUPPORTED_MIPS; x++){
              if(x < mipMult){
                yOffset2 += 1.0/(pow(2.0,(x+1.0)));
              }
            }
            vec2 reflectUV2 = vec2(
              SampleSphericalMap(R).x/(max(pow(2.0,mipMult),1.0)),
              (SampleSphericalMap(R).y/pow(2.0,mipMult+1.0)) + yOffset2
            );
            vec3 prefilteredColor2 = texture2D(uPFEMTex, reflectUV2).rgb;  


            float mixValue = ((roughness) - (mipDivisor*floor(roughness/mipDivisor)))/mipDivisor;
            prefilteredColor = mix(prefilteredColor1,prefilteredColor2,mixValue);

            vec2 envBRDF  = texture2D(uBRDFTex, vec2(max(dot(N, V), 0.0), ToLinear(uMaterialRoughness.rrr).r)).rg;
            vec3 specular = prefilteredColor * (F * envBRDF.x + envBRDF.y);
              
            vec3 ambient = (kD * diffuse + specular);// * ao; 

            color = (ambient + Lo) * 1.2;

            //color *= 2.0;

            //ACES ?
            //color = color / (color + vec3(1.0));
            color = tonemapAces(color);


            color = pow(color, vec3(1.0/2.2));  
           // 

        `;
    }
    if (aLightNum) {
      fragString += /*glsl*/ `
          for(int x = 0; x < NUM_AMBIENT_LIGHTS; x++){
            //ambientColor += (pow(uAmbientLights[x].color,gamma) * uAmbientLights[x].strength) * vMaterialDiffuse;
          };
        `;
    }

    fragString += /*glsl*/ `
          //vec4 color = diffuseAcc + ambientColor + specularAcc;
          // color.rgb = pow(color.rgb, vec3(1.0/2.2));
          gl_FragColor = vec4(color, 1.0);
          
        }
        `;

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
    const { camera, meshes } = props;

    if (enabledIn.value) {
      //console.log(props.ambientLights)
      uniforms = {
        uProjectionMatrix: camera.projectionMatrix,
        uViewMatrix: camera.viewMatrix,
        uCameraPositionWorld: camera.position,
        uModelMatrix: [],
        uMaterialAlbedo: [1, 1, 1, 1],
        uMaterialMetallic: [1, 1, 1, 1],
        uMaterialRoughness: [1, 1, 1, 1],
        uIrridianceCubemap: props.irridianceCubemap,
        uPFEMTex: props.pfemTex,
        uBRDFTex: props.brdfTex,
        uPFEMMipNumber: props.pfemMipNumber,
      };
      //console.log(camera)

      if (props.ambientLights) {
        if (aLightNum != props.ambientLights.length) {
          vertexNeedsUpdating = true;
        }
        props.ambientLights.forEach((light, i) => {
          let uniformName = "uAmbientLights[" + i + "].color";
          uniforms[uniformName] = light.color;
          uniformName = "uAmbientLights[" + i + "].strength";
          uniforms[uniformName] = light.strength;
        });
      } else if (!props.ambientLights && aLightNum) {
        vertexNeedsUpdating = true;
      }
      if (props.directionalLights) {
        if (dLightNum != props.directionalLights.length) {
          vertexNeedsUpdating = true;
        }
        props.directionalLights.forEach((light, i) => {
          let uniformNameColor = "uDirectionalLights[" + i + "].color";
          let uniformNamePosition = "uDirectionalLights[" + i + "].position";
          let uniformNameDepth = "uDirectionalLightsDepthTexture[" + i + "]";
          let uniformNameViewMatrix =
            "uDirectionalLights[" + i + "].viewMatrix";
          let uniformNameProjectionMatrix =
            "uDirectionalLights[" + i + "].projectionMatrix";
          let uniformNameNear = "uDirectionalLights[" + i + "].near";
          let uniformNameFar = "uDirectionalLights[" + i + "].far";
          let uniformNameBias = "uDirectionalLights[" + i + "].bias";
          let uniformNameIntensity = "uDirectionalLights[" + i + "].intensity"
         
          uniforms[uniformNameColor] = light.color;
          uniforms[uniformNameIntensity] = light.intensity;
          uniforms[uniformNamePosition] = light.position;
          uniforms[uniformNameDepth] = light.depthTexture;
          uniforms[uniformNameViewMatrix] = light.viewMatrix;
          uniforms[uniformNameNear] = light.near;
          uniforms[uniformNameFar] = light.far;
          uniforms[uniformNameBias] = light.bias;
          uniforms[uniformNameProjectionMatrix] = light.projectionMatrix;
        });
      } else if (!props.directionalLights && dLightNum) {
        vertexNeedsUpdating = true;
      }
      if (props.pointLights) {
        if (pLightNum != props.pointLights.length) {
          vertexNeedsUpdating = true;
        }
        props.pointLights.forEach((light, i) => {
          // let uniformNameDiffuse = "uPointLights[" + i + "].diffuse";
          // let uniformNameSpecular = "uPointLights[" + i + "].specular";
          // let uniformNamePosition = "uPointLights[" + i + "].position";
          // uniforms[uniformNameDiffuse] = light.diffuse;
          // uniforms[uniformNameSpecular] = light.specular;
          // uniforms[uniformNamePosition] = light.position;
        });
      } else if (!props.pointLights && pLightNum) {
        vertexNeedsUpdating = true;
      }

      if (vertexNeedsUpdating) {
        aLightNum = props.ambientLights ? props.ambientLights.length : 0;
        pLightNum = props.pointLights ? props.pointLights.length : 0;
        dLightNum = props.directionalLights
          ? props.directionalLights.length
          : 0;

        //ctx.dispose(drawcmd.pipeline)
        drawCmd.pipeline = GetPipeline(aLightNum, dLightNum, pLightNum);
        vertexNeedsUpdating = false;
      }

      meshes.forEach((mesh) => {
        uniforms.uModelMatrix = mesh.modelMatrix;
        uniforms.uMaterialAlbedo = mesh.albedo;
        uniforms.uMaterialMetallic = mesh.metallic;
        uniforms.uMaterialRoughness = mesh.roughness;
        uniforms.uIrridianceCubemap = props.irridianceCubemap;
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

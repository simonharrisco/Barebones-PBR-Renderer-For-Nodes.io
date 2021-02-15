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

      uniform vec4 uMaterialDiffuse;
      uniform vec4 uMaterialSpecular;
      uniform float uMaterialShininess;
      

      varying vec3 vNormalView;
      varying vec3 vPositionView;
      varying vec3 vNormal;

      varying vec4 vMaterialDiffuse;
      varying vec4 vMaterialSpecular;
      varying float vMaterialShininess;

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
        vMaterialDiffuse = uMaterialDiffuse;
        vMaterialSpecular = uMaterialSpecular;
        vMaterialShininess = uMaterialShininess;

        vPositionWorld =  vec4(uModelMatrix * vec4(aPosition, 1.0)).xyz;
        //vNormalView = normalize(vec3(uViewMatrix * uModelMatrix * vec4(aNormal, 0.0)));
         vec3 normal = mat3(transpose(inverse(uModelMatrix))) * aNormal;
        vNormalView = normalize(vec3(uViewMatrix * vec4(normal,0.0)));
        vPositionView = vec3(uViewMatrix * uModelMatrix * vec4(aPosition, 1.0)); 


        gl_Position =  uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aPosition, 1.0);
      }
      `;

    let fragString = `
        precision highp float;     
        varying vec3 vNormalView;
        varying vec3 vPositionView;
        varying vec3 vPositionWorld;
        uniform mat4 uViewMatrix;
        uniform mat4 uModelMatrix;

        varying vec4 lightCol;
        vec4 ambientColor = vec4(0);
        vec3 L;
        vec3 H;
        vec3 E;
        
        vec4 diffuseAcc = vec4(0);
        vec4 specularAcc = vec4(0);

        float constant = 1.0;
        float linear = 0.09;
        float quadratic = 0.032;
        vec4 gamma = vec4(vec3(2.2),1.0);

        varying vec4 vMaterialDiffuse;
        varying vec4 vMaterialSpecular;
        varying float vMaterialShininess;

        vec4 shadowSample = vec4(0,0,0,1);
      

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
              vec3 direction;
              vec4 diffuse;
              vec4 specular;
              sampler2D depthTexture;
              mat4 viewMatrix;
              mat4 projectionMatrix;
              float near;
              float far;
              float bias;
            };
            uniform uDirectionalLight uDirectionalLights[NUM_DIRECTIONAL_LIGHTS];
          `;
    }

    if (pLightNum) {
      fragString += /*glsl*/ `
            const int NUM_POINT_LIGHTS = ${pLightNum};
            struct uPointLight {
              vec4 diffuse;
              vec4 specular;
              vec3 position;

              float constant;
              float linear;
              float quadratic;  

            };
            uniform uPointLight uPointLights[NUM_POINT_LIGHTS];
          `;
    }
    fragString += `
        void main () {                
        `;
    if (aLightNum) {
      fragString += /*glsl*/ `
          for(int x = 0; x < NUM_AMBIENT_LIGHTS; x++){
            ambientColor += pow((pow(uAmbientLights[x].color,gamma) * uAmbientLights[x].strength) * pow(vMaterialDiffuse,gamma),(1.0/gamma));
          };
        `;
    }
    if (dLightNum) {
      fragString += /*glsl*/ `
          for(int x = 0; x < NUM_DIRECTIONAL_LIGHTS; x++){
            //L = -normalize(vec3(uViewMatrix * vec4(normalize(uDirectionalLights[x].direction),1)));

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

            float sampleValue = texture2D(uDirectionalLights[x].depthTexture,positionLightUV).r;
            float readDepth = (sampleValue *  (uDirectionalLights[x].far - uDirectionalLights[x].near)) + uDirectionalLights[x].near;


            if(positionDistanceToLight < readDepth){
              shadowSample = vec4(1.0);
            }
            //add color
            L = -normalize(vec3(uViewMatrix * vec4(normalize(uDirectionalLights[x].direction),0.0)));
            vec4 diffuse =  max(dot(L,vNormalView), 0.0) * (pow(uDirectionalLights[x].diffuse,gamma) * pow(vMaterialDiffuse,gamma));
            diffuseAcc += pow(diffuse,(1.0/gamma)) * shadowSample;
            //diffuseAcc += vec4(vec3(0.3),1);
          
            vec3 viewDir = normalize(vPositionView);
            vec3 reflectDir = reflect(L, vNormalView);
            vec3 halfwayDir = normalize(reflectDir+viewDir);

            float spec = pow(max(dot(reflectDir,viewDir), 0.0), vMaterialShininess);
            vec4 specular = spec * (pow(uDirectionalLights[x].specular,gamma) * pow(vMaterialSpecular,gamma));
            if (dot(L, vNormalView) < 0.0){
              specular = vec4(0.0, 0.0, 0.0, 1.0);
            }
            specularAcc += pow(specular,(1.0,gamma)) * shadowSample; 

            
            
          };
        `;
    }
    if (pLightNum) {
      fragString += /*glsl*/ `
          for(int x = 0; x < NUM_POINT_LIGHTS; x++){

            vec3 lightPosView = vec3(uViewMatrix * vec4(uPointLights[x].position,1));
            L = normalize(lightPosView - vPositionView);

            float distance    = length(lightPosView - vPositionView);
            float attenuation = 1.0 / (constant + (linear * distance) + (quadratic * (distance * distance)));   

            vec4 diffuse = (max(dot(L, vNormalView), 0.0) * (pow(uPointLights[x].diffuse,gamma) * pow(vMaterialDiffuse,gamma)) * attenuation;
            diffuseAcc += pow(diffuse,(1.0/gamma));
            
            vec3 viewDir = normalize(vPositionView);
            vec3 reflectDir = reflect(L, vNormalView);
            vec3 halfwayDir = normalize(reflectDir+viewDir);

            float spec = pow(max(dot(reflectDir,viewDir), 0.0), vMaterialShininess);
            vec4 specular = spec * (pow(uPointLights[x].specular,gamma) * pow(vMaterialSpecular,gamma)) * attenuation;
            if (dot(L, vNormalView) < 0.0){
               specular = vec4(0.0, 0.0, 0.0, 1.0);
            }
           specularAcc += pow(specular,(1.0,gamma)); 
          };
        `;
    }
    fragString += /*glsl*/ `
          vec4 color = diffuseAcc + ambientColor + specularAcc;
          // color.rgb = pow(color.rgb, vec3(1.0/2.2));
          gl_FragColor = color;
          
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
        uModelMatrix: [],
        uMaterialDiffuse: [1, 1, 1, 1],
        uMaterialSpecular: [1, 1, 1, 1],
        uMaterialShininess: 32,
      };

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
          let uniformNameDiffuse = "uDirectionalLights[" + i + "].diffuse";
          let uniformNameSpecular = "uDirectionalLights[" + i + "].specular";
          let uniformNamePosition = "uDirectionalLights[" + i + "].direction";
          let uniformNameDepth = "uDirectionalLights[" + i + "].depthTexture";
          let uniformNameViewMatrix =
            "uDirectionalLights[" + i + "].viewMatrix";
          let uniformNameProjectionMatrix =
            "uDirectionalLights[" + i + "].projectionMatrix";
          let uniformNameNear = "uDirectionalLights[" + i + "].near";
          let uniformNameFar = "uDirectionalLights[" + i + "].far";
          let uniformNameBias = "uDirectionalLights[" + i + "].bias";
          uniforms[uniformNameDiffuse] = light.diffuse;
          uniforms[uniformNameSpecular] = light.specular;
          uniforms[uniformNamePosition] = light.direction;
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
          let uniformNameDiffuse = "uPointLights[" + i + "].diffuse";
          let uniformNameSpecular = "uPointLights[" + i + "].specular";
          let uniformNamePosition = "uPointLights[" + i + "].position";
          uniforms[uniformNameDiffuse] = light.diffuse;
          uniforms[uniformNameSpecular] = light.specular;
          uniforms[uniformNamePosition] = light.position;
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

        (uniforms.uMaterialDiffuse = mesh.diffuse),
          (uniforms.uMaterialSpecular = mesh.specular),
          (uniforms.uMaterialShininess = mesh.shininess);

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

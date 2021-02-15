module.exports = (node, graph) => {
  const { cube: createCube, sphere : createSphere, torus: createTorus } = require("primitive-geometry");
  const { mat4, quat } = require('pex-math');
  const triggerIn = node.triggerIn("in");
  const triggerOut = node.triggerOut("out");

  const transformIn = node.in('transform', [0,0,0])
  const rotationIn = node.in('rotation',[0,0,0,0])
  const scaleIn = node.in('scale', [1,1,1])

  const albedoIn = node.in('albedo',[0,0,0,1],{type:"color"})
  const metallicIn = node.in('metalic',[0,0,0,1],{type:"color"})
  const roughnessIn = node.in('roughness',[0,0,0,1],{type:"color"})
  
  let meshIn = node.in('mesh',null);
  
  let meshes;
  let modelMatrix = mat4.create();

  let q = quat.create()
  let geo = createTorus();
  let mesh = {
      geo,
      modelMatrix,
      albedo : albedoIn.value,
      metallic : metallicIn.value,
      roughness : roughnessIn.value
    }
  triggerIn.onTrigger = (props) => {
    let { ctx } = props
    meshes = props.meshes || [];
 
    if(meshIn.value) geo = meshIn.value

    mat4.fromTranslationRotationScale(modelMatrix, transformIn.value, quat.fromEuler(q,rotationIn.value), scaleIn.value)
    mesh.geo = geo;
    mesh.modelMatrix = modelMatrix;
    mesh.albedo = albedoIn.value
    mesh.metallic = metallicIn.value
    mesh.roughness = roughnessIn.value
    meshes.push(mesh)
  

    props.meshes = meshes
    triggerOut.trigger(props);
  }

  node.onReady = () => {
  };
  node.onDestroy = () => {
  };
};
module.exports = (node, graph) => {
  const { cube: createCube, sphere : createSphere } = require("primitive-geometry");
  const { mat4, quat } = require('pex-math');
  const triggerIn = node.triggerIn("in");
  const triggerOut = node.triggerOut("out");

  const transformIn = node.in('transform', [0,0,0])
  const rotationIn = node.in('rotation',[0,0,0,0])
  const scaleIn = node.in('scale', [1,1,1])

  const diffuseIn = node.in('diffuse',[0,0,0,1],{type:"color"})
  const specularIn = node.in('specular',[0,0,0,1],{type:"color"})
  const shininessIn = node.in('shininess',0.5,{min: 0, max: 100})

  let meshIn = node.in('mesh',null);
  
  let meshes;
  let modelMatrix = mat4.create();

  let q = quat.create()
  let geo = createSphere();
  triggerIn.onTrigger = (props) => {
    let { ctx } = props
    meshes = props.meshes || [];

    mat4.fromTranslationRotationScale(modelMatrix, transformIn.value, quat.fromEuler(q,rotationIn.value), scaleIn.value)
    
    meshes.push({
      geo,
      modelMatrix,
      diffuse : diffuseIn.value,
      specular : specularIn.value,
      shininess : shininessIn.value
      })

    


    props.meshes = meshes
    triggerOut.trigger({
      ...props,
      
    });
  }

  node.onReady = () => {
  };
  node.onDestroy = () => {
  };
};
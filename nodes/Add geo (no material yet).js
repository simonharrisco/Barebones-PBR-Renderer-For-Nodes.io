module.exports = (node, graph) => {
  const { cube: createCube } = require("primitive-geometry");
  const { mat4, quat } = require('pex-math');
  const triggerIn = node.triggerIn("in");
  const triggerOut = node.triggerOut("out");

  const transformIn = node.in('transform', [0,0,0])
  const rotationIn = node.in('rotation',[0,0,0,0])
  const scaleIn = node.in('scale', [1,1,1])

  let meshIn = node.in('mesh',null);
  
  let meshes;
  let modelMatrix = mat4.create();

  let q = quat.create()
  let geo = createCube(1);
  triggerIn.onTrigger = (props) => {
    let { ctx } = props
    meshes = props.meshes || [];

    mat4.fromTranslationRotationScale(modelMatrix, transformIn.value, quat.fromEuler(q,rotationIn.value), scaleIn.value)
    
    meshes.push({
      geo,
      modelMatrix,
      diffuse : [0.8,0,1],
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
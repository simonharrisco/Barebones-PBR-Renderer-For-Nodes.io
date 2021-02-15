module.exports = (node, graph) => {
  const { cube: createCube } = require("primitive-geometry");
  const { mat4 } = require('pex-math');
  const triggerIn = node.triggerIn("in");
  const triggerOut = node.triggerOut("out");

  const transformIn = node.in('position', [0,0,0])
  const color = node.in('color',[0,0,0,1],{type:"color"})
  // const rotationIn = node.in('rotation',[0,0,0,0])
  // const scaleIn = node.in('scale', [1,1,1])

  let meshIn = node.in('mesh',null);
  
  let pointLights = []
  let pointLight = {
    diffuse : [1, 1,1, 1],
    specular : [1, 1, 1, 1],
    position : [1,1,1],
  }


  triggerIn.onTrigger = (props) => {
    let { ctx } = props
    // pointLights = props.pointLights || [];

    // pointLights.push(pointLight);   

    // props.pointLights = pointLights
    // triggerOut.trigger({
    //   ...props,
    //   pointLights     
    // });

    pointLight.diffuse = color.value
    pointLight.specular = color.value
    pointLight.position = transformIn.value
    
    

    if(props.pointLights){
      props.pointLights.push(pointLight)
    } else {
      props.pointLights = [pointLight]
    }    
  }

  node.onReady = () => {
  };
  node.onDestroy = () => {
  };
};
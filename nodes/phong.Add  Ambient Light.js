module.exports = (node, graph) => {
  const { cube: createCube } = require("primitive-geometry");
  const { mat4 } = require('pex-math');
  const triggerIn = node.triggerIn("in");
  const triggerOut = node.triggerOut("out");

  const colorIn = node.in('color',[0.5,0.5,0.5,1],{type: "color"})
  const strengthIn = node.in('strength',0.1)

  let meshIn = node.in('mesh',null);
  
  let ambientLights = []
  let ambientLight = {
    color : [1, 1, 1, 1],
    strength : 0.1
  }

  triggerIn.onTrigger = (props) => {
    let { ctx } = props
    
    ambientLight = {
      color: colorIn.value,
      strength : strengthIn.value
    }

    if(props.ambientLights){
      props.ambientLights.push(ambientLight)
    } else {
      props.ambientLights = [ambientLight]
    }    
  }

  node.onReady = () => {
  };
  node.onDestroy = () => {
  };
};
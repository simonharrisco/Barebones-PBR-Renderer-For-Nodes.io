module.exports = (node, graph) => {
  const { cube: createCube } = require("primitive-geometry");
  const { mat4,quat,vec3 } = require('pex-math');
  const triggerIn = node.triggerIn("in");
  const triggerOut = node.triggerOut("out");

  const positionIn = node.in('position', [0,0,0])
  const color = node.in('color',[0,0,0,1],{type:"color"})

  const nearIn = node.in('near',0.01)
  const farIn = node.in('far',100)
  const widthIn = node.in('width',10)

  const biasIn = node.in('bias',0.1);
  
  let ctx = graph.ctx


  let shadowDepthTex = graph.ctx.texture2D({
    width: 1024,
    height: 1024,
    pixelFormat: ctx.PixelFormat.Depth,
    encoding: ctx.Encoding.Linear
  })
  let shadowColorTex = graph.ctx.texture2D({
    width: 1024,
    height: 1024,
    pixelFormat: ctx.PixelFormat.RGBA8,
  })
  let pass = ctx.pass({
              color: [shadowColorTex],
              depth: shadowDepthTex ,
            })
  let directionalLights = []
  let directionalLight = {
    ambient : [0.1, 0.1, 0.1, 1],
    diffuse : [0, 0, 1, 1],
    specular : [0, 0, 1, 1],
    depthTexture : shadowDepthTex,
    colorTexture : shadowColorTex,
    near : 0.01,
    far: 50,
    width : 10,
    bias : 0.1,
    projectionMatrix : mat4.create(),
    direction : vec3.create(),
    viewMatrix : mat4.create(),
    inverseViewMatrix : mat4.create(),
    pass : pass
  }

  let viewMatrix = mat4.create()
  let inverseViewMatrix = mat4.create()
  let q = quat.create() 

  let ortho = mat4.create();

  let needsUpdate = true;
  function requestUpdate(){
    needsUpdate = true;
  }


  triggerIn.onTrigger = (props) => {
    let { ctx } = props

    //console.log(color.value)
    if(needsUpdate){
      directionalLight.diffuse = color.value
      directionalLight.specular = color.value
      directionalLight.near = nearIn.value
      directionalLight.far = farIn.value
      directionalLight.width = widthIn.value
      directionalLight.projectionMatrix = mat4.ortho(ortho, -widthIn.value, widthIn.value, -widthIn.value, widthIn.value, nearIn.value, farIn.value)
      directionalLight.direction = [-positionIn.value[0],-positionIn.value[1],-positionIn.value[2]]
      mat4.lookAt(viewMatrix,positionIn.value,[0,0,0],[0,1,0])
      directionalLight.viewMatrix = viewMatrix;
      inverseViewMatrix = mat4.copy(viewMatrix)
      mat4.invert(inverseViewMatrix)
      directionalLight.bias = biasIn.value

      needsUpdate = false
    }

    
    if(props.directionalLights){
      props.directionalLights.push(directionalLight)
    } else {
      props.directionalLights = [directionalLight]
    }    
    triggerOut.trigger(props)


  }


  positionIn.onChange = requestUpdate;
  color.onChange = requestUpdate;

  nearIn.onChange = requestUpdate;
  farIn.onChange = requestUpdate;
  widthIn.onChange = requestUpdate;

  biasIn.onChange = requestUpdate;
  

  node.onReady = () => {
  };
  node.onDestroy = () => {
  };
};
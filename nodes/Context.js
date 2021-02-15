module.exports = function (node, graph) {
  const createContext = require('pex-context')
  const fitRect = require('fit-rect')
  
  var sceneCanvas = document.createElement('canvas')
  sceneCanvas.width = graph.sceneContainer.clientWidth
  sceneCanvas.height = graph.sceneContainer.clientHeight
  graph.sceneContainer.appendChild(sceneCanvas)
  var ctx = createContext({
    canvas: sceneCanvas,
    powerPreference: 'high-performance',
    antialias: false,
    alpha: false
  })
  graph.ctx = ctx
  graph.canvas = sceneCanvas
  ctx.gl.getExtension('EXT_shader_texture_lod')
  ctx.gl.getExtension('OES_standard_derivatives')
  ctx.gl.getExtension('WEBGL_draw_buffers')
  ctx.gl.getExtension('OES_texture_float')
  
  
  var pixelRatio = 1
  var debugOnce = false
  
  var renderOut = node.triggerOut('out')
  
  graph.sceneContainer.style.background = '#444'
  
  const resolutions = [
    ['W', 'H', 'Inerit'],
    ['W x 1.5', 'H x 1.5', 'Half Retina'],
    ['W x 2', 'H x 2', 'Retina'],
    [1280, 720, 'HD'],	
    [1920, 1080, 'FullHD'],
    [2048, 1024, 'FullHD-ish'],
    [3840, 2160, '4K'],    
    [1080 * 3, 1920, 'V FullHD x3'],
    [1080 * 3 / 2, 1920 / 2, 'V FullHD x3 @ 50%'],
    [720, 1280, 'HD Portrait'],
    [1080, 1920, 'FullHD Portrait'],
    [2160, 3840, '4K Portrait'],
    [800, 800, 'GIF'],
    [2, 2, 'My Computer is Dying'],
  	[2048, 2048, 'Instagram'],
    [1200,630, 'Instagram Export'],
    [1200, 1800, '12x18 Portrait photo'],
    [1200 * 2, 1800 * 2, '12x18 Portrait photo HD'],    
  ]
  
  const align = ['start', 'center']
  
  const resolutionItems = resolutions.map((r) => `${r[0]} x ${r[1]} - ${r[2]}`)
  const resolutionIn = node.in('resolution', resolutionItems[0], {
    type: 'dropdown', values: resolutionItems, connectable: false
  })
  const alignIn = node.in('align', 'center', { values: align, type: 'dropdown', connectable: false })
  alignIn.onChange = updateSize
  const autoClearIn = node.in('Auto clear', true)
  
  let prevContainerResolution = [...resolutions[0]]
  
  function resizeAndFitCanvas(canvas, size, containerSize) {
    // Set canvas size
    canvas.width = size[0]
    canvas.height = size[1]
  
    // Fit canvas into its parent container
    const rect = [0, 0, size[0], size[1]] // Canvas width
    const target = [0, 0, containerSize[0], containerSize[1]] // Container size
    const containedRect = fitRect(rect, target, 'contain')
    const left = (alignIn.value == 'center') ? ~~containedRect[0] : 0
    const top = (alignIn.value == 'center') ? ~~containedRect[1] : 0
    canvas.style.position = 'absolute'
    canvas.style.transform = `translate3d(${left}px, ${top}px, 0)`
    canvas.style.width = ~~containedRect[2] + 'px'
    canvas.style.height = ~~containedRect[3] + 'px'
    
    node.comment = `${canvas.width} x ${canvas.height}`
  }
  
  function updateSize () {
    // Set container resolution
    resolutions[0][0] = graph.sceneContainer.clientWidth
    resolutions[0][1] = graph.sceneContainer.clientHeight
    resolutions[1][0] = Math.floor(graph.sceneContainer.clientWidth * 1.5)
    resolutions[1][1] = Math.floor(graph.sceneContainer.clientHeight * 1.5)
    resolutions[2][0] = graph.sceneContainer.clientWidth * 2
    resolutions[2][1] = graph.sceneContainer.clientHeight * 2
    
    // Get current resolution
    const resolution = resolutions[resolutionItems.indexOf(resolutionIn.value)] || resolutions[0]
    
    const sceneCanvas = graph.ctx.gl.canvas
  
    // Check if canvas resolution or container size is different
    if (
      sceneCanvas.width !== resolution[0] ||
      sceneCanvas.height !== resolution[1] ||
      resolutions[0][0] !== prevContainerResolution[0] ||
      resolutions[0][1] !== prevContainerResolution[1]
    ) {
      resizeAndFitCanvas(sceneCanvas, resolution, resolutions[0])
      
      prevContainerResolution = [...resolutions[0]]
      
      graph.nodes.forEach((node) => {
        node.onResize && node.onResize(sceneCanvas.width, sceneCanvas.height)
      })
    }
  }
  
  var initialState = {
    contextResolutions: resolutionItems,
    getContextResolution: () => resolutionIn.value,
    setContextResolution: (res) => {
      resolutionIn.setValue(res)
      updateSize()
    }
  }
  
  var clearCmd = {
    pass: ctx.pass({
      clearColor: [0.01, 0.01, 0.02, 1],
      clearDepth: 1
    })
  }
  
  var isDestroyed = false
  
  ctx.frame(() => {
    updateSize()
    
    ctx.debug(debugOnce)
    if (autoClearIn.value) {
    	ctx.submit(clearCmd)
    }
    
    debugOnce = false
   
    renderOut.trigger(initialState)
  
    return !isDestroyed
  })
  
  node.onDestroy = function () {
    sceneCanvas.parentNode.removeChild(sceneCanvas)
    isDestroyed = true
  }
  
  
  
}
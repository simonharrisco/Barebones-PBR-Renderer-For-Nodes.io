module.exports = (node, graph) => {
  const triggerIn = node.triggerIn("in");
  const triggerOut = node.triggerOut("out");
  const { perspective, orbiter: createOrbiter } = require("pex-cam");
  const backgroundColorIn = node.in("background color", [1, 1, 1, 1], {
    type: "color",
  });
  const nearIn = node.in("near", 1);
  const farIn = node.in("far", 100);
  const ctx = graph.ctx;

  node.comment = "Camera with Orbiter";

  const camera = perspective({
    fov: Math.PI / 4,
    near: 10,
    far: 200,
    aspect: ctx.gl.drawingBufferWidth / ctx.gl.drawingBufferHeight,
  });

  const orbiter = createOrbiter({
    camera: camera,
    // position: [3, 3, 0],
    lon: -45,
    lat: 45,
    element: ctx.gl.canvas,
    distance: 8,
    maxDistance: 80,
    easing: 0.1,
    autoUpdate: false,
  });

  node.onResize = () => {
    camera.set({
      aspect: ctx.gl.drawingBufferWidth / ctx.gl.drawingBufferHeight,
    });
  };

  const clearCmd = {
    pass: ctx.pass({
      clearColor: [0.2, 0.5, 1, 1],
      clearDepth: 1,
    }),
  };

  backgroundColorIn.onChange = () => {
    clearCmd.pass.clearColor = backgroundColorIn.value;
  };

  nearIn.onChange = () => camera.set({ near: nearIn.value });
  farIn.onChange = () => camera.set({ far: farIn.value });

  triggerIn.onTrigger = (props) => {
    ctx.submit(clearCmd);

    orbiter.updateCamera();

    triggerOut.trigger({
      ...props,
      camera,
      orbiter,
    });
  };
};

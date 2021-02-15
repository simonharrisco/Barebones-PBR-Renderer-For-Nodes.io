module.exports = function (node, graph) {
  const createContext = require("pex-context");
  const fitRect = require("fit-rect");

  // Ports
  const resolutions = [
    // Fluid
    ["W", "H", "Inerit"],
    ["W x 1.5", "H x 1.5", "Half Retina"],
    ["W x 2", "H x 2", "Retina"],

    // High-definition 16:9
    [640, 360, "nHD"],
    [960, 540, "qHD"],
    [1280, 720, "HD"],
    [1600, 900, "HD+ (HD Plus)"],
    [1920, 1080, "FHD (Full HD)"],
    [2560, 1440, "(W)QHD"],
    [3200, 1800, "QHD+"],
    [3840, 2160, "4K UHD"],
    [5120, 2880, "5K"],
    [7680, 4320, "8K UH"],

    // Social and Utils
    [2, 2, "My Computer is Dying"],
    [800, 800, "GIF"],
    [2048, 2048, "Instagram"],
    [1200, 630, "Instagram Export"],
    [1200, 1800, "12x18 Portrait photo"],
    [1200 * 2, 1800 * 2, "12x18 Portrait photo HD"],
  ];

  const resolutionItems = resolutions.map((r) => `${r[0]} x ${r[1]} - ${r[2]}`);
  const resolutionIn = node.in("resolution", resolutionItems[0], {
    type: "dropdown",
    values: resolutionItems,
    connectable: false,
  });
  const portraitIn = node.in("portrait", false);
  const alignIn = node.in("align", "center", {
    values: ["start", "center"],
    type: "dropdown",
    connectable: false,
  });
  alignIn.onChange = () => updateSize(true);
  const autoClearIn = node.in("Auto clear", true);
  const renderOut = node.triggerOut("out");

  // Create canvas and get context
  let sceneCanvas = document.createElement("canvas");
  sceneCanvas.width = graph.sceneContainer.clientWidth;
  sceneCanvas.height = graph.sceneContainer.clientHeight;
  graph.sceneContainer.appendChild(sceneCanvas);

  const ctx = createContext({
    canvas: sceneCanvas,
    powerPreference: "high-performance",
    antialias: false,
    alpha: false,
  });
  ctx.gl.getExtension("EXT_shader_texture_lod");
  ctx.gl.getExtension("OES_standard_derivatives");
  ctx.gl.getExtension("WEBGL_draw_buffers");
  ctx.gl.getExtension('WEBGL_depth_texture');
  ctx.gl.getExtension("OES_texture_float");
  //ctx.gl.getExtension("EXT_texture_filter_anisotropic");
  //ctx.gl.getExtension("EXT_color_buffer_float");

  graph.ctx = ctx;
  graph.canvas = sceneCanvas;
  graph.sceneContainer.style.background = "#444";

  // Handle resize
  let prevContainerResolution = [...resolutions[0]];

  function resizeAndFitCanvas(canvas, size, containerSize) {
    // Set canvas size
    canvas.width = size[0];
    canvas.height = size[1];

    // Fit canvas into its parent container
    const rect = [0, 0, size[0], size[1]]; // Canvas width
    const target = [0, 0, containerSize[0], containerSize[1]]; // Container size
    const containedRect = fitRect(rect, target, "contain");
    const left = alignIn.value === "center" ? ~~containedRect[0] : 0;
    const top = alignIn.value === "center" ? ~~containedRect[1] : 0;
    canvas.style.position = "absolute";
    canvas.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    canvas.style.width = ~~containedRect[2] + "px";
    canvas.style.height = ~~containedRect[3] + "px";

    node.comment = `${canvas.width} x ${canvas.height}`;
  }

  function updateSize(force) {
    // Get container size
    let clientWidth = graph.sceneContainer.clientWidth;
    let clientHeight = graph.sceneContainer.clientHeight;

    // Set container resolution
    resolutions[0][0] = clientWidth;
    resolutions[0][1] = clientHeight;
    resolutions[1][0] = Math.floor(clientWidth * 1.5);
    resolutions[1][1] = Math.floor(clientHeight * 1.5);
    resolutions[2][0] = clientWidth * 2;
    resolutions[2][1] = clientHeight * 2;

    // Get current resolution
    const resolution = [
      ...(resolutions[resolutionItems.indexOf(resolutionIn.value)] ||
        resolutions[0]),
    ];

    if (portraitIn.value) {
      [resolution[0], resolution[1]] = [resolution[1], resolution[0]];
    }

    const canvas = graph.ctx.gl.canvas;

    // Check if canvas resolution or container size is different
    if (
      force ||
      canvas.width !== resolution[0] ||
      canvas.height !== resolution[1] ||
      resolutions[0][0] !== prevContainerResolution[0] ||
      resolutions[0][1] !== prevContainerResolution[1]
    ) {
      resizeAndFitCanvas(canvas, resolution, resolutions[0]);

      prevContainerResolution = [...resolutions[0]];

      graph.nodes.forEach((node) => {
        node.onResize && node.onResize(canvas.width, canvas.height);
      });
    }
  }

  const initialState = {
    contextResolutions: resolutionItems,
    getContextResolution: () => resolutionIn.value,
    setContextResolution: (res) => {
      resolutionIn.setValue(res);
      updateSize();
    },
  };

  const clearCmd = {
    pass: ctx.pass({
      clearColor: [0.01, 0.01, 0.02, 1],
      clearDepth: 1,
    }),
  };

  let debugOnce = false;
  let isDestroyed = false;

  ctx.frame(() => {
    updateSize();

    ctx.debug(debugOnce);
    if (autoClearIn.value) {
      ctx.submit(clearCmd);
    }

    debugOnce = false;

    renderOut.trigger(
      {...initialState,
        ctx,
      });

    return !isDestroyed;
  });

  node.onDestroy = function () {
    sceneCanvas.remove();
    isDestroyed = true;
  };
};

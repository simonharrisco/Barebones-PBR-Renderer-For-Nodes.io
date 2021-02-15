module.exports = (node, graph) => {
  const triggerIn = node.triggerIn("in");
  const triggerOut = node.triggerOut("out");

  const tIn = node.in("t", 0);
  const enabledIn = node.in("enabled", true);

  const div = document.createElement("div");
  div.style.position = "absolute";
  div.style.left = "0px";
  div.style.width = "12em";
  div.style.top = "0px";
  div.style.background = "#FFFFFF";
  div.style.padding = "2px";
  div.style.lineHeight = "150%";
  div.innerText = "";

  const gl = graph.ctx.gl;
  const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
  const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
  const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);

  enabledIn.onChange = (enabled) => {
    if (div) {
      if (enabled) {
        div.style.display = "block";
      } else {
        div.style.display = "none";
      }
    }
  };

  node.onReady = () => {
    graph.sceneContainer.appendChild(div);
  };

  node.onDestroy = () => {
    if (div.parentElement) {
      div.remove();
    }
  };

  let prevTime = 0;
  let time = 0;
  let fpsCount = 0;
  let fps = 0;

  triggerIn.onTrigger = (props) => {
    const now = Date.now();
    if (!prevTime) prevTime = now;
    const deltaTime = now - prevTime;
    time += deltaTime / 1000;
    prevTime = now;
    fpsCount++;

    if (time > 1) {
      fps = fpsCount;
      fpsCount = 0;
      time -= 1;
    }

    triggerOut.trigger(props);
    const frameTime = Date.now() - now;

    div.innerText = `Frame Time: ${frameTime}
RAF Time: ${deltaTime}
FPS: ${fps}
T: ${tIn.value.toFixed(2)}
${vendor}
${renderer}`;
  };
};

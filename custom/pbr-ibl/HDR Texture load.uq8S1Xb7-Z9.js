module.exports = (node, graph) => {
  const io = require("pex-io");
  const parseHdr = require("parse-hdr");

  const ctx = graph.ctx;
  const url = node.in("url", "", { type: "asset" });
  const texture = node.out("texture out");

  url.onChange = async () => {
    await processImg();
  };

  async function processImg() {
    texture.setValue(await loadHDR(url.value));
  }
  processImg();

  async function loadHDR(url) {
    if (!url) return;

    const buffer = await io.loadBinary(url);
    const hdrImg = parseHdr(buffer);
    const panorama = ctx.texture2D({
      data: hdrImg.data,
      width: hdrImg.shape[0],
      height: hdrImg.shape[1],
      pixelFormat: ctx.PixelFormat.RGBA32F,
      encoding: ctx.Encoding.Linear,
      flipY: true,
    });

    return panorama;
  }
};

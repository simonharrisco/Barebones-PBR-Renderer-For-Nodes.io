module.exports = (node, graph) => {
  const { loadImage } = require("pex-io");

  const urlIn = node.in("url", "", {
    type: "asset",
    filter: /./,
    thumbnails: true,
  });
  const flipYIn = node.in("flipY", false);
  const textureOut = node.out("texture", null);

  const ctx = graph.ctx;
  const tex = ctx.texture2D({});

  async function update() {
    if (!urlIn.value) return;

    const img = await loadImage(urlIn.value);
    node.commentImage = img;

    if (!img) return;

    ctx.update(tex, { data: img, flipY: flipYIn.value });
    textureOut.setValue(tex);
  }
  urlIn.onChange = flipYIn.onChange = update;
};

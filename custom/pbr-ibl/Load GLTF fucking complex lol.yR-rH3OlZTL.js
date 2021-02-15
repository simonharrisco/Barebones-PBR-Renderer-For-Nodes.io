module.exports = (node, graph) => {
  const {load} = require('@loaders.gl/core');
  const {GLTFLoader} = require('@loaders.gl/gltf');

  const urlIn = node.in('url', '', { type: 'asset', filter: '.gltf' })
  const geometryOut = node.out('geometry', null)

  urlIn.onChange = async () => {
    node.comment = urlIn.value
    if (!urlIn.value) return
    const gltf = await load(urlIn.value, GLTFLoader);

    console.log(gltf)
    
    geometryOut.setValue(gltf)
  }
}

module.exports = (node, graph) => {
  const { loadText } = require('pex-io')
  const parseObj = require('geom-parse-obj')
  const urlIn = node.in('url', '', { type: 'asset', filter: '.obj' })
  const geometryOut = node.out('geometry', null)

  urlIn.onChange = async () => {
    node.comment = urlIn.value
    if (!urlIn.value) return
    const obj = await loadText(urlIn.value)
    let g = parseObj(obj)

    if (g.length) {
      g = g[0]
      node.comment += '\nThis file has multiple objects inside.'
    }
    geometryOut.setValue(g)
  }
}

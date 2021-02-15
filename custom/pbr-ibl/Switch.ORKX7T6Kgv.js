module.exports = (node, graph) => {
  const triggerIn = node.triggerIn('in')
  const switchIn = node.in('switch', 0, {min:0,max:4,precision: 0})
  
  const triggerOut0 = node.triggerOut('out')
  const triggerOut1 = node.triggerOut('out1')
  const triggerOut2 = node.triggerOut('out2')
  const triggerOut3 = node.triggerOut('out3')
  const triggerOut4 = node.triggerOut('out4')

  const commentIn = node.in('comment', '')
  
  commentIn.onChange = (comment) => {
    node.comment = comment    
  }

  triggerIn.onTrigger = (props) => {
    const value = switchIn.value
    if (value == 0) triggerOut0.trigger(props)
    if (value == 1) triggerOut1.trigger(props)
    if (value == 2) triggerOut2.trigger(props)
    if (value == 3) triggerOut3.trigger(props)
    if (value == 4) triggerOut4.trigger(props)

  }
}
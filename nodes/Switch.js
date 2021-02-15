module.exports = (node, graph) => {
  const triggerIn = node.triggerIn('in')
  const switchIn = node.in('switch', true)
  
  const triggerOut1 = node.triggerOut('out1')
  const triggerOut2 = node.triggerOut('out2')
  const commentIn = node.in('comment', '')
  
  commentIn.onChange = (comment) => {
    node.comment = comment    
  }

  triggerIn.onTrigger = (props) => {
    const value = switchIn.value
    if (value == false) triggerOut1.trigger(props)
    if (value == true) triggerOut2.trigger(props)
  }
}
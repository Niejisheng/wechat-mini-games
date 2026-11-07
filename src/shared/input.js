function touchPosition(touch) {
  return {
    x: touch.clientX ?? touch.pageX ?? touch.x,
    y: touch.clientY ?? touch.pageY ?? touch.y
  }
}

module.exports = { touchPosition }

function createAppContext({ ctx, width, height, draw, roundRect, text }) {
  return {
    ctx,
    width,
    height,
    draw,
    roundRect,
    text
  }
}

module.exports = { createAppContext }

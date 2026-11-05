function createCanvasTools(ctx) {
  function roundRect(x, y, w, h, r, fill, stroke) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + w, y, x + w, y + h, r)
    ctx.arcTo(x + w, y + h, x, y + h, r)
    ctx.arcTo(x, y + h, x, y, r)
    ctx.arcTo(x, y, x + w, y, r)
    ctx.closePath()
    if (fill) { ctx.fillStyle = fill; ctx.fill() }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke() }
  }

  function text(value, x, y, size, color, align = 'left') {
    ctx.font = `${size}px -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif`
    ctx.fillStyle = color
    ctx.textAlign = align
    ctx.textBaseline = 'middle'
    ctx.fillText(value, x, y)
  }

  return { roundRect, text }
}

module.exports = { createCanvasTools }

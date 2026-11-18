function toolbar(width, height) {
  const margin = 12
  const gap = 5
  const unit = (width - margin * 2 - gap * 3) / 5
  let x = margin
  return ['undo', 'erase', 'toggleNoteMode', 'autoNotes'].map(key => {
    const w = key === 'autoNotes' ? unit * 2 : unit
    const rect = { key, x, y: height - 63, w, h: 44 }
    x += w + gap
    return rect
  })
}

module.exports = { toolbar }

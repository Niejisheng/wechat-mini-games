function createGameSession({ draw, controller, enter, exit, destroy }) {
  if (!controller) throw new Error('A game session requires a controller')
  return {
    enter: enter || (() => {}),
    exit: exit || (() => {}),
    destroy: destroy || (() => controller && controller.destroy && controller.destroy()),
    draw,
    onTouchStart: event => controller.onTouchStart(event),
    onTouchEnd: event => controller.onTouchEnd(event)
  }
}

module.exports = { createGameSession }

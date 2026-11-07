function createGameSession({ draw, controller, enter, exit }) {
  return {
    enter: enter || (() => {}),
    exit: exit || (() => {}),
    draw,
    onTouchStart: event => controller.onTouchStart(event),
    onTouchEnd: event => controller.onTouchEnd(event)
  }
}

module.exports = { createGameSession }

const postMessage = (message) => {
  return JSON.parse(message.toString());
}

const sendAllTimers = (ws, activeTimers, oldTimers) => {
  ws.send(
    JSON.stringify({
      type: 'all_timers',
      activeTimers: activeTimers,
      oldTimers: oldTimers
    })
  )
}

const sendActiveTimers = (ws, activeTimers) => {
  ws.send(
    JSON.stringify({
      type: 'active_timers',
      activeTimers: activeTimers
    })
  )
}

const sendActiveTimersToAllClients = async (ws, activeTimers, clients) => {
  Array.from(clients.entries()).forEach(() => {
    sendActiveTimers(ws, activeTimers);
  });
}

module.exports = {
  postMessage,
  sendAllTimers,
  sendActiveTimersToAllClients
}

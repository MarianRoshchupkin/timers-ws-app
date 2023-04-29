const { nanoid } = require("nanoid");

const knex = require('knex')({
  client: "sqlite3",
  useNullAsDefault: true,
  connection: {
    filename: './data/db.sqlite3'
  },
})

const createTimer = async (req, data) => {
  const description = data.description;
  const [timer] = await knex('timers')
    .insert({
      id: nanoid(),
      userId: req.user.id,
      description: description,
      start: Date.now(),
      end: 0,
      duration: 0,
      isActive: true
    })
    .returning('id')

  return timer;
}

async function stopTimer(data) {
  const [timer] = await knex('timers')
    .where({ id: data.timerId })
    .update({
      isActive: false,
      end: Date.now(),
      duration: knex.raw('end - start')
    })
    .returning('id')

  return timer;
}

const getAllTimers = async (req) => {
  const activeTimers = await knex('timers')
    .select()
    .where({
      userId: req.user.id,
      isActive: true
    })
  const oldTimers = await knex('timers')
    .select()
    .where({
      userId: req.user.id,
      isActive: false
    })

  for (const timer of activeTimers) {
    timer.progress = Date.now() - timer.start
  }

  return { activeTimers, oldTimers }
}

module.exports = {
  createTimer,
  stopTimer,
  getAllTimers
}

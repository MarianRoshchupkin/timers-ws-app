const { nanoid } = require("nanoid");

const knex = require('knex')({
  client: "sqlite3",
  useNullAsDefault: true,
  connection: {
    filename: './data/db.sqlite3'
  },
})

const findUserByUsername = async (username) =>
  knex('users')
    .select()
    .where({ username })
    .first()

const findUserBySessionId = async (sessionId) => {
  const session = await knex('sessions')
    .select('userId')
    .where({ sessionId: sessionId })
    .first()

  if (!session) return

  return knex('users')
    .select()
    .where({ id: session.userId })
    .first()
}

const createSession = async (userId) => {
  const sessionId = nanoid();

  await knex('sessions').insert({
    userId: userId,
    sessionId: sessionId,
  })

  return sessionId;
}

const deleteSession = async (sessionId) => {
  await knex('sessions').where({ sessionId: sessionId }).delete();
}

module.exports = {
  findUserByUsername,
  findUserBySessionId,
  createSession,
  deleteSession
}

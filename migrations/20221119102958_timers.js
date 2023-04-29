/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('timers', (table) => {
    table.string('id', 255).unique();
    table.string('userId', 255).notNullable();
    table.string('description', 255).notNullable();
    table.integer('start').notNullable();
    table.integer('end').notNullable();
    table.integer('duration').notNullable();
    table.boolean('isActive').notNullable();
  })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('timers')
};

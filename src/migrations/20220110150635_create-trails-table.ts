import { Knex } from 'knex';

export async function up(knex: Knex): Promise<any> {
  return knex.schema.createTable('trails', (table: Knex.TableBuilder) => {
    table.text('id').primary();
    table.text('url').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('expire_at');
  });
}

export async function down(knex: Knex): Promise<any> {
  return knex.schema.dropTable('trails');
}

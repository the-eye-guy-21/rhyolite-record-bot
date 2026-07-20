const { readFile } = require('node:fs/promises');
const path = require('node:path');
const { Pool } = require('pg');

if (!process.env.DATABASE_URL) {
  throw new Error('Missing the DATABASE_URL environment variable.');
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
});

pool.on('error', (error) => {
  console.error('Unexpected PostgreSQL connection error:', error);
});

async function initializeDatabase() {
  const schemaPath = path.join(__dirname, 'schema.sql');
  const schema = await readFile(schemaPath, 'utf8');

  await pool.query(schema);

  console.log('Database tables initialized successfully.');
}

async function testDatabaseConnection() {
  const result = await pool.query(
    'SELECT NOW() AS current_time'
  );

  return result.rows[0].current_time;
}

async function createScene(scene) {
  const query = `
    INSERT INTO scenes (
      guild_id,
      thread_id,
      thread_name,
      thread_url,
      title,
      location,
      characters,
      premise,
      start_year,
      start_season,
      start_day,
      start_daypart,
      created_by_user_id
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6,
      $7,
      $8,
      $9,
      $10,
      $11,
      $12,
      $13
    )
    RETURNING *;
  `;

  const values = [
    scene.guildId,
    scene.threadId,
    scene.threadName,
    scene.threadUrl,
    scene.title,
    scene.location,
    scene.characters,
    scene.premise,
    scene.startYear,
    scene.startSeason,
    scene.startDay,
    scene.startDaypart,
    scene.createdByUserId,
  ];

  const result = await pool.query(query, values);

  return result.rows[0];
}

async function getSceneByThreadId(threadId) {
  const query = `
    SELECT *
    FROM scenes
    WHERE thread_id = $1
    LIMIT 1;
  `;

  const values = [
    threadId,
  ];

  const result = await pool.query(query, values);

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

async function closeScene(scene) {
  const query = `
    UPDATE scenes
    SET
      final_summary = $1,
      end_year = $2,
      end_season = $3,
      end_day = $4,
      end_daypart = $5,
      status = 'completed',
      updated_at = NOW()
    WHERE thread_id = $6
    RETURNING *;
  `;

  const values = [
    scene.finalSummary,
    scene.endYear,
    scene.endSeason,
    scene.endDay,
    scene.endDaypart,
    scene.threadId,
  ];

  const result = await pool.query(query, values);

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

async function setCalendarState(calendar) {
  const query = `
    INSERT INTO calendar_state (
      guild_id,
      current_year,
      current_season,
      current_day,
      current_daypart,
      updated_by_user_id
    )
    VALUES (
      $1,
      $2,
      $3,
      $4,
      $5,
      $6
    )
    ON CONFLICT (guild_id)
    DO UPDATE SET
      current_year = EXCLUDED.current_year,
      current_season = EXCLUDED.current_season,
      current_day = EXCLUDED.current_day,
      current_daypart = EXCLUDED.current_daypart,
      updated_by_user_id = EXCLUDED.updated_by_user_id,
      updated_at = NOW()
    RETURNING *;
  `;

  const values = [
    calendar.guildId,
    calendar.currentYear,
    calendar.currentSeason,
    calendar.currentDay,
    calendar.currentDaypart,
    calendar.updatedByUserId,
  ];

  const result = await pool.query(query, values);

  return result.rows[0];
}

async function getCalendarState(guildId) {
  const query = `
    SELECT *
    FROM calendar_state
    WHERE guild_id = $1
    LIMIT 1;
  `;

  const values = [
    guildId,
  ];

  const result = await pool.query(query, values);

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

module.exports = {
  closeScene,
  createScene,
  getCalendarState,
  getSceneByThreadId,
  initializeDatabase,
  pool,
  setCalendarState,
  testDatabaseConnection,
};

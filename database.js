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

async function editScene(scene) {
  const query = `
    UPDATE scenes
    SET
      title = COALESCE($1::text, title),
      location = COALESCE($2::text, location),
      characters = COALESCE($3::text, characters),
      premise = COALESCE($4::text, premise),
      start_year = COALESCE($5::integer, start_year),
      start_season = COALESCE($6::text, start_season),
      start_day = COALESCE($7::integer, start_day),
      start_daypart = COALESCE($8::text, start_daypart),
      updated_at = NOW()
    WHERE thread_id = $9
    RETURNING *;
  `;

  const values = [
    scene.title,
    scene.location,
    scene.characters,
    scene.premise,
    scene.startYear,
    scene.startSeason,
    scene.startDay,
    scene.startDaypart,
    scene.threadId,
  ];

  const result = await pool.query(query, values);

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

async function deleteScene(threadId) {
  const query = `
    DELETE FROM scenes
    WHERE thread_id = $1
    RETURNING *;
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

async function getSceneList(guildId) {
  const query = `
    SELECT *
    FROM scenes
    WHERE guild_id = $1
    ORDER BY
      start_year DESC,
      CASE start_season
        WHEN 'winter' THEN 4
        WHEN 'fall' THEN 3
        WHEN 'summer' THEN 2
        WHEN 'spring' THEN 1
      END DESC,
      start_day DESC,
      CASE start_daypart
        WHEN 'night' THEN 5
        WHEN 'evening' THEN 4
        WHEN 'afternoon' THEN 3
        WHEN 'midmorning' THEN 2
        WHEN 'morning' THEN 1
        ELSE 0
      END DESC
    LIMIT 10;
  `;

  const values = [
    guildId,
  ];

  const result = await pool.query(query, values);

  return result.rows;
}

async function attachArchiveMessage(sceneArchive) {
  const query = `
    UPDATE scenes
    SET
      archive_channel_id = $1,
      archive_message_id = $2,
      updated_at = NOW()
    WHERE thread_id = $3
    RETURNING *;
  `;

  const values = [
    sceneArchive.channelId,
    sceneArchive.messageId,
    sceneArchive.threadId,
  ];

  const result = await pool.query(query, values);

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

module.exports = {
  attachArchiveMessage,
  closeScene,
  createScene,
  deleteScene,
  editScene,
  getSceneByThreadId,
  getSceneList,
  initializeDatabase,
  pool,
  testDatabaseConnection,
};

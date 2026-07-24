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
  const existingScene = await getSceneByThreadId(
    scene.threadId
  );

  if (existingScene) {
    const error = new Error(
      'This thread already has a scene record.'
    );

    error.code = '23505';

    throw error;
  }

  return insertScene(scene);
}

async function createAdditionalScene(scene) {
  return insertScene(scene);
}

async function insertScene(scene) {
  const query = `
    INSERT INTO scenes (
      guild_id,
      thread_id,
      thread_name,
      thread_url,
      starting_message_url,
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
      $13,
      $14
    )
    RETURNING *;
  `;

  const values = [
    scene.guildId,
    scene.threadId,
    scene.threadName,
    scene.threadUrl,
    scene.startingMessageUrl || null,
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
    ORDER BY id ASC
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

async function getScenesByThreadId(threadId) {
  const query = `
    SELECT *
    FROM scenes
    WHERE thread_id = $1
    ORDER BY id ASC;
  `;

  const values = [
    threadId,
  ];

  const result = await pool.query(query, values);

  return result.rows;
}

async function getOnlySceneByThreadId(threadId) {
  const scenes = await getScenesByThreadId(
    threadId
  );

  if (scenes.length === 0) {
    return null;
  }

  if (scenes.length > 1) {
    throw createAmbiguousSceneError(
      threadId
    );
  }

  return scenes[0];
}

async function getSceneById(sceneId, guildId) {
  const query = `
    SELECT *
    FROM scenes
    WHERE id = $1
      AND guild_id = $2
    LIMIT 1;
  `;

  const values = [
    sceneId,
    guildId,
  ];

  const result = await pool.query(query, values);

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

async function closeScene(scene) {
  const existingScene =
    await getOnlySceneByThreadId(
      scene.threadId
    );

  if (!existingScene) {
    return null;
  }

  return closeSceneById({
    sceneId: existingScene.id,
    guildId: existingScene.guild_id,
    finalSummary: scene.finalSummary,
    endYear: scene.endYear,
    endSeason: scene.endSeason,
    endDay: scene.endDay,
    endDaypart: scene.endDaypart,
  });
}

async function closeSceneById(scene) {
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
    WHERE id = $6
      AND guild_id = $7
    RETURNING *;
  `;

  const values = [
    scene.finalSummary,
    scene.endYear,
    scene.endSeason,
    scene.endDay,
    scene.endDaypart,
    scene.sceneId,
    scene.guildId,
  ];

  const result = await pool.query(query, values);

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

async function editScene(scene) {
  const existingScene =
    await getOnlySceneByThreadId(
      scene.threadId
    );

  if (!existingScene) {
    return null;
  }

  return editSceneById({
    sceneId: existingScene.id,
    guildId: existingScene.guild_id,
    title: scene.title,
    location: scene.location,
    characters: scene.characters,
    premise: scene.premise,
    startYear: scene.startYear,
    startSeason: scene.startSeason,
    startDay: scene.startDay,
    startDaypart: scene.startDaypart,
    startingMessageUrl:
      scene.startingMessageUrl,
  });
}

async function editSceneById(scene) {
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
      starting_message_url = COALESCE(
        $9::text,
        starting_message_url
      ),
      updated_at = NOW()
    WHERE id = $10
      AND guild_id = $11
    RETURNING *;
  `;

  const values = [
    scene.title ?? null,
    scene.location ?? null,
    scene.characters ?? null,
    scene.premise ?? null,
    scene.startYear ?? null,
    scene.startSeason ?? null,
    scene.startDay ?? null,
    scene.startDaypart ?? null,
    scene.startingMessageUrl ?? null,
    scene.sceneId,
    scene.guildId,
  ];

  const result = await pool.query(query, values);

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

async function deleteScene(threadId) {
  const existingScene =
    await getOnlySceneByThreadId(
      threadId
    );

  if (!existingScene) {
    return null;
  }

  return deleteSceneById(
    existingScene.id,
    existingScene.guild_id
  );
}

async function deleteSceneById(sceneId, guildId) {
  const query = `
    DELETE FROM scenes
    WHERE id = $1
      AND guild_id = $2
    RETURNING *;
  `;

  const values = [
    sceneId,
    guildId,
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

async function searchScenes(
  guildId,
  searchTerm,
  status
) {
  const query = `
    SELECT *
    FROM scenes
    WHERE guild_id = $1
      AND (
        title ILIKE '%' || $2 || '%'
        OR location ILIKE '%' || $2 || '%'
        OR characters ILIKE '%' || $2 || '%'
        OR premise ILIKE '%' || $2 || '%'
        OR COALESCE(final_summary, '') ILIKE '%' || $2 || '%'
      )
      AND (
        $3::text IS NULL
        OR status = $3
      )
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
    searchTerm,
    status,
  ];

  const result = await pool.query(query, values);

  return result.rows;
}

async function attachArchiveMessage(
  sceneArchive
) {
  let sceneId =
    sceneArchive.sceneId || null;

  /*
   * This fallback keeps older one-scene
   * registration code working safely.
   */
  if (
    !sceneId
    && sceneArchive.threadId
  ) {
    const existingScene =
      await getOnlySceneByThreadId(
        sceneArchive.threadId
      );

    if (!existingScene) {
      return null;
    }

    sceneId = existingScene.id;
  }

  if (!sceneId) {
    return null;
  }

  const query = `
    UPDATE scenes
    SET
      archive_channel_id = $1,
      archive_message_id = $2,
      updated_at = NOW()
    WHERE id = $3
    RETURNING *;
  `;

  const values = [
    sceneArchive.channelId,
    sceneArchive.messageId,
    sceneId,
  ];

  const result = await pool.query(query, values);

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

async function createPlotPoint(plotPoint) {
  const query = `
    INSERT INTO plot_points (
      guild_id,
      entry_type,
      title,
      summary,
      people,
      location,
      source_url,
      event_year,
      event_season,
      event_day,
      event_daypart,
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
      $12
    )
    RETURNING *;
  `;

  const values = [
    plotPoint.guildId,
    plotPoint.entryType,
    plotPoint.title,
    plotPoint.summary,
    plotPoint.people || null,
    plotPoint.location || null,
    plotPoint.sourceUrl || null,
    plotPoint.eventYear,
    plotPoint.eventSeason,
    plotPoint.eventDay,
    plotPoint.eventDaypart,
    plotPoint.createdByUserId,
  ];

  const result = await pool.query(
    query,
    values
  );

  return result.rows[0];
}

async function getPlotPointById(
  plotPointId,
  guildId
) {
  const query = `
    SELECT *
    FROM plot_points
    WHERE id = $1
      AND guild_id = $2
    LIMIT 1;
  `;

  const values = [
    plotPointId,
    guildId,
  ];

  const result = await pool.query(
    query,
    values
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

async function attachPlotArchiveMessage(
  plotArchive
) {
  const query = `
    UPDATE plot_points
    SET
      archive_channel_id = $1,
      archive_message_id = $2,
      updated_at = NOW()
    WHERE id = $3
      AND guild_id = $4
    RETURNING *;
  `;

  const values = [
    plotArchive.channelId,
    plotArchive.messageId,
    plotArchive.plotPointId,
    plotArchive.guildId,
  ];

  const result = await pool.query(
    query,
    values
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

async function deletePlotPointById(
  plotPointId,
  guildId
) {
  const query = `
    DELETE FROM plot_points
    WHERE id = $1
      AND guild_id = $2
    RETURNING *;
  `;

  const values = [
    plotPointId,
    guildId,
  ];

  const result = await pool.query(
    query,
    values
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

function createAmbiguousSceneError(
  threadId
) {
  const error = new Error(
    'This thread contains multiple incident files. A file number is required.'
  );

  error.code = 'AMBIGUOUS_SCENE';
  error.threadId = threadId;

  return error;
}

module.exports = {
  attachArchiveMessage,
  attachPlotArchiveMessage,
  closeScene,
  closeSceneById,
  createAdditionalScene,
  createPlotPoint,
  createScene,
  deletePlotPointById,
  deleteScene,
  deleteSceneById,
  editScene,
  editSceneById,
  getOnlySceneByThreadId,
  getPlotPointById,
  getSceneById,
  getSceneByThreadId,
  getSceneList,
  getScenesByThreadId,
  initializeDatabase,
  pool,
  searchScenes,
  testDatabaseConnection,
};

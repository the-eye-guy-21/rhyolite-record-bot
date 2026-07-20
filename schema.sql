CREATE TABLE IF NOT EXISTS scenes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  guild_id TEXT NOT NULL,
  thread_id TEXT NOT NULL UNIQUE,
  thread_name TEXT NOT NULL,
  thread_url TEXT NOT NULL,

  archive_channel_id TEXT,
  archive_message_id TEXT UNIQUE,

  title TEXT NOT NULL,
  location TEXT NOT NULL,
  characters TEXT NOT NULL,
  premise TEXT NOT NULL,
  final_summary TEXT,

  status TEXT NOT NULL DEFAULT 'ongoing'
    CHECK (
      status IN (
        'ongoing',
        'paused',
        'completed',
        'abandoned'
      )
    ),

  start_year INTEGER NOT NULL
    CHECK (start_year >= 1),

  start_season TEXT NOT NULL
    CHECK (
      start_season IN (
        'spring',
        'summer',
        'fall',
        'winter'
      )
    ),

  start_day INTEGER NOT NULL
    CHECK (start_day BETWEEN 1 AND 28),

  start_daypart TEXT NOT NULL DEFAULT 'unspecified'
    CHECK (
      start_daypart IN (
        'morning',
        'midmorning',
        'afternoon',
        'evening',
        'night',
        'unspecified'
      )
    ),

  end_year INTEGER
    CHECK (end_year >= 1),

  end_season TEXT
    CHECK (
      end_season IN (
        'spring',
        'summer',
        'fall',
        'winter'
      )
    ),

  end_day INTEGER
    CHECK (end_day BETWEEN 1 AND 28),

  end_daypart TEXT
    CHECK (
      end_daypart IN (
        'morning',
        'midmorning',
        'afternoon',
        'evening',
        'night',
        'unspecified'
      )
    ),

  created_by_user_id TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CHECK (
    (
      end_year IS NULL
      AND end_season IS NULL
      AND end_day IS NULL
      AND end_daypart IS NULL
    )
    OR
    (
      end_year IS NOT NULL
      AND end_season IS NOT NULL
      AND end_day IS NOT NULL
      AND end_daypart IS NOT NULL
    )
  )
);

ALTER TABLE scenes
ADD COLUMN IF NOT EXISTS archive_channel_id TEXT;

ALTER TABLE scenes
ADD COLUMN IF NOT EXISTS archive_message_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS scenes_archive_message_id_unique
ON scenes (archive_message_id)
WHERE archive_message_id IS NOT NULL;

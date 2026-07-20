CREATE TABLE IF NOT EXISTS scenes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,

  guild_id TEXT NOT NULL,
  thread_id TEXT NOT NULL UNIQUE,
  thread_name TEXT NOT NULL,
  thread_url TEXT NOT NULL,

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

CREATE TABLE IF NOT EXISTS calendar_state (
  guild_id TEXT PRIMARY KEY,

  current_year INTEGER NOT NULL
    CHECK (current_year >= 1),

  current_season TEXT NOT NULL
    CHECK (
      current_season IN (
        'spring',
        'summer',
        'fall',
        'winter'
      )
    ),

  current_day INTEGER NOT NULL
    CHECK (current_day BETWEEN 1 AND 28),

  current_daypart TEXT NOT NULL
    CHECK (
      current_daypart IN (
        'morning',
        'midmorning',
        'afternoon',
        'evening',
        'night',
        'unspecified'
      )
    ),

  updated_by_user_id TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

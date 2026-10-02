import * as migration_20260922_074043_initial from './20260922_074043_initial';
import * as migration_20260924_132306_phase3_schema from './20260924_132306_phase3_schema';
import * as migration_20260925_133726_add_media_blob_fields from './20260925_133726_add_media_blob_fields';
import * as migration_20261002_090000_phase5_chatbot_foundation from './20261002_090000_phase5_chatbot_foundation';

export const migrations = [
  {
    up: migration_20260922_074043_initial.up,
    down: migration_20260922_074043_initial.down,
    name: '20260922_074043_initial',
  },
  {
    up: migration_20260924_132306_phase3_schema.up,
    down: migration_20260924_132306_phase3_schema.down,
    name: '20260924_132306_phase3_schema',
  },
  {
    up: migration_20260925_133726_add_media_blob_fields.up,
    down: migration_20260925_133726_add_media_blob_fields.down,
    name: '20260925_133726_add_media_blob_fields',
  },
  {
    up: migration_20261002_090000_phase5_chatbot_foundation.up,
    down: migration_20261002_090000_phase5_chatbot_foundation.down,
    name: '20261002_090000_phase5_chatbot_foundation',
  },
];

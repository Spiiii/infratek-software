import * as migration_20260922_074043_initial from './20260922_074043_initial';
import * as migration_20260924_132306_phase3_schema from './20260924_132306_phase3_schema';

export const migrations = [
  {
    up: migration_20260922_074043_initial.up,
    down: migration_20260922_074043_initial.down,
    name: '20260922_074043_initial',
  },
  {
    up: migration_20260924_132306_phase3_schema.up,
    down: migration_20260924_132306_phase3_schema.down,
    name: '20260924_132306_phase3_schema'
  },
];

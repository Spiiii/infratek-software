import * as migration_20260922_074043_initial from './20260922_074043_initial';

export const migrations = [
  {
    up: migration_20260922_074043_initial.up,
    down: migration_20260922_074043_initial.down,
    name: '20260922_074043_initial'
  },
];

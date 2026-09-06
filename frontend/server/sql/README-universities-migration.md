# Universities and programs migration

Run from `frontend/server` against a review or staging database first:

```powershell
npm run dedupe-universities -- --dry-run
```

The dry run only reads the database and prints the university count before deduplication, unique count after deduplication, and program rows that would be created. It performs no writes.

After reviewing that output:

1. Run `sql/universities-programs-migration.sql` to create/normalize the tables and the `programs` table.
2. Run `npm run dedupe-universities -- --dry-run` again and review the result.
3. Run `npm run dedupe-universities` to merge duplicate universities and create program rows.
4. Run `sql/universities-programs-migration.sql` again. With duplicate names removed, it creates the case-insensitive unique index on `lower(trim(name))`.

The PostgreSQL admin API is mounted at `/api/admin/universities` by the Node server and returns nested programs. It requires an administrator JWT containing `isAdmin: true`.

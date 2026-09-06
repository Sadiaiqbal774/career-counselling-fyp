const db = require('../db');

const dryRun = process.argv.includes('--dry-run');

function keyFor(name) {
  return String(name || '').trim().toLowerCase();
}

function filled(current, candidate) {
  return current || candidate || '';
}

async function deduplicate() {
  const client = await db.pool.connect();
  try {
    const result = await client.query('SELECT * FROM universities ORDER BY id');
    const rows = result.rows;
    const groups = new Map();
    rows.forEach((row) => {
      const key = keyFor(row.name);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    });

    const uniqueRows = [...groups.values()];
    const programRows = uniqueRows.reduce((count, group) => count + group.filter((row) => row.degree_name || row.program).length, 0);
    console.log(`Mode: ${dryRun ? 'DRY RUN (no writes)' : 'LIVE'}`);
    console.log(`University rows before: ${rows.length ? new Set(rows.map((row) => row.id)).size : 0}`);
    console.log(`Unique universities after: ${uniqueRows.length}`);
    console.log(`Program rows to create: ${programRows}`);

    if (dryRun) return;

    await client.query('BEGIN');
    for (const group of uniqueRows) {
      const kept = group[0];
      const merged = group.reduce((value, row) => ({
        city: filled(value.city, row.city),
        province: filled(value.province, row.province),
        sector: filled(value.sector, row.sector) || 'Public',
        website_url: filled(value.website_url, row.website_url),
      }), kept);
      await client.query(
        'UPDATE universities SET city = $1, province = $2, sector = $3, website_url = $4 WHERE id = $5',
        [merged.city, merged.province, merged.sector, merged.website_url, kept.id],
      );
      for (const row of group) {
        const degreeName = row.degree_name || row.program;
        if (degreeName) {
          await client.query(
            'INSERT INTO programs (university_id, degree_name, merit_formula) VALUES ($1, $2, $3)',
            [kept.id, degreeName, row.merit_formula || row.merit || null],
          );
        }
      }
      await client.query('DELETE FROM universities WHERE id <> $1 AND lower(trim(name)) = lower(trim($2))', [kept.id, kept.name]);
    }
    await client.query('COMMIT');
    console.log('Deduplication completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Deduplication failed:', error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await db.pool.end();
  }
}

deduplicate();

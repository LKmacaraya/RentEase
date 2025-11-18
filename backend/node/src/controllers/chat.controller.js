import { pool } from '../db/pool.js';
async function ensureSchema() {
  // Base table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id BIGSERIAL PRIMARY KEY,
      type TEXT NOT NULL CHECK (type IN ('public','private')),
      sender_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      listing_id BIGINT NULL REFERENCES listings(id) ON DELETE CASCADE,
      user_a BIGINT NULL REFERENCES users(id) ON DELETE CASCADE,
      user_b BIGINT NULL REFERENCES users(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      kind TEXT NOT NULL DEFAULT 'text' CHECK (kind IN ('text','image','sticker')),
      edited_at TIMESTAMPTZ NULL,
      deleted_at TIMESTAMPTZ NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  // Ensure column exists for older installs
  await pool.query(`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS listing_id BIGINT REFERENCES listings(id) ON DELETE CASCADE;`);
  await pool.query(`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS kind TEXT NOT NULL DEFAULT 'text' CHECK (kind IN ('text','image','sticker'));`);
  await pool.query(`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ NULL;`);
  await pool.query(`ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ NULL;`);
  // Indexes
  await pool.query(`CREATE INDEX IF NOT EXISTS chat_type_idx ON chat_messages(type, id);`);
  await pool.query(`CREATE INDEX IF NOT EXISTS chat_pair_idx ON chat_messages(listing_id, user_a, user_b, id);`);
}

const schemaReady = ensureSchema().catch(()=>{});
function normalizePair(id1, id2){
  const a = Math.min(Number(id1), Number(id2));
  const b = Math.max(Number(id1), Number(id2));
  return { a, b };
}

export async function getPublicMessages(req, res, next){
  try{
    await schemaReady;
    const afterId = req.query.afterId ? Number(req.query.afterId) : 0;
    const { rows } = await pool.query(
      `SELECT m.id, m.content, m.kind, m.edited_at, m.deleted_at, m.created_at, u.id AS sender_id, u.name AS sender_name
       FROM chat_messages m JOIN users u ON u.id = m.sender_id
       WHERE m.type = 'public' AND ($1 = 0 OR m.id > $1)
       ORDER BY m.id ASC LIMIT 200`,
      [afterId]
    );
    res.json(rows);
  }catch(err){ next(err); }
}

export async function listAdmins(req, res, next){
  try{
    await schemaReady;
    const { rows } = await pool.query(`SELECT id, name FROM users WHERE role='admin' ORDER BY id ASC LIMIT 50`);
    res.json(rows);
  }catch(err){ next(err); }
}

export async function postPublicMessage(req, res, next){
  try{
    await schemaReady;
    const senderId = req.user.id;
    const { content, kind } = req.body;
    if(!content || !content.trim()) return res.status(400).json({ error: 'Empty content' });
    const k = (kind||'text');
    const { rows } = await pool.query(
      `INSERT INTO chat_messages(type, sender_id, content, kind) VALUES ('public', $1, $2, $3)
       RETURNING id, content, kind, created_at`,
      [senderId, content.trim(), k]
    );
    res.status(201).json({ id: rows[0].id, content: rows[0].content, kind: rows[0].kind, created_at: rows[0].created_at, sender_id: senderId });
  }catch(err){ next(err); }
}

export async function updatePublicMessage(req, res, next){
  try{
    await schemaReady;
    const me = req.user;
    const id = Number(req.params.id);
    const { content } = req.body;
    if(!id) return res.status(400).json({ error: 'Invalid id' });
    if(!content || !content.trim()) return res.status(400).json({ error: 'Empty content' });
    const { rows: ownerRows } = await pool.query('SELECT sender_id FROM chat_messages WHERE id=$1 AND type=\'public\'', [id]);
    if(!ownerRows.length) return res.status(404).json({ error: 'Not found' });
    if(ownerRows[0].sender_id !== me.id && me.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { rows } = await pool.query('UPDATE chat_messages SET content=$1, edited_at=NOW() WHERE id=$2 RETURNING id, content, kind, edited_at', [content.trim(), id]);
    res.json(rows[0]);
  }catch(err){ next(err); }
}

export async function deletePublicMessage(req, res, next){
  try{
    await schemaReady;
    const me = req.user;
    const id = Number(req.params.id);
    if(!id) return res.status(400).json({ error: 'Invalid id' });
    const { rows: ownerRows } = await pool.query('SELECT sender_id FROM chat_messages WHERE id=$1 AND type=\'public\'', [id]);
    if(!ownerRows.length) return res.status(404).json({ error: 'Not found' });
    if(ownerRows[0].sender_id !== me.id && me.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    await pool.query('UPDATE chat_messages SET deleted_at=NOW() WHERE id=$1', [id]);
    res.status(204).send();
  }catch(err){ next(err); }
}

export async function getPrivateMessages(req, res, next){
  try{
    await schemaReady;
    const me = req.user.id;
    const listingId = Number(req.params.listingId);
    const otherId = Number(req.params.otherId);
    if(!listingId || Number.isNaN(listingId)) return res.status(400).json({ error: 'Invalid listing' });
    if(!otherId || Number.isNaN(otherId)) return res.status(400).json({ error: 'Invalid user' });
    const { a, b } = normalizePair(me, otherId);
    const afterId = req.query.afterId ? Number(req.query.afterId) : 0;
    const { rows } = await pool.query(
      `SELECT m.id, m.content, m.kind, m.edited_at, m.deleted_at, m.created_at, u.id AS sender_id, u.name AS sender_name
       FROM chat_messages m JOIN users u ON u.id = m.sender_id
       WHERE m.type='private' AND m.listing_id=$1 AND m.user_a=$2 AND m.user_b=$3 AND ($4 = 0 OR m.id > $4)
       ORDER BY m.id ASC LIMIT 200`,
      [listingId, a, b, afterId]
    );
    res.json(rows);
  }catch(err){ next(err); }
}

export async function postPrivateMessage(req, res, next){
  try{
    await schemaReady;
    const me = req.user.id;
    const listingId = Number(req.params.listingId);
    const otherId = Number(req.params.otherId);
    if(!listingId || Number.isNaN(listingId)) return res.status(400).json({ error: 'Invalid listing' });
    if(!otherId || Number.isNaN(otherId)) return res.status(400).json({ error: 'Invalid user' });
    const { a, b } = normalizePair(me, otherId);
    const { content } = req.body;
    if(!content || !content.trim()) return res.status(400).json({ error: 'Empty content' });
    const { rows } = await pool.query(
      `INSERT INTO chat_messages(type, sender_id, listing_id, user_a, user_b, content)
       VALUES ('private', $1, $2, $3, $4, $5)
       RETURNING id, content, created_at`,
      [me, listingId, a, b, content.trim()]
    );
    res.status(201).json({ id: rows[0].id, content: rows[0].content, created_at: rows[0].created_at, sender_id: me, other_id: otherId });
  }catch(err){ next(err); }
}

export async function updatePrivateMessage(req, res, next){
  try{
    await schemaReady;
    const me = req.user;
    const id = Number(req.params.id);
    const { content } = req.body;
    if(!id) return res.status(400).json({ error: 'Invalid id' });
    if(!content || !content.trim()) return res.status(400).json({ error: 'Empty content' });
    const { rows: ownerRows } = await pool.query("SELECT sender_id FROM chat_messages WHERE id=$1 AND type='private'", [id]);
    if(!ownerRows.length) return res.status(404).json({ error: 'Not found' });
    if(ownerRows[0].sender_id !== me.id && me.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    const { rows } = await pool.query('UPDATE chat_messages SET content=$1, edited_at=NOW() WHERE id=$2 RETURNING id, content, kind, edited_at', [content.trim(), id]);
    res.json(rows[0]);
  }catch(err){ next(err); }
}

export async function deletePrivateMessage(req, res, next){
  try{
    await schemaReady;
    const me = req.user;
    const id = Number(req.params.id);
    if(!id) return res.status(400).json({ error: 'Invalid id' });
    const { rows: ownerRows } = await pool.query("SELECT sender_id FROM chat_messages WHERE id=$1 AND type='private'", [id]);
    if(!ownerRows.length) return res.status(404).json({ error: 'Not found' });
    if(ownerRows[0].sender_id !== me.id && me.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
    await pool.query('UPDATE chat_messages SET deleted_at=NOW() WHERE id=$1', [id]);
    res.status(204).send();
  }catch(err){ next(err); }
}

export async function listPrivateThreads(req, res, next){
  try{
    await schemaReady;
    const me = req.user.id;
    const { rows } = await pool.query(
      `WITH pairs AS (
         SELECT DISTINCT listing_id, CASE WHEN user_a=$1 THEN user_b ELSE user_a END AS other_id
         FROM chat_messages
         WHERE type='private' AND (user_a=$1 OR user_b=$1)
       ), last_msg AS (
         SELECT listing_id, user_a, user_b, MAX(id) AS last_id
         FROM chat_messages
         WHERE type='private' AND (user_a=$1 OR user_b=$1)
         GROUP BY listing_id, user_a, user_b
       )
       SELECT p.listing_id, l.title AS listing_title, p.other_id, u.name AS other_name, m.content AS last_content, m.created_at AS last_time
       FROM pairs p
       JOIN listings l ON l.id = p.listing_id
       JOIN users u ON u.id = p.other_id
       JOIN last_msg lm ON (lm.listing_id = p.listing_id AND lm.user_a = LEAST($1, p.other_id) AND lm.user_b = GREATEST($1, p.other_id))
       JOIN chat_messages m ON m.id = lm.last_id
       ORDER BY last_time DESC
      `,
      [me]
    );
    res.json(rows);
  }catch(err){ next(err); }
}

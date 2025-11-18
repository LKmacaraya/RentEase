import { pool } from '../db/pool.js';

export async function listListings(req, res, next) {
  try {
    const { q, minPrice, maxPrice, beds, baths, city, status } = req.query;
    const conditions = [];
    const params = [];

    if (q) { params.push(`%${q}%`); conditions.push(`(title ILIKE $${params.length} OR description ILIKE $${params.length})`); }
    if (minPrice) { params.push(minPrice); conditions.push(`price >= $${params.length}`); }
    if (maxPrice) { params.push(maxPrice); conditions.push(`price <= $${params.length}`); }
    if (beds) { params.push(beds); conditions.push(`beds >= $${params.length}`); }
    if (baths) { params.push(baths); conditions.push(`baths >= $${params.length}`); }
    if (city) { params.push(`%${city}%`); conditions.push(`city ILIKE $${params.length}`); }
    if (status) { params.push(status); conditions.push(`status = $${params.length}`); }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT id, title, description, price, beds, baths, city, address, status, lat, lng, images, owner_id, created_at
       FROM listings ${where} ORDER BY created_at DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

export async function getListing(req, res, next) {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      'SELECT id, title, description, price, beds, baths, city, address, status, lat, lng, images, owner_id, created_at FROM listings WHERE id=$1',
      [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function createListing(req, res, next) {
  try {
    const ownerId = req.user.id;
    const { title, description, price, beds, baths, city, address, status, lat, lng, images } = req.body;
    const { rows } = await pool.query(
      `INSERT INTO listings (title, description, price, beds, baths, city, address, status, lat, lng, images, owner_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12)
       RETURNING id, title, description, price, beds, baths, city, address, status, lat, lng, images, owner_id, created_at`,
      [title, description, price, beds, baths, city, address, status || 'available', lat ?? null, lng ?? null, JSON.stringify(images || []), ownerId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function updateListing(req, res, next) {
  try {
    const { id } = req.params;
    const ownerId = req.user.id;
    const { title, description, price, beds, baths, city, address, status, lat, lng, images } = req.body;

    const { rows: existingRows } = await pool.query('SELECT owner_id FROM listings WHERE id=$1', [id]);
    if (!existingRows.length) return res.status(404).json({ error: 'Not found' });
    if (existingRows[0].owner_id !== ownerId && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    const { rows } = await pool.query(
      `UPDATE listings SET title=$1, description=$2, price=$3, beds=$4, baths=$5, city=$6, address=$7, status=$8, lat=$9, lng=$10, images=$11::jsonb
       WHERE id=$12 RETURNING id, title, description, price, beds, baths, city, address, status, lat, lng, images, owner_id, created_at`,
      [title, description, price, beds, baths, city, address, status || 'available', lat ?? null, lng ?? null, JSON.stringify(images || []), id]
    );
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function deleteListing(req, res, next) {
  try {
    const { id } = req.params;
    const ownerId = req.user.id;
    const { rows: existingRows } = await pool.query('SELECT owner_id FROM listings WHERE id=$1', [id]);
    if (!existingRows.length) return res.status(404).json({ error: 'Not found' });
    if (existingRows[0].owner_id !== ownerId && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });

    await pool.query('DELETE FROM listings WHERE id=$1', [id]);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

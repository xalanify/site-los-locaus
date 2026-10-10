const express = require('express');
const { getDb } = require('../database');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

/* Foto de perfil de quem escreveu — o nome do comentário/com publicação
   bate certo com o username da conta, por isso dá para ir buscar a foto. */
async function avatarLookup(db) {
  const rows = await db
    .prepare(
      `SELECT LOWER(u.username) AS k, p.avatar_url
       FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id`,
    )
    .all()
    .catch(() => []);
  const map = new Map(rows.map((r) => [String(r.k), r.avatar_url || null]));
  return (name) => map.get(String(name || '').trim().toLowerCase()) || null;
}

// Obter todas as publicações (com gostos e comentários)
// — aceita ?limit / ?offset para paginar o feed
router.get('/', async (req, res) => {
  try {
    const db = getDb();
    const ip = req.ip || req.connection.remoteAddress || 'unknown';

    const limit = req.query.limit
      ? Math.min(100, Math.max(1, Number(req.query.limit) || 10))
      : 0;
    const offset = Math.max(0, Number(req.query.offset) || 0);

    const posts = limit
      ? await db
          .prepare('SELECT * FROM posts ORDER BY created_at DESC LIMIT ? OFFSET ?')
          .all(limit, offset)
      : await db.prepare('SELECT * FROM posts ORDER BY created_at DESC').all();

    const ids = posts.map((p) => Number(p.id));

    // Tudo numa só passagem (antes eram N+1 consultas) — e só dos
    // posts desta página, em vez de a lista inteira da BD
    const comments = ids.length
      ? await db
          .prepare(
            'SELECT id, post_id, author, content, created_at FROM post_comments ' +
              'WHERE post_id = ANY(?::int[]) ORDER BY created_at ASC',
          )
          .all(ids)
      : [];
    const liked = ids.length
      ? await db
          .prepare(
            'SELECT DISTINCT post_id FROM post_likes WHERE ip = ? AND post_id = ANY(?::int[])',
          )
          .all(ip, ids)
      : [];

    // Fotos de perfil de quem escreveu (o nome bate certo com o username)
    const avatarOf = await avatarLookup(db);

    const byPost = new Map();
    for (const c of comments) {
      if (!byPost.has(c.post_id)) byPost.set(c.post_id, []);
      byPost.get(c.post_id).push({ ...c, author_avatar: avatarOf(c.author) });
    }
    const likedSet = new Set(liked.map((r) => Number(r.post_id)));

    const withExtras = posts.map((p) => {
      const cs = byPost.get(p.id) || [];
      return {
        ...p,
        author_avatar: avatarOf(p.author),
        liked: likedSet.has(p.id),
        comments: cs,
        comments_count: cs.length,
      };
    });

    res.json(withExtras);
  } catch (error) {
    console.error('Erro posts GET:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Criar nova publicação (SÓ ADMIN)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const title = String(req.body.title || '').trim().slice(0, 150);
    const content = String(req.body.content || '').trim().slice(0, 5000);
    const image_url = String(req.body.image_url || '').trim().slice(0, 2000);

    if (!title || !content) {
      return res.status(400).json({ error: 'Título e conteúdo são obrigatórios' });
    }
    if (image_url && !/^https?:\/\//i.test(image_url)) {
      return res.status(400).json({ error: 'URL de imagem inválida' });
    }

    const db = getDb();
    const result = await db
      .prepare('INSERT INTO posts (title, content, image_url) VALUES (?, ?, ?) RETURNING id')
      .run(title, content, image_url || null);

    const post = await db.prepare('SELECT * FROM posts WHERE id = ?').get(result.lastInsertRowid);

    res.json(post);
  } catch (error) {
    console.error('Erro posts POST:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Dar like numa publicação
router.post('/:id/like', async (req, res) => {
  try {
    const db = getDb();
    const postId = Number(req.params.id);
    const ip = req.ip || req.connection.remoteAddress || 'unknown';

    if (!Number.isInteger(postId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }

    const existingLike = await db
      .prepare('SELECT id FROM post_likes WHERE post_id = ? AND ip = ?')
      .get(postId, ip);

    if (existingLike) {
      return res.status(400).json({ error: 'Já deste like nesta publicação' });
    }

    await db.prepare('INSERT INTO post_likes (post_id, ip) VALUES (?, ?)').run(postId, ip);
    await db.prepare('UPDATE posts SET likes = likes + 1 WHERE id = ?').run(postId);

    const post = await db.prepare('SELECT * FROM posts WHERE id = ?').get(postId);
    if (!post) return res.status(404).json({ error: 'Publicação não encontrada' });
    res.json(post);
  } catch (error) {
    console.error('Erro like:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Comentários de uma publicação
router.get('/:id/comments', async (req, res) => {
  try {
    const postId = Number(req.params.id);
    if (!Number.isInteger(postId)) return res.status(400).json({ error: 'ID inválido' });
    const db = getDb();
    const comments = await db
      .prepare(
        'SELECT id, author, content, created_at FROM post_comments WHERE post_id = ? ORDER BY created_at ASC'
      )
      .all(postId);
    const avatarOf = await avatarLookup(db);
    res.json(comments.map((c) => ({ ...c, author_avatar: avatarOf(c.author) })));
  } catch (error) {
    console.error('Erro comments GET:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Comentar numa publicação (visitantes)
router.post('/:id/comments', async (req, res) => {
  try {
    const postId = Number(req.params.id);
    if (!Number.isInteger(postId)) return res.status(400).json({ error: 'ID inválido' });

    const author = String(req.body.author || '').trim().slice(0, 50);
    const content = String(req.body.content || '').trim().slice(0, 1000);

    if (!author || !content) {
      return res.status(400).json({ error: 'Nome e comentário são obrigatórios' });
    }

    const db = getDb();
    const post = await db.prepare('SELECT id FROM posts WHERE id = ?').get(postId);
    if (!post) return res.status(404).json({ error: 'Publicação não encontrada' });

    const result = await db
      .prepare('INSERT INTO post_comments (post_id, author, content) VALUES (?, ?, ?) RETURNING id')
      .run(postId, author, content);

    const comment = await db
      .prepare('SELECT id, author, content, created_at FROM post_comments WHERE id = ?')
      .get(result.lastInsertRowid);

    res.json({ ...comment, author_avatar: (await avatarLookup(db))(comment.author) });
  } catch (error) {
    console.error('Erro comment POST:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Eliminar um comentário (SÓ ADMIN)
router.delete('/:id/comments/:commentId', requireAdmin, async (req, res) => {
  try {
    const commentId = Number(req.params.commentId);
    if (!Number.isInteger(commentId)) return res.status(400).json({ error: 'ID inválido' });
    const db = getDb();
    await db.prepare('DELETE FROM post_comments WHERE id = ?').run(commentId);
    res.json({ success: true });
  } catch (error) {
    console.error('Erro comment DELETE:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Eliminar publicação (SÓ ADMIN)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const postId = Number(req.params.id);
    if (!Number.isInteger(postId)) {
      return res.status(400).json({ error: 'ID inválido' });
    }
    const db = getDb();
    // As FKs têm ON DELETE CASCADE, mas apagamos por ordem por segurança.
    await db.prepare('DELETE FROM post_likes WHERE post_id = ?').run(postId);
    await db.prepare('DELETE FROM post_comments WHERE post_id = ?').run(postId);
    await db.prepare('DELETE FROM posts WHERE id = ?').run(postId);
    res.json({ success: true });
  } catch (error) {
    console.error('Erro delete post:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// Apagar TODAS as publicações (SÓ ADMIN) — limpar testes
router.delete('/', requireAdmin, async (req, res) => {
  try {
    const db = getDb();
    // As FKs têm ON DELETE CASCADE, mas apagamos por ordem por segurança.
    await db.exec('DELETE FROM post_likes; DELETE FROM post_comments; DELETE FROM posts;');
    res.json({ success: true });
  } catch (error) {
    console.error('Erro clear posts:', error.message);
    res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = { postsRouter: router };

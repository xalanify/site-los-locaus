// ============================================================
//  API de Componentes e Periféricos (só admin)
//
//  GET    /api/componentes             catálogo + preços guardados
//  POST   /api/componentes/atualizar   { ids: [] } vai às lojas
//  POST   /api/componentes/preco       preço manual (loja bloqueada)
//  DELETE /api/componentes/preco       apaga o preço de uma loja
// ============================================================
const express = require('express');
const { getDb } = require('../database');
const { requireAdmin } = require('../middleware/auth');
const {
  CATALOGO,
  CATEGORIAS,
  CATEGORIA_QUERY,
  LOJAS,
  buscarPrecos,
  buscarTudo,
  guardarPreco,
  listarPrecos,
  montarProdutos,
  garantirTabela,
} = require('../componentes');

const router = express.Router();

router.get('/', requireAdmin, async (req, res) => {
  try {
    await garantirTabela();
    const rows = await listarPrecos();
    res.json({
      categorias: CATEGORIAS,
      categoriaQuery: CATEGORIA_QUERY,
      lojas: LOJAS,
      produtos: montarProdutos(rows),
    });
  } catch (error) {
    console.error('Erro componentes GET:', error.message);
    res.status(500).json({ error: 'Não deu para carregar os componentes.' });
  }
});

/* Pesquisa ao vivo em todas as lojas (qualquer produto, não só o catálogo). */
router.get('/pesquisar', requireAdmin, async (req, res) => {
  try {
    const q = String((req.query && req.query.q) || '').trim();
    const tipo = req.query && req.query.tipo === 'periferico' ? 'periferico' : 'componente';
    const categoria = String((req.query && req.query.categoria) || '');
    const lojas = String((req.query && req.query.lojas) || '')
      .split(',')
      .map((x) => x.trim())
      .filter((x) => LOJAS[x]);
    if (!q) return res.json({ ok: true, resultados: [], lojas: LOJAS });
    const resultados = await buscarTudo(q, { tipo, categoria, lojas, limite: 80 });
    res.json({ ok: true, resultados, lojas: LOJAS });
  } catch (error) {
    console.error('Erro componentes pesquisar:', error.message);
    res.status(500).json({ error: 'Não deu para pesquisar nas lojas.' });
  }
});

router.post('/atualizar', requireAdmin, async (req, res) => {
  try {
    await garantirTabela();
    const ids = Array.isArray(req.body && req.body.ids) ? req.body.ids.slice(0, 6) : [];
    const alvo = ids.length ? CATALOGO.filter((p) => ids.includes(p.id)) : [];
    if (!alvo.length) return res.status(400).json({ error: 'Escolhe pelo menos um produto.' });

    const atualizados = [];
    for (const produto of alvo) {
      const encontrados = await buscarPrecos(produto);
      for (const e of encontrados) {
        await guardarPreco(produto.id, e.loja, e, false);
      }
      atualizados.push({ id: produto.id, encontrados: encontrados.length });
    }

    const rows = await listarPrecos();
    res.json({ ok: true, atualizados, produtos: montarProdutos(rows) });
  } catch (error) {
    console.error('Erro componentes atualizar:', error.message);
    res.status(500).json({ error: 'Não deu para atualizar os preços.' });
  }
});

router.post('/preco', requireAdmin, async (req, res) => {
  try {
    await garantirTabela();
    const produto_id = String((req.body && req.body.produto_id) || '');
    const loja = String((req.body && req.body.loja) || '');
    const produto = CATALOGO.find((p) => p.id === produto_id);
    if (!produto || !LOJAS[loja]) {
      return res.status(400).json({ error: 'Produto ou loja inválidos.' });
    }
    const preco = Number(req.body && req.body.preco);
    if (!Number.isFinite(preco) || preco <= 0) {
      return res.status(400).json({ error: 'Preço inválido.' });
    }
    const url = String((req.body && req.body.url) || '').trim();
    await guardarPreco(
      produto_id,
      loja,
      { preco: Math.round(preco * 100) / 100, url: url || null, imagem: null, titulo: null },
      true,
    );
    const rows = await listarPrecos();
    res.json({ ok: true, produtos: montarProdutos(rows) });
  } catch (error) {
    console.error('Erro componentes preco:', error.message);
    res.status(500).json({ error: 'Não deu para guardar o preço.' });
  }
});

router.delete('/preco', requireAdmin, async (req, res) => {
  try {
    await garantirTabela();
    const produto_id = String((req.query && req.query.produto_id) || '');
    const loja = String((req.query && req.query.loja) || '');
    if (!produto_id || !LOJAS[loja]) {
      return res.status(400).json({ error: 'Produto ou loja inválidos.' });
    }
    await getDb()
      .prepare('DELETE FROM public.componentes_precos WHERE produto_id = ? AND loja = ?')
      .run(produto_id, loja);
    const rows = await listarPrecos();
    res.json({ ok: true, produtos: montarProdutos(rows) });
  } catch (error) {
    console.error('Erro componentes apagar preco:', error.message);
    res.status(500).json({ error: 'Não deu para apagar o preço.' });
  }
});

module.exports = { componentesRouter: router };

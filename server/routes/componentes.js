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
const { requireAdmin, attachAuth } = require('../middleware/auth');
const {
  CATALOGO,
  CATEGORIAS,
  CATEGORIA_QUERY,
  LOJAS,
  buscarPrecos,
  buscarTudo,
  buscarMaisVendidos,
  guardarPreco,
  listarPrecos,
  listarHistorico,
  listarAlertas,
  guardarAlerta,
  apagarAlerta,
  montarProdutos,
  garantirTabela,
  imagemPeriferico,
} = require('../componentes');

const router = express.Router();

/* Foto de um periférico — usada no cartão do perfil (qualquer conta). */
router.get('/imagem', attachAuth, async (req, res) => {
  try {
    const q = String((req.query && req.query.q) || '').slice(0, 120);
    if (!q) return res.json({ imagem: null });
    res.setHeader('Cache-Control', 'public, max-age=21600');
    res.json({ imagem: await imagemPeriferico(q) });
  } catch (error) {
    console.error('Erro imagem periferico:', error.message);
    res.json({ imagem: null });
  }
});

/* Bytes da foto do periférico (para o browser poder remover o fundo
   branco no canvas sem problemas de CORS). */
router.get('/imagem-proxy', async (req, res) => {
  try {
    const q = String((req.query && req.query.q) || '').slice(0, 120);
    if (!q) return res.status(404).end();
    const url = await imagemPeriferico(q);
    if (!url) return res.status(404).end();
    const r = await fetch(url);
    if (!r.ok) return res.status(404).end();
    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', r.headers.get('content-type') || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=21600');
    res.send(buf);
  } catch (error) {
    console.error('Erro proxy imagem periferico:', error.message);
    res.status(404).end();
  }
});

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

/* Histórico de preços de um produto. */
router.get('/historico', requireAdmin, async (req, res) => {
  try {
    const produto_id = String((req.query && req.query.produto_id) || '');
    if (!produto_id) return res.status(400).json({ error: 'Produto inválido.' });
    res.json({ ok: true, pontos: await listarHistorico(produto_id) });
  } catch (error) {
    console.error('Erro componentes historico:', error.message);
    res.status(500).json({ error: 'Não deu para carregar o histórico.' });
  }
});

/* Alertas de descida de preço do admin. */
router.get('/alertas', requireAdmin, async (req, res) => {
  try {
    const uid = Number(req.auth && req.auth.uid);
    if (!uid) return res.json({ ok: true, alertas: [] });
    res.json({ ok: true, alertas: await listarAlertas(uid) });
  } catch (error) {
    console.error('Erro componentes alertas:', error.message);
    res.status(500).json({ error: 'Não deu para carregar os alertas.' });
  }
});

router.post('/alerta', requireAdmin, async (req, res) => {
  try {
    const uid = Number(req.auth && req.auth.uid);
    if (!uid) return res.status(400).json({ error: 'Entra com a conta de admin para criar alertas.' });
    const produto_id = String((req.body && req.body.produto_id) || '');
    const preco = Number(req.body && req.body.preco_alvo);
    if (!CATALOGO.some((p) => p.id === produto_id) || !Number.isFinite(preco) || preco <= 0) {
      return res.status(400).json({ error: 'Produto ou preço inválido.' });
    }
    await guardarAlerta(uid, produto_id, Math.round(preco * 100) / 100);
    res.json({ ok: true, alertas: await listarAlertas(uid) });
  } catch (error) {
    console.error('Erro componentes alerta:', error.message);
    res.status(500).json({ error: 'Não deu para guardar o alerta.' });
  }
});

router.delete('/alerta', requireAdmin, async (req, res) => {
  try {
    const uid = Number(req.auth && req.auth.uid);
    if (!uid) return res.json({ ok: true, alertas: [] });
    const produto_id = String((req.query && req.query.produto_id) || '');
    if (produto_id) await apagarAlerta(uid, produto_id);
    res.json({ ok: true, alertas: await listarAlertas(uid) });
  } catch (error) {
    console.error('Erro componentes apagar alerta:', error.message);
    res.status(500).json({ error: 'Não deu para apagar o alerta.' });
  }
});

/* Mais vendidos / relevantes (entrada da página, sem pesquisa). */
router.get('/mais-vendidos', requireAdmin, async (req, res) => {
  try {
    const tipo = req.query && req.query.tipo === 'periferico' ? 'periferico' : 'componente';
    const categoria = String((req.query && req.query.categoria) || '');
    const resultados = await buscarMaisVendidos({ tipo, categoria, limite: 12 });
    res.json({ ok: true, resultados });
  } catch (error) {
    console.error('Erro componentes mais-vendidos:', error.message);
    res.status(500).json({ error: 'Não deu para carregar os mais vendidos.' });
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

/* ============================================================
   Função da Vercel
   ------------------------------------------------------------
   Expõe a app Express do servidor como uma única função.
   A Vercel aceita uma função (req, res) — e a app do Express
   tem exactamente essa assinatura, por isso basta exportá-la.

   Todas as rotas /api/* vêm para aqui (ver vercel.json -> rewrites)
   e são despachadas pelos routers do Express.
   ============================================================ */
module.exports = require('../server/index');

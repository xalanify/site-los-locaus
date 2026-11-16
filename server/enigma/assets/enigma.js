/* ============================================================
   locaus.fun :: enigma 1 semana  (scripts das páginas)
   3D escuro + movimento do rato, aviso de telemóvel e ligação
   automática à conta.
   ============================================================ */

(function () {
  var st = "background:linear-gradient(90deg,#2a0b0f,#150608);color:#ff8f5e;" +
           "padding:8px 15px;border-radius:3px;letter-spacing:.24em;font:11px Consolas,monospace";
  console.log("%c L O C A U S . F U N  ::  E N I G M A  1   S E M A N A ", st);
})();

function aviso(texto, ms) {
  var t = document.getElementById("toast");
  if (!t) { t = document.createElement("div"); t.id = "toast"; t.className = "toast"; document.body.appendChild(t); }
  t.textContent = texto;
  t.classList.add("on");
  clearTimeout(aviso._t);
  aviso._t = setTimeout(function () { t.classList.remove("on"); }, ms || 3400);
}

function tremer(el) {
  if (!el) return;
  el.classList.remove("treme");
  void el.offsetWidth;
  el.classList.add("treme");
  setTimeout(function () { el.classList.remove("treme"); }, 420);
}

/* ajuda / ajuda() — poucas pistas, sem passo-a-passo */
function registarAjuda(funcao) {
  var ultima = 0;
  function imprimir() {
    var agora = Date.now();
    if (agora - ultima < 400) return;
    ultima = agora;
    funcao();
  }
  function ajudaFn() { imprimir(); return "olha em volta."; }
  try {
    Object.defineProperty(window, "ajuda", { configurable: true, get: function () { imprimir(); return ajudaFn; } });
  } catch (e) { window.ajuda = ajudaFn; }
}

/* ---------------------------------------------------------- cena 3D */
function montarCena3D() {
  document.querySelectorAll("[data-roda]").forEach(function (roda) {
    if (roda.dataset.pronta) return;
    roda.dataset.pronta = "1";
    roda.classList.add("roda-3d");

    var cena = document.createElement("div");
    cena.className = "cena3d";

    for (var i = 1; i <= 3; i++) {
      var anel = document.createElement("div");
      anel.className = "anel anel-" + i;
      cena.appendChild(anel);
    }

    var nucleo = document.createElement("div");
    nucleo.className = "nucleo";
    cena.appendChild(nucleo);

    var brilho = document.createElement("div");
    brilho.className = "nucleo-brilho";
    cena.appendChild(brilho);

    var poeira = document.createElement("div");
    poeira.className = "poeira";
    for (var p = 0; p < 26; p++) {
      var pt = document.createElement("i");
      var ang = Math.random() * Math.PI * 2;
      var raio = 26 + Math.random() * 46;
      pt.style.left = 50 + Math.cos(ang) * raio + "%";
      pt.style.top = 50 + Math.sin(ang) * raio + "%";
      pt.style.animationDelay = (Math.random() * 6).toFixed(2) + "s";
      pt.style.opacity = (0.2 + Math.random() * 0.6).toFixed(2);
      poeira.appendChild(pt);
    }
    cena.appendChild(poeira);

    roda.appendChild(cena);

    var alvoX = 0, alvoY = 0, x = 0, y = 0;
    document.addEventListener("mousemove", function (e) {
      alvoX = (e.clientY / window.innerHeight - 0.5) * -26;
      alvoY = (e.clientX / window.innerWidth - 0.5) * 34;
    });
    document.addEventListener("deviceorientation", function (e) {
      if (e.gamma == null) return;
      alvoY = Math.max(-30, Math.min(30, e.gamma)) * 0.8;
      alvoX = Math.max(-30, Math.min(30, (e.beta || 0) - 45)) * -0.5;
    });

    function loop() {
      x += (alvoX - x) * 0.06;
      y += (alvoY - y) * 0.06;
      cena.style.transform = "rotateX(" + x.toFixed(2) + "deg) rotateY(" + y.toFixed(2) + "deg)";
      requestAnimationFrame(loop);
    }
    loop();
  });
}

/* ------------------------------------------------------- experiência */
function tokenSessao() {
  try {
    return localStorage.getItem("userToken") || localStorage.getItem("adminToken") || "";
  } catch (e) {
    return "";
  }
}

function normalizar(v) {
  return String(v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function api(rota, corpo) {
  if (rota === "responder" && corpo && normalizar(corpo.valor) === "ajuda") {
    aviso("Seu burro 😄 a palavra \"ajuda\" não é para escrever aqui — é na consola (F12).", 5600);
    return Promise.resolve({ ok: false, troll: true });
  }
  var cabecalhos = { "Content-Type": "application/json" };
  var t = tokenSessao();
  if (t) cabecalhos.Authorization = "Bearer " + t;
  return fetch("/api/enigma/" + rota, {
    method: "POST",
    headers: cabecalhos,
    body: JSON.stringify(corpo || {})
  }).then(function (r) { return r.json(); });
}

function progresso(etapa) {
  if (!tokenSessao()) { location.href = "/enigmas"; return; }
  api("entrou", { etapa: etapa }).catch(function () {});
}

function mostrarLink(url) {
  var chapa = document.getElementById("chapa");
  if (!chapa) return;
  chapa.innerHTML = 'próxima página: <a href="' + url + '">clica aqui para continuar</a>';
  chapa.classList.add("on");
}

/* aviso: o enigma é só para computador */
function bloquearTelemovel() {
  if (!window.matchMedia("(max-width: 1023px)").matches) return false;
  var caixa = document.createElement("div");
  caixa.className = "aviso-mobile";
  caixa.innerHTML =
    '<div class="aviso-mobile-card">' +
    '<span class="aviso-mobile-ico">⌘</span>' +
    "<h2>Este enigma é para computador</h2>" +
    "<p>No telemóvel (ou na app) não é possível resolver as etapas. Abre o site num PC para participar.</p>" +
    '<a href="/enigmas">voltar aos enigmas</a>' +
    "</div>";
  document.body.appendChild(caixa);
  document.body.classList.add("so-telemovel-bloqueado");
  return true;
}

/* ligação para voltar à página dos enigmas (progresso fica guardado) */
function montarVoltar() {
  var header = document.querySelector("header");
  if (!header || header.querySelector(".voltar")) return;
  var a = document.createElement("a");
  a.className = "voltar";
  a.href = "/enigmas";
  a.textContent = "← enigmas";
  a.title = "Voltar aos enigmas (o progresso fica guardado)";
  a.addEventListener("click", function () {
    try {
      sessionStorage.setItem("locaus:skip-boot", "1");
    } catch (e) {
      /* sem sessionStorage */
    }
  });
  header.insertBefore(a, header.children[1] || null);
}

/* no fim: mostra as moedas ganhas */
function mostrarPremio() {
  var alvo = document.querySelector(".fim");
  if (!alvo || !tokenSessao()) return;
  fetch("/api/enigma/eu", {
    headers: { Authorization: "Bearer " + tokenSessao() }
  })
    .then(function (r) { return r.ok ? r.json() : null; })
    .then(function (d) {
      if (!d || !d.terminou) return;
      var p = document.createElement("p");
      p.className = "premio-fim";
      p.innerHTML =
        "ganhaste <b>" + (d.moedas || 0) + " moedas</b>" +
        (d.posicao ? " · " + d.posicao + ".º lugar" : "") +
        ". já estão na tua conta.";
      var link = alvo.querySelector("a");
      if (link) alvo.insertBefore(p, link.parentNode);
      else alvo.appendChild(p);
    })
    .catch(function () {});
}

document.addEventListener("DOMContentLoaded", function () {
  if (bloquearTelemovel()) return;
  montarVoltar();
  montarCena3D();
  mostrarPremio();
});

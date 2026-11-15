/* Navegação, rodapé, índice lateral e gráficos simples do site. Sem dependências. */
(function () {
  'use strict';
  var PAGES = [
    ['index.html', 'Visão geral'],
    ['orcamento.html', 'Orçamento global'],
    ['acao-social.html', 'Ação Social'],
    ['saude.html', 'Saúde'],
    ['metodo.html', 'Método e fontes'],
    ['dashboard.html', 'Dashboard']
  ];
  var here = document.body.getAttribute('data-page') || 'index.html';
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---------- números em português ---------- */
  function group(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function eur(v) { if (v == null) return 'n.d.'; return (v < 0 ? '−' : '') + group(Math.round(Math.abs(v))) + ' €'; }
  function dec(v, d) { return Math.abs(v).toFixed(d).replace('.', ','); }
  function meur(v, d) { if (v == null) return 'n.d.'; return (v < 0 ? '−' : '') + dec(v / 1e6, d == null ? 1 : d) + ' M€'; }
  function smeur(v, d) { return (v > 0 ? '+' : v < 0 ? '−' : '') + dec(v / 1e6, d == null ? 1 : d) + ' M€'; }
  function spct(a, b) { if (!b) return 'n.a.'; var p = 100 * (a - b) / b; return (p > 0 ? '+' : p < 0 ? '−' : '') + dec(p, 1) + '%'; }

  /* ---------- cabeçalho ---------- */
  var header = el('header', 'site-header');
  var nav = PAGES.map(function (p) {
    var cur = p[0] === here ? ' aria-current="page"' : '';
    var cls = p[0] === 'dashboard.html' && p[0] !== here ? ' class="cta"' : '';
    return '<a href="' + p[0] + '"' + cur + cls + '>' + p[1] + '</a>';
  }).join('');
  header.innerHTML = '<div class="wrap">' +
    '<a class="brand" href="index.html" aria-label="Início">' +
    '<img class="brand-logo" src="assets/logo-il.png" alt="Iniciativa Liberal" width="800" height="353">' +
    '<span class="brand-sub">Cascais · GEPA<br>Orçamento 2025–2027</span></a>' +
    '<button class="nav-toggle" aria-expanded="false" aria-controls="site-nav">Menu</button>' +
    '<nav class="site-nav" id="site-nav" aria-label="Principal">' + nav + '</nav></div>';
  document.body.insertBefore(header, document.body.firstChild);
  var toggle = header.querySelector('.nav-toggle'), navEl = header.querySelector('.site-nav');
  toggle.addEventListener('click', function () { var o = navEl.classList.toggle('open'); toggle.setAttribute('aria-expanded', o); });

  /* ---------- rodapé ---------- */
  if (!document.body.classList.contains('dash')) {
    var footer = el('footer', 'site-footer');
    footer.innerHTML = '<div class="wrap">' +
      '<div><h2>O que é este site</h2><p>Documento de trabalho do GEPA do Núcleo da Iniciativa Liberal de Cascais para apoiar os eleitos na apreciação do Orçamento e das GOP de 2027.</p><p>A posição política global é definida pelos órgãos e eleitos competentes. As fichas estão em versão para partilha e validação.</p></div>' +
      '<div><h2>Páginas</h2><ul>' + PAGES.map(function (p) { return '<li><a href="' + p[0] + '">' + p[1] + '</a></li>'; }).join('') + '</ul></div>' +
      '<div><h2>Ficheiros</h2><ul>' +
      '<li><a href="GEPA_Ficha_Objetivo_05_Ação Social_2025_2027.docx">Ficha GEPA 05, Ação Social (.docx)</a></li>' +
      '<li><a href="GEPA_Ficha_Objetivo_06_Saúde_2025_2027.docx">Ficha GEPA 06, Saúde (.docx)</a></li>' +
      '<li><a href="gop_acoes_2025_2027.csv">Ações das GOP 2025–2027 (.csv)</a></li>' +
      '<li><a href="dashboard_orcamento_cascais_2025_2027.html">Dashboard em página inteira</a></li></ul>' +
      '<p>Dados gerados a 14 de novembro de 2026.</p></div></div>';
    document.body.appendChild(footer);
    var top = el('button', 'to-top', '↑'); top.setAttribute('aria-label', 'Voltar ao topo');
    top.addEventListener('click', function () { window.scrollTo({ top: 0, behavior: 'smooth' }); });
    document.body.appendChild(top);
    window.addEventListener('scroll', function () { top.classList.toggle('show', window.scrollY > 700); }, { passive: true });
  }

  /* ---------- índice lateral ---------- */
  var toc = document.querySelector('.toc');
  if (toc) {
    var secs = [].slice.call(document.querySelectorAll('.content > section[id]'));
    toc.innerHTML = '<h2>Nesta página</h2><ol>' + secs.map(function (s) {
      var h = s.querySelector('h2'); return '<li><a href="#' + s.id + '">' + esc(s.getAttribute('data-toc') || (h && h.textContent) || s.id) + '</a></li>';
    }).join('') + '</ol>';
    var links = [].slice.call(toc.querySelectorAll('a'));
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (e.isIntersecting) links.forEach(function (a) { a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id); });
        });
      }, { rootMargin: '-20% 0px -70% 0px' });
      secs.forEach(function (s) { io.observe(s); });
    }
  }

  /* ---------- gráficos ---------- */
  function data(id) { var s = document.getElementById(id); return s ? JSON.parse(s.textContent) : null; }

  // Gráficos em SVG (role="img") para poderem ser exportados em PNG por assets/export.js.
  var C = { a: '#b4bcc4', b: '#00a7e2', neg: '#e6007d', ink: '#4f4f4f', strong: '#000000', axis: '#8a8a8a' };
  function cut(s, px) { var n = Math.max(6, Math.floor(px / 6.6)); return s.length > n ? s.slice(0, n - 1) + '…' : s; }
  function T(x, y, txt, o) {
    o = o || {};
    return '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" dy="0.35em" font-size="' + (o.fs || 12.5) + '" fill="' + (o.fill || C.ink) + '"' +
      (o.anchor ? ' text-anchor="' + o.anchor + '"' : '') + (o.fw ? ' font-weight="' + o.fw + '"' : '') + '>' + esc(txt) + (o.title ? '<title>' + esc(o.title) + '</title>' : '') + '</text>';
  }
  function R(x, y, w, h, fill, title) {
    return '<rect x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" width="' + Math.max(2, w).toFixed(1) + '" height="' + h + '" rx="3" fill="' + fill + '">' + (title ? '<title>' + esc(title) + '</title>' : '') + '</rect>';
  }
  function svg(W, H, body, label) {
    return '<svg role="img" aria-label="' + esc(label) + '" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" style="display:block;max-width:100%;height:auto">' + body + '</svg>';
  }
  function geom(box) {
    var W = Math.max(280, Math.floor(box.clientWidth || 600)), narrow = W < 520, lw = narrow ? 0 : Math.min(W * 0.3, 230);
    return { W: W, narrow: narrow, lw: lw, x0: narrow ? 0 : lw + 12 };
  }
  function label(g, y, rowH, text) {
    return g.narrow ? T(0, y + 9, cut(text, g.W), { fw: 500, fill: C.strong, title: text }) : T(g.lw, y + rowH / 2, cut(text, g.lw), { anchor: 'end', title: text });
  }
  // barras simples: [{l, v, hi}]
  function bars(box, items) {
    var g = geom(box), rowH = g.narrow ? 48 : 32, bh = 18, maxw = g.W - g.x0 - 84;
    var mx = Math.max.apply(null, items.map(function (d) { return d.v; })) || 1, s = '';
    items.forEach(function (d, i) {
      var y = i * rowH, by = g.narrow ? y + 22 : y + (rowH - bh) / 2, w = maxw * d.v / mx;
      s += label(g, y, rowH, d.l) + R(g.x0, by, w, bh, d.hi ? C.b : C.a, d.l + ': ' + eur(d.v)) + T(g.x0 + Math.max(2, w) + 8, by + bh / 2, meur(d.v, d.v < 1e7 ? 2 : 1), { fs: 12 });
    });
    box.innerHTML = svg(g.W, items.length * rowH, s, 'Gráfico de barras');
  }
  // pares: {a:'Inicial 2026', b:'Proposta 2027', items:[{l, a, b}]}
  function pairs(box, cfg) {
    var g = geom(box), rowH = g.narrow ? 62 : 44, bh = 11, maxw = g.W - g.x0 - 150;
    var mx = Math.max.apply(null, cfg.items.map(function (d) { return Math.max(d.a || 0, d.b || 0); })) || 1;
    var f = function (v) { return Math.abs(v || 0) < 1e6 ? eur(v || 0) : meur(v, 2); }, s = '';
    cfg.items.forEach(function (d, i) {
      var y = i * rowH, by = g.narrow ? y + 22 : y + (rowH - 2 * bh - 4) / 2, wa = maxw * (d.a || 0) / mx, wb = maxw * (d.b || 0) / mx;
      s += label(g, y, rowH, d.l) +
        R(g.x0, by, wa, bh, C.a, d.l + ' · ' + cfg.a + ': ' + eur(d.a)) + T(g.x0 + Math.max(2, wa) + 8, by + bh / 2, f(d.a), { fs: 11.5 }) +
        R(g.x0, by + bh + 4, wb, bh, C.b, d.l + ' · ' + cfg.b + ': ' + eur(d.b)) + T(g.x0 + Math.max(2, wb) + 8, by + bh + 4 + bh / 2, f(d.b) + ' (' + spct(d.b, d.a) + ')', { fs: 11.5 });
    });
    box.innerHTML = '<div class="legend"><span><i class="c-a"></i>' + esc(cfg.a) + '</span><span><i class="c-b"></i>' + esc(cfg.b) + '</span></div>' + svg(g.W, cfg.items.length * rowH, s, 'Gráfico de barras: ' + cfg.a + ' e ' + cfg.b);
  }
  // divergente: [{l, a, b}] mostra b − a
  function diverge(box, items) {
    var rows = items.map(function (d) { return { l: d.l, dv: d.b - d.a, a: d.a, b: d.b }; }).sort(function (p, q) { return q.dv - p.dv; });
    var g = geom(box), rowH = g.narrow ? 46 : 28, bh = 14, avail = g.W - g.x0, cx = g.x0 + avail / 2, half = Math.max(24, avail / 2 - 122);
    var ext = Math.max.apply(null, rows.map(function (d) { return Math.abs(d.dv); })) || 1, H = rows.length * rowH;
    var s = '<line x1="' + cx + '" x2="' + cx + '" y1="0" y2="' + H + '" stroke="' + C.axis + '" stroke-width="1"/>';
    rows.forEach(function (d, i) {
      var y = i * rowH, by = g.narrow ? y + 24 : y + (rowH - bh) / 2, w = Math.max(2, half * Math.abs(d.dv) / ext), pos = d.dv >= 0;
      var val = smeur(d.dv) + ' (' + spct(d.b, d.a) + ')', tip = d.l + ': ' + meur(d.a) + ' para ' + meur(d.b);
      s += label(g, y, rowH, d.l) + R(pos ? cx : cx - w, by, w, bh, pos ? C.b : C.neg, tip) +
        T(pos ? cx + w + 6 : cx - w - 6, by + bh / 2, val, { fs: 11.5, anchor: pos ? 'start' : 'end' });
    });
    box.innerHTML = '<div class="legend"><span><i class="c-b"></i>Ganha dotação</span><span><i class="c-neg"></i>Perde dotação</span></div>' + svg(g.W, H, s, 'Variação por objetivo');
  }  // tabela de programas/objetivos: cols = [[chave, título]], linhas com valores em euros
  function progTable(box, cfg) {
    var cols = cfg.cols, tot = {};
    cols.forEach(function (c) { tot[c[0]] = 0; });
    var body = cfg.rows.map(function (r) {
      cols.forEach(function (c) { tot[c[0]] += r[c[0]] || 0; });
      var dv = r[cfg.cmp[1]] - r[cfg.cmp[0]];
      return '<tr><th scope="row">' + esc(r.l) + '</th>' + cols.map(function (c) { return '<td class="r">' + (cfg.m ? meur(r[c[0]], 2) : eur(r[c[0]])) + '</td>'; }).join('') +
        '<td class="r ' + (dv > 0 ? 'up' : dv < 0 ? 'down' : '') + '">' + spct(r[cfg.cmp[1]], r[cfg.cmp[0]]) + '</td></tr>';
    }).join('');
    box.innerHTML = '<table><thead><tr><th scope="col">' + esc(cfg.head) + '</th>' + cols.map(function (c) { return '<th scope="col" class="r">' + esc(c[1]) + '</th>'; }).join('') +
      '<th scope="col" class="r">' + esc(cfg.cmpLabel) + '</th></tr></thead><tbody>' + body +
      '<tr class="total"><th scope="row">Total</th>' + cols.map(function (c) { return '<td class="r">' + (cfg.m ? meur(tot[c[0]], 2) : eur(tot[c[0]])) + '</td>'; }).join('') +
      '<td class="r">' + spct(tot[cfg.cmp[1]], tot[cfg.cmp[0]]) + '</td></tr></tbody></table>';
  }

  var renders = [];
  [].forEach.call(document.querySelectorAll('[data-chart]'), function (box) {
    var d = data(box.getAttribute('data-src')); if (!d) return;
    var t = box.getAttribute('data-chart'), ka = box.getAttribute('data-ka'), kb = box.getAttribute('data-kb'), fn = null;
    if (t === 'bars') fn = function () { bars(box, d); };
    else if (t === 'pairs') fn = function () { pairs(box, { a: box.getAttribute('data-a'), b: box.getAttribute('data-b'), items: d.rows.map(function (r) { return { l: r.l, a: r[ka], b: r[kb] }; }) }); };
    else if (t === 'diverge') fn = function () { diverge(box, d.rows.map(function (r) { return { l: r.l, a: r[ka], b: r[kb] }; })); };
    else if (t === 'table') progTable(box, d);
    if (fn) { fn(); renders.push(fn); }
  });
  var rt, lastW = window.innerWidth;
  window.addEventListener('resize', function () {
    if (window.innerWidth === lastW) return; lastW = window.innerWidth;
    clearTimeout(rt); rt = setTimeout(function () { renders.forEach(function (f) { f(); }); }, 180);
  });
  /* ---------- dashboard: saltar para um separador ---------- */
  var frame = document.querySelector('.dash-frame');
  if (frame) {
    var base = frame.getAttribute('src').split('#')[0];
    if (location.hash) frame.setAttribute('src', base + location.hash);
    [].forEach.call(document.querySelectorAll('.jump a'), function (a) {
      a.addEventListener('click', function (ev) {
        ev.preventDefault();
        var h = a.getAttribute('href');
        frame.setAttribute('src', base + h);
        try { history.replaceState(null, '', h); } catch (e) { /* file:// */ }
      });
    });
  }
})();

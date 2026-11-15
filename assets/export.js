/* Exportação: tabelas em .csv e .xlsx, gráficos SVG em .png, texto da página em .txt.
   Funciona no site e no dashboard, sem dependências e sem rede (o .xlsx é escrito aqui). */
(function () {
  'use strict';
  if (window.__xp) return; window.__xp = true;
  try { if (window.self !== window.top) document.documentElement.classList.add('embedded'); } catch (e) { document.documentElement.classList.add('embedded'); }

  var st = document.createElement('style');
  st.textContent =
    '.xp-bar{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:10px 0 2px;font-family:Poppins,Arial,sans-serif}' +
    '.xp-bar>span{font:600 10.5px/1 Outfit,Poppins,Arial,sans-serif;letter-spacing:.08em;text-transform:uppercase;color:#767676;margin-right:2px}' +
    '.xp-btn{font:500 12px/1 Poppins,Arial,sans-serif;border:1px solid #e2e5e8;background:#fff;color:#4f4f4f;border-radius:24px;padding:6px 12px;cursor:pointer;white-space:nowrap}' +
    '.xp-btn:hover{border-color:#00a7e2;color:#0064a5}' +
    '.xp-btn:focus-visible{outline:2px solid #00a7e2;outline-offset:1px}' +
    '.xp-float{position:fixed;left:18px;bottom:18px;z-index:45;box-shadow:0 6px 18px rgba(0,0,0,.1);padding:10px 16px}' +
    'body.xp-hide .xp-bar,body.xp-hide .xp-float,body.xp-hide .xp-btn{display:none!important}' +
    '@media print{.xp-bar,.xp-float{display:none!important}}';
  document.head.appendChild(st);

  /* ---------- utilitários ---------- */
  function slug(s) {
    return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'dados';
  }
  function download(blob, name) {
    var a = document.createElement('a'), url = URL.createObjectURL(blob);
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  function clean(s) { return String(s == null ? '' : s).replace(/[   ]/g, ' ').replace(/\s+/g, ' ').trim(); }
  function hostTitle(host) {
    var h = host.querySelector('h3,caption,h4');
    if (!h) { var p = host.previousElementSibling; while (p && !/^H[2-4]$/.test(p.tagName) && !(p.classList && p.classList.contains('chart'))) p = p.previousElementSibling; if (p && /^H[2-4]$/.test(p.tagName)) h = p; }
    if (!h) { var s = host.closest('section'); h = s && s.querySelector('h2'); }
    return clean(h ? h.textContent : document.title);
  }
  function visible(el) { var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; }

  /* ---------- tabelas ---------- */
  var BLANK = { '': 1, '—': 1, '-': 1, 'n.d.': 1, 'n.a.': 1 };
  function parseNum(t) {
    var s = t.replace(/\s/g, '').replace(/−/g, '-');
    if (/^[+-]?0\d/.test(s)) return null;                        // códigos com zero à esquerda ficam texto
    var m = /^([+-]?\d+(?:,\d+)?)(M€|€\/hab\.|€|%|p\.p\.)?$/.exec(s);
    return m ? { v: parseFloat(m[1].replace(',', '.')), u: m[2] || '' } : null;
  }
  // Texto da célula sem as maiúsculas de CSS e com espaço entre blocos (div, br, p) dentro da célula.
  function cellText(node) {
    var s = '';
    [].forEach.call(node.childNodes, function (n) {
      if (n.nodeType === 3) s += n.nodeValue;
      else if (n.nodeType === 1) {
        var block = n.tagName === 'BR' || !/^inline/.test(getComputedStyle(n).display);
        s += (block ? ' ' : '') + cellText(n) + (block ? ' ' : '');
      }
    });
    return s;
  }
  function readTable(table) {
    var head = [], body = [];
    [].forEach.call(table.rows, function (tr) {
      var cells = [].map.call(tr.cells, function (c) { return clean(cellText(c)).replace(/\s[▲▼]$/, ''); });
      if (!head.length && tr.parentNode.tagName === 'THEAD') head = cells; else body.push(cells);
    });
    var n = Math.max(head.length, body.reduce(function (m, r) { return Math.max(m, r.length); }, 0));
    var types = [];
    for (var j = 0; j < n; j++) {
      var unit = null, ok = true, seen = 0;
      for (var i = 0; i < body.length && ok; i++) {
        var t = body[i][j]; if (t == null || BLANK[t]) continue;
        var p = parseNum(t);
        if (!p) ok = false; else if (unit === null) { unit = p.u; seen++; } else if (unit !== p.u) ok = false; else seen++;
      }
      types.push(ok && seen ? { num: true, u: unit } : { num: false });
    }
    var rows = body.map(function (r) {
      var o = [];
      for (var j = 0; j < n; j++) {
        var t = r[j] == null ? '' : r[j];
        o.push(types[j].num ? (BLANK[t] ? null : parseNum(t).v) : t);
      }
      return o;
    });
    var hd = []; for (var k = 0; k < n; k++) hd.push((head[k] || '') + (types[k].num && types[k].u ? ' (' + types[k].u + ')' : ''));
    return { head: hd, rows: rows };
  }
  function expandAll(host) { var b, n = 0; while ((b = host.querySelector('button.more')) && n++ < 60) b.click(); }
  function tablesOf(host) {
    expandAll(host);
    var ts = host.tagName === 'TABLE' ? [host] : [].slice.call(host.querySelectorAll('table'));
    return ts.map(readTable);
  }
  function csvCell(v) {
    if (v == null) return '';
    if (typeof v === 'number') return String(v).replace('.', ',');
    return /[;"\n\r]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }
  function toCSV(tables) {
    return '﻿' + tables.map(function (t) {
      return [t.head].concat(t.rows).map(function (r) { return r.map(csvCell).join(';'); }).join('\r\n');
    }).join('\r\n\r\n') + '\r\n';
  }

  /* ---------- xlsx mínimo (zip sem compressão) ---------- */
  var CRC = (function () { var t = [], c; for (var n = 0; n < 256; n++) { c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  function crc32(u8) { var c = 0xFFFFFFFF; for (var i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }
  function zip(files) {
    var enc = new TextEncoder(), parts = [], central = [], off = 0;
    files.forEach(function (f) {
      var name = enc.encode(f.name), data = enc.encode(f.text), crc = crc32(data);
      var lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
      lh.setUint16(10, 0, true); lh.setUint16(12, 0x21, true); lh.setUint32(14, crc, true); lh.setUint32(18, data.length, true);
      lh.setUint32(22, data.length, true); lh.setUint16(26, name.length, true); lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), name, data);
      var ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
      ch.setUint16(12, 0, true); ch.setUint16(14, 0x21, true); ch.setUint32(16, crc, true); ch.setUint32(20, data.length, true); ch.setUint32(24, data.length, true);
      ch.setUint16(28, name.length, true); ch.setUint32(42, off, true);
      central.push(new Uint8Array(ch.buffer), name);
      off += 30 + name.length + data.length;
    });
    var csize = central.reduce(function (s, p) { return s + p.length; }, 0);
    var end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true); end.setUint16(10, files.length, true);
    end.setUint32(12, csize, true); end.setUint32(16, off, true);
    return new Blob(parts.concat(central, [new Uint8Array(end.buffer)]), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }
  function x(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ''); }
  function col(i) { var s = ''; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = (i - m - 1) / 26; } return s; }
  function sheetXML(t) {
    var all = [t.head].concat(t.rows), widths = t.head.map(function (h) { return Math.max(8, h.length + 2); });
    var rows = all.map(function (r, i) {
      return '<row r="' + (i + 1) + '">' + r.map(function (v, j) {
        var ref = col(j) + (i + 1);
        if (v == null || v === '') return '';
        if (typeof v === 'number') return '<c r="' + ref + '"' + (i === 0 ? ' s="1"' : '') + '><v>' + v + '</v></c>';
        widths[j] = Math.min(60, Math.max(widths[j], v.length + 2));
        return '<c r="' + ref + '" t="inlineStr"' + (i === 0 ? ' s="1"' : '') + '><is><t xml:space="preserve">' + x(v) + '</t></is></c>';
      }).join('') + '</row>';
    }).join('');
    return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
      '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
      '<cols>' + widths.map(function (w, j) { return '<col min="' + (j + 1) + '" max="' + (j + 1) + '" width="' + w + '" customWidth="1"/>'; }).join('') + '</cols>' +
      '<sheetData>' + rows + '</sheetData></worksheet>';
  }
  function toXLSX(tables, title) {
    var used = {}, names = tables.map(function (t, i) {
      var n = (tables.length > 1 ? (i + 1) + ' ' : '') + title.replace(/[\[\]:*?\/\\]/g, ' ');
      n = n.slice(0, 31).trim() || 'Folha' + (i + 1); while (used[n]) n = n.slice(0, 28) + ' ' + (i + 1); used[n] = 1; return n;
    });
    var H = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
    var files = [
      { name: '[Content_Types].xml', text: H + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + tables.map(function (t, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join('') + '</Types>' },
      { name: '_rels/.rels', text: H + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>' },
      { name: 'xl/workbook.xml', text: H + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' + names.map(function (n, i) { return '<sheet name="' + x(n) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join('') + '</sheets></workbook>' },
      { name: 'xl/_rels/workbook.xml.rels', text: H + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + tables.map(function (t, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join('') + '<Relationship Id="rId' + (tables.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>' },
      { name: 'xl/styles.xml', text: H + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs></styleSheet>' }
    ];
    tables.forEach(function (t, i) { files.push({ name: 'xl/worksheets/sheet' + (i + 1) + '.xml', text: sheetXML(t) }); });
    return zip(files);
  }

  /* ---------- gráficos SVG para PNG (desenho direto no canvas, com as fontes da página) ---------- */
  function clear(c) { return !c || c === 'none' || c === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(c); }
  function num(el, a) { var v = parseFloat(el.getAttribute(a)); return isNaN(v) ? 0 : v; }
  function em(el, a, fs) { var v = el.getAttribute(a); if (!v) return 0; return /em$/.test(v) ? parseFloat(v) * fs : (parseFloat(v) || 0); }
  function drawSVG(ctx, svg, ox, oy, S) {
    [].forEach.call(svg.querySelectorAll('rect,line,path,circle,text'), function (el) {
      var cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') return;
      var m = el.getCTM(); if (!m) return;
      var alpha = 1; for (var p = el; p && p !== svg.parentNode; p = p.parentNode) { var o = parseFloat(getComputedStyle(p).opacity); if (!isNaN(o)) alpha *= o; }
      var fill = cs.fill, stroke = cs.stroke, sw = parseFloat(cs.strokeWidth) || 1, tag = el.tagName.toLowerCase();
      ctx.save();
      ctx.setTransform(S * m.a, S * m.b, S * m.c, S * m.d, S * (m.e + ox), S * (m.f + oy));
      ctx.globalAlpha = alpha; ctx.lineWidth = sw; ctx.lineCap = cs.strokeLinecap || 'butt'; ctx.lineJoin = cs.strokeLinejoin || 'miter';
      var dash = cs.strokeDasharray; ctx.setLineDash(dash && dash !== 'none' ? dash.split(/[ ,]+/).map(parseFloat).filter(function (n) { return !isNaN(n); }) : []);
      if (!clear(fill)) ctx.fillStyle = fill; if (!clear(stroke)) ctx.strokeStyle = stroke;
      if (tag === 'text') {
        var txt = [].filter.call(el.childNodes, function (n) { return n.nodeType === 3; }).map(function (n) { return n.nodeValue; }).join('');
        if (txt && !clear(fill)) {
          var fs = parseFloat(cs.fontSize) || 12;
          ctx.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + fs + 'px ' + cs.fontFamily;
          ctx.textAlign = cs.textAnchor === 'middle' ? 'center' : cs.textAnchor === 'end' ? 'right' : 'left';
          ctx.textBaseline = 'alphabetic';
          ctx.fillText(txt, num(el, 'x') + em(el, 'dx', fs), num(el, 'y') + em(el, 'dy', fs));
        }
      } else {
        var path = null;
        if (tag === 'rect') {
          var w = num(el, 'width'), h = num(el, 'height'), rx = Math.min(num(el, 'rx'), w / 2, h / 2);
          if (w > 0 && h > 0) { path = new Path2D(); if (rx > 0 && path.roundRect) path.roundRect(num(el, 'x'), num(el, 'y'), w, h, rx); else path.rect(num(el, 'x'), num(el, 'y'), w, h); }
        } else if (tag === 'line') { path = new Path2D(); path.moveTo(num(el, 'x1'), num(el, 'y1')); path.lineTo(num(el, 'x2'), num(el, 'y2')); fill = 'none'; }
        else if (tag === 'circle') { path = new Path2D(); path.arc(num(el, 'cx'), num(el, 'cy'), num(el, 'r'), 0, Math.PI * 2); }
        else if (tag === 'path' && el.getAttribute('d')) path = new Path2D(el.getAttribute('d'));
        if (path) { if (!clear(fill)) ctx.fill(path, cs.fillRule === 'evenodd' ? 'evenodd' : 'nonzero'); if (!clear(stroke)) ctx.stroke(path); }
      }
      ctx.restore();
    });
  }
  function wrap(ctx, text, font, maxW) {
    ctx.font = font; var out = [], line = '';
    clean(text).split(' ').forEach(function (w) {
      var t = line ? line + ' ' + w : w;
      if (line && ctx.measureText(t).width > maxW) { out.push(line); line = w; } else line = t;
    });
    if (line) out.push(line); return out;
  }
  function chartPNG(host, title) {
    var svgs = [].filter.call(host.querySelectorAll('svg[role="img"]'), visible); if (!svgs.length) return;
    var S = 2, pad = 24, ff = getComputedStyle(document.body).fontFamily;
    var boxes = svgs.map(function (s) { return s.getBoundingClientRect(); });
    var W = Math.max(360, Math.ceil(Math.max.apply(null, boxes.map(function (b) { return b.width; })))) + pad * 2, inner = W - pad * 2;
    var bg = getComputedStyle(host).backgroundColor; if (clear(bg)) bg = '#ffffff';
    var mc = document.createElement('canvas').getContext('2d');
    var fT = '600 17px ' + ff, fS = '400 12px ' + ff, fF = '400 11px ' + ff;
    var subEl = host.querySelector('.spec,.sub'), srcEl = host.querySelector('.src');
    var tL = wrap(mc, title, fT, inner), sL = subEl ? wrap(mc, subEl.innerText, fS, inner) : [], fL = srcEl ? wrap(mc, srcEl.innerText, fF, inner) : [];
    var seen = {}, legend = [];
    [].forEach.call(host.querySelectorAll('.legend span'), function (sp) {
      var i = sp.querySelector('i'), t = clean(sp.textContent); if (!i || !t || seen[t]) return; seen[t] = 1;
      mc.font = fS; legend.push({ c: getComputedStyle(i).backgroundColor, t: t, w: 16 + mc.measureText(t).width + 18 });
    });
    var lrows = [[]], lx = 0; legend.forEach(function (l) { if (lx + l.w > inner && lx > 0) { lrows.push([]); lx = 0; } lrows[lrows.length - 1].push(l); lx += l.w; });
    if (!legend.length) lrows = [];
    var H = pad + tL.length * 23 + (sL.length ? 4 + sL.length * 17 : 0) + (lrows.length ? 8 + lrows.length * 20 : 0) + 12;
    boxes.forEach(function (b) { H += Math.ceil(b.height) + 10; });
    H += (fL.length ? 6 + fL.length * 15 : 0) + 22 + pad;
    var cv = document.createElement('canvas'); cv.width = W * S; cv.height = H * S;
    var ctx = cv.getContext('2d'); ctx.fillStyle = bg; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(S, 0, 0, S, 0, 0); ctx.textBaseline = 'alphabetic';
    var y = pad;
    ctx.fillStyle = '#000000'; ctx.font = fT; tL.forEach(function (l) { y += 23; ctx.fillText(l, pad, y - 6); });
    if (sL.length) { y += 4; ctx.fillStyle = '#767676'; ctx.font = fS; sL.forEach(function (l) { y += 17; ctx.fillText(l, pad, y - 5); }); }
    if (lrows.length) {
      y += 8; lrows.forEach(function (r) {
        var xx = pad; y += 20;
        r.forEach(function (l) { ctx.fillStyle = l.c; ctx.fillRect(xx, y - 15, 10, 10); ctx.fillStyle = '#4f4f4f'; ctx.font = fS; ctx.fillText(l.t, xx + 16, y - 6); xx += l.w; });
      });
    }
    y += 12;
    svgs.forEach(function (s, i) { drawSVG(ctx, s, pad, y, S); ctx.setTransform(S, 0, 0, S, 0, 0); y += Math.ceil(boxes[i].height) + 10; });
    if (fL.length) { y += 6; ctx.fillStyle = '#767676'; ctx.font = fF; fL.forEach(function (l) { y += 15; ctx.fillText(l, pad, y - 4); }); }
    y += 22; ctx.fillStyle = '#00a7e2'; ctx.fillRect(pad, y - 13, 4, 12);
    ctx.fillStyle = '#767676'; ctx.font = fF; ctx.fillText('Orçamento de Cascais 2025–2027 · GEPA, Núcleo IL Cascais', pad + 10, y - 3);
    cv.toBlob(function (b) { if (b) download(b, 'cascais-' + slug(title) + '.png'); }, 'image/png');
  }

  /* ---------- texto ---------- */
  function exportText() {
    document.body.classList.add('xp-hide');
    var root = document.querySelector('section.view:not([hidden])') || document.querySelector('main') || document.body;
    var h1 = document.querySelector('h1');
    var txt = root.innerText;
    document.body.classList.remove('xp-hide');
    var head = clean(document.title) + '\r\n' + (h1 && !root.contains(h1) ? clean(h1.textContent) + '\r\n' : '') +
      'Exportado em ' + new Date().toLocaleDateString('pt-PT') + ' · GEPA, Núcleo IL Cascais\r\n' + '='.repeat(60) + '\r\n\r\n';
    txt = txt.replace(/\r?\n/g, '\r\n').replace(/(\r\n[ \t]*){3,}/g, '\r\n\r\n').trim();
    var h2 = root.querySelector('h2');
    download(new Blob(['﻿' + head + txt + '\r\n'], { type: 'text/plain;charset=utf-8' }), 'cascais-' + slug((root.tagName === 'SECTION' && h2 ? h2.textContent + '-' : '') + document.title) + '.txt');
  }

  /* ---------- botões ---------- */
  function btn(label, title, fn) { var b = document.createElement('button'); b.type = 'button'; b.className = 'xp-btn'; b.textContent = label; b.title = title; b.addEventListener('click', fn); return b; }
  function decorate() {
    var hosts = new Map();
    function add(h, k) { if (!h || h.closest('.xp-bar')) return; var s = hosts.get(h) || {}; s[k] = 1; hosts.set(h, s); }
    [].forEach.call(document.querySelectorAll('table'), function (t) { add(t.closest('.card') || t.closest('.tbl') || t, 't'); });
    [].forEach.call(document.querySelectorAll('svg[role="img"]'), function (s) { add(s.closest('.card') || s.closest('.chart') || s.parentNode, 'c'); });
    hosts.forEach(function (kinds, host) {
      var outside = host.classList.contains('tbl') || host.tagName === 'TABLE';
      var bar = outside ? (host.nextElementSibling && host.nextElementSibling.classList.contains('xp-bar') ? host.nextElementSibling : null) : host.querySelector(':scope > .xp-bar');
      var key = Object.keys(kinds).sort().join('');
      if (bar && bar.getAttribute('data-k') === key) return;
      if (bar) bar.remove();
      bar = document.createElement('div'); bar.className = 'xp-bar'; bar.setAttribute('data-k', key);
      var lab = document.createElement('span'); lab.textContent = 'Exportar'; bar.appendChild(lab);
      if (kinds.t) {
        bar.appendChild(btn('Tabela .xlsx', 'Descarregar a tabela em Excel', function () { var t = hostTitle(host); download(toXLSX(tablesOf(host), t), 'cascais-' + slug(t) + '.xlsx'); }));
        bar.appendChild(btn('Tabela .csv', 'Descarregar a tabela em CSV (separador ponto e vírgula)', function () { var t = hostTitle(host); download(new Blob([toCSV(tablesOf(host))], { type: 'text/csv;charset=utf-8' }), 'cascais-' + slug(t) + '.csv'); }));
      }
      if (kinds.c) bar.appendChild(btn('Gráfico .png', 'Descarregar o gráfico em imagem PNG', function () { chartPNG(host, hostTitle(host)); }));
      if (outside) host.parentNode.insertBefore(bar, host.nextSibling); else host.appendChild(bar);
    });
  }
  var pending = false;
  function schedule() { if (pending) return; pending = true; requestAnimationFrame(function () { pending = false; decorate(); }); }

  function init() {
    var slot = document.querySelector('header.top .gctl');
    if (slot) slot.appendChild(btn('Texto .txt', 'Descarregar o texto do separador atual', exportText));
    else if (document.querySelector('main') && !document.body.classList.contains('dash')) {
      var f = btn('Exportar texto .txt', 'Descarregar o texto desta página', exportText); f.classList.add('xp-float'); document.body.appendChild(f);
    }
    decorate();
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();

  window.__xpTest = { readTable: readTable, toCSV: toCSV, toXLSX: toXLSX, tablesOf: tablesOf, chartPNG: chartPNG };
})();

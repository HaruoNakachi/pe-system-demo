/* radar.js
 * 自前の SVG によるレーダーチャートと横棒グラフ。外部ライブラリは使用しない。
 * axes: [{ label, self, other, state }] / 値域は 1〜4（評価基準）。
 * bars: [{ label, self, other, state }] / 同じ値域。実践例1つにつき1本組。
 */

var PE_Radar = (function () {

  var NS = 'http://www.w3.org/2000/svg';

  function el(name, attrs) {
    var node = document.createElementNS(NS, name);
    for (var k in attrs) {
      if (Object.prototype.hasOwnProperty.call(attrs, k)) {
        node.setAttribute(k, String(attrs[k]));
      }
    }
    return node;
  }

  function point(cx, cy, radius, ratio, index, count) {
    var angle = (Math.PI * 2 * index / count) - Math.PI / 2;
    return {
      x: cx + Math.cos(angle) * radius * ratio,
      y: cy + Math.sin(angle) * radius * ratio
    };
  }

  function ratioOf(value, max) {
    if (typeof value !== 'number') return 0;
    return Math.max(0, Math.min(1, value / max));
  }

  /* 値のない軸（適用外・担当外・観察機会なし・未回答）は頂点を置かない。
     中心に落として 0 のように見せると、低評価と区別できなくなるため。 */
  function valuedPoints(axes, key, cx, cy, radius, max) {
    var parts = [];
    for (var i = 0; i < axes.length; i++) {
      if (typeof axes[i][key] !== 'number') continue;
      var p = point(cx, cy, radius, ratioOf(axes[i][key], max), i, axes.length);
      parts.push(p.x.toFixed(1) + ',' + p.y.toFixed(1));
    }
    return parts;
  }

  function appendShape(svg, axes, key, cx, cy, radius, max, className) {
    var parts = valuedPoints(axes, key, cx, cy, radius, max);
    if (parts.length >= 3) {
      svg.appendChild(el('polygon', { points: parts.join(' '), class: className }));
    } else if (parts.length === 2) {
      svg.appendChild(el('polyline', { points: parts.join(' '), class: className, fill: 'none' }));
    }
  }

  /* options.ariaLabel を渡さない場合は汎用の文言にする（ラダーの呼び出し側で職種名入りの文言を渡す）。 */
  function render(container, axes, options) {
    container.innerHTML = '';
    if (!axes || axes.length < 3) {
      container.textContent = 'レーダーチャートを表示できません。';
      return;
    }

    var W = 440, H = 300, cx = 220, cy = 150, radius = 98, max = 4;

    var svg = el('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      role: 'img',
      'aria-label': (options && options.ariaLabel)
        ? options.ariaLabel
        : '力ごとの本人評価と他者評価のレーダーチャート',
      class: 'radar-svg'
    });

    /* 目盛（1〜4） */
    for (var r = 1; r <= max; r++) {
      var ring = [];
      for (var i = 0; i < axes.length; i++) {
        var p = point(cx, cy, radius, r / max, i, axes.length);
        ring.push(p.x.toFixed(1) + ',' + p.y.toFixed(1));
      }
      svg.appendChild(el('polygon', {
        points: ring.join(' '),
        class: 'radar-grid'
      }));
    }

    /* 軸線と目盛ラベル */
    for (var a = 0; a < axes.length; a++) {
      var edge = point(cx, cy, radius, 1, a, axes.length);
      svg.appendChild(el('line', {
        x1: cx, y1: cy, x2: edge.x.toFixed(1), y2: edge.y.toFixed(1), class: 'radar-axis'
      }));
    }
    for (var t = 1; t <= max; t++) {
      var tick = el('text', {
        x: cx + 4, y: (cy - radius * (t / max) + 4).toFixed(1), class: 'radar-tick'
      });
      tick.textContent = String(t);
      svg.appendChild(tick);
    }

    /* 他者評価 → 本人評価の順に重ねる */
    appendShape(svg, axes, 'other', cx, cy, radius, max, 'radar-shape radar-other');
    appendShape(svg, axes, 'self', cx, cy, radius, max, 'radar-shape radar-self');

    /* 頂点 */
    for (var s = 0; s < axes.length; s++) {
      if (typeof axes[s].other === 'number') {
        var op = point(cx, cy, radius, ratioOf(axes[s].other, max), s, axes.length);
        svg.appendChild(el('circle', { cx: op.x.toFixed(1), cy: op.y.toFixed(1), r: 3.5, class: 'radar-dot radar-other-dot' }));
      }
      if (typeof axes[s].self === 'number') {
        var sp = point(cx, cy, radius, ratioOf(axes[s].self, max), s, axes.length);
        svg.appendChild(el('circle', { cx: sp.x.toFixed(1), cy: sp.y.toFixed(1), r: 3.5, class: 'radar-dot radar-self-dot' }));
      }
    }

    /* 力の名称 */
    for (var n = 0; n < axes.length; n++) {
      var lp = point(cx, cy, radius + 14, 1, n, axes.length);
      var anchor = 'middle';
      var dy = 4;
      if (lp.x > cx + 4) { anchor = 'start'; }
      else if (lp.x < cx - 4) { anchor = 'end'; }
      else { dy = (lp.y < cy) ? -6 : 16; }
      var label = el('text', {
        x: lp.x.toFixed(1),
        y: (lp.y + dy).toFixed(1),
        'text-anchor': anchor,
        class: 'radar-label'
      });
      label.textContent = axes[n].label;
      svg.appendChild(label);

      if (axes[n].state === 'notApplicable' || axes[n].state === 'unobserved' || axes[n].state === 'unanswered') {
        var note = el('text', {
          x: lp.x.toFixed(1),
          y: (lp.y + dy + 13).toFixed(1),
          'text-anchor': anchor,
          class: 'radar-label radar-label-note'
        });
        /* 幅が狭いため短縮形。資格名を含む正式表記は同じ画面の件数表に出る。 */
        note.textContent = axes[n].state === 'notApplicable' ? '（要資格）'
          : (axes[n].state === 'unobserved' ? '（担当外・観察機会なし）' : '（未回答）');
        svg.appendChild(note);
      }
    }

    container.appendChild(svg);
    appendLegend(container);
  }

  function appendLegend(container) {
    var legend = document.createElement('div');
    legend.className = 'radar-legend';
    legend.innerHTML =
      '<span class="legend-item"><span class="legend-swatch legend-self"></span>本人評価</span>' +
      '<span class="legend-item"><span class="legend-swatch legend-other"></span>他者評価</span>';
    container.appendChild(legend);
  }

  function stateNote(state) {
    if (state === 'notApplicable') return '（要資格）';
    if (state === 'unobserved') return '（担当外・観察機会なし）';
    return '（未回答）';
  }

  /* 長い実践例の文言は行で折り返し、収まらない分は「…」で省略する。
     全文は <title> で読めるようにする。 */
  function wrapLabel(text, perLine, maxLines) {
    var lines = [];
    var rest = String(text === null || text === undefined ? '' : text);
    while (rest.length > 0 && lines.length < maxLines) {
      if (lines.length === maxLines - 1 && rest.length > perLine) {
        lines.push(rest.slice(0, perLine - 1) + '…');
        rest = '';
      } else {
        lines.push(rest.slice(0, perLine));
        rest = rest.slice(perLine);
      }
    }
    return lines;
  }

  /* 横棒グラフ。実践例が2つしかなくレーダーでは多角形にならない
     「各個人の目標」のために用意している。値域・色・凡例はレーダーと揃える。
     値のない棒（適用外・担当外・観察機会なし・未回答）は描かず、理由を文字で示す。 */
  function renderBars(container, bars, options) {
    container.innerHTML = '';
    if (!bars || bars.length === 0) {
      container.textContent = '表示できる実践例がありません。';
      return;
    }

    var W = 440, max = 4;
    var padX = 10, valueW = 26, axisTop = 18, barH = 15, barGap = 6;
    var trackX = padX, trackW = W - padX * 2 - valueW;
    var perLine = 34, maxLines = 2;

    var blocks = [];
    var y = axisTop;
    for (var i = 0; i < bars.length; i++) {
      var lines = wrapLabel(bars[i].label, perLine, maxLines);
      var labelH = lines.length * 14;
      var bodyH = (typeof bars[i].self === 'number' || typeof bars[i].other === 'number')
        ? (barH * 2 + barGap) : 16;
      blocks.push({ y: y, lines: lines, labelH: labelH, bodyH: bodyH });
      y += labelH + 6 + bodyH + 16;
    }
    var H = y;

    var svg = el('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      role: 'img',
      'aria-label': (options && options.ariaLabel)
        ? options.ariaLabel
        : '実践例ごとの本人評価と他者評価の横棒グラフ',
      class: 'radar-svg bar-svg'
    });

    /* 目盛（1〜4） */
    for (var t = 1; t <= max; t++) {
      var gx = trackX + trackW * (t / max);
      svg.appendChild(el('line', {
        x1: gx.toFixed(1), y1: axisTop - 6, x2: gx.toFixed(1), y2: (H - 6).toFixed(1), class: 'bar-grid'
      }));
      var tick = el('text', { x: gx.toFixed(1), y: axisTop - 9, 'text-anchor': 'middle', class: 'radar-tick' });
      tick.textContent = String(t);
      svg.appendChild(tick);
    }

    for (var b = 0; b < bars.length; b++) {
      var bar = bars[b];
      var blk = blocks[b];
      var g = el('g', {});
      var title = el('title', {});
      title.textContent = bar.label;
      g.appendChild(title);

      for (var n = 0; n < blk.lines.length; n++) {
        var lab = el('text', { x: trackX, y: blk.y + 11 + n * 14, class: 'bar-label' });
        lab.textContent = blk.lines[n];
        g.appendChild(lab);
      }

      var top = blk.y + blk.labelH + 6;
      if (typeof bar.self === 'number' || typeof bar.other === 'number') {
        g.appendChild(barRow(bar.self, top, trackX, trackW, barH, max, 'bar-self'));
        if (typeof bar.other === 'number') {
          g.appendChild(barRow(bar.other, top + barH + barGap, trackX, trackW, barH, max, 'bar-other'));
        } else {
          /* 他者評価の値がない実践例（デモの設定画面で追加した合意した目標など）。
             0 のように見せず「—」と文字で示す。 */
          var dash = el('text', { x: trackX, y: (top + barH + barGap + barH - 3).toFixed(1), class: 'bar-note' });
          dash.textContent = '他者評価 —';
          g.appendChild(dash);
        }
      } else {
        var note = el('text', { x: trackX, y: top + 11, class: 'bar-note' });
        note.textContent = stateNote(bar.state);
        g.appendChild(note);
      }
      svg.appendChild(g);
    }

    container.appendChild(svg);
    /* options.legend === false のときは凡例を付けない（合意した目標ごとに複数枚並べるとき、最後の1枚にだけ付ける） */
    if (!options || options.legend !== false) appendLegend(container);
  }

  function barRow(value, y, x, width, height, max, className) {
    var g = el('g', {});
    if (typeof value !== 'number') return g;
    var w = Math.max(2, width * ratioOf(value, max));
    g.appendChild(el('rect', {
      x: x, y: y.toFixed(1), width: w.toFixed(1), height: height, rx: 3, class: 'bar-shape ' + className
    }));
    var val = el('text', { x: (x + w + 5).toFixed(1), y: (y + height - 3).toFixed(1), class: 'bar-value' });
    val.textContent = (Math.round(value * 10) / 10).toFixed(1).replace(/\.0$/, '');
    g.appendChild(val);
    return g;
  }

  return { render: render, renderBars: renderBars };
})();

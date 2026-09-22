/* radar.js
 * 自前の SVG によるレーダーチャート。外部ライブラリは使用しない。
 * axes: [{ label, self, other, state }] / 値域は 1〜4（評価基準）。
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

  function render(container, axes) {
    container.innerHTML = '';
    if (!axes || axes.length < 3) {
      container.textContent = 'レーダーチャートを表示できません。';
      return;
    }

    var W = 440, H = 300, cx = 220, cy = 150, radius = 98, max = 4;

    var svg = el('svg', {
      viewBox: '0 0 ' + W + ' ' + H,
      role: 'img',
      'aria-label': '実践ラダーの4つの力についての本人評価と他者評価のレーダーチャート',
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

    var legend = document.createElement('div');
    legend.className = 'radar-legend';
    legend.innerHTML =
      '<span class="legend-item"><span class="legend-swatch legend-self"></span>本人評価</span>' +
      '<span class="legend-item"><span class="legend-swatch legend-other"></span>他者評価</span>';
    container.appendChild(legend);
  }

  return { render: render };
})();

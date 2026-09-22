/* ============================================================
   QuizFlow — Futuristic background
   Injects the fixed background layers (grid, radial glows, orbs)
   and drives a slow, subtle canvas particle field.
   Respects prefers-reduced-motion.
   ============================================================ */

(function () {
  'use strict';

  function init() {
    if (document.getElementById('bgFx')) return;

    var fx = document.createElement('div');
    fx.className = 'bg-fx';
    fx.id = 'bgFx';
    fx.innerHTML =
      '<div class="bg-grid"></div>' +
      '<div class="bg-radial"></div>' +
      '<div class="bg-orb o1"></div>' +
      '<div class="bg-orb o2"></div>' +
      '<div class="bg-orb o3"></div>' +
      '<canvas id="particles"></canvas>';
    document.body.appendChild(fx);

    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return;

    var canvas = fx.querySelector('#particles');
    var ctx = canvas.getContext('2d');
    var particles = [];
    var raf = null;
    var w = 0;
    var h = 0;

    var COLORS = ['124, 92, 252', '59, 130, 246', '34, 211, 238'];

    function resize() {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
    }

    function spawn() {
      var count = Math.min(90, Math.max(35, Math.floor(w / 20)));
      particles = [];
      for (var i = 0; i < count; i++) {
        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          r: Math.random() * 1.8 + 0.6,
          vx: (Math.random() - 0.5) * 0.18,
          vy: (Math.random() - 0.5) * 0.22 - 0.08,
          a: Math.random() * 0.5 + 0.15,
          tw: Math.random() * Math.PI * 2,
          c: COLORS[Math.floor(Math.random() * COLORS.length)]
        });
      }
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.tw += 0.008;

        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;

        var alpha = p.a * (0.5 + 0.5 * Math.sin(p.tw));
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(' + p.c + ', ' + alpha.toFixed(3) + ')';
        ctx.shadowBlur = 8;
        ctx.shadowColor = 'rgba(' + p.c + ', 0.8)';
        ctx.fill();
        ctx.shadowBlur = 0;
      }
      raf = requestAnimationFrame(draw);
    }

    resize();
    spawn();
    draw();

    var t;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(function () {
        resize();
        spawn();
      }, 250);
    });

    /* Cleanup hooks for SPAs / re-init safety */
    window.QuizFlowBg = {
      destroy: function () {
        if (raf) cancelAnimationFrame(raf);
        if (fx && fx.parentNode) fx.parentNode.removeChild(fx);
      }
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

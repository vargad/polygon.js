var one = require('onecolor');
var Polygon = require('../polygon');
var Vec2 = require('vec2');
var fc = require('fc');
var tests = require('./offset/tests')
var dat = require('dat-gui');
var dashedLine = require('ctx-dashed-line');

var hsl = function(h,s,l) {
  return new one.HSL(h, s, l).hex();
};

var config = {
  inner: -200,
  outer: -50,
  step: 10,
  renderPoly: false,
  renderPoints: false,
  renderPointAssociations : false,
  simplify: false,
  renderSelfIntersections: true,
  pruneSelfIntersections: false,
  renderSplitSelfIntersections : false,
  renderTool : false,
  renderOriginalMutation: false
};

try {
  obj = JSON.parse(window.localStorage.getItem('offset-data') || '{}') || {};
  Object.keys(obj).forEach(function(k) {
    config[k] = obj[k];
  });
} catch (e) {
  throw e;
}

var currentTest = window.localStorage.getItem('currentTest') || 0;

var testKeys = Object.keys(tests);
console.log(testKeys)
var testsLength = testKeys.length;
var p = tests[testKeys[currentTest]]();

var renderPoly = function(polygons, angle, dashed, width, alpha) {

  var a = Array.isArray(polygons) ? polygons : [polygons];

  a.forEach(function(poly) {

    if (!poly.points.length || !poly.point(0)) {
      return;
    }

    ctx.beginPath();
      ctx.moveTo(poly.point(0).x, poly.point(0).y);
      poly.points.forEach(function(c) {
        ctx.lineTo(c.x, c.y);
      });
    var origWidth = ctx.lineWidth;
    ctx.closePath();
    ctx.lineWidth = width || 1;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = hsl(angle, .75, .65, alpha);
    ctx.stroke();
    ctx.lineWidth = origWidth;

    ctx.strokeStyle =  hsl(angle, 1, .65, alpha);
    poly.points.forEach(function(c) {
      ctx.beginPath();
        var orig = ctx.strokeStyle;

        if (c.color) {
          config.renderPoints && ctx.arc(c.x, c.y, (c.radius || .5), Math.PI*2, false);
          ctx.strokeStyle = c.color;
          ctx.stroke();
        }

      if (c.point && config.renderPointAssociations && dashed !== false) {
        dashedLine(ctx, c, c.point, 4);
        ctx.stroke();
      }
      ctx.strokeStyle = orig;

    });
  });
};

var renderPolyPoints = function(polygon, color, radius) {
  polygon.points.forEach(function(point) {
    ctx.beginPath();
      ctx.arc(point.x, point.y, point.radius || radius || 5, Math.PI*2, false);
      ctx.strokeStyle = color || 'red';
      ctx.stroke();
  });
};

var renderPolyPointLabels = function(polygon, color, scale) {
  polygon.points.forEach(function(point, i) {
    ctx.font= scale/4 + "px monospace";
    ctx.fillStyle = color;
    ctx.save()
      ctx.translate(point.x-20, point.y)
      ctx.scale(1, -1);
      ctx.fillText(''+i, 0, 0);
    ctx.restore();
  });
};



var ctx = fc(function() {
  var start = Date.now();

  var w = ctx.canvas.width;
  var h = ctx.canvas.height;
  ctx.strokeStyle = "red";
  ctx.fillStyle = '#111115';
  ctx.fillRect(0, 0, w, h);

  ctx.save();
    ctx.translate(w/2, h/2);
    ctx.scale(scale, -scale);
    ctx.translate(-translate.x, translate.y);

    renderPoly(p, 0, false, 3, .5);


    ctx.beginPath()
    ctx.moveTo(-5, -5);
    ctx.lineTo(5, 5);
    ctx.closePath();
    ctx.strokeStyle = "blue"
    ctx.stroke();

    ctx.beginPath()
    ctx.moveTo(-5, 5);
    ctx.lineTo(5, -5);
    ctx.closePath();
    ctx.strokeStyle = "blue"
    ctx.stroke();
    var iterations = 0;
    for (var i = config.inner; i<config.outer; i += config.step || 10) {
      if (i === 0) { continue; }
      var o = p.offset(i);

      var oo = p.offset(i, true);
      config.renderOriginalMutation && renderPoly(oo, .4);
      iterations++;
      config.simplify && o.simplify();
      config.renderPoints && renderPolyPoints(o, 'yellow', 1);
      config.renderTool && renderPolyPoints(o, 'blue', Math.abs(i));
      config.renderPoly && renderPoly(o, .3);
      config.renderSelfIntersections && renderPolyPoints(o.selfIntersections());

      if (config.pruneSelfIntersections) {

        var selfi = o.pruneSelfIntersections();

        selfi.forEach(function(s, j) {
          renderPoly(s, i/(config.outer - config.inner), false);
        });
      }

      if (config.renderSplitSelfIntersections) {
        var parts = o.splitSelfIntersections(i, p);
        parts.forEach(function(s, j) {
          renderPoly(s, i/(config.outer - config.inner) + j/parts.length, false);
        });
      }

    }

    p.points[0].color = "#f0f";
    p.points[1].color = "#f00";

    //renderPolyPoints(p, 'orange', 1);
    //renderPolyPointLabels(p, 'white', scale);

  ctx.restore();

  console.warn('runtime', iterations + ' @ ' + (Date.now() - start) + 'ms');

}, false);

var gui = new dat.GUI({ });
var updateValues = function() {
  console.clear();
  window.localStorage.setItem('offset-data', JSON.stringify(config));
  ctx.dirty();
};

gui.add(config, 'inner', -200, 500).onChange(updateValues);
gui.add(config, 'outer', -200, 500).onChange(updateValues);
gui.add(config, 'step', 1, 200).onChange(updateValues);
gui.add(config, 'renderSelfIntersections', false).onChange(updateValues);
gui.add(config, 'renderSplitSelfIntersections', false).onChange(updateValues);
gui.add(config, 'renderPoly', false).onChange(updateValues);
gui.add(config, 'renderPoints', false).onChange(updateValues);
gui.add(config, 'renderPointAssociations', false).onChange(updateValues);
gui.add(config, 'simplify', false).onChange(updateValues);
gui.add(config, 'pruneSelfIntersections', false).onChange(updateValues);
gui.add(config, 'renderTool', false).onChange(updateValues);
gui.add(config, 'renderOriginalMutation', false).onChange(updateValues);

window.addEventListener('keydown', function(ev) {
  switch (ev.keyCode) {
    case 39:
      currentTest = (currentTest + 1) % testsLength;
      p = tests[testKeys[currentTest]]();
      ctx.dirty();
    break;
    case 37:
      currentTest = currentTest - 1;
      if (currentTest < 0) {
        currentTest = testsLength-1;
      }
      p = tests[testKeys[currentTest]]();
      ctx.dirty();
    break;
  }
  window.localStorage.setItem('currentTest', currentTest);
});

var scale = parseFloat(window.localStorage.getItem('scale')) || 1;
var translate = Vec2.fromArray(
  (window.localStorage.getItem('translate') || '').split(',').map(function(i) {
    var val = parseFloat(i.trim());
    return !isNaN(val) ? val : 0;
  })
);

ctx.canvas.addEventListener('mousewheel', function(ev) {
  scale += ev.wheelDelta * .001 * scale;
  if (scale < 0) {
    scale = 0.1;
  }
  window.localStorage.setItem('scale', scale);

  ctx.dirty();
  ev.preventDefault();
});

var down = 0;

var mouse = Vec2(0, 0);
ctx.canvas.addEventListener('mousedown', function(e) { down = Vec2(e.clientX, e.clientY); });
ctx.canvas.addEventListener('mouseup', function() { down = false; });
ctx.canvas.addEventListener('mousemove', function(e) {
  mouse.set(e.clientX, e.clientY)
  if (down) {
    var newDown = Vec2(e.clientX, e.clientY);
    var d = newDown.subtract(down, true);
    translate.subtract(d.divide(scale));

    window.localStorage.setItem('translate', translate.toArray().join(','));

    down = newDown;
    ctx.dirty();
  }
});

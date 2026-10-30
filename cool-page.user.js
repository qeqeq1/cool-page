// ==UserScript==
// @name         页面冷静模式 Cool Page
// @namespace    coolpage.misaka
// @version      1.1
// @description  Alt+F 一键冻结当前网页的烧机特效：清除 blur 滤镜、停用 CSS 动画、暂停视频、把 requestAnimationFrame 限流到 2fps。状态按站点记忆。适合友盟官网这类"特效自嗨、风扇起飞"的页面
// @author       Misaka
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @run-at       document-start
// @noframes     false
// ==/UserScript==

(function () {
  'use strict';

  var HOST = location.hostname;
  var STORE_KEY = 'coolpage:states';

  // ---------- 状态存取 ----------
  function loadStates() {
    try { return JSON.parse(GM_getValue(STORE_KEY, '{}')); }
    catch (e) { return {}; }
  }
  function saveStates(s) { GM_setValue(STORE_KEY, JSON.stringify(s)); }

  var states = loadStates();
  var cool = !!states[HOST]; // 当前站点是否冷静

  // ---------- rAF 限流（必须在 document-start 打补丁才能拦住页面自己的动画循环） ----------
  var origRAF = window.requestAnimationFrame.bind(window);
  var origCAAF = window.cancelAnimationFrame.bind(window);
  var COOL_INTERVAL = 500; // 冷静模式下 rAF 限流到 2fps

  window.requestAnimationFrame = function (cb) {
    if (!cool) return origRAF(cb);
    // 用 setTimeout 代替 rAF：脱离 vsync 高频回调，动画循环立刻降到 2fps
    return window.setTimeout(function () { cb(performance.now()); }, COOL_INTERVAL);
  };
  window.cancelAnimationFrame = function (id) {
    // 兼容两种 id：原生的走原函数，冷静模式下发出的是 timeout id
    window.clearTimeout(id);
    try { origCAAF(id); } catch (e) { }
  };

  // ---------- 冷静 CSS ----------
  var COOL_CSS = [
    '*, *::before, *::after {',
    '  animation: none !important;',
    '  transition: none !important;',
    '  filter: none !important;',
    '  backdrop-filter: none !important;',
    '  will-change: auto !important;',
    '}',
    'video { animation-play-state: paused !important; }'
  ].join('\n');

  var styleEl = null;
  function applyCoolCSS(on) {
    if (on && !styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = 'coolpage-style';
      styleEl.textContent = COOL_CSS;
      (document.head || document.documentElement).appendChild(styleEl);
    } else if (!on && styleEl) {
      styleEl.remove();
      styleEl = null;
    }
  }

  function pauseVideos() {
    document.querySelectorAll('video').forEach(function (v) {
      try { v.pause(); v.autoplay = false; } catch (e) { }
    });
  }

  // ---------- 开关 ----------
  function setCool(on, silent) {
    cool = !!on;
    states[HOST] = cool;
    saveStates(states);
    applyCoolCSS(cool);
    if (cool) pauseVideos();
    if (!silent) toast(cool ? '❄ 已进入冷静模式（本站点已记忆）' : '▶ 已恢复动画（本站点已记忆）');
  }

  // ---------- 提示气泡 ----------
  var toastTimer = null;
  function toast(msg) {
    var t = document.getElementById('coolpage-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'coolpage-toast';
      t.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);' +
        'z-index:2147483647;padding:10px 18px;border-radius:10px;background:rgba(20,20,28,.92);' +
        'color:#fff;font:13px/1.5 system-ui,sans-serif;pointer-events:none;opacity:0;' +
        'transition:opacity .25s;';
      (document.body || document.documentElement).appendChild(t);
    }
    t.textContent = msg;
    t.style.opacity = '1';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.style.opacity = '0'; }, 2200);
  }

  // ---------- 快捷键 Alt+F ----------
  window.addEventListener('keydown', function (e) {
    if (e.altKey && (e.key === 'f' || e.key === 'F')) {
      e.preventDefault();
      setCool(!cool);
    }
  }, true);

  // ---------- 油猴菜单 ----------
  GM_registerMenuCommand('切换冷静模式（Alt+F）', function () { setCool(!cool); });
  GM_registerMenuCommand('彻底冻结本页（停掉全部 rAF + 清动效）', function () {
    setCool(true, true);
    // 一次性补刀：把已有 canvas 上的动画循环连根拔（覆盖 rAF 为空操作）
    window.requestAnimationFrame = function () { return 0; };
    pauseVideos();
    toast('❄ 本页已彻底冻结，刷新后恢复为限流模式');
  });

  // ---------- 启动（document-start，先打补丁再等 DOM） ----------
  if (cool) {
    applyCoolCSS(true);
    document.addEventListener('DOMContentLoaded', pauseVideos);
  }
})();

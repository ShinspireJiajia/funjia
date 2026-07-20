/**
 * a11y-init.js
 * 全站無障礙操作設定(字級調整 / 高對比模式)引擎。
 * 以同步(非 DOMContentLoaded)方式盡早在 <head> 執行,
 * 避免頁面先以預設樣式繪製後才套用設定造成的閃爍。
 * 設定值存於 localStorage,並透過 postMessage 在 masterpage 與 iframe 內頁之間即時同步,
 * 不需整頁重新載入。
 */

window.FunJia = window.FunJia || {};

(function (ns) {
  "use strict";

  var FONT_KEY = "funjia_font_scale";
  var CONTRAST_KEY = "funjia_contrast";
  var MAX_FONT_SCALE = 3;

  function getFontScale() {
    var value = parseInt(localStorage.getItem(FONT_KEY), 10);
    return value >= 0 && value <= MAX_FONT_SCALE ? value : 0;
  }

  function getContrast() {
    return localStorage.getItem(CONTRAST_KEY) === "high" ? "high" : "normal";
  }

  function applyToDocument() {
    var scale = getFontScale();
    if (scale > 0) {
      document.documentElement.setAttribute("data-font-scale", String(scale));
    } else {
      document.documentElement.removeAttribute("data-font-scale");
    }
    document.documentElement.setAttribute("data-contrast", getContrast());
  }

  function broadcast() {
    document.dispatchEvent(new CustomEvent("funjia:a11y-changed"));
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ source: "funjia", type: "a11y-changed" }, "*");
      }
      document.querySelectorAll("iframe").forEach(function (frame) {
        if (frame.contentWindow) {
          frame.contentWindow.postMessage({ source: "funjia", type: "a11y-changed" }, "*");
        }
      });
    } catch (e) {
      /* 跨視窗訊息在極少數瀏覽器安全性設定下可能被拒絕,忽略即可,不影響當前頁面套用 */
    }
  }

  function setFontScale(scale) {
    scale = Math.max(0, Math.min(MAX_FONT_SCALE, scale));
    if (scale === 0) {
      localStorage.removeItem(FONT_KEY);
    } else {
      localStorage.setItem(FONT_KEY, String(scale));
    }
    applyToDocument();
    broadcast();
  }

  function setContrast(mode) {
    localStorage.setItem(CONTRAST_KEY, mode === "high" ? "high" : "normal");
    applyToDocument();
    broadcast();
  }

  applyToDocument();

  window.addEventListener("message", function (event) {
    var data = event.data;
    if (data && data.source === "funjia" && data.type === "a11y-changed") {
      applyToDocument();
      document.dispatchEvent(new CustomEvent("funjia:a11y-changed"));
    }
  });

  ns.a11yCore = {
    MAX_FONT_SCALE: MAX_FONT_SCALE,
    getFontScale: getFontScale,
    getContrast: getContrast,
    setFontScale: setFontScale,
    setContrast: setContrast,
  };
})(window.FunJia);

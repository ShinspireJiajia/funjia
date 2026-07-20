/**
 * a11y-panel.js
 * 共用的「語言 / 字級 / 高對比」設定面板元件。
 * 同一份標記與邏輯同時掛載於 masterpage 頁首彈出選單,
 * 以及「更多功能」頁的無障礙與顯示設定區塊,確保兩處行為一致且不重複維護。
 */

window.FunJia = window.FunJia || {};

(function (ns) {
  "use strict";

  function buildPanelHTML() {
    return (
      '<div class="a11y-panel__section">' +
        '<div class="a11y-panel__section-title" data-i18n="panelLangTitle">語言</div>' +
        '<div class="a11y-panel__lang-list">' +
          '<button type="button" data-lang="zh-TW">繁體中文</button>' +
          '<button type="button" data-lang="en">English</button>' +
          '<button type="button" data-lang="ja">日本語</button>' +
          '<button type="button" data-lang="ko">한국어</button>' +
        "</div>" +
      "</div>" +
      '<div class="a11y-panel__section">' +
        '<div class="a11y-panel__section-title" data-i18n="panelFontTitle">字級大小</div>' +
        '<div class="a11y-panel__font-list">' +
          '<button type="button" data-font-scale="0" data-i18n="fontLevel0">標準</button>' +
          '<button type="button" data-font-scale="1" data-i18n="fontLevel1">大</button>' +
          '<button type="button" data-font-scale="2" data-i18n="fontLevel2">特大</button>' +
          '<button type="button" data-font-scale="3" data-i18n="fontLevel3">最大</button>' +
        "</div>" +
      "</div>" +
      '<div class="a11y-panel__section a11y-panel__section--contrast">' +
        '<div class="a11y-panel__section-title" data-i18n="panelContrastTitle">高對比模式</div>' +
        '<button type="button" class="a11y-panel__contrast-toggle" data-contrast-toggle role="switch" aria-checked="false">' +
          '<span class="a11y-panel__switch-track"><span class="a11y-panel__switch-thumb"></span></span>' +
          '<span data-contrast-label data-i18n="contrastOff">關閉</span>' +
        "</button>" +
      "</div>"
    );
  }

  function init(container) {
    if (!container || container.dataset.a11yPanelBound) return;
    container.dataset.a11yPanelBound = "1";
    container.innerHTML = buildPanelHTML();
    ns.i18nCore.applyDom(container);

    var langButtons = container.querySelectorAll("button[data-lang]");
    var fontButtons = container.querySelectorAll("button[data-font-scale]");
    var contrastBtn = container.querySelector("[data-contrast-toggle]");
    var contrastLabel = container.querySelector("[data-contrast-label]");

    function syncLang() {
      var lang = ns.i18nCore.getCurrentLang();
      langButtons.forEach(function (btn) {
        btn.classList.toggle("is-active", btn.getAttribute("data-lang") === lang);
      });
    }

    function syncFont() {
      var scale = ns.a11yCore.getFontScale();
      fontButtons.forEach(function (btn) {
        btn.classList.toggle("is-active", parseInt(btn.getAttribute("data-font-scale"), 10) === scale);
      });
    }

    function syncContrast() {
      var isHigh = ns.a11yCore.getContrast() === "high";
      contrastBtn.classList.toggle("is-on", isHigh);
      contrastBtn.setAttribute("aria-checked", String(isHigh));
      contrastLabel.textContent = ns.i18nCore.t(isHigh ? "contrastOn" : "contrastOff");
    }

    container.addEventListener("click", function (event) {
      var langBtn = event.target.closest("button[data-lang]");
      if (langBtn) {
        ns.i18nCore.setLanguage(langBtn.getAttribute("data-lang"));
        syncLang();
        return;
      }
      var fontBtn = event.target.closest("button[data-font-scale]");
      if (fontBtn) {
        ns.a11yCore.setFontScale(parseInt(fontBtn.getAttribute("data-font-scale"), 10));
        syncFont();
        return;
      }
      if (event.target.closest("[data-contrast-toggle]")) {
        ns.a11yCore.setContrast(ns.a11yCore.getContrast() === "high" ? "normal" : "high");
        syncContrast();
      }
    });

    document.addEventListener("funjia:lang-changed", syncLang);
    document.addEventListener("funjia:a11y-changed", function () {
      syncFont();
      syncContrast();
    });

    syncLang();
    syncFont();
    syncContrast();
  }

  ns.a11yPanel = { init: init };
})(window.FunJia);

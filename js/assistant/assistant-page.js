/**
 * assistant-page.js
 * AI 語音助理頁(pages/assistant.html)頁面邏輯:
 * 整合語言切換、快捷提問、文字/語音輸入、對話記憶與情境模擬。
 */

(function () {
  "use strict";

  var ns = window.FunJia;
  var LANG_STORAGE_KEY = "funjia_lang";
  var context = { lastLocationId: null }; // 單次 session 的前後文記憶
  var isMuted = false;

  document.addEventListener("DOMContentLoaded", function () {
    applyStaticText();
    renderLangChips();
    bindEvents();
    appendAssistantMessage(ns.i18n.t("greeting"), null, false);
  });

  function applyStaticText() {
    document.getElementById("assistantTitle").textContent = ns.i18n.t("pageTitle");
    document.getElementById("chatInput").setAttribute("placeholder", ns.i18n.t("placeholder"));

    var quickChips = document.getElementById("quickChips");
    quickChips.innerHTML =
      chip("quickToilet", ns.i18n.t("quickToilet")) +
      chip("quickAlishanTemp", ns.i18n.t("quickAlishanTemp")) +
      chip("quickDistance", ns.i18n.t("quickDistance")) +
      chip("quickDelayDemo", ns.i18n.t("quickDelayDemo"), true);
  }

  function chip(id, label, isDemo) {
    return (
      '<button class="quick-chip' + (isDemo ? " is-demo" : "") + '" data-quick="' + id + '">' + label + "</button>"
    );
  }

  function renderLangChips() {
    var current = ns.i18n.getCurrentLang();
    var labels = { "zh-TW": "中", en: "EN", ja: "日", ko: "한" };
    var container = document.getElementById("langChips");
    container.innerHTML = ns.i18n.LANGS.map(function (lang) {
      return (
        '<button data-lang="' + lang + '" class="' + (lang === current ? "is-active" : "") + '">' +
        labels[lang] +
        "</button>"
      );
    }).join("");
  }

  function bindEvents() {
    document.getElementById("langChips").addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-lang]");
      if (!btn) return;
      localStorage.setItem(LANG_STORAGE_KEY, btn.getAttribute("data-lang"));
      window.location.reload();
    });

    document.getElementById("muteToggle").addEventListener("click", function () {
      isMuted = !isMuted;
      this.classList.toggle("is-muted", isMuted);
      this.querySelector("i").className = isMuted ? "fa-solid fa-volume-xmark" : "fa-solid fa-volume-high";
    });

    document.getElementById("quickChips").addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-quick]");
      if (!btn) return;
      var quickId = btn.getAttribute("data-quick");
      if (quickId === "quickDelayDemo") {
        triggerDelayScenario();
      } else {
        sendUserMessage(ns.i18n.t(quickId));
      }
    });

    document.getElementById("chatForm").addEventListener("submit", function (e) {
      e.preventDefault();
      var input = document.getElementById("chatInput");
      var text = input.value.trim();
      if (!text) return;
      input.value = "";
      sendUserMessage(text);
    });

    document.getElementById("chatLog").addEventListener("click", function (e) {
      var actionBtn = e.target.closest("button[data-action]");
      if (!actionBtn) return;
      var value = actionBtn.getAttribute("data-action");
      var label = actionBtn.textContent;
      actionBtn.closest(".chat-actions").remove(); // 用過的行動按鈕就收起,避免重複點擊
      appendUserMessage(label);
      appendAssistantMessage(ns.chatEngine.handleDelayAction(value));
    });

  }

  function sendUserMessage(text) {
    appendUserMessage(text);
    ns.chatEngine.reply(text, context).then(function (result) {
      appendAssistantMessage(result.text, result.actions);
    });
  }

  function triggerDelayScenario() {
    var scenario = ns.chatEngine.delayScenario();
    appendAssistantMessage(scenario.text, scenario.actions);
  }

  function appendUserMessage(text) {
    appendMessage(text, "user");
  }

  function appendAssistantMessage(text, actions, speakAloud) {
    appendMessage(text, "assistant", actions);
    if (speakAloud !== false && !isMuted) {
      ns.voiceRecognition.speak(text);
    }
  }

  function appendMessage(text, role, actions) {
    var log = document.getElementById("chatLog");
    var row = document.createElement("div");
    row.className = "chat-bubble-row from-" + role;

    var actionsHtml = "";
    if (actions && actions.length) {
      actionsHtml =
        '<div class="chat-actions">' +
        actions
          .map(function (a) {
            return '<button data-action="' + a.value + '">' + a.label + "</button>";
          })
          .join("") +
        "</div>";
    }

    row.innerHTML =
      '<span class="chat-avatar"><i class="fa-solid ' + (role === "user" ? "fa-user" : "fa-robot") + '"></i></span>' +
      '<div><div class="chat-bubble">' + escapeHtml(text) + "</div>" + actionsHtml + "</div>";

    log.appendChild(row);
    log.scrollTop = log.scrollHeight;
  }

  function escapeHtml(text) {
    var div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

})();

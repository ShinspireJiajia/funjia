/**
 * i18n.js
 * AI 語音助理的多語系字典(中/英/日/韓)。
 * Demo 階段以靜態字典 + 關鍵字比對模擬多語系 LLM 的能力,
 * 正式版可將 matchIntent() 替換為呼叫後端 LLM proxy,並保留這裡的 UI 字串結構。
 */

window.FunJia = window.FunJia || {};

(function (ns) {
  "use strict";

  var DICT = {
    "zh-TW": {
      speechLang: "zh-TW",
      pageTitle: "AI 語音助理",
      placeholder: "輸入文字...",
      greeting: "您好,我是 Fun 嘉語音助理!開車或搭車時,可以直接問我天氣、距離、周邊設施等問題。",
      quickToilet: "幫我找最近的廁所",
      quickAlishanTemp: "阿里山現在幾度?",
      quickDistance: "下一個景點還有多遠?",
      quickDelayDemo: "模擬情境:行程延遲",
      you: "您",
      assistant: "助理",
    },
    en: {
      speechLang: "en-US",
      pageTitle: "AI Voice Assistant",
      placeholder: "Type a message...",
      greeting: "Hi, I'm the Fun Jia voice assistant! While driving, just ask me about weather, distance, or nearby facilities.",
      quickToilet: "Find the nearest restroom",
      quickAlishanTemp: "What's the temperature at Alishan now?",
      quickDistance: "How far to the next attraction?",
      quickDelayDemo: "Simulate: trip delayed",
      you: "You",
      assistant: "Assistant",
    },
    ja: {
      speechLang: "ja-JP",
      pageTitle: "AI音声アシスタント",
      placeholder: "メッセージを入力してください...",
      greeting: "こんにちは、Fun 嘉の音声アシスタントです。運転中でも天気や距離、周辺施設について質問できます。",
      quickToilet: "一番近いトイレを探して",
      quickAlishanTemp: "阿里山の今の気温は?",
      quickDistance: "次の観光地までどれくらい?",
      quickDelayDemo: "シナリオ模擬:行程が遅延",
      you: "あなた",
      assistant: "アシスタント",
    },
    ko: {
      speechLang: "ko-KR",
      pageTitle: "AI 음성 어시스턴트",
      placeholder: "메시지를 입력해 주세요...",
      greeting: "안녕하세요, Fun 嘉 음성 어시스턴트입니다! 운전 중에도 날씨, 거리, 주변 시설을 물어보세요.",
      quickToilet: "가장 가까운 화장실 찾기",
      quickAlishanTemp: "아리산 현재 기온은?",
      quickDistance: "다음 관광지까지 얼마나 남았나요?",
      quickDelayDemo: "시나리오 시뮬레이션: 일정 지연",
      you: "나",
      assistant: "어시스턴트",
    },
  };

  var STORAGE_KEY = "funjia_lang";

  function getCurrentLang() {
    var lang = localStorage.getItem(STORAGE_KEY);
    return DICT[lang] ? lang : "zh-TW";
  }

  function t(key) {
    var lang = getCurrentLang();
    return (DICT[lang] && DICT[lang][key]) || DICT["zh-TW"][key] || key;
  }

  ns.i18n = {
    getCurrentLang: getCurrentLang,
    t: t,
    LANGS: Object.keys(DICT),
  };
})(window.FunJia);

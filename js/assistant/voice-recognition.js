/**
 * voice-recognition.js
 * 包裝瀏覽器內建 Web Speech API,提供語音合成朗讀(TTS)。
 * 注意:此 API 主要在 Chrome / Edge 等瀏覽器支援。
 */

window.FunJia = window.FunJia || {};

(function (ns) {
  "use strict";

  /** 將助理回覆朗讀出來(供駕駛免持收聽) */
  function speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // 避免多句疊加播放
    var utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = ns.i18n.t("speechLang");
    window.speechSynthesis.speak(utterance);
  }

  ns.voiceRecognition = {
    speak: speak,
  };
})(window.FunJia);

/**
 * more-page.js
 * 更多功能頁(pages/more.html)邏輯:掛載共用的語言 / 字級 / 高對比設定面板,
 * 讓使用者不必進入頁首選單,也能在此頁直接調整無障礙與顯示設定。
 */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var panel = document.getElementById("a11yPanel");
    if (panel) window.FunJia.a11yPanel.init(panel);
  });
})();

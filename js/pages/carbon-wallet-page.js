/**
 * carbon-wallet-page.js
 * 減碳錢包頁(pages/carbon-wallet.html)邏輯:顯示目前點數餘額與收支紀錄。
 */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var ns = window.FunJia;

    document.getElementById("walletBalance").textContent = ns.walletService.getBalance();
    renderHistory(ns.walletService.getHistory());
  });

  function renderHistory(list) {
    var container = document.getElementById("walletHistory");
    if (!list.length) {
      container.innerHTML =
        '<div class="empty-state"><i class="fa-regular fa-face-smile"></i><p>還沒有點數紀錄,快去規劃一趟低碳行程吧!</p></div>';
      return;
    }
    container.innerHTML = list
      .map(function (item) {
        var negative = item.delta < 0;
        return (
          '<div class="wallet-history-item">' +
          '<span class="wallet-history-item__icon' + (negative ? " is-negative" : "") + '">' +
          '<i class="fa-solid ' + (negative ? "fa-arrow-down" : "fa-leaf") + '"></i></span>' +
          '<div class="wallet-history-item__body"><p>' + escapeHtml(item.reason) + "</p><span>" + item.date + "</span></div>" +
          '<span class="wallet-history-item__delta' + (negative ? " is-negative" : "") + '">' +
          (negative ? "" : "+") + item.delta + "</span>" +
          "</div>"
        );
      })
      .join("");
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
})();

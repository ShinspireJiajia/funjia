/**
 * reward-card.js
 * 優惠商城卡片元件:呈現折價券/贈品兌換項目,依目前點數餘額標示是否足夠兌換。
 * 僅負責渲染,兌換按鈕點擊行為由頁面腳本(rewards-mall-page.js)以事件委派處理。
 */

window.FunJia = window.FunJia || {};

(function (ns) {
  "use strict";

  var GRADIENTS = {
    green: "linear-gradient(135deg, #3f7f4c, #1f4a2a)",
    orange: "linear-gradient(135deg, #e08a3c, #b85a1e)",
    blue: "linear-gradient(135deg, #3d7ea6, #1f4a63)",
    brown: "linear-gradient(135deg, #8a6642, #5c4326)",
    pink: "linear-gradient(135deg, #d97a9c, #a8496b)",
    teal: "linear-gradient(135deg, #2f8f82, #1a5a52)",
    gray: "linear-gradient(135deg, #6b7280, #3f4451)",
  };

  function buildCardHTML(item, balance) {
    var gradient = GRADIENTS[item.tone] || GRADIENTS.gray;
    var affordable = balance >= item.cost;

    return (
      '<div class="reward-card">' +
      '<div class="reward-card__icon" style="background:' + gradient + '"><i class="fa-solid ' + item.icon + '"></i></div>' +
      '<div class="reward-card__body">' +
      "<h3>" + item.title + "</h3>" +
      '<p class="reward-card__desc">' + item.desc + "</p>" +
      '<div class="reward-card__footer">' +
      '<span class="reward-card__cost"><i class="fa-solid fa-leaf"></i> ' + item.cost + " 點</span>" +
      '<button type="button" class="btn btn-sm ' + (affordable ? "btn-primary" : "btn-outline") + ' reward-card__btn"' +
      (affordable ? "" : " disabled") +
      ' data-action="redeem" data-reward-id="' + item.id + '">' +
      (affordable ? "兌換" : "點數不足") +
      "</button>" +
      "</div>" +
      "</div>" +
      "</div>"
    );
  }

  function renderList(container, items, balance) {
    if (!items || !items.length) {
      container.innerHTML =
        '<div class="empty-state"><i class="fa-regular fa-face-frown"></i><p>目前尚無可兌換項目</p></div>';
      return;
    }
    container.innerHTML = items
      .map(function (item) {
        return buildCardHTML(item, balance);
      })
      .join("");
  }

  ns.rewardCard = {
    renderList: renderList,
  };
})(window.FunJia);

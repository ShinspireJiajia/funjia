/**
 * quick-select-grid.js
 * 首頁「快選查詢」大分類格線元件:交通/住宿/餐飲/景點。
 * 點擊後導向 search.html 並帶入對應的 group 參數,查詢頁再依大分類切換子項目頁籤。
 */

window.FunJia = window.FunJia || {};

(function (ns) {
  "use strict";

  function renderQuickSelectGrid(container) {
    container.innerHTML = ns.poiService.GROUPS.map(function (group) {
      return (
        '<a class="quick-select-item" href="search.html?group=' + group.key + '">' +
        '<span class="quick-select-item__icon" style="background:' + group.bg + ';color:' + group.color + ';">' +
        '<i class="fa-solid ' + group.icon + '"></i></span>' +
        "<span>" + group.label + "</span>" +
        "</a>"
      );
    }).join("");
  }

  ns.quickSelectGrid = {
    render: renderQuickSelectGrid,
  };
})(window.FunJia);

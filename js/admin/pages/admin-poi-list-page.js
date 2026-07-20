/**
 * admin-poi-list-page.js
 * 後台「POI 資料庫清單」頁(pages/admin-poi-list.html)邏輯:
 * 合併景點/店家/住宿三類資料(含官方與使用者投稿),提供篩選查詢,
 * 並可切換上/下架狀態(寫入 poi-service.js 的後台狀態覆蓋,會立即影響消費端頁面顯示)。
 */

(function () {
  "use strict";

  var TYPE_LABEL = { attractions: "景點", shops: "店家", lodging: "住宿" };
  var TYPES = ["attractions", "shops", "lodging"];

  var state = { rows: [] };

  document.addEventListener("DOMContentLoaded", function () {
    var ns = window.FunJia;
    load(ns);

    ["fltKeyword", "fltType", "fltSource", "fltStatus"].forEach(function (id) {
      document.getElementById(id).addEventListener("input", render);
      document.getElementById(id).addEventListener("change", render);
    });

    document.getElementById("fltClearBtn").addEventListener("click", function () {
      document.getElementById("fltKeyword").value = "";
      document.getElementById("fltType").value = "";
      document.getElementById("fltSource").value = "";
      document.getElementById("fltStatus").value = "";
      render();
    });

    document.getElementById("tableArea").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-action]");
      if (!btn) return;
      var type = btn.getAttribute("data-type");
      var id = btn.getAttribute("data-id");
      var name = btn.getAttribute("data-name");
      var nextStatus = btn.getAttribute("data-action") === "archive" ? "archived" : "published";
      ns.poiService.setAdminStatus(type, id, nextStatus);
      ns.adminAuditService.log("POI", nextStatus === "archived" ? "下架" : "上架", "「" + name + "」");
      load(ns);
    });
  });

  function load(ns) {
    Promise.all(TYPES.map(function (type) { return ns.poiService.getAllForAdmin(type); })).then(function (results) {
      state.rows = [].concat(results[0], results[1], results[2]);
      render();
    });
  }

  function render() {
    var keyword = document.getElementById("fltKeyword").value.trim().toLowerCase();
    var typeFilter = document.getElementById("fltType").value;
    var sourceFilter = document.getElementById("fltSource").value;
    var statusFilter = document.getElementById("fltStatus").value;

    var filtered = state.rows.filter(function (item) {
      if (typeFilter && item.type !== typeFilter) return false;
      if (sourceFilter && item.source !== sourceFilter) return false;
      if (statusFilter && item.status !== statusFilter) return false;
      if (keyword) {
        var haystack = (item.name + " " + (item.category || "")).toLowerCase();
        if (haystack.indexOf(keyword) === -1) return false;
      }
      return true;
    });

    var publishedCount = filtered.filter(function (i) { return i.status === "published"; }).length;
    document.getElementById("listStats").innerHTML =
      "篩選結果 <b>" + filtered.length + "</b> 筆　｜　已上架 <b>" + publishedCount + "</b> 筆　｜　已下架 <b>" +
      (filtered.length - publishedCount) + "</b> 筆";

    var area = document.getElementById("tableArea");
    if (!filtered.length) {
      area.innerHTML = '<div class="adm-empty"><i class="fa-regular fa-folder-open"></i><p>找不到符合篩選條件的資料。</p></div>';
      return;
    }

    area.innerHTML =
      '<div class="adm-table-wrap"><table class="adm-table"><thead><tr>' +
      "<th>類型</th><th>名稱</th><th>分類</th><th>地址</th><th>來源</th><th>狀態</th><th>操作</th>" +
      "</tr></thead><tbody>" +
      filtered.map(buildRow).join("") +
      "</tbody></table></div>";
  }

  function buildRow(item) {
    var isPublished = item.status === "published";
    var statusHtml = isPublished
      ? '<span class="adm-status ok">已上架</span>'
      : '<span class="adm-status off">已下架</span>';
    var sourceHtml =
      item.source === "ugc" ? '<span class="adm-status pending">使用者投稿</span>' : "官方";
    var toggleBtn = isPublished
      ? '<button type="button" class="adm-chip-btn danger" data-action="archive" data-type="' +
        item.type + '" data-id="' + item.id + '" data-name="' + escapeHtml(item.name) + '">下架</button>'
      : '<button type="button" class="adm-chip-btn ok" data-action="publish" data-type="' +
        item.type + '" data-id="' + item.id + '" data-name="' + escapeHtml(item.name) + '">重新上架</button>';

    return (
      "<tr><td>" + TYPE_LABEL[item.type] + '</td><td class="strong">' + escapeHtml(item.name) + "</td><td>" +
      escapeHtml(item.category || "") + "</td><td>" + escapeHtml(item.address || "") + "</td><td>" +
      sourceHtml + "</td><td>" + statusHtml + "</td><td><div class=\"adm-row-actions\">" +
      '<a class="adm-chip-btn view" href="detail.html?type=' + item.type + "&id=" + item.id +
      '" target="_blank" rel="noopener">檢視</a>' + toggleBtn + "</div></td></tr>"
    );
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
})();

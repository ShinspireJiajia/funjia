/**
 * admin-audit-log-page.js
 * 後台「操作紀錄」頁(pages/admin-audit-log.html)邏輯:
 * 查詢 admin-audit-service.js 記錄的操作紀錄(來自其他後台頁面的實際操作)。
 */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var ns = window.FunJia;
    render(ns);

    ["fltOperator", "fltModule"].forEach(function (id) {
      document.getElementById(id).addEventListener("input", function () { render(ns); });
      document.getElementById(id).addEventListener("change", function () { render(ns); });
    });

    document.getElementById("fltClearBtn").addEventListener("click", function () {
      document.getElementById("fltOperator").value = "";
      document.getElementById("fltModule").value = "";
      render(ns);
    });
  });

  function render(ns) {
    var operator = document.getElementById("fltOperator").value.trim();
    var moduleKey = document.getElementById("fltModule").value;
    var list = ns.adminAuditService.getLog({ operator: operator, module: moduleKey });

    document.getElementById("listStats").innerHTML = "共 <b>" + list.length + "</b> 筆紀錄";

    var area = document.getElementById("tableArea");
    if (!list.length) {
      area.innerHTML = '<div class="adm-empty"><i class="fa-regular fa-clipboard"></i><p>找不到符合篩選條件的紀錄。</p></div>';
      return;
    }

    area.innerHTML =
      '<div class="adm-table-wrap"><table class="adm-table"><thead><tr>' +
      "<th>時間</th><th>操作人</th><th>模組</th><th>動作</th><th>內容</th>" +
      "</tr></thead><tbody>" +
      list
        .map(function (entry) {
          return (
            "<tr><td>" + new Date(entry.at).toLocaleString("zh-TW") + "</td><td>" + escapeHtml(entry.operator) +
            "</td><td>" + escapeHtml(entry.module) + "</td><td>" + escapeHtml(entry.action) + "</td><td>" +
            escapeHtml(entry.detail) + "</td></tr>"
          );
        })
        .join("") +
      "</tbody></table></div>";
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
})();

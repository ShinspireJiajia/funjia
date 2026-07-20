/**
 * admin-roles-page.js
 * 後台「角色權限矩陣」頁(pages/admin-roles.html)邏輯:
 * 顯示各角色在各模組的權限等級,點擊儲存格即可循環切換等級(admin-account-service.js)。
 */

(function () {
  "use strict";

  var LEVEL_LABEL = { none: "—", view: "唯讀", edit: "新增/編輯", review: "審核/上下架", full: "全權" };
  var LEVEL_CLASS = { none: "off", view: "off", edit: "pending", review: "pending", full: "ok" };

  document.addEventListener("DOMContentLoaded", function () {
    var ns = window.FunJia;
    render(ns);

    document.getElementById("matrixArea").addEventListener("click", function (e) {
      var cell = e.target.closest("[data-role][data-module]");
      if (!cell) return;
      var role = cell.getAttribute("data-role");
      var moduleKey = cell.getAttribute("data-module");
      var next = ns.adminAccountService.cyclePermission(role, moduleKey);
      var moduleLabel = ns.adminAccountService.getModules().find(function (m) { return m.key === moduleKey; }).label;
      ns.adminAuditService.log("帳號", "調整權限", role + " 的「" + moduleLabel + "」→ " + LEVEL_LABEL[next]);
      render(ns);
    });
  });

  function render(ns) {
    var roles = ns.adminAccountService.getRoles();
    var modules = ns.adminAccountService.getModules();
    var matrix = ns.adminAccountService.getPermissionMatrix();

    var headHtml = "<th>角色</th>" + modules.map(function (m) { return "<th>" + escapeHtml(m.label) + "</th>"; }).join("");
    var rowsHtml = roles
      .map(function (role) {
        var cells = modules
          .map(function (m) {
            var level = (matrix[role] && matrix[role][m.key]) || "none";
            return (
              '<td><button type="button" class="adm-status ' + LEVEL_CLASS[level] + '" data-role="' + role +
              '" data-module="' + m.key + '" style="cursor:pointer;">' + LEVEL_LABEL[level] + "</button></td>"
            );
          })
          .join("");
        return '<tr><td class="strong">' + escapeHtml(role) + "</td>" + cells + "</tr>";
      })
      .join("");

    document.getElementById("matrixArea").innerHTML =
      '<div class="adm-table-wrap"><table class="adm-table"><thead><tr>' + headHtml + "</tr></thead><tbody>" + rowsHtml + "</tbody></table></div>";
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
})();

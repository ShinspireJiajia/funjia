/**
 * admin-accounts-page.js
 * 後台「人員帳號清單」頁(pages/admin-accounts.html)邏輯:
 * 顯示/篩選帳號清單、停用/啟用帳號、新增帳號(admin-account-service.js)。
 */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var ns = window.FunJia;
    fillRoleOptions(ns);
    render(ns);

    ["fltKeyword", "fltRole", "fltStatus"].forEach(function (id) {
      document.getElementById(id).addEventListener("input", function () { render(ns); });
      document.getElementById(id).addEventListener("change", function () { render(ns); });
    });

    document.getElementById("fltClearBtn").addEventListener("click", function () {
      document.getElementById("fltKeyword").value = "";
      document.getElementById("fltRole").value = "";
      document.getElementById("fltStatus").value = "";
      render(ns);
    });

    document.getElementById("tableArea").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-action]");
      if (!btn) return;
      var id = btn.getAttribute("data-id");
      var name = btn.getAttribute("data-name");
      var nextStatus = btn.getAttribute("data-action") === "disable" ? "disabled" : "active";
      ns.adminAccountService.setAccountStatus(id, nextStatus);
      ns.adminAuditService.log("帳號", nextStatus === "disabled" ? "停用帳號" : "啟用帳號", "「" + name + "」");
      render(ns);
    });

    document.getElementById("addAccountBtn").addEventListener("click", function () {
      var name = document.getElementById("newName").value.trim();
      var email = document.getElementById("newEmail").value.trim();
      var role = document.getElementById("newRole").value;
      if (!name || !email) {
        window.alert("請輸入姓名與 Email。");
        return;
      }
      ns.adminAccountService.addAccount({ name: name, email: email, role: role });
      ns.adminAuditService.log("帳號", "新增帳號", "「" + name + "」(" + role + ")");
      document.getElementById("newName").value = "";
      document.getElementById("newEmail").value = "";
      render(ns);
    });
  });

  function fillRoleOptions(ns) {
    var roles = ns.adminAccountService.getRoles();
    document.getElementById("fltRole").insertAdjacentHTML(
      "beforeend",
      roles.map(function (r) { return '<option value="' + r + '">' + r + "</option>"; }).join("")
    );
    document.getElementById("newRole").innerHTML = roles
      .map(function (r) { return '<option value="' + r + '">' + r + "</option>"; })
      .join("");
  }

  function render(ns) {
    var keyword = document.getElementById("fltKeyword").value.trim().toLowerCase();
    var roleFilter = document.getElementById("fltRole").value;
    var statusFilter = document.getElementById("fltStatus").value;

    var accounts = ns.adminAccountService.getAccounts().filter(function (a) {
      if (roleFilter && a.role !== roleFilter) return false;
      if (statusFilter && a.status !== statusFilter) return false;
      if (keyword) {
        var haystack = (a.name + " " + a.email).toLowerCase();
        if (haystack.indexOf(keyword) === -1) return false;
      }
      return true;
    });

    var activeCount = accounts.filter(function (a) { return a.status === "active"; }).length;
    document.getElementById("listStats").innerHTML =
      "篩選結果 <b>" + accounts.length + "</b> 人　｜　啟用中 <b>" + activeCount + "</b> 人";

    var area = document.getElementById("tableArea");
    if (!accounts.length) {
      area.innerHTML = '<div class="adm-empty"><i class="fa-regular fa-address-card"></i><p>找不到符合篩選條件的帳號。</p></div>';
      return;
    }

    area.innerHTML =
      '<div class="adm-table-wrap"><table class="adm-table"><thead><tr>' +
      "<th>姓名</th><th>角色</th><th>Email</th><th>狀態</th><th>最後登入</th><th>操作</th>" +
      "</tr></thead><tbody>" +
      accounts.map(buildRow).join("") +
      "</tbody></table></div>";
  }

  function buildRow(a) {
    var isActive = a.status === "active";
    var statusHtml = isActive ? '<span class="adm-status ok">啟用</span>' : '<span class="adm-status off">已停用</span>';
    var lastLogin = a.lastLoginAt ? new Date(a.lastLoginAt).toLocaleString("zh-TW") : "尚未登入";
    var toggle = isActive
      ? '<button type="button" class="adm-chip-btn danger" data-action="disable" data-id="' + a.id + '" data-name="' + escapeHtml(a.name) + '">停用</button>'
      : '<button type="button" class="adm-chip-btn ok" data-action="enable" data-id="' + a.id + '" data-name="' + escapeHtml(a.name) + '">重新啟用</button>';

    return (
      '<tr><td class="strong">' + escapeHtml(a.name) + "</td><td>" + escapeHtml(a.role) + "</td><td>" +
      escapeHtml(a.email) + "</td><td>" + statusHtml + "</td><td>" + lastLogin +
      '</td><td><div class="adm-row-actions">' + toggle + "</div></td></tr>"
    );
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
})();

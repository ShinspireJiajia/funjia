/**
 * admin-campaign-rules-page.js
 * 後台「派點規則設定」頁(pages/admin-campaign-rules.html)邏輯:
 * 管理減碳點數觸發規則(admin-point-rule-service.js),
 * 並提供點數帳本查詢(demo 階段對應單一裝置的 wallet-service.js 錢包)。
 */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var ns = window.FunJia;
    render(ns);

    document.getElementById("tableArea").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-action]");
      if (!btn) return;
      var id = btn.getAttribute("data-id");
      var name = btn.getAttribute("data-name");
      var nextStatus = btn.getAttribute("data-action") === "disable" ? "draft" : "active";
      ns.adminPointRuleService.setRuleStatus(id, nextStatus);
      ns.adminAuditService.log("行銷/點數", nextStatus === "active" ? "啟用規則" : "停用規則", "「" + name + "」");
      render(ns);
    });

    document.getElementById("addRuleBtn").addEventListener("click", function () {
      var event = document.getElementById("ruleEvent").value.trim();
      if (!event) {
        window.alert("請輸入觸發事件名稱。");
        return;
      }
      var rule = ns.adminPointRuleService.addRule({
        event: event,
        points: document.getElementById("rulePoints").value.trim() || "—",
        dailyCap: document.getElementById("ruleDailyCap").value.trim() || "—",
        cooldown: document.getElementById("ruleCooldown").value.trim() || "—",
      });
      ns.adminAuditService.log("行銷/點數", "新增規則", "「" + rule.event + "」(草稿)");
      ["ruleEvent", "rulePoints", "ruleDailyCap", "ruleCooldown"].forEach(function (id) {
        document.getElementById(id).value = "";
      });
      render(ns);
    });

    document.getElementById("ledgerQueryBtn").addEventListener("click", function () {
      var member = document.getElementById("ledgerMember").value.trim();
      renderLedger(ns, member);
    });

    renderLedger(ns, "");
  });

  function render(ns) {
    var rules = ns.adminPointRuleService.getRules();
    var activeCount = rules.filter(function (r) { return r.status === "active"; }).length;
    document.getElementById("listStats").innerHTML =
      "啟用中 <b>" + activeCount + "</b> 項　｜　草稿 <b>" + (rules.length - activeCount) + "</b> 項";

    document.getElementById("tableArea").innerHTML =
      '<div class="adm-table-wrap"><table class="adm-table"><thead><tr>' +
      "<th>觸發事件</th><th class=\"num\">點數</th><th class=\"num\">每日上限</th><th>冷卻時間</th><th>狀態</th><th>操作</th>" +
      "</tr></thead><tbody>" +
      rules.map(buildRow).join("") +
      "</tbody></table></div>";
  }

  function buildRow(rule) {
    var isActive = rule.status === "active";
    var statusHtml = isActive ? '<span class="adm-status ok">啟用</span>' : '<span class="adm-status off">草稿</span>';
    var toggle = isActive
      ? '<button type="button" class="adm-chip-btn danger" data-action="disable" data-id="' + rule.id + '" data-name="' + escapeHtml(rule.event) + '">停用</button>'
      : '<button type="button" class="adm-chip-btn ok" data-action="enable" data-id="' + rule.id + '" data-name="' + escapeHtml(rule.event) + '">啟用</button>';

    return (
      '<tr><td class="strong">' + escapeHtml(rule.event) + '</td><td class="num">' + escapeHtml(rule.points) +
      '</td><td class="num">' + escapeHtml(rule.dailyCap) + "</td><td>" + escapeHtml(rule.cooldown) +
      "</td><td>" + statusHtml + '</td><td><div class="adm-row-actions">' + toggle + "</div></td></tr>"
    );
  }

  function renderLedger(ns, member) {
    var balance = ns.walletService.getBalance();
    var history = ns.walletService.getHistory();
    var area = document.getElementById("ledgerArea");

    if (!history.length) {
      area.innerHTML = '<p class="adm-hint">' + (member ? "「" + escapeHtml(member) + "」" : "示範錢包") + '目前沒有任何點數異動紀錄。</p>';
      return;
    }

    area.innerHTML =
      '<div class="adm-kv-list" style="margin-top:14px;">' +
      '<div class="adm-kv-row"><span>' + (member ? "會員 " + escapeHtml(member) : "示範錢包") + ' 目前餘額</span><span>' + balance + " 點</span></div>" +
      history
        .slice(0, 10)
        .map(function (h) {
          var sign = h.delta > 0 ? "+" : "";
          return '<div class="adm-kv-row"><span>' + escapeHtml(h.date) + " " + escapeHtml(h.reason) + "</span><span>" + sign + h.delta + " 點</span></div>";
        })
        .join("") +
      "</div>";
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
})();

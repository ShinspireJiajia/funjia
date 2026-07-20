/**
 * admin-push-log-page.js
 * 後台「發送紀錄」頁(pages/admin-push-log.html)邏輯:
 * 顯示所有推播訊息(草稿/排程中/已發送),可模擬立即發送或取消排程/草稿。
 */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var ns = window.FunJia;
    render(ns);

    document.getElementById("tableArea").addEventListener("click", function (e) {
      var sendBtn = e.target.closest('[data-action="send-now"]');
      var cancelBtn = e.target.closest('[data-action="cancel"]');

      if (sendBtn) {
        var id = sendBtn.getAttribute("data-id");
        var name = sendBtn.getAttribute("data-name");
        ns.newsService.updatePushMessage(id, {
          status: "sent",
          date: new Date().toISOString().slice(0, 10),
          stats: { sentCount: 8000 + Math.floor(Math.random() * 4000), openRate: 0, clickRate: 0 },
        });
        ns.adminAuditService.log("推播", "立即發送", "「" + name + "」");
        render(ns);
        return;
      }

      if (cancelBtn) {
        var cancelId = cancelBtn.getAttribute("data-id");
        var cancelName = cancelBtn.getAttribute("data-name");
        var confirmed = window.confirm('確定要取消「' + cancelName + '」嗎?此動作無法復原。');
        if (!confirmed) return;
        ns.newsService.removePushMessage(cancelId);
        ns.adminAuditService.log("推播", "取消訊息", "「" + cancelName + "」");
        render(ns);
      }
    });
  });

  var STATUS_MAP = {
    sent: '<span class="adm-status ok">已發送</span>',
    scheduled: '<span class="adm-status pending">排程中</span>',
    draft: '<span class="adm-status off">草稿</span>',
  };

  function render(ns) {
    var list = ns.newsService.getPushMessages();
    var sentCount = list.filter(function (m) { return m.status === "sent"; }).length;
    document.getElementById("listStats").innerHTML =
      "共 <b>" + list.length + "</b> 筆　｜　已發送 <b>" + sentCount + "</b> 筆";

    var area = document.getElementById("tableArea");
    if (!list.length) {
      area.innerHTML = '<div class="adm-empty"><i class="fa-regular fa-paper-plane"></i><p>還沒有任何推播訊息,前往「發送推播」建立第一則。</p></div>';
      return;
    }

    area.innerHTML =
      '<div class="adm-table-wrap"><table class="adm-table"><thead><tr>' +
      "<th>標題</th><th>受眾</th><th>日期</th><th>狀態</th><th class=\"num\">發送數</th><th>操作</th>" +
      "</tr></thead><tbody>" +
      list.map(buildRow).join("") +
      "</tbody></table></div>";
  }

  function buildRow(m) {
    var actions = "";
    if (m.status !== "sent") {
      actions +=
        '<button type="button" class="adm-chip-btn ok" data-action="send-now" data-id="' + m.id + '" data-name="' + escapeHtml(m.title) + '">立即發送</button>' +
        '<button type="button" class="adm-chip-btn danger" data-action="cancel" data-id="' + m.id + '" data-name="' + escapeHtml(m.title) + '">取消</button>';
    }
    var stats = m.stats || { sentCount: 0 };

    return (
      '<tr><td class="strong">' + escapeHtml(m.title) + "</td><td>" + escapeHtml(m.audience || "全體使用者") +
      "</td><td>" + escapeHtml(m.date) + "</td><td>" + STATUS_MAP[m.status] + '</td><td class="num">' +
      (stats.sentCount || "—") + '</td><td><div class="adm-row-actions">' + actions + "</div></td></tr>"
    );
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
})();

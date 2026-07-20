/**
 * admin-push-compose-page.js
 * 後台「發送推播」頁(pages/admin-push-compose.html)邏輯:
 * 編輯推播內容並選擇受眾,立即發送/建立排程/儲存草稿(news-service.js)。
 * 發送成功(status: sent)的訊息會併入前台「嘉義最新消息」列表一起顯示。
 */

(function () {
  "use strict";

  var selectedAudience = "全體使用者";

  document.addEventListener("DOMContentLoaded", function () {
    var ns = window.FunJia;
    renderSent(ns);

    document.getElementById("audienceChips").addEventListener("click", function (e) {
      var chip = e.target.closest(".adm-tag-chip");
      if (!chip) return;
      document.querySelectorAll("#audienceChips .adm-tag-chip").forEach(function (c) { c.classList.remove("on"); });
      chip.classList.add("on");
      selectedAudience = chip.getAttribute("data-audience");
    });

    document.getElementById("saveDraftBtn").addEventListener("click", function () {
      submit(ns, "draft");
    });
    document.getElementById("sendBtn").addEventListener("click", function () {
      var scheduleValue = document.getElementById("pushSchedule").value;
      submit(ns, scheduleValue ? "scheduled" : "sent");
    });
  });

  function submit(ns, status) {
    var title = document.getElementById("pushTitle").value.trim();
    var summary = document.getElementById("pushSummary").value.trim();
    if (!title || !summary) {
      window.alert("請至少輸入標題與摘要。");
      return;
    }
    var scheduleValue = document.getElementById("pushSchedule").value;
    var item = ns.newsService.addPushMessage({
      title: title,
      summary: summary,
      content: document.getElementById("pushContent").value.trim() || summary,
      category: document.getElementById("pushCategory").value,
      audience: selectedAudience,
      status: status,
      date: scheduleValue ? scheduleValue.slice(0, 10) : new Date().toISOString().slice(0, 10),
      stats: status === "sent" ? { sentCount: estimateAudienceSize(selectedAudience), openRate: 0, clickRate: 0 } : { sentCount: 0, openRate: 0, clickRate: 0 },
    });

    var actionLabel = status === "sent" ? "發送" : status === "scheduled" ? "建立排程" : "儲存草稿";
    ns.adminAuditService.log("推播", actionLabel, "「" + item.title + "」(受眾:" + selectedAudience + ")");

    resetForm();
    renderSent(ns);
    window.alert("「" + item.title + "」已" + actionLabel + "。");
  }

  function estimateAudienceSize(audience) {
    var base = { 全體使用者: 12840, "常瀏覽「阿里山」地區": 6530, 賞櫻愛好者標籤: 3980, 測試帳號: 5 };
    return base[audience] || 1000;
  }

  function resetForm() {
    document.getElementById("pushTitle").value = "";
    document.getElementById("pushSummary").value = "";
    document.getElementById("pushContent").value = "";
    document.getElementById("pushSchedule").value = "";
  }

  function renderSent(ns) {
    var sent = ns.newsService.getPushMessages().filter(function (m) { return m.status === "sent"; });
    var area = document.getElementById("sentArea");
    if (!sent.length) {
      area.innerHTML = '<p class="adm-hint">目前尚無已發送的推播紀錄。</p>';
      return;
    }
    area.innerHTML =
      '<div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>標題</th><th class="num">發送數</th><th class="num">開啟率</th><th class="num">點擊率</th></tr></thead><tbody>' +
      sent
        .slice(0, 8)
        .map(function (m) {
          var stats = m.stats || { sentCount: 0, openRate: 0, clickRate: 0 };
          return (
            '<tr><td class="strong">' + escapeHtml(m.title) + '</td><td class="num">' + stats.sentCount +
            '</td><td class="num">' + stats.openRate + '%</td><td class="num">' + stats.clickRate + "%</td></tr>"
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

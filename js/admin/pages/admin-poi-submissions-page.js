/**
 * admin-poi-submissions-page.js
 * 後台「使用者投稿審核」頁(pages/admin-poi-submissions.html)邏輯:
 * 彙整景點/店家/住宿/活動四類使用者自建資料(user-poi-service.js),
 * 「通過」寫入已審閱標記,「退件」則直接刪除該筆投稿(會立即影響消費端頁面)。
 */

(function () {
  "use strict";

  var TYPE_LABEL = { attractions: "景點", shops: "店家", lodging: "住宿", events: "活動" };
  var REVIEWED_KEY = "funjia_admin_reviewed_submissions"; // [id, ...]

  document.addEventListener("DOMContentLoaded", function () {
    var ns = window.FunJia;
    render(ns);

    document.getElementById("tableArea").addEventListener("click", function (e) {
      var approveBtn = e.target.closest('[data-action="approve"]');
      var rejectBtn = e.target.closest('[data-action="reject"]');

      if (approveBtn) {
        markReviewed(approveBtn.getAttribute("data-id"));
        ns.adminAuditService.log("POI", "審核通過", "使用者投稿「" + approveBtn.getAttribute("data-name") + "」");
        render(ns);
        return;
      }

      if (rejectBtn) {
        var name = rejectBtn.getAttribute("data-name");
        var reason = window.prompt('確定要退件「' + name + '」嗎?請輸入退件原因(將通知投稿使用者):', "內容不完整,請補充地址與詳細介紹");
        if (reason === null) return;
        ns.userPoiService.remove(rejectBtn.getAttribute("data-id"));
        ns.adminAuditService.log("POI", "退件", "「" + name + "」,原因:" + reason);
        render(ns);
      }
    });
  });

  function readReviewed() {
    try {
      return JSON.parse(localStorage.getItem(REVIEWED_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function markReviewed(id) {
    var list = readReviewed();
    if (list.indexOf(id) === -1) {
      list.push(id);
      localStorage.setItem(REVIEWED_KEY, JSON.stringify(list));
    }
  }

  function render(ns) {
    var reviewed = readReviewed();
    var submissions = ns.poiService.USER_ADDABLE_TYPES.reduce(function (acc, type) {
      return acc.concat(
        ns.userPoiService.getAll(type).map(function (item) {
          return Object.assign({}, item, { isReviewed: reviewed.indexOf(item.id) !== -1 });
        })
      );
    }, []);

    submissions.sort(function (a, b) {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    var pendingCount = submissions.filter(function (s) { return !s.isReviewed; }).length;
    document.getElementById("listStats").innerHTML =
      "待審核 <b>" + pendingCount + "</b> 筆　｜　已通過 <b>" + (submissions.length - pendingCount) + "</b> 筆";

    var area = document.getElementById("tableArea");
    if (!submissions.length) {
      area.innerHTML = '<div class="adm-empty"><i class="fa-regular fa-face-smile"></i><p>目前沒有使用者投稿的資料。</p></div>';
      return;
    }

    area.innerHTML =
      '<div class="adm-table-wrap"><table class="adm-table"><thead><tr>' +
      "<th>名稱</th><th>類型</th><th>投稿時間</th><th>狀態</th><th>操作</th>" +
      "</tr></thead><tbody>" +
      submissions.map(buildRow).join("") +
      "</tbody></table></div>";
  }

  function buildRow(item) {
    var statusHtml = item.isReviewed
      ? '<span class="adm-status ok">已通過</span>'
      : '<span class="adm-status pending">待審核</span>';
    var createdLabel = item.createdAt ? new Date(item.createdAt).toLocaleString("zh-TW") : "—";
    var actions = item.isReviewed
      ? ""
      : '<button type="button" class="adm-chip-btn ok" data-action="approve" data-id="' +
        item.id + '" data-name="' + escapeHtml(item.name) + '">通過</button>';
    actions +=
      '<button type="button" class="adm-chip-btn danger" data-action="reject" data-id="' +
      item.id + '" data-name="' + escapeHtml(item.name) + '">退件</button>';

    return (
      '<tr><td class="strong">' + escapeHtml(item.name) + "</td><td>" + TYPE_LABEL[item.type] +
      "</td><td>" + createdLabel + "</td><td>" + statusHtml +
      '</td><td><div class="adm-row-actions">' + actions + "</div></td></tr>"
    );
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
})();

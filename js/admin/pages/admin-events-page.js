/**
 * admin-events-page.js
 * 後台「活動檔期管理」頁(pages/admin-events.html)邏輯:
 * 以時間軸呈現各活動檔期起訖,清單並自動統計綁定的優惠券(deals.json)與
 * 打卡徽章(badges.json)筆數(以 refId 對應此活動 id)。
 */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var ns = window.FunJia;
    load(ns);

    document.getElementById("tableArea").addEventListener("click", function (e) {
      var btn = e.target.closest("[data-action]");
      if (!btn) return;
      var id = btn.getAttribute("data-id");
      var name = btn.getAttribute("data-name");
      var nextStatus = btn.getAttribute("data-action") === "archive" ? "archived" : "published";
      ns.poiService.setAdminStatus("events", id, nextStatus);
      ns.adminAuditService.log("活動檔期", nextStatus === "archived" ? "下架" : "上架", "「" + name + "」");
      load(ns);
    });
  });

  function load(ns) {
    Promise.all([
      ns.poiService.getAllForAdmin("events"),
      ns.dataService.fetchJson("deals.json"),
      ns.dataService.fetchJson("badges.json"),
    ]).then(function (results) {
      var events = results[0];
      var deals = results[1];
      var badges = results[2];

      events.forEach(function (ev) {
        var boundDeals = deals.filter(function (d) { return d.type === "events" && d.refId === ev.id; }).length;
        var boundBadges = badges.filter(function (b) { return b.type === "events" && b.refId === ev.id; }).length;
        ev.boundCount = boundDeals + boundBadges;
      });

      events.sort(function (a, b) {
        return new Date(a.startDate || 0) - new Date(b.startDate || 0);
      });

      renderTimeline(events);
      renderTable(events);
    });
  }

  function renderTimeline(events) {
    var withDates = events.filter(function (e) { return e.startDate && e.endDate; });
    var area = document.getElementById("timelineArea");
    var axis = document.getElementById("timelineAxis");

    if (!withDates.length) {
      area.innerHTML = '<p class="adm-hint">尚無設定檔期日期的活動。</p>';
      axis.innerHTML = "";
      return;
    }

    var minTime = Math.min.apply(null, withDates.map(function (e) { return new Date(e.startDate).getTime(); }));
    var maxTime = Math.max.apply(null, withDates.map(function (e) { return new Date(e.endDate).getTime(); }));
    var span = Math.max(1, maxTime - minTime);

    area.innerHTML = withDates
      .map(function (ev) {
        var left = ((new Date(ev.startDate).getTime() - minTime) / span) * 100;
        var width = Math.max(2, ((new Date(ev.endDate).getTime() - new Date(ev.startDate).getTime()) / span) * 100);
        var barClass = ev.isHot ? "adm-tl-bar hot" : "adm-tl-bar";
        return (
          '<div class="adm-tl-row"><span class="adm-tl-label">' + escapeHtml(ev.name) + '</span>' +
          '<div class="adm-tl-track"><div class="' + barClass + '" style="left:' + left + "%;width:" + width + '%;" title="' +
          ev.startDate + " ~ " + ev.endDate + '"></div></div></div>'
        );
      })
      .join("");

    axis.innerHTML =
      "<div></div><div><span>" + formatMonth(minTime) + "</span><span>" +
      formatMonth(minTime + span * 0.33) + "</span><span>" + formatMonth(minTime + span * 0.66) +
      "</span><span>" + formatMonth(maxTime) + "</span></div>";
  }

  function formatMonth(ts) {
    var d = new Date(ts);
    return d.getFullYear() + "/" + String(d.getMonth() + 1).padStart(2, "0");
  }

  function renderTable(events) {
    var publishedCount = events.filter(function (e) { return e.status === "published"; }).length;
    document.getElementById("listStats").innerHTML =
      "共 <b>" + events.length + "</b> 檔　｜　已上架 <b>" + publishedCount + "</b> 檔";

    document.getElementById("tableArea").innerHTML =
      '<div class="adm-table-wrap"><table class="adm-table"><thead><tr>' +
      "<th>活動名稱</th><th>分類</th><th>檔期</th><th>地址</th><th class=\"num\">綁定優惠/徽章</th><th>狀態</th><th>操作</th>" +
      "</tr></thead><tbody>" +
      events.map(buildRow).join("") +
      "</tbody></table></div>";
  }

  function buildRow(ev) {
    var isPublished = ev.status === "published";
    var statusHtml = isPublished ? '<span class="adm-status ok">已上架</span>' : '<span class="adm-status off">已下架</span>';
    var toggle = isPublished
      ? '<button type="button" class="adm-chip-btn danger" data-action="archive" data-id="' + ev.id + '" data-name="' + escapeHtml(ev.name) + '">下架</button>'
      : '<button type="button" class="adm-chip-btn ok" data-action="publish" data-id="' + ev.id + '" data-name="' + escapeHtml(ev.name) + '">上架</button>';

    return (
      '<tr><td class="strong">' + escapeHtml(ev.name) + "</td><td>" + escapeHtml(ev.category || "") +
      "</td><td>" + escapeHtml((ev.startDate || "—") + " ~ " + (ev.endDate || "—")) + "</td><td>" +
      escapeHtml(ev.address || "") + '</td><td class="num">' + ev.boundCount + "</td><td>" + statusHtml +
      '</td><td><div class="adm-row-actions">' +
      '<a class="adm-chip-btn view" href="detail.html?type=events&id=' + ev.id + '" target="_blank" rel="noopener">檢視</a>' +
      toggle + "</div></td></tr>"
    );
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
})();

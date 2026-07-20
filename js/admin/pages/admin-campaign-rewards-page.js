/**
 * admin-campaign-rewards-page.js
 * 後台「兌換獎勵管理」頁(pages/admin-campaign-rewards.html)邏輯:
 * 管理優惠商城獎勵(reward-service.js 的後台覆蓋層),異動會立即影響消費端優惠商城顯示,
 * 並顯示本機兌換紀錄(getMyRedemptions)。
 */

(function () {
  "use strict";

  var state = { list: [], editingId: null };

  document.addEventListener("DOMContentLoaded", function () {
    var ns = window.FunJia;
    load(ns);
    loadRedemptions(ns);

    document.getElementById("addRewardBtn").addEventListener("click", function () {
      var item = ns.rewardService.addCustomReward({ title: "未命名獎勵", status: "draft", cost: 0, stock: 0 });
      ns.adminAuditService.log("行銷/點數", "新增獎勵", "「" + item.title + "」(草稿)");
      load(ns, item.id);
    });

    document.getElementById("tableArea").addEventListener("click", function (e) {
      var editBtn = e.target.closest('[data-action="edit"]');
      var toggleBtn = e.target.closest('[data-action="toggle-status"]');
      if (editBtn) {
        openEditor(editBtn.getAttribute("data-id"));
        return;
      }
      if (toggleBtn) {
        var id = toggleBtn.getAttribute("data-id");
        var nextStatus = toggleBtn.getAttribute("data-next");
        ns.rewardService.updateReward(id, { status: nextStatus });
        ns.adminAuditService.log("行銷/點數", nextStatus === "published" ? "上架獎勵" : "下架獎勵", "「" + toggleBtn.getAttribute("data-name") + "」");
        load(ns, state.editingId);
      }
    });

    document.getElementById("saveOffBtn").addEventListener("click", function () { saveEditing(ns, "draft"); });
    document.getElementById("savePublishBtn").addEventListener("click", function () { saveEditing(ns, "published"); });
  });

  function load(ns, keepEditingId) {
    ns.rewardService.getAllRewardsForAdmin().then(function (list) {
      state.list = list;
      render();
      if (keepEditingId) openEditor(keepEditingId);
    });
  }

  function render() {
    var publishedCount = state.list.filter(function (r) { return r.status === "published"; }).length;
    document.getElementById("listStats").innerHTML =
      "上架中 <b>" + publishedCount + "</b> 項　｜　共 <b>" + state.list.length + "</b> 項";

    document.getElementById("tableArea").innerHTML =
      '<div class="adm-table-wrap"><table class="adm-table"><thead><tr>' +
      "<th>獎勵</th><th>類型</th><th class=\"num\">所需點數</th><th class=\"num\">庫存</th><th>狀態</th><th>操作</th>" +
      "</tr></thead><tbody>" +
      state.list.map(buildRow).join("") +
      "</tbody></table></div>";
  }

  function buildRow(item) {
    var isPublished = item.status === "published";
    var lowStock = typeof item.stock === "number" && item.stock <= 10;
    var statusHtml = isPublished
      ? lowStock
        ? '<span class="adm-status pending">庫存偏低</span>'
        : '<span class="adm-status ok">上架中</span>'
      : '<span class="adm-status off">下架</span>';
    var toggle = isPublished
      ? '<button type="button" class="adm-chip-btn danger" data-action="toggle-status" data-id="' + item.id + '" data-next="draft" data-name="' + escapeHtml(item.title) + '">下架</button>'
      : '<button type="button" class="adm-chip-btn ok" data-action="toggle-status" data-id="' + item.id + '" data-next="published" data-name="' + escapeHtml(item.title) + '">上架</button>';

    return (
      '<tr><td class="strong">' + escapeHtml(item.title) + "</td><td>" +
      (item.kind === "gift" ? "實體贈品" : "優惠券") + '</td><td class="num">' + (item.cost || 0) +
      '</td><td class="num">' + (typeof item.stock === "number" ? item.stock : "—") + "</td><td>" + statusHtml +
      '</td><td><div class="adm-row-actions">' +
      '<button type="button" class="adm-chip-btn note" data-action="edit" data-id="' + item.id + '">編輯</button>' +
      toggle + "</div></td></tr>"
    );
  }

  function openEditor(id) {
    var item = state.list.find(function (i) { return i.id === id; });
    if (!item) return;
    state.editingId = id;
    document.getElementById("editCard").style.display = "block";
    document.getElementById("editingTitle").textContent = item.title;
    document.getElementById("editTitle").value = item.title;
    document.getElementById("editKind").value = item.kind || "coupon";
    document.getElementById("editCost").value = item.cost || 0;
    document.getElementById("editStock").value = typeof item.stock === "number" ? item.stock : 0;
    document.getElementById("editDesc").value = item.desc || "";
  }

  function saveEditing(ns, status) {
    if (!state.editingId) return;
    var patch = {
      title: document.getElementById("editTitle").value.trim() || "未命名獎勵",
      kind: document.getElementById("editKind").value,
      cost: parseInt(document.getElementById("editCost").value, 10) || 0,
      stock: parseInt(document.getElementById("editStock").value, 10) || 0,
      desc: document.getElementById("editDesc").value.trim(),
      status: status,
    };
    ns.rewardService.updateReward(state.editingId, patch);
    ns.adminAuditService.log("行銷/點數", status === "published" ? "儲存並上架獎勵" : "儲存並下架獎勵", "「" + patch.title + "」");
    load(ns, state.editingId);
  }

  function loadRedemptions(ns) {
    ns.rewardService.getMyRedemptions().then(function (records) {
      var area = document.getElementById("redemptionArea");
      if (!records.length) {
        area.innerHTML = '<p class="adm-hint">目前沒有任何兌換紀錄。</p>';
        return;
      }
      area.innerHTML =
        '<div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>兌換時間</th><th>獎勵</th><th>兌換碼</th></tr></thead><tbody>' +
        records
          .slice(0, 10)
          .map(function (r) {
            return (
              "<tr><td>" + escapeHtml(r.date) + "</td><td>" + escapeHtml(r.reward ? r.reward.title : "(獎勵已下架)") +
              '</td><td style="font-family:ui-monospace,monospace;">' + escapeHtml(r.code) + "</td></tr>"
            );
          })
          .join("") +
        "</tbody></table></div>";
    });
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
})();

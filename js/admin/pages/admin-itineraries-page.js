/**
 * admin-itineraries-page.js
 * 後台「推薦行程範本」頁(pages/admin-itineraries.html)邏輯:
 * 清單顯示全部範本(含草稿/下架),點擊「編輯」載入右側站點規劃與留言管理面板,
 * 站點順序以上移/下移調整,異動皆呼叫 itinerary-service.js 寫回 localStorage 覆蓋層。
 */

(function () {
  "use strict";

  var state = { list: [], editingId: null, stops: [] };

  document.addEventListener("DOMContentLoaded", function () {
    var ns = window.FunJia;
    load(ns);

    document.getElementById("addTemplateBtn").addEventListener("click", function () {
      var item = ns.itineraryService.addCustomTemplate({ title: "未命名行程" });
      ns.adminAuditService.log("行程範本", "新增", "「" + item.title + "」(草稿)");
      load(ns, item.id);
    });

    document.getElementById("tableArea").addEventListener("click", function (e) {
      var editBtn = e.target.closest('[data-action="edit"]');
      var toggleBtn = e.target.closest('[data-action="toggle-status"]');

      if (editBtn) {
        openEditor(ns, editBtn.getAttribute("data-id"));
        return;
      }
      if (toggleBtn) {
        var id = toggleBtn.getAttribute("data-id");
        var nextStatus = toggleBtn.getAttribute("data-next");
        ns.itineraryService.setTemplateStatus(id, nextStatus);
        ns.adminAuditService.log("行程範本", nextStatus === "published" ? "上架" : "下架", "「" + toggleBtn.getAttribute("data-name") + "」");
        load(ns, state.editingId);
      }
    });

    document.getElementById("addStopBtn").addEventListener("click", function () {
      var nameInput = document.getElementById("newStopName");
      var noteInput = document.getElementById("newStopNote");
      var transportInput = document.getElementById("newStopTransport");
      var name = nameInput.value.trim();
      if (!name) return;
      state.stops.push({ name: name, note: noteInput.value.trim(), transport: transportInput.value.trim() });
      nameInput.value = "";
      noteInput.value = "";
      transportInput.value = "";
      renderStopList();
    });

    document.getElementById("stopList").addEventListener("click", function (e) {
      var btn = e.target.closest("button[data-stop-action]");
      if (!btn) return;
      var index = Number(btn.getAttribute("data-index"));
      var action = btn.getAttribute("data-stop-action");
      if (action === "up" && index > 0) {
        swapStops(index, index - 1);
      } else if (action === "down" && index < state.stops.length - 1) {
        swapStops(index, index + 1);
      } else if (action === "remove") {
        state.stops.splice(index, 1);
      }
      renderStopList();
    });

    document.getElementById("stopList").addEventListener("input", function (e) {
      var index = Number(e.target.getAttribute("data-index"));
      if (Number.isNaN(index)) return;
      if (e.target.classList.contains("name-input")) {
        state.stops[index].name = e.target.value;
      } else if (e.target.classList.contains("note-input")) {
        state.stops[index].note = e.target.value;
      } else if (e.target.classList.contains("transport-input")) {
        state.stops[index].transport = e.target.value;
      }
    });

    document.getElementById("saveDraftBtn").addEventListener("click", function () {
      saveEditing(ns, "draft");
    });
    document.getElementById("savePublishBtn").addEventListener("click", function () {
      saveEditing(ns, "published");
    });

    document.getElementById("commentArea").addEventListener("click", function (e) {
      var btn = e.target.closest('[data-remove-comment]');
      if (!btn) return;
      var confirmed = window.confirm("確定要刪除這則留言嗎?此動作無法復原。");
      if (!confirmed) return;
      ns.itineraryService.removeComment(state.editingId, btn.getAttribute("data-remove-comment"));
      ns.adminAuditService.log("行程範本", "刪除留言", "範本「" + escapeHtml(state.currentItem.title) + "」");
      openEditor(ns, state.editingId);
    });
  });

  function swapStops(a, b) {
    var tmp = state.stops[a];
    state.stops[a] = state.stops[b];
    state.stops[b] = tmp;
  }

  function load(ns, keepEditingId) {
    ns.itineraryService.getAllTemplatesForAdmin().then(function (list) {
      list.sort(function (a, b) {
        return (b.baseFavorites || 0) - (a.baseFavorites || 0);
      });
      state.list = list;
      render();
      if (keepEditingId) {
        openEditor(ns, keepEditingId);
      }
    });
  }

  function render() {
    var publishedCount = state.list.filter(function (i) { return i.status === "published"; }).length;
    var draftCount = state.list.filter(function (i) { return i.status === "draft"; }).length;
    document.getElementById("listStats").innerHTML =
      "已上架 <b>" + publishedCount + "</b> 筆　｜　草稿 <b>" + draftCount + "</b> 筆　｜　共 <b>" + state.list.length + "</b> 筆";

    document.getElementById("tableArea").innerHTML =
      '<div class="adm-table-wrap"><table class="adm-table"><thead><tr>' +
      "<th>標題</th><th class=\"num\">天數</th><th class=\"num\">站點數</th><th class=\"num\">減碳量</th>" +
      "<th class=\"num\">點數</th><th class=\"num\">收藏</th><th class=\"num\">留言</th><th>狀態</th><th>操作</th>" +
      "</tr></thead><tbody>" +
      state.list.map(buildRow).join("") +
      "</tbody></table></div>";
  }

  function buildRow(item) {
    var statusMap = {
      published: '<span class="adm-status ok">已上架</span>',
      draft: '<span class="adm-status off">草稿</span>',
      archived: '<span class="adm-status danger">已下架</span>',
    };
    var toggle =
      item.status === "published"
        ? '<button type="button" class="adm-chip-btn danger" data-action="toggle-status" data-id="' + item.id + '" data-next="archived" data-name="' + escapeHtml(item.title) + '">下架</button>'
        : '<button type="button" class="adm-chip-btn ok" data-action="toggle-status" data-id="' + item.id + '" data-next="published" data-name="' + escapeHtml(item.title) + '">上架</button>';

    return (
      '<tr><td class="strong">' + escapeHtml(item.title) + '</td><td class="num">' + item.days +
      '</td><td class="num">' + (item.stops || []).length + '</td><td class="num">' +
      (item.carbonSavedKg || 0) + " kg</td><td class=\"num\">" + (item.pointsEarned || 0) +
      '</td><td class="num">' + (item.baseFavorites || 0) + '</td><td class="num">' +
      (item.comments || []).length + "</td><td>" + statusMap[item.status] +
      '</td><td><div class="adm-row-actions">' +
      '<a class="adm-chip-btn view" href="itin-detail.html?id=' + item.id + '" target="_blank" rel="noopener">檢視</a>' +
      '<button type="button" class="adm-chip-btn note" data-action="edit" data-id="' + item.id + '">編輯</button>' +
      toggle + "</div></td></tr>"
    );
  }

  function openEditor(ns, id) {
    var item = state.list.find(function (i) { return i.id === id; });
    if (!item) return;
    state.editingId = id;
    state.currentItem = item;
    state.stops = (item.stops || []).map(function (s) { return { name: s.name, note: s.note || "", transport: s.transport || "", image: s.image }; });

    document.getElementById("editArea").style.display = "grid";
    document.getElementById("editingTitle").textContent = item.title;
    document.getElementById("editTitle").value = item.title;
    document.getElementById("editDays").value = item.days;
    document.getElementById("editSummary").value = item.summary || "";
    document.getElementById("editCarbon").value = item.carbonSavedKg || 0;
    document.getElementById("editPoints").value = item.pointsEarned || 0;
    renderStopList();
    renderComments(item);
  }

  function renderStopList() {
    var container = document.getElementById("stopList");
    if (!state.stops.length) {
      container.innerHTML = '<p class="adm-hint">尚未加入任何站點。</p>';
      return;
    }
    container.innerHTML = state.stops
      .map(function (stop, index) {
        return (
          '<div class="adm-stop-item"><span class="adm-stop-item__order">' + (index + 1) + "</span>" +
          '<div class="adm-stop-item__body">' +
          '<input class="name-input" data-index="' + index + '" value="' + escapeHtml(stop.name) + '" />' +
          '<input class="note-input" data-index="' + index + '" value="' + escapeHtml(stop.note) + '" placeholder="備註" />' +
          '<input class="transport-input" data-index="' + index + '" value="' + escapeHtml(stop.transport || "") + '" placeholder="交通資訊(如:步行 5 分鐘)" />' +
          "</div>" +
          '<div class="adm-stop-item__actions">' +
          '<button type="button" data-stop-action="up" data-index="' + index + '"><i class="fa-solid fa-arrow-up"></i></button>' +
          '<button type="button" data-stop-action="down" data-index="' + index + '"><i class="fa-solid fa-arrow-down"></i></button>' +
          '<button type="button" data-stop-action="remove" data-index="' + index + '"><i class="fa-solid fa-xmark"></i></button>' +
          "</div></div>"
        );
      })
      .join("");
  }

  function renderComments(item) {
    var comments = item.comments || [];
    var area = document.getElementById("commentArea");
    if (!comments.length) {
      area.innerHTML = '<p class="adm-hint">這個範本目前沒有留言。</p>';
      return;
    }
    area.innerHTML =
      '<div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>留言人</th><th>內容</th><th>日期</th><th>操作</th></tr></thead><tbody>' +
      comments
        .map(function (c) {
          return (
            '<tr><td class="strong">' + escapeHtml(c.name) + "</td><td>" + escapeHtml(c.text) + "</td><td>" +
            escapeHtml(c.date) + '</td><td><button type="button" class="adm-chip-btn danger" data-remove-comment="' +
            c.id + '">刪除</button></td></tr>'
          );
        })
        .join("") +
      "</tbody></table></div>";
  }

  function saveEditing(ns, status) {
    if (!state.editingId) return;
    var patch = {
      title: document.getElementById("editTitle").value.trim() || "未命名行程",
      days: Math.max(1, parseInt(document.getElementById("editDays").value, 10) || 1),
      summary: document.getElementById("editSummary").value.trim(),
      carbonSavedKg: parseFloat(document.getElementById("editCarbon").value) || 0,
      pointsEarned: parseInt(document.getElementById("editPoints").value, 10) || 0,
      stops: state.stops.filter(function (s) { return s.name.trim(); }),
      status: status,
    };

    if (state.currentItem.isCustom) {
      ns.itineraryService.updateCustomTemplate(state.editingId, patch);
    } else {
      ns.itineraryService.saveTemplateOverride(state.editingId, patch);
    }
    ns.adminAuditService.log("行程範本", status === "published" ? "儲存並上架" : "儲存草稿", "「" + patch.title + "」");
    load(ns, state.editingId);
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
})();

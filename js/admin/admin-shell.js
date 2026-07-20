/**
 * admin-shell.js
 * admin.html(後台 masterpage)專用邏輯:
 * 1. 依 admin-nav-config.js 畫出側欄分組導覽 → 切換 iframe 內容頁面
 * 2. 更新頂部麵包屑文字、目前登入的示範管理者資訊
 * 3. 側欄分組展開/收合
 */

(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    var ns = window.FunJia;
    var nav = document.getElementById("admNav");
    var contentFrame = document.getElementById("admContentFrame");
    var crumb = document.getElementById("admCrumb");

    renderNav(ns, nav);
    renderCurrentUser(ns);
    bindNavEvents(nav, contentFrame, crumb);
    bindLogout();

    // 依網址參數 ?page= 決定初始頁面,預設為 POI 資料庫清單
    var initialPage = new URLSearchParams(window.location.search).get("page") || ns.adminNavConfig.DEFAULT_PAGE;
    navigateTo(ns, nav, contentFrame, crumb, initialPage);
  });

  function renderNav(ns, nav) {
    var groups = ns.adminNavConfig.NAV_GROUPS;
    nav.innerHTML = groups
      .map(function (group) {
        var leavesHtml = group.leaves
          .map(function (leaf) {
            return (
              '<button type="button" class="adm-nav-leaf" data-page="' +
              leaf.page +
              '"><i class="fa-solid ' +
              leaf.icon +
              '"></i>' +
              escapeHtml(leaf.label) +
              "</button>"
            );
          })
          .join("");
        return (
          '<div class="adm-nav-group is-open" data-group="' +
          group.key +
          '">' +
          '<button type="button" class="adm-nav-group__head" data-toggle="' +
          group.key +
          '"><span>' +
          escapeHtml(group.label) +
          '</span><i class="fa-solid fa-chevron-right"></i></button>' +
          '<div class="adm-nav-group__body">' +
          leavesHtml +
          "</div></div>"
        );
      })
      .join("");
  }

  function renderCurrentUser(ns) {
    var user = ns.adminAccountService.getCurrentUser();
    document.getElementById("admAvatar").textContent = user.name.slice(0, 2).toUpperCase();
    document.getElementById("admUserName").textContent = user.name;
    document.getElementById("admUserRole").textContent = user.role;
  }

  function bindNavEvents(nav, contentFrame, crumb) {
    nav.addEventListener("click", function (e) {
      var groupHead = e.target.closest(".adm-nav-group__head");
      if (groupHead) {
        groupHead.closest(".adm-nav-group").classList.toggle("is-open");
        return;
      }
      var leaf = e.target.closest(".adm-nav-leaf");
      if (leaf) {
        navigateTo(window.FunJia, nav, contentFrame, crumb, leaf.getAttribute("data-page"));
      }
    });
  }

  function navigateTo(ns, nav, contentFrame, crumb, page) {
    contentFrame.setAttribute("src", "pages/" + page);
    nav.querySelectorAll(".adm-nav-leaf").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-page") === page);
    });
    var found = ns.adminNavConfig.findLeaf(page);
    if (found) {
      crumb.innerHTML = escapeHtml(found.group.label) + " / <b>" + escapeHtml(found.leaf.label) + "</b>";
    }
  }

  function bindLogout() {
    document.getElementById("admLogoutBtn").addEventListener("click", function () {
      var confirmed = window.confirm("確定要登出後台管理系統嗎?");
      if (confirmed) {
        window.location.href = "index.html";
      }
    });
  }

  function escapeHtml(str) {
    return String(str == null ? "" : str).replace(/[&<>"']/g, function (ch) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch];
    });
  }
})();

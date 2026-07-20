/**
 * admin-nav-config.js
 * 後台側欄導覽結構設定:定義分組、每組底下的功能頁面與圖示,
 * 由 admin-shell.js 讀取後畫出側欄選單,並用於麵包屑文字組合。
 */

window.FunJia = window.FunJia || {};

(function (ns) {
  "use strict";

  var NAV_GROUPS = [
    {
      key: "content",
      label: "內容管理",
      leaves: [
        { page: "admin-poi-list.html", label: "POI 資料庫清單", icon: "fa-map-location-dot" },
        { page: "admin-poi-submissions.html", label: "使用者投稿審核", icon: "fa-inbox" },
        { page: "admin-itineraries.html", label: "推薦行程範本", icon: "fa-route" },
      ],
    },
    {
      key: "marketing",
      label: "行銷設定",
      leaves: [
        { page: "admin-events.html", label: "活動檔期管理", icon: "fa-calendar-days" },
        { page: "admin-campaign-rules.html", label: "派點規則設定", icon: "fa-leaf" },
        { page: "admin-campaign-rewards.html", label: "兌換獎勵管理", icon: "fa-gift" },
      ],
    },
    {
      key: "account",
      label: "帳號管理",
      leaves: [
        { page: "admin-accounts.html", label: "人員帳號清單", icon: "fa-users" },
        { page: "admin-roles.html", label: "角色權限矩陣", icon: "fa-shield-halved" },
        { page: "admin-audit-log.html", label: "操作紀錄", icon: "fa-clipboard-list" },
      ],
    },
    {
      key: "push",
      label: "推播管理",
      leaves: [
        { page: "admin-push-compose.html", label: "發送推播", icon: "fa-paper-plane" },
        { page: "admin-push-log.html", label: "發送紀錄", icon: "fa-clock-rotate-left" },
      ],
    },
    {
      key: "analytics",
      label: "數據中心",
      leaves: [{ page: "admin-dashboard.html", label: "流量數據儀表板", icon: "fa-chart-column" }],
    },
  ];

  var DEFAULT_PAGE = "admin-poi-list.html";

  function findLeaf(page) {
    for (var i = 0; i < NAV_GROUPS.length; i++) {
      var group = NAV_GROUPS[i];
      for (var j = 0; j < group.leaves.length; j++) {
        if (group.leaves[j].page === page) {
          return { group: group, leaf: group.leaves[j] };
        }
      }
    }
    return null;
  }

  ns.adminNavConfig = {
    NAV_GROUPS: NAV_GROUPS,
    DEFAULT_PAGE: DEFAULT_PAGE,
    findLeaf: findLeaf,
  };
})(window.FunJia);

/**
 * poi-service.js
 * 景點/店家/住宿/活動/停車場/公車站(POI, Point of Interest)資料服務層。
 * 依 type 對應到不同 mock JSON,未來可分別替換為:
 * - attractions/shops/lodging/events → 交通部觀光署觀光資訊資料庫(TDX)
 * - parking → 嘉義市智慧停車場管理雲端平臺
 * - bus → TDX 公車動態 API
 */

window.FunJia = window.FunJia || {};

(function (ns) {
  "use strict";

  var TYPE_FILE_MAP = {
    attractions: "attractions.json",
    shops: "shops.json",
    lodging: "lodging.json",
    events: "events.json",
    parking: "parking.json",
    bus: "bus-stops.json",
    hsr: "hsr-schedule.json",
    gas: "gas-stations.json",
    youbike: "youbike-stations.json",
  };

  var TYPE_LABEL_MAP = {
    attractions: "景點",
    shops: "店家",
    lodging: "住宿",
    events: "活動",
    parking: "停車場",
    bus: "公車站",
    hsr: "高鐵時刻",
    gas: "加油站",
    youbike: "YouBike微笑單車",
  };

  // 快選查詢分類設定,首頁格線與查詢頁分類頁籤共用同一份設定
  var CATEGORIES = [
    { type: "attractions", label: "景點", icon: "fa-mountain-sun" },
    { type: "shops", label: "店家", icon: "fa-store" },
    { type: "lodging", label: "住宿", icon: "fa-bed" },
    { type: "bus", label: "公車查詢", icon: "fa-bus" },
    { type: "events", label: "活動", icon: "fa-calendar-days" },
    { type: "parking", label: "停車場", icon: "fa-square-parking" },
    { type: "hsr", label: "高鐵時刻", icon: "fa-train" },
    { type: "gas", label: "加油站", icon: "fa-gas-pump" },
    { type: "youbike", label: "YouBike微笑單車", icon: "fa-bicycle" },
  ];

  // 大分類:查詢頁先選大類型,再於同一大類型底下切換子項目頁籤
  // 注意:「活動資訊」已收斂為「好康專區 > 優惠」底下的子項目(deals.html?kind=event),
  // 不再是快選查詢/首頁的獨立大分類節點。
  var GROUPS = [
    { key: "traffic", label: "交通接駁", icon: "fa-bus", bg: "#e5ebe0", color: "#3d5a41", types: ["bus", "hsr", "gas", "youbike", "parking"] },
    { key: "lodging", label: "友善住宿", icon: "fa-bed", bg: "#e0e8e7", color: "#365d5d", types: ["lodging"] },
    { key: "food", label: "在地美食", icon: "fa-utensils", bg: "#f0e6db", color: "#95592f", types: ["shops"] },
    { key: "attractions", label: "熱門景點", icon: "fa-camera", bg: "#efe9d7", color: "#836824", types: ["attractions"] },
  ];

  // 開放使用者自行新增資料的類型(景點/店家/住宿/活動),對應「新增資料」頁面(add-poi.html)
  var USER_ADDABLE_TYPES = ["attractions", "shops", "lodging", "events"];

  // 後台「上/下架」狀態覆蓋,key 為 "type:id" → { status: "archived" }
  // 官方資料預設視為已上架,僅在此表中找到 archived 時才會從清單中過濾掉。
  var ADMIN_STATUS_KEY = "funjia_admin_poi_status";

  function readAdminStatusMap() {
    try {
      return JSON.parse(localStorage.getItem(ADMIN_STATUS_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function writeAdminStatusMap(map) {
    localStorage.setItem(ADMIN_STATUS_KEY, JSON.stringify(map));
  }

  /** 取得後台設定的上架狀態("published" | "archived"),預設為 published */
  function getAdminStatus(type, id) {
    var map = readAdminStatusMap();
    var entry = map[type + ":" + id];
    return (entry && entry.status) || "published";
  }

  /** 後台設定 POI 上/下架狀態 */
  function setAdminStatus(type, id, status) {
    var map = readAdminStatusMap();
    map[type + ":" + id] = { status: status, updatedAt: new Date().toISOString() };
    writeAdminStatusMap(map);
  }

  function getTypeLabel(type) {
    return TYPE_LABEL_MAP[type] || "";
  }

  function getGroupByKey(key) {
    return GROUPS.find(function (group) {
      return group.key === key;
    });
  }

  function getGroupByType(type) {
    return GROUPS.find(function (group) {
      return group.types.indexOf(type) !== -1;
    });
  }

  /** 取得指定大分類底下的子項目(依 GROUPS 設定的順序),對應到 CATEGORIES 的顯示資料 */
  function getCategoriesByGroup(groupKey) {
    var group = getGroupByKey(groupKey);
    if (!group) {
      return [];
    }
    return group.types
      .map(function (type) {
        return CATEGORIES.find(function (cat) {
          return cat.type === type;
        });
      })
      .filter(Boolean);
  }

  function getList(type) {
    var fileName = TYPE_FILE_MAP[type];
    if (!fileName) {
      return Promise.reject(new Error("未知的查詢類型:" + type));
    }
    return ns.dataService.fetchJson(fileName).then(function (list) {
      var merged = list;
      if (USER_ADDABLE_TYPES.indexOf(type) !== -1 && ns.userPoiService) {
        merged = ns.userPoiService.getAll(type).concat(list);
      }
      return merged.filter(function (item) {
        return getAdminStatus(type, item.id) !== "archived";
      });
    });
  }

  /** 後台專用:取得指定類型「全部」資料(含已下架),並附上 status 欄位 */
  function getAllForAdmin(type) {
    var fileName = TYPE_FILE_MAP[type];
    if (!fileName) {
      return Promise.reject(new Error("未知的查詢類型:" + type));
    }
    return ns.dataService.fetchJson(fileName).then(function (list) {
      var merged = list;
      if (USER_ADDABLE_TYPES.indexOf(type) !== -1 && ns.userPoiService) {
        merged = ns.userPoiService.getAll(type).concat(list);
      }
      return merged.map(function (item) {
        return Object.assign({}, item, {
          status: getAdminStatus(type, item.id),
          source: item.isUserCreated ? "ugc" : "official",
        });
      });
    });
  }

  function getById(type, id) {
    return getList(type).then(function (list) {
      return list.find(function (item) {
        return item.id === id;
      });
    });
  }

  /** 取得推薦專區用的熱門景點(首頁「推薦專區-熱門景點」) */
  function getHotAttractions(limit) {
    return getList("attractions").then(function (list) {
      var hot = list.filter(function (item) {
        return item.isHot;
      });
      return typeof limit === "number" ? hot.slice(0, limit) : hot;
    });
  }

  /** 取得推薦專區用的推薦美食(首頁「推薦專區-推薦美食」) */
  function getRecommendedFood(limit) {
    return getList("shops").then(function (list) {
      var food = list.filter(function (item) {
        return item.isFood;
      });
      return typeof limit === "number" ? food.slice(0, limit) : food;
    });
  }

  ns.poiService = {
    CATEGORIES: CATEGORIES,
    GROUPS: GROUPS,
    USER_ADDABLE_TYPES: USER_ADDABLE_TYPES,
    getList: getList,
    getById: getById,
    getAllForAdmin: getAllForAdmin,
    getAdminStatus: getAdminStatus,
    setAdminStatus: setAdminStatus,
    getTypeLabel: getTypeLabel,
    getGroupByKey: getGroupByKey,
    getGroupByType: getGroupByType,
    getCategoriesByGroup: getCategoriesByGroup,
    getHotAttractions: getHotAttractions,
    getRecommendedFood: getRecommendedFood,
  };
})(window.FunJia);

/**
 * itinerary-service.js
 * 「Fun 嘉」推薦行程服務層:平台策展的推薦行程內容來自 itineraries.json,
 * 使用者的收藏與留言則先以 localStorage 模擬(單機示範),
 * 未來如需多人真正同步,需改接後端帳號系統與資料庫。
 */

window.FunJia = window.FunJia || {};

(function (ns) {
  "use strict";

  var FAVORITES_KEY = "funjia_itinerary_favorites"; // { [id]: true }
  var COMMENTS_KEY = "funjia_itinerary_comments"; // { [id]: [{id,name,text,date}] }
  var REMOVED_COMMENTS_KEY = "funjia_itinerary_removed_comments"; // { [id]: [commentId,...] },後台移除官方範本內建留言用
  var OVERRIDES_KEY = "funjia_admin_itinerary_overrides"; // { [id]: {status?, days?, summary?, stops?, ...} },後台編輯官方範本用
  var CUSTOM_KEY = "funjia_admin_itinerary_custom"; // [{...後台新增的範本,含 id/status}]

  function readStore(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || {};
    } catch (e) {
      return {};
    }
  }

  function writeStore(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function readList(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch (e) {
      return [];
    }
  }

  function writeList(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function isFavorited(id) {
    var favorites = readStore(FAVORITES_KEY);
    return !!favorites[id];
  }

  function toggleFavorite(id) {
    var favorites = readStore(FAVORITES_KEY);
    favorites[id] = !favorites[id];
    writeStore(FAVORITES_KEY, favorites);
    return favorites[id];
  }

  function getLocalComments(id) {
    var all = readStore(COMMENTS_KEY);
    return all[id] || [];
  }

  function addComment(id, name, text, images) {
    var all = readStore(COMMENTS_KEY);
    var list = all[id] || [];
    var comment = {
      id: "local-" + Date.now(),
      name: name || "匿名旅人",
      text: text,
      date: new Date().toISOString().slice(0, 10),
      images: (images || []).slice(0, 2),
    };
    list.push(comment);
    all[id] = list;
    writeStore(COMMENTS_KEY, all);
    return comment;
  }

  /** 後台專用:取得「全部」推薦行程範本(含草稿/下架、後台編輯覆蓋與新增的自訂範本) */
  function getAllTemplatesForAdmin() {
    return ns.dataService.fetchJson("itineraries.json").then(function (list) {
      var overrides = readStore(OVERRIDES_KEY);
      var seed = list.map(function (item) {
        var override = overrides[item.id];
        var merged = override ? Object.assign({}, item, override) : Object.assign({}, item);
        merged.status = merged.status || "published";
        merged.isCustom = false;
        return merged;
      });
      var custom = readList(CUSTOM_KEY);
      return seed.concat(custom);
    });
  }

  /** 後台專用:設定範本上架狀態("draft" | "published" | "archived") */
  function setTemplateStatus(id, status) {
    var custom = readList(CUSTOM_KEY);
    var index = custom.findIndex(function (item) {
      return item.id === id;
    });
    if (index !== -1) {
      custom[index].status = status;
      writeList(CUSTOM_KEY, custom);
      return;
    }
    var overrides = readStore(OVERRIDES_KEY);
    overrides[id] = Object.assign({}, overrides[id], { status: status });
    writeStore(OVERRIDES_KEY, overrides);
  }

  /** 後台專用:編輯官方範本(標題/天數/簡介/站點/減碳量/點數等) */
  function saveTemplateOverride(id, patch) {
    var overrides = readStore(OVERRIDES_KEY);
    overrides[id] = Object.assign({}, overrides[id], patch);
    writeStore(OVERRIDES_KEY, overrides);
  }

  /** 後台專用:新增自訂推薦行程範本,預設為草稿 */
  function addCustomTemplate(data) {
    var custom = readList(CUSTOM_KEY);
    var item = Object.assign(
      {
        id: "custom-" + Date.now(),
        title: "未命名行程",
        days: 1,
        image: "landmark",
        summary: "",
        stops: [],
        carbonSavedKg: 0,
        pointsEarned: 0,
        baseFavorites: 0,
        comments: [],
        status: "draft",
        isCustom: true,
      },
      data
    );
    custom.push(item);
    writeList(CUSTOM_KEY, custom);
    return item;
  }

  /** 後台專用:編輯自訂範本 */
  function updateCustomTemplate(id, patch) {
    var custom = readList(CUSTOM_KEY);
    var index = custom.findIndex(function (item) {
      return item.id === id;
    });
    if (index === -1) return null;
    custom[index] = Object.assign({}, custom[index], patch);
    writeList(CUSTOM_KEY, custom);
    return custom[index];
  }

  /** 後台專用:刪除留言(官方範本內建留言僅隱藏,使用者現場留言則直接刪除) */
  function removeComment(itinId, commentId) {
    if (String(commentId).indexOf("local-") === 0) {
      var all = readStore(COMMENTS_KEY);
      all[itinId] = (all[itinId] || []).filter(function (c) {
        return c.id !== commentId;
      });
      writeStore(COMMENTS_KEY, all);
      return;
    }
    var removed = readStore(REMOVED_COMMENTS_KEY);
    removed[itinId] = (removed[itinId] || []).concat([commentId]);
    writeStore(REMOVED_COMMENTS_KEY, removed);
  }

  /** 取得所有「已上架」推薦行程(前台顯示用),附上目前收藏數與是否已收藏 */
  function getItineraries() {
    return getAllTemplatesForAdmin().then(function (list) {
      return list
        .filter(function (item) {
          return item.status === "published";
        })
        .map(decorate);
    });
  }

  function getItineraryById(id) {
    return getAllTemplatesForAdmin().then(function (list) {
      var item = list.find(function (item) {
        return item.id === id;
      });
      return item ? decorate(item) : null;
    });
  }

  function decorate(item) {
    var favorited = isFavorited(item.id);
    var localComments = getLocalComments(item.id);
    var removedIds = readStore(REMOVED_COMMENTS_KEY)[item.id] || [];
    var baseComments = (item.comments || []).filter(function (c) {
      return removedIds.indexOf(c.id) === -1;
    });
    return Object.assign({}, item, {
      isFavorited: favorited,
      favoriteCount: item.baseFavorites + (favorited ? 1 : 0),
      comments: baseComments.concat(localComments),
    });
  }

  ns.itineraryService = {
    getItineraries: getItineraries,
    getItineraryById: getItineraryById,
    toggleFavorite: toggleFavorite,
    addComment: addComment,
    removeComment: removeComment,
    getAllTemplatesForAdmin: getAllTemplatesForAdmin,
    setTemplateStatus: setTemplateStatus,
    saveTemplateOverride: saveTemplateOverride,
    addCustomTemplate: addCustomTemplate,
    updateCustomTemplate: updateCustomTemplate,
  };
})(window.FunJia);

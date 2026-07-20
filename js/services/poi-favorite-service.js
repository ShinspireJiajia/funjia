/**
 * poi-favorite-service.js
 * 景點/店家/住宿(POI)收藏服務層:demo 階段以 localStorage 模擬,
 * 供快選查詢結果卡片(poi-card-list.js)收藏,並於「揪團旅行 > Fun 嘉推薦 > 我收藏的景點」彙整顯示。
 */

window.FunJia = window.FunJia || {};

(function (ns) {
  "use strict";

  var STORAGE_KEY = "funjia_poi_favorites"; // { "type:id": true }
  var FAVORITABLE_TYPES = ["attractions", "shops", "lodging"];

  function readStore() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (e) {
      return {};
    }
  }

  function writeStore(value) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  }

  function key(type, id) {
    return type + ":" + id;
  }

  function isFavorited(type, id) {
    return !!readStore()[key(type, id)];
  }

  /** 切換收藏狀態,回傳切換後是否為已收藏 */
  function toggleFavorite(type, id) {
    var store = readStore();
    var k = key(type, id);
    if (store[k]) {
      delete store[k];
    } else {
      store[k] = true;
    }
    writeStore(store);
    return !!store[k];
  }

  /** 取得所有已收藏的景點/店家/住宿完整資料(依收藏時間新到舊排序) */
  function getFavoritedPois() {
    var store = readStore();
    var keys = Object.keys(store).reverse();
    if (!keys.length) return Promise.resolve([]);

    return Promise.all(
      FAVORITABLE_TYPES.map(function (type) {
        return ns.poiService.getList(type);
      })
    ).then(function (lists) {
      var byKey = {};
      FAVORITABLE_TYPES.forEach(function (type, i) {
        lists[i].forEach(function (item) {
          byKey[key(type, item.id)] = item;
        });
      });
      return keys
        .map(function (k) {
          return byKey[k];
        })
        .filter(Boolean);
    });
  }

  ns.poiFavoriteService = {
    FAVORITABLE_TYPES: FAVORITABLE_TYPES,
    isFavorited: isFavorited,
    toggleFavorite: toggleFavorite,
    getFavoritedPois: getFavoritedPois,
  };
})(window.FunJia);

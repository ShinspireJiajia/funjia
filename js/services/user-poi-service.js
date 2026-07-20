/**
 * user-poi-service.js
 * 使用者自建資料服務層(景點/店家/住宿/活動共用):demo 階段以 localStorage 保存
 * 使用者新增的資料,供 poi-service 併入對應分類清單一起顯示。
 * 正式上線需改為後端 API + 資料庫審核機制。
 */

window.FunJia = window.FunJia || {};

(function (ns) {
  "use strict";

  var STORAGE_KEY = "funjia_user_pois";
  var LEGACY_ATTRACTIONS_KEY = "funjia_user_attractions"; // 舊版僅支援景點自建時使用的儲存鍵

  var DEFAULT_IMAGE_BY_TYPE = {
    attractions: "landmark",
    shops: "food-market",
    lodging: "hotel-city",
    events: "music",
  };

  function readAll() {
    migrateLegacyAttractions();
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function writeAll(list) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  // 將舊版(僅景點)儲存的資料搬遷至新的共用儲存區,搬遷後即可移除舊資料,避免資料遺失
  function migrateLegacyAttractions() {
    var legacyRaw = localStorage.getItem(LEGACY_ATTRACTIONS_KEY);
    if (!legacyRaw) {
      return;
    }
    try {
      var legacyList = JSON.parse(legacyRaw) || [];
      var current = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current.concat(legacyList)));
    } catch (e) {
      // 舊資料格式異常則略過搬遷
    } finally {
      localStorage.removeItem(LEGACY_ATTRACTIONS_KEY);
    }
  }

  /**
   * 取得指定類型使用者自建的資料(依新增時間新到舊)
   * @param {string} type attractions | shops | lodging | events
   */
  function getAll(type) {
    return readAll()
      .filter(function (item) {
        return item.type === type;
      })
      .reverse();
  }

  /**
   * 新增一筆使用者自建資料
   * @param {string} type attractions | shops | lodging | events
   * @param {object} data {name, category, address, hours, phone, tags, description, photo, lat, lng, priceRange, startDate, endDate}
   * @returns {object} 新增後的完整資料物件
   */
  function add(type, data) {
    var list = readAll();
    var item = {
      id: "user-" + Date.now(),
      type: type,
      name: data.name,
      category: data.category || "使用者自建",
      address: data.address || "",
      hours: data.hours || "",
      phone: data.phone || "",
      tags: data.tags || [],
      description: data.description || "",
      photo: data.photo || "",
      image: DEFAULT_IMAGE_BY_TYPE[type] || "landmark",
      rating: null,
      isHot: false,
      isUserCreated: true,
      createdAt: new Date().toISOString(),
    };
    if (typeof data.lat === "number" && typeof data.lng === "number") {
      item.lat = data.lat;
      item.lng = data.lng;
    }
    if (type === "lodging" && data.priceRange) {
      item.priceRange = data.priceRange;
    }
    if (type === "events") {
      item.startDate = data.startDate || "";
      item.endDate = data.endDate || data.startDate || "";
    }
    if (type === "shops") {
      item.isFood = true;
    }
    list.push(item);
    writeAll(list);
    return item;
  }

  /** 刪除使用者自建的資料 */
  function remove(id) {
    var list = readAll().filter(function (item) {
      return item.id !== id;
    });
    writeAll(list);
  }

  ns.userPoiService = {
    getAll: getAll,
    add: add,
    remove: remove,
  };
})(window.FunJia);

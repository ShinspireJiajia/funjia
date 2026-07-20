/**
 * badge-service.js
 * 景點打卡任務服務層:提供徽章清單(data/badges.json)與 GPS 打卡邏輯,
 * 已解鎖徽章以 localStorage 儲存(demo 模擬,正式上線需改為後端帳號系統)。
 */

window.FunJia = window.FunJia || {};

(function (ns) {
  "use strict";

  var UNLOCKED_KEY = "funjia_unlocked_badges"; // [{id, date}]
  var EARTH_RADIUS_M = 6371000;

  function readUnlocked() {
    try {
      return JSON.parse(localStorage.getItem(UNLOCKED_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function writeUnlocked(list) {
    localStorage.setItem(UNLOCKED_KEY, JSON.stringify(list));
  }

  function toRad(deg) {
    return (deg * Math.PI) / 180;
  }

  /** 計算兩座標間距離(公尺,Haversine 公式) */
  function distanceMeters(lat1, lng1, lat2, lng2) {
    var dLat = toRad(lat2 - lat1);
    var dLng = toRad(lng2 - lng1);
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return EARTH_RADIUS_M * c;
  }

  function getBadges() {
    return ns.dataService.fetchJson("badges.json");
  }

  /** 取得徽章清單,並附上是否已解鎖與解鎖日期 */
  function getBadgesWithStatus() {
    return getBadges().then(function (list) {
      var unlocked = readUnlocked();
      return list.map(function (badge) {
        var record = unlocked.find(function (u) {
          return u.id === badge.id;
        });
        return Object.assign({}, badge, {
          isUnlocked: !!record,
          unlockedAt: record ? record.date : null,
        });
      });
    });
  }

  function unlock(badgeId) {
    var list = readUnlocked();
    if (list.some(function (u) { return u.id === badgeId; })) {
      return;
    }
    list.unshift({ id: badgeId, date: new Date().toISOString().slice(0, 10) });
    writeUnlocked(list);
  }

  /**
   * 嘗試打卡指定徽章:取得目前定位並比對景點座標與允許誤差半徑。
   * 回傳 Promise,成功時 resolve {badge, alreadyUnlocked, distance},
   * 失敗時 reject {reason: "unsupported"|"permission"|"too_far", badge, distance}
   */
  function checkIn(badgeId) {
    return getBadges().then(function (list) {
      var badge = list.find(function (b) { return b.id === badgeId; });
      if (!badge) {
        return Promise.reject({ reason: "not_found" });
      }
      if (readUnlocked().some(function (u) { return u.id === badgeId; })) {
        return Promise.resolve({ badge: badge, alreadyUnlocked: true, distance: 0 });
      }
      if (!navigator.geolocation) {
        return Promise.reject({ reason: "unsupported", badge: badge });
      }
      return new Promise(function (resolve, reject) {
        navigator.geolocation.getCurrentPosition(
          function (position) {
            var distance = distanceMeters(
              position.coords.latitude,
              position.coords.longitude,
              badge.lat,
              badge.lng
            );
            if (distance <= badge.radius) {
              unlock(badge.id);
              resolve({ badge: badge, alreadyUnlocked: false, distance: distance });
            } else {
              reject({ reason: "too_far", badge: badge, distance: distance });
            }
          },
          function () {
            reject({ reason: "permission", badge: badge });
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
      });
    });
  }

  ns.badgeService = {
    getBadgesWithStatus: getBadgesWithStatus,
    checkIn: checkIn,
  };
})(window.FunJia);

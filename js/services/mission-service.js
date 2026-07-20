/**
 * mission-service.js
 * 任務系統服務層(探索/文化/低碳任務):提供任務清單(data/missions.json)、
 * 依驗證方式(GPS/QR Code/問答/拍照/公共運輸回報)完成任務,並發放減碳點數與徽章
 * (與減碳錢包 wallet-service.js 共用同一套點數帳本,任務完成即計入減碳錢包餘額)。
 * 已完成任務以 localStorage 儲存(demo 模擬,正式上線需改為後端帳號系統)。
 */

window.FunJia = window.FunJia || {};

(function (ns) {
  "use strict";

  var DONE_KEY = "funjia_completed_missions"; // [{id, date}]
  var EARTH_RADIUS_M = 6371000;

  function readDone() {
    try {
      return JSON.parse(localStorage.getItem(DONE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function writeDone(list) {
    localStorage.setItem(DONE_KEY, JSON.stringify(list));
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

  function isWithinPeriod(mission) {
    var today = new Date().toISOString().slice(0, 10);
    if (mission.startDate && today < mission.startDate) {
      return false;
    }
    if (mission.endDate && today > mission.endDate) {
      return false;
    }
    return true;
  }

  function getMissions() {
    return ns.dataService.fetchJson("missions.json");
  }

  /** 取得任務清單,並附上是否已完成、完成日期與是否在任務期間內 */
  function getMissionsWithStatus() {
    return getMissions().then(function (list) {
      var done = readDone();
      return list.map(function (mission) {
        var record = done.find(function (d) {
          return d.id === mission.id;
        });
        return Object.assign({}, mission, {
          isDone: !!record,
          doneAt: record ? record.date : null,
          isActive: isWithinPeriod(mission),
        });
      });
    });
  }

  function complete(mission) {
    var list = readDone();
    if (list.some(function (d) { return d.id === mission.id; })) {
      return;
    }
    list.unshift({ id: mission.id, date: new Date().toISOString().slice(0, 10) });
    writeDone(list);
    if (mission.reward && mission.reward.points) {
      ns.walletService.addPoints(mission.reward.points, "完成任務:" + mission.title);
    }
  }

  /** GPS 定位打卡驗證,回傳 Promise,失敗時 reject {reason} */
  function verifyGps(mission) {
    var config = mission.verifyConfig || {};
    if (!navigator.geolocation) {
      return Promise.reject({ reason: "unsupported" });
    }
    return new Promise(function (resolve, reject) {
      navigator.geolocation.getCurrentPosition(
        function (position) {
          var distance = distanceMeters(
            position.coords.latitude,
            position.coords.longitude,
            config.lat,
            config.lng
          );
          if (distance <= config.radius) {
            resolve();
          } else {
            reject({ reason: "too_far", distance: distance, radius: config.radius });
          }
        },
        function () {
          reject({ reason: "permission" });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }

  /** QR Code / 店家核銷代碼驗證 */
  function verifyQrcode(mission, inputCode) {
    var config = mission.verifyConfig || {};
    var normalized = (inputCode || "").trim().toUpperCase();
    if (normalized && normalized === (config.code || "").toUpperCase()) {
      return Promise.resolve();
    }
    return Promise.reject({ reason: "wrong_code" });
  }

  /** 問答驗證,answers 為使用者選擇的選項索引陣列,需全部正確才算完成 */
  function verifyQuiz(mission, answers) {
    var questions = (mission.verifyConfig || {}).questions || [];
    var allCorrect = questions.every(function (question, index) {
      return answers[index] === question.answerIndex;
    });
    return allCorrect ? Promise.resolve() : Promise.reject({ reason: "wrong_answer" });
  }

  /** 拍照驗證(demo 階段有上傳檔案即視為完成) */
  function verifyPhoto(mission, hasFile) {
    return hasFile ? Promise.resolve() : Promise.reject({ reason: "no_photo" });
  }

  /** 公共運輸紀錄回報驗證(demo 階段由使用者自主回報確認) */
  function verifyTransit(mission, confirmed) {
    return confirmed ? Promise.resolve() : Promise.reject({ reason: "not_confirmed" });
  }

  ns.missionService = {
    getMissionsWithStatus: getMissionsWithStatus,
    complete: complete,
    verifyGps: verifyGps,
    verifyQrcode: verifyQrcode,
    verifyQuiz: verifyQuiz,
    verifyPhoto: verifyPhoto,
    verifyTransit: verifyTransit,
  };
})(window.FunJia);

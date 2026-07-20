/**
 * route-service.js
 * 路線規劃頁(pages/route-plan.html)資料服務層:依起訖點座標推算距離,
 * 產生模擬的步行/公車轉乘路線(車資、時間、站數)。
 * demo 階段以距離推算模擬結果,未來可替換為 TDX 大眾運輸路線規劃 API。
 */

window.FunJia = window.FunJia || {};

(function (ns) {
  "use strict";

  var BUS_SPEED_KMH = 22;
  var WALK_SPEED_KMH = 4.5;
  var BASE_FARE = 15;
  var FARE_PER_KM = 3.5;
  var LONG_TRIP_KM = 40; // 超過此距離模擬為需轉乘一次的長程路線

  function toRad(deg) {
    return (deg * Math.PI) / 180;
  }

  /** 計算兩座標間的直線距離(公里,Haversine 公式) */
  function distanceKm(a, b) {
    var R = 6371;
    var dLat = toRad(b.lat - a.lat);
    var dLng = toRad(b.lng - a.lng);
    var lat1 = toRad(a.lat);
    var lat2 = toRad(b.lat);
    var h =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  function minutesFor(km, speedKmh) {
    return Math.max(1, Math.round((km / speedKmh) * 60));
  }

  /**
   * @param {{lat:number,lng:number,name:string}} origin
   * @param {{lat:number,lng:number,name:string}} destination
   */
  function planRoute(origin, destination) {
    var totalKm = distanceKm(origin, destination);
    var legs = totalKm > LONG_TRIP_KM ? 2 : 1;
    var walkKm = Math.max(0.15, Math.min(0.6, totalKm * 0.08));
    var busKmTotal = Math.max(totalKm - walkKm * 2, 0.5);
    var perLegKm = busKmTotal / legs;

    var steps = [];
    steps.push({
      mode: "walk",
      label: "步行到最近站牌",
      km: walkKm,
      minutes: minutesFor(walkKm, WALK_SPEED_KMH),
    });

    for (var i = 0; i < legs; i++) {
      steps.push({
        mode: "bus",
        label: legs > 1 ? "公車 開往轉乘站" + (i + 1) : "公車 開往" + destination.name + "方向",
        km: perLegKm,
        minutes: minutesFor(perLegKm, BUS_SPEED_KMH),
        stops: Math.max(2, Math.round(perLegKm * 1.5)),
      });
      if (i < legs - 1) {
        steps.push({
          mode: "walk",
          label: "步行轉乘",
          km: 0.2,
          minutes: minutesFor(0.2, WALK_SPEED_KMH),
        });
      }
    }

    steps.push({
      mode: "walk",
      label: "步行抵達" + destination.name,
      km: walkKm,
      minutes: minutesFor(walkKm, WALK_SPEED_KMH),
    });

    var totalMinutes = steps.reduce(function (sum, s) {
      return sum + s.minutes;
    }, 0);
    var fare = Math.round(BASE_FARE + totalKm * FARE_PER_KM);

    return {
      distanceKm: totalKm,
      fare: fare,
      totalMinutes: totalMinutes,
      steps: steps,
    };
  }

  ns.routeService = {
    distanceKm: distanceKm,
    planRoute: planRoute,
  };
})(window.FunJia);

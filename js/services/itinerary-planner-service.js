/**
 * itinerary-planner-service.js
 * 智慧減碳排程演算法:依使用者選定的景點、天數(半日/一日/多日)與交通策略,
 * 加權計算景點間距離、停留時長、停車資源與食宿需求,產生分日行程建議,
 * 並估算相較於「全程自駕」基準所減少的碳排放量與可獲得的減碳點數。
 * demo 階段以規則式演算法模擬(距離用 Haversine 公式、交通/碳排係數為假設值),
 * 未來可替換為 TDX 運輸路網 API + 實際碳排係數資料庫。
 */

window.FunJia = window.FunJia || {};

(function (ns) {
  "use strict";

  var DAY_START_MIN = 9 * 60; // 每日行程自 09:00 開始
  var HALF_DAY_BUDGET_MIN = 240; // 半日:約 4 小時
  var FULL_DAY_BUDGET_MIN = 540; // 一日/多日單日:約 9 小時(09:00–18:00)
  var LUNCH_TRIGGER_MIN = 12 * 60; // 行程時鐘跨過中午即安排用餐
  var MEAL_MINUTES = 45;

  var SPEED_KMH = { walk: 4.5, bus: 22, transfer: 22, drive: 45 };
  // 碳排係數(公克 CO2 / 公里 / 人),demo 假設值:步行/單車零碳排,公車遠低於自駕
  var EMISSION_G_PER_KM = { walk: 0, bus: 25, transfer: 25, drive: 120 };
  var MOUNTAIN_TOWNS = ["阿里山鄉", "竹崎鄉", "番路鄉", "梅山鄉"];

  var DWELL_MINUTES_BY_CATEGORY = {
    自然風景: 150,
    生態園區: 150,
    鐵道文化: 120,
    文化園區: 90,
    海濱景點: 90,
    水庫風景: 90,
    地標景點: 60,
  };
  var DEFAULT_DWELL_MINUTES = 90;

  function toRad(deg) {
    return (deg * Math.PI) / 180;
  }

  /** 兩座標間直線距離(公里,Haversine 公式) */
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

  function estimateDwellMinutes(attraction) {
    return DWELL_MINUTES_BY_CATEGORY[attraction.category] || DEFAULT_DWELL_MINUTES;
  }

  function isMountainBound(poi) {
    var address = poi.address || "";
    return MOUNTAIN_TOWNS.some(function (town) {
      return address.indexOf(town) !== -1;
    });
  }

  function travelMinutes(mode, km) {
    return Math.max(1, Math.round((km / SPEED_KMH[mode]) * 60));
  }

  /** 依距離、景點屬性與交通策略決定該段行程的交通方式 */
  function legMode(fromPOI, toPOI, km, strategy) {
    if (km <= 1) {
      return "walk";
    }
    var enteringMountain = isMountainBound(toPOI) && !isMountainBound(fromPOI);
    if (strategy !== "drive" && enteringMountain) {
      return "transfer"; // 建議停車轉乘公車/小火車上山
    }
    if (strategy === "drive") {
      return "drive";
    }
    var busThreshold = strategy === "transit" ? 30 : 15;
    return km <= busThreshold ? "bus" : "drive";
  }

  /** 最近鄰建構 + 2-opt 局部改善,規劃景點造訪順序(第一個選定景點為起點錨點) */
  function orderStops(points) {
    if (points.length <= 2) {
      return points.slice();
    }
    var anchor = points[0];
    var rest = nearestNeighborOrder(anchor, points.slice(1));
    rest = twoOptImprove(anchor, rest);
    return [anchor].concat(rest);
  }

  function nearestNeighborOrder(start, points) {
    var remaining = points.slice();
    var order = [];
    var current = start;
    while (remaining.length) {
      var bestIndex = 0;
      var bestDist = Infinity;
      remaining.forEach(function (p, i) {
        var d = distanceKm(current, p);
        if (d < bestDist) {
          bestDist = d;
          bestIndex = i;
        }
      });
      var next = remaining.splice(bestIndex, 1)[0];
      order.push(next);
      current = next;
    }
    return order;
  }

  function routeLength(start, order) {
    var total = 0;
    var current = start;
    order.forEach(function (p) {
      total += distanceKm(current, p);
      current = p;
    });
    return total;
  }

  function twoOptImprove(start, order) {
    var best = order.slice();
    var bestLen = routeLength(start, best);
    var improved = true;
    var guard = 0;
    while (improved && guard < 200) {
      improved = false;
      guard++;
      for (var i = 0; i < best.length - 1; i++) {
        for (var j = i + 1; j < best.length; j++) {
          var candidate = best.slice(0, i).concat(best.slice(i, j + 1).reverse(), best.slice(j + 1));
          var candidateLen = routeLength(start, candidate);
          if (candidateLen < bestLen - 1e-9) {
            best = candidate;
            bestLen = candidateLen;
            improved = true;
          }
        }
      }
    }
    return best;
  }

  function findNearestPOI(list, anchorPoint, filterFn) {
    var candidates = filterFn ? list.filter(filterFn) : list;
    if (!candidates.length) {
      return null;
    }
    var best = null;
    var bestDist = Infinity;
    candidates.forEach(function (c) {
      var d = distanceKm(anchorPoint, c);
      if (d < bestDist) {
        bestDist = d;
        best = c;
      }
    });
    return best;
  }

  function findNearestParking(anchorPoint, allParking, preferLowCarbon) {
    if (preferLowCarbon) {
      var lowCarbon = findNearestPOI(allParking, anchorPoint, function (p) {
        return p.isLowCarbonTransfer;
      });
      if (lowCarbon) {
        return lowCarbon;
      }
    }
    return findNearestPOI(allParking, anchorPoint);
  }

  function createDay(index) {
    return {
      index: index,
      items: [],
      mealInserted: false,
      hasCarLeg: false,
      distanceKm: 0,
      minutes: 0,
      carbonG: 0,
    };
  }

  function buildTravelEvent(fromPoint, toPOI, strategy) {
    var km = distanceKm(fromPoint, toPOI);
    var mode = legMode(fromPoint, toPOI, km, strategy);
    var minutes = travelMinutes(mode, km);
    var carbonG = km * EMISSION_G_PER_KM[mode];
    return {
      kind: "travel",
      mode: mode,
      distanceKm: km,
      minutes: minutes,
      carbonG: carbonG,
      fromName: fromPoint.name,
      toName: toPOI.name,
    };
  }

  /**
   * @param {{attractionIds?:string[], points?:Object[], tripLength:'half'|'day'|'multi', days?:number, strategy:'transit'|'balanced'|'drive'}} options
   *   points 為自訂站點時,每個物件需含 {name, lat, lng, category?, address?};
   *   缺少 lat/lng 的站點無法排入動線,會回傳於結果的 unplaced 陣列。
   * @returns {Promise<Object|null>}
   */
  function planItinerary(options) {
    return Promise.all([
      ns.poiService.getList("attractions"),
      ns.poiService.getList("shops"),
      ns.poiService.getList("lodging"),
      ns.poiService.getList("parking"),
    ]).then(function (results) {
      var allAttractions = results[0];
      var allShops = results[1];
      var allLodging = results[2];
      var allParking = results[3];

      var unplaced = [];
      var selected;

      if (options.points) {
        selected = options.points.filter(function (p) {
          var hasCoords = typeof p.lat === "number" && typeof p.lng === "number";
          if (!hasCoords) unplaced.push(p);
          return hasCoords;
        });
      } else {
        selected = (options.attractionIds || [])
          .map(function (id) {
            return allAttractions.find(function (a) {
              return a.id === id;
            });
          })
          .filter(Boolean)
          .filter(function (a) {
            var hasCoords = typeof a.lat === "number" && typeof a.lng === "number";
            if (!hasCoords) unplaced.push(a);
            return hasCoords;
          });
      }

      if (!selected.length) {
        return null;
      }

      var strategy = options.strategy || "balanced";
      var maxDays = options.tripLength === "multi" ? Math.max(1, options.days || 2) : 1;
      var ordered = orderStops(selected);
      var usedShopIds = [];

      var dayBudget = options.tripLength === "half" ? HALF_DAY_BUDGET_MIN : FULL_DAY_BUDGET_MIN;
      if (options.tripLength === "multi" && maxDays > 1) {
        // 使用者指定的天數若明顯寬鬆於實際所需時間,需依總工作量平均分攤到各天,
        // 否則排程只在真的超出單日 9 小時上限才會分天,天數調整將對結果毫無影響。
        var roughTotalMin = estimateDwellMinutes(ordered[0]);
        for (var oi = 1; oi < ordered.length; oi++) {
          var legKm = distanceKm(ordered[oi - 1], ordered[oi]);
          var mode = legMode(ordered[oi - 1], ordered[oi], legKm, strategy);
          roughTotalMin += travelMinutes(mode, legKm) + estimateDwellMinutes(ordered[oi]);
        }
        dayBudget = Math.min(FULL_DAY_BUDGET_MIN, Math.max(HALF_DAY_BUDGET_MIN, Math.ceil(roughTotalMin / maxDays)));
      }

      // 即使時間預算尚未超過,只要景點數足夠攤到每一天,仍依站點數量強制分天,
      // 確保使用者指定的天數(進而住宿安排)不會因為單日就能排完而被忽略。
      var targetStopsPerDay =
        options.tripLength === "multi" && maxDays > 1 && ordered.length >= maxDays
          ? Math.ceil(ordered.length / maxDays)
          : Infinity;

      var days = [];
      var currentDay = createDay(1);
      var currentDayStopCount = 0;
      var clock = DAY_START_MIN;
      var prevPoint = null;

      function applyParking(day) {
        if (!day.hasCarLeg) {
          return;
        }
        var firstStop = day.items.filter(function (it) {
          return it.kind === "attraction";
        })[0];
        if (!firstStop) {
          return;
        }
        var preferLowCarbon = isMountainBound(firstStop.poi);
        var parking = findNearestParking(firstStop.poi, allParking, preferLowCarbon);
        if (parking) {
          day.items.unshift({
            kind: "parking",
            poi: parking,
            note: preferLowCarbon
              ? "建議於此停車,轉乘公車/小火車上山,減少山區自駕碳排"
              : "鄰近停車資訊,可供自駕停放",
          });
        }
      }

      function closeDayForSplit() {
        var attractionItems = currentDay.items.filter(function (it) {
          return it.kind === "attraction";
        });
        var lastStop = attractionItems[attractionItems.length - 1];
        var nextStartPoint = lastStop ? lastStop.poi : prevPoint;

        if (lastStop) {
          var lodge = findNearestPOI(allLodging, lastStop.poi);
          if (lodge) {
            currentDay.items.push({ kind: "lodging", poi: lodge });
            nextStartPoint = lodge;
          }
        }
        applyParking(currentDay);
        days.push(currentDay);
        currentDay = createDay(days.length + 1);
        currentDayStopCount = 0;
        clock = DAY_START_MIN;
        return nextStartPoint;
      }

      ordered.forEach(function (poi, idx) {
        var travelEvent = null;

        if (idx > 0) {
          travelEvent = buildTravelEvent(prevPoint, poi, strategy);
          var addedMinutes = travelEvent.minutes + estimateDwellMinutes(poi);
          var timeOverflow = clock - DAY_START_MIN + addedMinutes > dayBudget;
          var countOverflow = currentDayStopCount >= targetStopsPerDay;
          if ((timeOverflow || countOverflow) && days.length + 1 < maxDays) {
            prevPoint = closeDayForSplit();
            travelEvent = buildTravelEvent(prevPoint, poi, strategy);
          }
        }

        if (travelEvent) {
          travelEvent.arrivalMin = clock;
          clock += travelEvent.minutes;
          travelEvent.departureMin = clock;
          currentDay.items.push(travelEvent);
          currentDay.distanceKm += travelEvent.distanceKm;
          currentDay.minutes += travelEvent.minutes;
          currentDay.carbonG += travelEvent.carbonG;
          if (travelEvent.mode === "drive" || travelEvent.mode === "transfer") {
            currentDay.hasCarLeg = true;
          }
        }

        var dwell = estimateDwellMinutes(poi);
        var stopEvent = { kind: "attraction", poi: poi, arrivalMin: clock, dwellMinutes: dwell };
        clock += dwell;
        stopEvent.departureMin = clock;
        currentDay.items.push(stopEvent);
        currentDay.minutes += dwell;
        currentDayStopCount++;

        if (!currentDay.mealInserted && clock > LUNCH_TRIGGER_MIN) {
          var mealShop = findNearestPOI(allShops, poi, function (s) {
            return s.isFood && usedShopIds.indexOf(s.id) === -1;
          });
          if (mealShop) {
            usedShopIds.push(mealShop.id);
            var mealEvent = { kind: "meal", poi: mealShop, arrivalMin: clock, dwellMinutes: MEAL_MINUTES };
            clock += MEAL_MINUTES;
            mealEvent.departureMin = clock;
            currentDay.items.push(mealEvent);
            currentDay.minutes += MEAL_MINUTES;
          }
          currentDay.mealInserted = true;
        }

        prevPoint = poi;
      });

      applyParking(currentDay);
      days.push(currentDay);

      var totalDistanceKm = 0;
      var totalMinutes = 0;
      var totalCarbonG = 0;
      days.forEach(function (day) {
        totalDistanceKm += day.distanceKm;
        totalMinutes += day.minutes;
        totalCarbonG += day.carbonG;
      });

      var baselineCarbonG = totalDistanceKm * EMISSION_G_PER_KM.drive;
      var carbonSavedG = Math.max(0, baselineCarbonG - totalCarbonG);
      var pointsEarned = Math.floor(carbonSavedG / 100); // 100 公克 CO2 減碳量 = 1 點

      return {
        days: days,
        totalDistanceKm: totalDistanceKm,
        totalMinutes: totalMinutes,
        totalCarbonG: totalCarbonG,
        baselineCarbonG: baselineCarbonG,
        carbonSavedG: carbonSavedG,
        pointsEarned: pointsEarned,
        unplaced: unplaced,
      };
    });
  }

  ns.itineraryPlannerService = {
    planItinerary: planItinerary,
  };
})(window.FunJia);

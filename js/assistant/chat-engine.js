/**
 * chat-engine.js
 * AI 語音助理的對話邏輯(demo 階段以關鍵字規則模擬 LLM 回覆)。
 * 具備簡單的前後文記憶(context.lastLocationId),並示範「情境感知救援」提問流程。
 * 正式版建議將 matchIntent/buildReply 替換為呼叫後端 LLM proxy(勿把金鑰放在前端)。
 */

window.FunJia = window.FunJia || {};

(function (ns) {
  "use strict";

  var LOCATION_ALIASES = {
    "太保": "taibao",
    taibao: "taibao",
    "阿里山": "alishan",
    alishan: "alishan",
    アリサン: "alishan",
    아리산: "alishan",
    "嘉義市": "chiayi-city",
    "嘉義": "chiayi-city",
    chiayi: "chiayi-city",
    "東石": "dongshi",
    dongshi: "dongshi",
    "布袋": "budai",
    budai: "budai",
    "民雄": "minsyong",
    minsyong: "minsyong",
    "大埔": "dapu",
    dapu: "dapu",
  };

  var KEYWORDS = {
    toilet: ["廁所", "洗手間", "restroom", "toilet", "トイレ", "화장실"],
    weather: ["幾度", "氣溫", "天氣", "temperature", "weather", "気温", "天気", "기온", "날씨"],
    distance: ["多遠", "還有多遠", "多久", "距離", "how far", "distance", "どれくらい", "얼마나"],
  };

  function findLocationId(text) {
    var lower = text.toLowerCase();
    for (var alias in LOCATION_ALIASES) {
      if (lower.indexOf(alias.toLowerCase()) !== -1) {
        return LOCATION_ALIASES[alias];
      }
    }
    return null;
  }

  function matchesAny(text, list) {
    var lower = text.toLowerCase();
    return list.some(function (kw) {
      return lower.indexOf(kw.toLowerCase()) !== -1;
    });
  }

  /**
   * @param {string} text 使用者輸入(文字或語音辨識結果)
   * @param {object} context { lastLocationId } 用於模擬前後文記憶
   * @returns {Promise<{text: string, actions?: Array}>}
   */
  function reply(text, context) {
    var mentionedLocationId = findLocationId(text);

    if (matchesAny(text, KEYWORDS.toilet)) {
      return Promise.resolve({ text: toiletReply() });
    }

    if (matchesAny(text, KEYWORDS.weather)) {
      var locationId = mentionedLocationId || context.lastLocationId || "chiayi-city";
      context.lastLocationId = locationId;
      return ns.weatherService.getLocationWeather(locationId).then(function (loc) {
        return { text: weatherReply(loc) };
      });
    }

    if (matchesAny(text, KEYWORDS.distance)) {
      return Promise.resolve({ text: distanceReply() });
    }

    if (mentionedLocationId) {
      context.lastLocationId = mentionedLocationId;
    }

    return Promise.resolve({ text: fallbackReply() });
  }

  /** 情境感知救援:模擬行程大延遲時,助理主動提出的建議(由畫面上的示範按鈕觸發) */
  function delayScenario() {
    return {
      text: delayReply(),
      actions: [
        { label: actionLabel("yes"), value: "yes" },
        { label: actionLabel("no"), value: "no" },
      ],
    };
  }

  function handleDelayAction(value) {
    return value === "yes" ? delayConfirmReroute() : delayKeepPlan();
  }

  /* -------- 依語言回覆內容(示範用簡化多語系內容) -------- */
  function lang() {
    return ns.i18n.getCurrentLang();
  }

  function toiletReply() {
    var map = {
      "zh-TW": "已為您找到最近的洗手間:觸口遊客中心公共廁所,距離約 350 公尺,是否需要導航前往?",
      en: "Nearest restroom found: Chukou Visitor Center public restroom, about 350m away. Want directions?",
      ja: "最寄りのトイレが見つかりました:觸口ビジターセンターの公共トイレ、約350m先です。案内しますか?",
      ko: "가장 가까운 화장실을 찾았습니다: 촉구 방문자센터 공용화장실, 약 350m 거리입니다. 길안내가 필요하신가요?",
    };
    return map[lang()] || map["zh-TW"];
  }

  function weatherReply(loc) {
    if (!loc) {
      var notFound = {
        "zh-TW": "抱歉,目前查無這個地點的天氣資訊。",
        en: "Sorry, I couldn't find weather data for that location.",
        ja: "申し訳ありませんが、その地点の天気情報が見つかりませんでした。",
        ko: "죄송합니다. 해당 지역의 날씨 정보를 찾을 수 없습니다.",
      };
      return notFound[lang()] || notFound["zh-TW"];
    }
    var map = {
      "zh-TW": loc.locationName + "現在氣溫 " + loc.temperature + "°C," + loc.weatherDesc + ",降雨機率 " + loc.pop + "%。",
      en: loc.locationName + " is currently " + loc.temperature + "°C, " + loc.weatherDesc + ", " + loc.pop + "% chance of rain.",
      ja: loc.locationName + "の現在の気温は" + loc.temperature + "℃、" + loc.weatherDesc + "、降水確率" + loc.pop + "%です。",
      ko: loc.locationName + "의 현재 기온은 " + loc.temperature + "°C, " + loc.weatherDesc + ", 강수 확률 " + loc.pop + "%입니다.",
    };
    return map[lang()] || map["zh-TW"];
  }

  function distanceReply() {
    var map = {
      "zh-TW": "距離下一個景點約 12 公里,依目前路況預計 18 分鐘車程。",
      en: "About 12 km to the next attraction — roughly 18 minutes given current traffic.",
      ja: "次の観光地まで約12km、現在の道路状況で約18分の道のりです。",
      ko: "다음 관광지까지 약 12km, 현재 교통 상황으로 약 18분 소요됩니다.",
    };
    return map[lang()] || map["zh-TW"];
  }

  function delayReply() {
    var map = {
      "zh-TW": "您目前的車程比預期晚了 40 分鐘,要幫您取消下一個景點,直接導航去預訂的餐廳嗎?",
      en: "You're running about 40 minutes behind schedule. Want me to skip the next attraction and navigate straight to your reserved restaurant?",
      ja: "現在の走行は予定より40分遅れています。次の観光地をキャンセルして予約したレストランへ直接案内しますか?",
      ko: "현재 일정보다 40분 지연되고 있습니다. 다음 관광지를 건너뛰고 예약한 식당으로 바로 안내할까요?",
    };
    return map[lang()] || map["zh-TW"];
  }

  function delayConfirmReroute() {
    var map = {
      "zh-TW": "好的,已為您規劃前往餐廳的路線,預計 25 分鐘後抵達。",
      en: "Got it — route to the restaurant is set, arriving in about 25 minutes.",
      ja: "了解しました。レストランまでのルートを設定しました。到着まで約25分です。",
      ko: "알겠습니다. 식당으로 가는 경로를 설정했습니다. 약 25분 후 도착 예정입니다.",
    };
    return map[lang()] || map["zh-TW"];
  }

  function delayKeepPlan() {
    var map = {
      "zh-TW": "好的,將維持原訂行程,請留意時間安排。",
      en: "Okay, keeping the original plan — please keep an eye on the time.",
      ja: "了解しました。予定通りの行程を維持します。時間にご注意ください。",
      ko: "알겠습니다. 원래 일정을 유지합니다. 시간에 유의해 주세요.",
    };
    return map[lang()] || map["zh-TW"];
  }

  function fallbackReply() {
    var map = {
      "zh-TW": "您好,我是 Fun 嘉語音助理,您可以問我天氣、路程距離、周邊設施等問題(此為原型示範,尚未串接真實 LLM)。",
      en: "Hi, I'm the Fun Jia assistant. Ask me about weather, distance, or nearby facilities (this is a prototype, not yet connected to a real LLM).",
      ja: "こんにちは、Fun 嘉アシスタントです。天気、距離、周辺施設について質問できます(本デモはまだ実際のLLMに接続していません)。",
      ko: "안녕하세요, Fun 嘉 어시스턴트입니다. 날씨, 거리, 주변 시설에 대해 물어보세요 (본 프로토타입은 아직 실제 LLM에 연결되지 않았습니다).",
    };
    return map[lang()] || map["zh-TW"];
  }

  function actionLabel(type) {
    var map = {
      "zh-TW": { yes: "是,幫我導航去餐廳", no: "否,維持原行程" },
      en: { yes: "Yes, navigate to the restaurant", no: "No, keep the plan" },
      ja: { yes: "はい、レストランへ案内して", no: "いいえ、予定を維持" },
      ko: { yes: "네, 식당으로 안내해주세요", no: "아니요, 일정 유지" },
    };
    return (map[lang()] || map["zh-TW"])[type];
  }

  ns.chatEngine = {
    reply: reply,
    delayScenario: delayScenario,
    handleDelayAction: handleDelayAction,
  };
})(window.FunJia);

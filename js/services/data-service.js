/**
 * data-service.js
 * 通用資料存取工具:目前讀取本地 mock JSON,未來要換成真實 API
 * (中央氣象署 / TDX 運輸資料流通服務 / 嘉義市開放資料平台)時,
 * 只需修改這裡的 fetch 網址與回應轉換邏輯,呼叫端(各 service)不需更動。
 *
 * 注意:直接用瀏覽器開啟 index.html(file://)會因 CORS 限制導致 fetch 本地 JSON 失敗,
 * 請透過本地伺服器(例如 VS Code Live Server、`npx serve`、`python -m http.server`)開啟。
 */

window.FunJia = window.FunJia || {};

(function (ns) {
  "use strict";

  var DATA_BASE_PATH = "../data/"; // 各功能頁面皆位於 pages/ 目錄下,故資料路徑皆為上一層的 data/
  var cache = {};

  /**
   * 讀取 data/ 目錄下的 JSON 檔案(附簡單快取,避免同一頁面重複請求)
   * @param {string} fileName 例如 "attractions.json"
   * @returns {Promise<any>}
   */
  function fetchJson(fileName) {
    if (cache[fileName]) {
      return Promise.resolve(cache[fileName]);
    }
    return fetch(DATA_BASE_PATH + fileName)
      .then(function (res) {
        if (!res.ok) {
          throw new Error("資料讀取失敗:" + fileName);
        }
        return res.json();
      })
      .then(function (json) {
        cache[fileName] = json;
        return json;
      });
  }

  ns.dataService = {
    fetchJson: fetchJson,
  };
})(window.FunJia);

const APPS = ["1443988620", "1442620678", "281796108", "324684580"];
const FLAGS = new Map([["CN", "🇨🇳"], ["HK", "🇭🇰"], ["US", "🇺🇸"]]);
const FIELD = "app_monitor";
let MONITOR = {};
let NOTICE = [];

function loadMonitor() {
    let stored = $prefs.valueForKey(FIELD);
    if (stored) {
        MONITOR = JSON.parse(stored);
    }
}

function storeMonitor() {
    $prefs.setValueForKey(JSON.stringify(MONITOR), FIELD);
}

function flag(country) {
    return FLAGS.get(country.toUpperCase());
}

function notify() {
    let notice = NOTICE.join("\n");
    console.log(notice);
    $notify("APP监控", "", notice);
}

function genRequest(appId, country = "us") {
    return {
        url: `https://itunes.apple.com/lookup?id=${appId}&country=${country}`,
        method: "post"
    };
}

function dealResponse(appId, res) {
    let statusCode = res.statusCode;
    if (statusCode != 200) throw `App(${appId}): status code ${statusCode}.`;
    
    let result = (JSON.parse(res.body).results)[0];
    if (!result) throw `App(${appId}): not found.`;
    
    let trackId = result.trackId;
    let app = {
        trackName: result.trackName,
        version: result.version,
        country: (result.trackViewUrl.match(/^https:\/\/apps.apple.com\/([a-zA-Z]+)\/app/))[1]
    };

    let existed = MONITOR[trackId];
    if (!existed) {
        MONITOR[trackId] = app;
        NOTICE.push(`${flag(app.country)}${app.trackName}:版本【${app.version}】`);
    } else if (existed.version != app.version) {
        MONITOR[trackId] = app;
        NOTICE.push(`${flag(app.country)}${app.trackName}:升级【${app.version}】`);
    }
}

(async function main() {
    loadMonitor();
    await Promise.all(APPS.map(appId => $task.fetch(genRequest(appId)).then(res => dealResponse(appId, res)).catch(err => console.log(err))));
    if (NOTICE.length > 0) {
        storeMonitor();
        notify();
    } else {
        console.log("版本没有变化");
    }
    $done();
})();

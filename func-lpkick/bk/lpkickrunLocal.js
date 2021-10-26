const storeTypes = require(`./storeType.json`);

const req = {};
//regexp = new RegExp('ＵＲＬ：.*') 
req.targetUrl = 'https://t.livepocket.jp/e/wakkuru0211/';
//regexp = new RegExp('チケット：.*') 
req.targetName = '１部前売チケット整理番号券';
//regexp = new RegExp('枚数：.*') 
req.targetNumber = '2';
//regexp = new RegExp('コンビニ種別：.*') 
const storeType = 'ローソン';
req.storeTypeId = storeTypes.filter((x)=>x.name === storeType)[0].code;
//regexp = new RegExp('開始時間：.*') 
req.startTime = '2021-02-10 21:30';
//regexp = new RegExp('ユーザー：.*') 
req.confUser = 'kisyan3333@gmail.com';
//regexp = new RegExp('pw：.*') 
req.confPass = '6yjAWLhCxVT2';
//regexp = new RegExp('稼働：.*') 
const runType = '本番';
if (runType === '本番') {
  req.isTest = false;
} else {
  req.isTest = true;
}
//req.isBrowse = true;
//regexp = new RegExp('通知先：.*') 
req.toMail = 'trigger@applet.ifttt.com';
req.notCheckOnly = true;

console.log(JSON.stringify(req));
require('./lpkick.js')(req);


/* メール例
lpkick run

url：https://t.livepocket.jp/e/nagoya_reny0126
チケット：通常チケット整理番号券
枚数：1
コンビニ種別：ファミリーマート
開始時間：2021-01-04 10:00
ユーザー：kisyan3333@gmail.com
pw：aaaaa
稼働：テスト
通知先：ytsys3993@gmail.com
*/
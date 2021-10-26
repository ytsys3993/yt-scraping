const storeTypes = require(`./storeType.json`);

const req = {};
//regexp = new RegExp('ＵＲＬ：.*') 
req.targetUrl = 'https://t.livepocket.jp/e/dr6-v/';
// req.targetUrl = 'https://t.livepocket.jp/e/c3sia/';
//regexp = new RegExp('チケット：.*') 
req.targetName = 'aa';
//regexp = new RegExp('枚数：.*') 
req.targetNumber = '1';
//regexp = new RegExp('コンビニ種別：.*') 
const storeType = 'ローソン';
req.storeTypeId = storeTypes.filter((x)=>x.name === storeType)[0].code;
//regexp = new RegExp('開始時間：.*') 
req.startTime = '2021-01-30 12:00';
//regexp = new RegExp('ユーザー：.*') 
req.confUser = 'sugachan.tectec@gmail.com';
//regexp = new RegExp('pw：.*') 
req.confPass = '6yjAWLhCxVT2';
//regexp = new RegExp('稼働：.*') 
const runType = 'テスト';
if (runType === '本番') {
  req.isTest = false;
} else {
  req.isTest = true;
}
req.isBrowse = true;
//regexp = new RegExp('通知先：.*') 
req.toMail = 'trigger@applet.ifttt.com';
req.notCheckOnly = true;
req.isStage = true;
req.targetTicket = '.table #ticket-346203',
// req.priority = 'B9,B11,B7,C10,C8,C12,D9,D11,D7,B13,B5,C6,C14,D13,D5'
req.priority = 'F13,G11'
console.log(JSON.stringify(req));
require('./lpkick9.js')(req);


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
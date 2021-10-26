const Log4js = require("log4js");
const logger = Log4js.getLogger("system");
const inbox = require('inbox');
const simpleParser = require('mailparser').simpleParser;
const iconv = require('iconv');
const conv = new iconv.Iconv("ISO-2022-JP", "UTF-8");
const taskList = require(`./lptasklist.json`);
let taskListS = [];
const {
  fromMail,
  fromMailPass,
} = require(`./mailconfig.json`);
const storeTypes = require(`./storeType.json`);
const statusSendMail = require('./sendmail');
const fs = require('fs');

/*Gmailへの接続情報をセット*/
var client = inbox.createConnection(false, "imap.gmail.com", {
    secureConnection: true,
    auth: {
      user: fromMail,
      pass: fromMailPass
    }
  });

/*Gmailに接続成功時に呼ばれる*/
client.on("connect", function() {
    client.openMailbox("INBOX", function(error, info) {
      if(error) throw error;
      console.log("Wait for LP (Successfully connected to server)");
    });
  });

client.on("new", function(message) {
    var stream = client.createMessageStream(message.UID);
    var from = message.from.address
    simpleParser(stream)
        .then(mail => { 
            lpjsonWrite(mail, from);
        })
        .catch(err => {
            logger.info(err);
        });
});

/* Gmailへの接続を試みる */
client.connect(); 

async function lpjsonWrite (mail, from) {

  console.log("mail post start(lp)");
  // 本文取得
  // var body = conv.convert(mail.text).toString();
  var body = mail.text;

  // 本文チェック
  let regexp_run = new RegExp('lpkick.run')
  // let regexp_run = new RegExp('lpkick.test')
  let regexp_check = new RegExp('lpkick.check')
  var match_run = body.match(regexp_run);
  var match_check = body.match(regexp_check);
  if (match_run) {
      console.log("lpjson write start from this mail");
      // 目的のメール受け取ったらメール受信は止める
      // client.close();

      const req = {};

      //※いずれ事前チェックを入れたい
      regexp = new RegExp('url：.*') 
      req.targetUrl = body.match(regexp) ? body.match(regexp).toString().replace('url：', '') : null;
      regexp = new RegExp('チケット：.*') 
      req.targetName = body.match(regexp) ? body.match(regexp).toString().replace('チケット：', '') : null;
      regexp = new RegExp('枚数：.*') 
      req.targetNumber = body.match(regexp) ? body.match(regexp).toString().replace('枚数：', '') : null;
      regexp = new RegExp('コンビニ種別：.*')
      const storeType = body.match(regexp) ? body.match(regexp).toString().replace('コンビニ種別：', '') : null;
      req.storeTypeId = storeTypes.filter((x)=>x.name === storeType)[0].code;
      regexp = new RegExp('開始時間：.*') 
      req.startTime = body.match(regexp) ? body.match(regexp).toString().replace('開始時間：', '') : null;
      regexp = new RegExp('ユーザー：.*') 
      req.confUser = body.match(regexp) ? body.match(regexp).toString().replace('ユーザー：', '') : null;
      regexp = new RegExp('pw：.*') 
      req.confPass = body.match(regexp) ? body.match(regexp).toString().replace('pw：', '') : null;
      regexp = new RegExp('稼働：.*') 
      const runType = body.match(regexp) ? body.match(regexp).toString().replace('稼働：', '') : null;
      if (runType === '本番') {
        req.isTest = false;
      } else {
        req.isTest = true;
      }
      regexp = new RegExp('通知先：.*') 
      req.toMail = body.match(regexp) ? body.match(regexp).toString().replace('通知先：', '') : null;

      const task = JSON.parse(JSON.stringify(req));

      // tasklist 書き込み前チェック
      // 最終検証まだ（確認後は、もう一つ5分おきにjson監視して1時間前に発動するjsを開発)

      // すでに同時刻が存在すれば追加できないように
      if (taskList.filter((x) => x.startTime === task.startTime).length){
        console.log('同時刻が存在するので追加不可')
      } else {
        console.log('同時刻が存在しないので追加処理開始')
        // tasklist 書き込み
        taskList.push(task);
        await fs.writeFileSync('./lptasklist.json', JSON.stringify(taskList));
      }
      
      taskListS = JSON.parse(JSON.stringify(taskList));
      // taskListSのパスワードは***に変換しときたい
      
  }

  if (match_check) {
    console.log("lpkick check from this mail");

    const textArea = taskListS ? JSON.stringify(taskListS) : 'no tasklist'
    statusSendMail(message={subject: 'lpkick check', text: textArea}, null, from )

  }

}



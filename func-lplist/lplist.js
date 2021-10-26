
const puppeteer = require('puppeteer');
const nodemailer = require("nodemailer");
const moment = require("moment");
require('array-foreach-async');
var fs = require('fs');
const config = require(`./config.json`);
const { format } = require('path');

// nexe lplist.js

// 指定ミリ秒を待つ
const awaitTime = (millisec) => {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, millisec);
    //setTimeout(() => {reject(new Error("エラー！"))}, sec*1000);
  });
};


(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // 最大52650回までトライ
  // 6 * 24 * 365
  let tryCnt = 0;
  for (let i = 1; i <= 52650; i++) {

    await page.goto(config.targetUrl, {
      waitUntil:'load',
      timeout:0
    });

    // トライ回数インクリメント
    tryCnt++;

    // _m分単位まで待つ(初回を除く)
    const _optionList = config.optionList;
    let _set = null;
    let _m = null;
    let _intervalMinute = null;
    await _optionList.forEachAsync(async (option) => {      
      const _now = moment();
      const _start = moment(`${_now.format("YYYY-MM-DD ")}${option.startTime}`);
      const _end = moment(`${_now.format("YYYY-MM-DD ")}${option.endTime}`);
      if (_now >= _start && _now < _end) {
        _intervalMinute = option.intervalMinute;
        if (_intervalMinute === 'stop') {
          // _endまで待つ
          _set = _end;
        } else {
          // 指定分数後まで待つ
          _m = Number(_intervalMinute);
          const _minutes = Math.floor((moment().minutes() / _m)) * _m;
          _set = moment().set('minutes', _minutes).add(_m,'minutes').set('seconds', 0);
        }
      }
    });
    
    console.log(`${_set.format("YYYY-MM-DD HH:mm:ss")}まで画面更新処理待機中...`);
    await awaitTime(_set.diff(moment()));

    // メイン処理
    let rows = null;
    rows = await page.$$('.event-list-full-img');

    const oldData = JSON.parse(fs.readFileSync('data.txt'));

    const oldTitles = [];
    oldData.list.forEach(data => {
      oldTitles.push(data.title);      
    });
    
    const expData = {};
    const datas = [];
    await rows.forEachAsync(async (row) => {      
        const rowchild = await row.$$('.item');
        await rowchild.forEachAsync(async (child) => {
        const url = await child.$eval('a', (elm) => elm.href);
        const title = await child.$eval('a > figure > figcaption > h2 > span', (elm) => elm.textContent);
        const day = await child.$eval('a > figure > figcaption > ul > li', (elm) => elm.textContent);

        const data = {};
        data.url = url;
        data.title = title;
        data.day = day;

        const flg = !oldTitles.includes(data.title);

        data.new = flg;

        datas.push(data);
        })
    })

    expData.list = datas;

    const expMessages = [];

    // エラーで落ちていないかの検証のため
    if (['12:00','18:00'].includes(_set.format('HH:mm'))) {
      expMessages.push('lplist-no-problem')
    }

    // キーワードに一致するのものが存在したら
    expData.list.forEach(data => {
      config.targetList.forEach(target => {
        if (data[target.element].indexOf(target.search) != -1 && data.new) {
          expMessages.push(target.message);
          console.log(data[target.element]);
        }
      })
    });

    if (expMessages.length > 0) {
      const textArea = JSON.stringify(expMessages);
      await statusSendMail(message={subject: 'lplist check', text: textArea}); 
    }
    // console.log(expData);
    

    writeFile("data.txt", JSON.stringify(expData, null, '    '));

  }
})();

//ファイルの書き込み関数
function writeFile(path, data) {
    fs.writeFile(path, data, function (err) {
      if (err) {
          throw err;
      }
    });
}

//ファイル読み込み関数
function readFile(path) {
    fs.readFileSync(path, 'utf8', function (err, data) {
  
      //エラーの場合はエラーを投げてくれる
      if (err) {
          throw err;
      }
      
      //ここに処理
      console.log(data);
    });
  }

  async  function statusSendMail(message) {
    try {
        // 指定がなければconfigに依存
        message.from = config.fromMail;
        message.to = config.toSysMail;
  
        //SMTPサーバの設定
        var smtpConfig = {
          host: 'smtp.gmail.com',
          port: 587,
          secure: false, // true for 587, false for other ports
          requireTLS: true,
          auth: {
            user: config.fromMail,
            pass: config.fromMailPass
          }
        };
        return new Promise((resolve,reject)=>{

          var transporter = nodemailer.createTransport(smtpConfig);
    
          transporter.sendMail(message, function (error, info) {
            // エラー発生時
            if (error) {
              console.log("send failed");
              console.log(error.message);
              resolve(false); // or use rejcet(false) but then you will have to handle errors
            } else {
              resolve(true);
              // 送信成功
              console.log("send successful");
            }
    
          });
        })
    } catch (e) {
      console.log("Error", e);
    }
  }

  
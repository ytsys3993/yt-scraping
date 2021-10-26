
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
  const browser = await puppeteer.launch({
    headless: false,
  });
  const page = await browser.newPage();

  let _now = moment();
  let _set = moment(config.loginTime).set('seconds', 0).set('milliseconds', 0);
  if (_now.isBefore(_set)) {
    console.log(`${_set.format("YYYY-MM-DD HH:mm:ss")}までログイン処理待機中...`);
  } else {
    console.log(`${_set.format("YYYY-MM-DD HH:mm:ss")}にすでに到達`);
  }
  await awaitTime(_set.diff(_now));
  console.log("ログイン処理想定時間到達");
  
  await page.goto('https://talkport.com/login')

  await page.waitForSelector('.kontainer-app > .AppSessionsNew > .AppSessionsNew__buttons > .AppSessionsNew__buttons__wrapper > .Button:nth-child(1)', { timeout: 0 });
  await Promise.all([
    // ページ遷移を伴うクリックの場合
    // Execution context was destroyed, most likely because of a navigation 対策
    // https://qiita.com/monaka_ben_mezd/items/4cb6191458b2d7af0cf7
    page.waitForNavigation({waitUntil: ['load', 'networkidle2']}),
    page.click('.kontainer-app > .AppSessionsNew > .AppSessionsNew__buttons > .AppSessionsNew__buttons__wrapper > .Button:nth-child(1)'),
  ]);

  await page.type('#phone_number_or_email', 'sugachan.tectec@gmail.com');
  await page.type('input[name="password"]', "sero3202");


  await page.waitForSelector('.kontainer-app > .AppSessionsNew > .AppForm > .AppForm__row > .Button', { timeout: 0 });
  await Promise.all([
    // ページ遷移を伴うクリックの場合
    // Execution context was destroyed, most likely because of a navigation 対策
    // https://qiita.com/monaka_ben_mezd/items/4cb6191458b2d7af0cf7
    page.waitForNavigation({waitUntil: ['load', 'networkidle2']}),
    page.click('.kontainer-app > .AppSessionsNew > .AppForm > .AppForm__row > .Button'),
  ]);

  // 指定時刻まで待つ
  _now = moment();
  _set = moment(config.startTime).set('seconds', 0);
  if (_now.isBefore(_set)) {
    console.log(`${_set.format("YYYY-MM-DD HH:mm:ss")}まで購入処理待機中...`);
  } else {
    console.log(`${_set.format("YYYY-MM-DD HH:mm")}にすでに到達`);
  }
  await awaitTime(_set.diff(_now));
  console.log("購入処理想定時間到達");
  
  await page.goto(config.targetUrl, {
    waitUntil:'load',
    timeout:0
  });

  const hrefs = await page.$$eval('a', hrefs => hrefs.map((a) => {
    return a.href
  }));

  var matched = hrefs.filter(function(href) {
    return href.match(/spot_token/);
  });
    
  if (matched && matched.length >= 1) {
    // 最後を取得
    await page.goto(matched[matched.length - 1], {
      waitUntil:'load',
      timeout:0
    });

    if (!config.isTest) {
      // 決済クリック
      await page.waitForSelector('body > div.AppLayout > div.AppMain > div > div.AppBookingsNew > form > input.Button.Button--large', { timeout: 0 });
      await Promise.all([
        // ページ遷移を伴うクリックの場合
        // Execution context was destroyed, most likely because of a navigation 対策
        // https://qiita.com/monaka_ben_mezd/items/4cb6191458b2d7af0cf7
        page.waitForNavigation({waitUntil: ['load', 'networkidle2']}),
        page.click('body > div.AppLayout > div.AppMain > div > div.AppBookingsNew > form > input.Button.Button--large'),
      ]);
    } else {
      console.log('test完了');
    }
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

  
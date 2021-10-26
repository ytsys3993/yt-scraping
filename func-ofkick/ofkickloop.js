// import
const nodemailer = require("nodemailer");
const puppeteer = require('puppeteer')
const moment = require("moment");
const Log4js = require("log4js");
Log4js.configure("./log-config.json");
const logger = Log4js.getLogger("system");
const webclient = require("request");
const configName = process.argv[2] || 'ofconfig';
const configSpace = process.argv[3] || 5;
const {
  loginUrl,
  targetUrl,
  creatorsUrl,
  startTime,
  endTime,
  isFree,
  autoLogin,
  confUser,
  confPass,
  isCredit,
  isBrowse,
  isTest,
  chromePath,
  fromMail,
  fromMailPass,
  toMail,
  cardNumber,
  cardExpiry,
  cardCvc,
  billingName,
  isSendmail,
} = require(`./${configName}.json`);
let targetUrl2;
let countTime;
let forcedExit = false;


// 指定ミリ秒を待つ
const awaitTime = (millisec) => {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, millisec);
    //setTimeout(() => {reject(new Error("エラー！"))}, sec*1000);
  });
};



// ページアクセスリトライ
const retry = async (fn, retryDelay = 100, numRetries = 3) => {
  for (let i = 0; i < numRetries; i++) {
    try {
      return await fn()
    } catch (e) {
      if (i === numRetries - 1) throw e
      await delay(retryDelay)
      retryDelay = retryDelay * 2
    }
  }
};

// メイン処理
// ※単独でも使えるようにしたいが
module.exports = (req) => !(async () => {
  try {

    if (isTest) {
      logger.info("【テスト：開始】");
    }

    // 指定時刻まで待つ
    const _now = moment();
    const _set = moment(startTime).subtract(0, "minutes").set('seconds', 0);
    if (_now.isBefore(_set)) {
      logger.info(`${_set.format("YYYY-MM-DD HH:mm:ss")}までログイン処理待機中...`);
    } else {
      logger.info(`${_set.format("YYYY-MM-DD HH:mm:ss")}にすでに到達`);
    }
    await awaitTime(_set.diff(_now));
    logger.info("ログイン処理想定時間到達");

    // ブラウザ起動
    await newBrowser();    
    // await newBrowserTest();

  } catch (e) {
    logger.error(e)
    await page.screenshot({ path: 'log\\error.png' });
  }
})()

// 時刻チェック
async function timeCheck() {
  try {
  } catch (e) {
    logger.error('指定時間チェック')
    logger.error(e);
    await page.screenshot({ path: 'log\\error.png' });
  }
}

async function jamErrorTry(page) {
  try {

    // 最大5回までトライ
    let tryCnt = 0;
    for (let i = 1; i <= 3; i++) {

      // エラー時
      let resultSelector = await page.$('span#remain_sec');

      // 指定時間を待ち、リロード
      if (resultSelector) {
        // トライ回数インクリメント
        tryCnt++;
        let value = await (await resultSelector.getProperty('textContent')).jsonValue()
        
        logger.info(`混線のため${value}秒待機開始...`);        
        page.screenshot({ path: `log\\JamErrorTrying${value}.png` });
        await awaitTime(value * 1000);
        // リロード
        await page.reload({ waitUntil: 'networkidle2' });
      }

      // 成功もしくは5回チャレンジして無理だったら強制終了
      if (!resultSelector || tryCnt >= 5) {
        break;
      }

    }
    
    if (tryCnt === 0) {
      logger.info('混線なし');
    } else {
      if (tryCnt !== 0) {
        logger.info(`混線解消(${tryCnt}回目に成功)`);
      }
    }
} catch (e) {
    logger.error(e)
    await page.screenshot({ path: 'log\\JamErrorTryedError.png' });
  }
}

// ブラウザ起動
async function newBrowser() {
  try {
    // headless:true ブラウザ非表示
    const launchOption = {
      headless: false,
    };
    if (chromePath) {
      launchOption.executablePath = chromePath;
      launchOption.args = [
        // Chromeウィンドウのサイズ
        '--window-size=1600,200',
        // Chromeウィンドウのポジション
        '--window-position=300,300',
      ]
    }

    // ブラウザ起動
    const browser = await puppeteer.launch(launchOption)

    // 新ページ作成
    const page = await browser.newPage()

    // タイムアウト無効化
    await page.setDefaultTimeout(0);
    await page.setDefaultNavigationTimeout(0);

    // ログインページに
    // await page.goto(loginUrl, { waitUntil: 'networkidle2' });
    await page.goto(loginUrl, { waitUntil: 'networkidle2' });

    logger.info("ログインページに移動完了");

    // ログイン
    const wasLogin = await newLogin(page);
    if (!wasLogin) {
      logger.error("ログインエラー");
      throw new Error();
    }

    // 時間カウント開始
    logger.info("<成績時間カウント開始>");
    countTime = moment();

    // 購入ページに移動
    const wasLoadBuyPage = await moveTargetPage(page);
    if (!wasLoadBuyPage) {
      if (!forcedExit) {
        logger.error("購入ページ確認NG");
        throw new Error();
      }
    } else {
      // メール情報の作成
      var message = {
        from: fromMail,
        to: toMail,
        subject: 'ofkick start',
        text: 'start'
      };

      // メール送信テスト
      statusSendMail(message);
    }

    if (wasLoadBuyPage) {

      // 対象ページで購入処理
      const wasBuy = await targetPageBuy(page);

      var textArea = '';
      if (!isTest) {
        const us = confUser.substr(0,3);
        if (wasBuy) {
          textArea = `Congratulations!!(${us})`;
        } else {
          textArea = `No Good!!(${us})`;
        }
      } else {
        textArea = 'Test Run!!'
      }

      // メール情報の作成
      var message = {
        from: fromMail,
        to: toMail,
        subject: 'ofkick end',
        text: textArea
      };

      // メール送信テスト
      statusSendMail(message);

      if (!isTest || !isBrowse) {
        // 念のため30秒待つ
        await awaitTime(30 * 1000);
        // ブラウザ終了
        browser.close();
      }

    } else {
      if (forcedExit) {
        browser.close();
      } else {
        logger.warn("購入状態確認NG");
      }
    }

  } catch (e) {
    logger.error(e)
    await page.screenshot({ path: 'log\\error.png' });
  }
}

// ログイン処理
async function newLogin(page) {
  try {

    await page.setViewport({ width: 1280, height: 587 })
  
    await page.waitForSelector('body > #root > .main > .top', { timeout: 0 })
    await page.click('body > #root > .main > .top')
    
    await page.waitForSelector('body > #header > .header-wrapper > .header-right > .login-button', { timeout: 0 })
    await page.click('body > #header > .header-wrapper > .header-right > .login-button')
    
    await page.waitForSelector('body > #session-container #session_email', { timeout: 0 })
    await page.click('body > #session-container #session_email')
    
    await page.type('body > #session-container #session_email', confUser)
    await page.type('body > #session-container #session_password', confPass)
    
    await page.waitForSelector('body > #session-container > .session-card > .login-form > .login-button:nth-child(4)', { timeout: 0 })
    await page.click('body > #session-container > .session-card > .login-form > .login-button:nth-child(4)')
    
    await page.waitForSelector('#organization > div > div.info > div.info-title > a.info-right-button.destructive', { timeout: 0 })
    logger.info("ログイン完了");

    return true;
  } catch (e) {
    logger.error(e)
    await page.screenshot({ path: 'log\\error.png' });

    return false;
  }

}

// 対象ページ移動
async function moveTargetPage(page) {
  try {
    let isLoadingSucceeded = false;
    let isEndTime = false;

    // 最大60回までトライ
    let tryCnt = 0;
    for (let i = 1; i <= 60; i++) {

      // トライ回数インクリメント
      tryCnt++;

      if (i !== 1) {
        // _m分単位まで待つ(初回を除く)
        const _m = configSpace;
        const _now = moment();
        const _minutes = Math.floor((moment().minutes() / _m)) * _m;
        const _set = moment().set('minutes', _minutes).add(_m,'minutes').set('seconds', 0);

        const _end = moment(endTime);
        if (_now.isAfter(_end)) {
          logger.info(`${_end.format("YYYY-MM-DD HH:mm:ss")}に到達したため終了します`);
          isEndTime = true;
          forcedExit = true;
          break;
        } else {
          logger.info(`${_set.format("YYYY-MM-DD HH:mm:ss")}まで画面更新処理待機中...`);
          await awaitTime(_set.diff(moment()));
        }
      }

      if (isEndTime) {
        break;
      }

      // 対象ページに移動
      logger.info(`クリエイターズページ：${creatorsUrl}`);
      await page.goto(creatorsUrl, { timeout: 0, });

      // 購入状態にあるか
      const rows = await page.$$('.post-col');
      console.log(rows.length);
      let resHref = null;
      for (const row of rows) {
        const text = await (await (await row.$('.remains-count')).getProperty("textContent")).jsonValue();
        console.log(text);
        if(text !== '完売'){
          const href = await (await (await row.$("a")).getProperty('href')).jsonValue();
          console.log(href)
          resHref = href;

          // 購入対象としてセット
          targetUrl2 = resHref;
          
          // 対象ページに移動
          logger.info(`ターゲットページ：${targetUrl2}`);
          await page.goto(targetUrl2, { timeout: 0, });

          // 購入状態にあるか
          isLoadingSucceeded = await page.$('#post > div > div.post-container > div.post-info > a').then(res => !!res);
          break;
        }
      }
      // 成功もしくは3回チャレンジして無理だったら強制終了
      if (isLoadingSucceeded || isEndTime || tryCnt >= 60) {
        break;
      }
    }

    if (isLoadingSucceeded) {
      logger.info(`購入状態確認(${tryCnt}回目に成功)`);
    }
    if (isEndTime) {
      logger.info(`強制終了`);
    }
    return isLoadingSucceeded;
  } catch (e) {
    logger.error(e)
    await page.screenshot({ path: 'log\\error.png' });

    return false;
  }

}

// 購入処理
async function targetPageBuy(page) {
  try {

    logger.info("購入処理開始(確定前)");

    // 購入前確認
    await page.waitForSelector('#post > div > div.post-container > div.post-info > a', { timeout: 0 })
    await page.click('#post > div > div.post-container > div.post-info > a')

    // 購入後のチェックを入れる
    const wasBuy = await targetPayment(page);
    
    if (!isTest) {

      if (wasBuy) {
        logger.info("購入処理完了(多分)");
        logger.info(`<成績：${moment().diff(countTime) / 1000}秒>`);
      }
      // 念には念をで30秒待つ。次回スクショで完了済を確認できたら、外してもOK
      await awaitTime(30 * 1000);
      logger.info("購入処理後、30秒経過");

      await page.screenshot({ path: 'log\\byend2.png' });
    } else {      
      logger.info(`<成績：${moment().diff(countTime) / 1000}秒>`);
    }

    return wasBuy;

  } catch (e) {
    logger.error(e)
    await page.screenshot({ path: 'log\\error.png' });
    return false;
  }
}

// 購入確定処理(有料用)
async function targetPayment(page) {
  try {

    logger.info("購入処理開始(有料)");

    // 購入ページの決済画面への移動ボタン待ち
    await page.waitForSelector('#pay-button', { timeout: 0})
    await page.click('#pay-button')

    // カード番号入力場所待ち
    await page.waitForSelector('#cardNumber', { timeout: 0})
    await page.type('#cardNumber', cardNumber, {delay: 100});
    await page.type('#cardExpiry', cardExpiry, {delay: 80});
    await page.type('#cardCvc', cardCvc, {delay: 60});
    await page.type('#billingName', billingName, {delay: 50});

    if (!isTest) {

      // 決済画面の決済ボタン待ち
      await page.waitForSelector('#root > div > div > div.App-Payment > div > form > div:nth-child(2) > div:nth-child(4) > button > div.SubmitButton-IconContainer' , { timeout: 0 })
      await awaitTime(1000);
      await page.click('#root > div > div > div.App-Payment > div > form > div:nth-child(2) > div:nth-child(4) > button > div.SubmitButton-IconContainer' , { timeout: 0 })

      // ページ遷移先の情報を期待(購入後))
      await page.waitForSelector('#post > div > div.post-session-success > div.bottom > h1', { timeout: 0 })
    
    } else {
      logger.info("【テスト:決済ロジック】");
      return true;
    }
    return true;
  } catch (e) {
    logger.error(e)
    await page.screenshot({ path: 'log\\error.png' });

    return false;
  }
}

// メール送信処理
async function statusSendMail(message) {
  try {
    if (isSendmail) {
      //SMTPサーバの設定
      var smtpConfig = {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // true for 587, false for other ports
        requireTLS: true,
        auth: {
          user: fromMail,
          pass: fromMailPass
        }
      };
      var transporter = nodemailer.createTransport(smtpConfig);

      transporter.sendMail(message, function (error, info) {
        // エラー発生時
        if (error) {
          logger.error("send failed");
          logger.error(error.message);
          return;
        }

        // 送信成功
        logger.info("send successful");
      });
    }
  } catch (e) {
    logger.error("Error", e);
  }
}

// ブラウザ検証
async function newBrowserTest() {
  try {
    // headless:true ブラウザ非表示
    const launchOption = {
      headless: false,
    };
    if (chromePath) {
      launchOption.executablePath = chromePath;
    }

    
    // ブラウザ起動
    const browser = await puppeteer.launch(launchOption)

    // 新ページ作成
    const page = await browser.newPage()

    // タイムアウト無効化
    await page.setDefaultNavigationTimeout(0);

    // ターゲットページに
    await page.goto('https://only-five.jp/creators/2103', { timeout: 0, });
    // browser.close();

    
    
  } catch {

  }
}

// import
// 枚数選択を再度求められた場合に対応不可だがそれ以外は安定
const os = require('os');
const nodemailer = require("nodemailer");
const puppeteer = require('puppeteer')
const iPhone = puppeteer.devices['iPhone 6'];
const moment = require("moment");
const Log4js = require("log4js");
Log4js.configure("./log-config.json");
const logger = Log4js.getLogger("system");
const webclient = require("request");
require('array-foreach-async');
const configName = process.argv[2] || 'lpconfig';
let conf = {
  mypageUrl,
  targetUrl,
  targetNumber,
  targetName,
  storeTypeId,
  startTime,
  targetTicket,
  isFree,
  autoLogin,
  confUser,
  confPass,
  isCredit,
  isBrowse,
  isTest,
  fromMail,
  fromMailPass,
  toMail,
  toSysMail,
} = require(`./${configName}.json`);
let countTime;

// 指定ミリ秒を待つ
const awaitTime = (millisec) => {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, millisec);
    //setTimeout(() => {reject(new Error("エラー！"))}, sec*1000);
  });
};

const awaitDare = (sec) => {
  return awaitTime(sec * 1000);
}

// メイン処理
module.exports = (req) => !(async () => {
  try {

    // マージ
    if (req) {
      Object.assign(conf, req); 
      logger.info(`キック：${JSON.stringify(conf)}`);
    }

    // テスト
    if (conf.isTest) {
      logger.info('【テスト】');
    }

    // チェック処理じゃなければ本処理へ
    if (conf.notCheckOnly) {
      // 指定時刻の15分前まで待つ
      const _now = moment();
      const _set = moment(conf.startTime).subtract(15, "minutes").set('seconds', 0);
      if (_now.isBefore(_set)) {
        logger.info(`${_set.format("YYYY-MM-DD HH:mm:ss")}までログイン処理待機中...`);
      } else {
        logger.info(`${_set.format("YYYY-MM-DD HH:mm:ss")}にすでに到達`);
      }
      await awaitTime(_set.diff(_now));
      logger.info("ログイン処理想定時間到達");

    }

    // ブラウザ起動
    await newBrowser();    

  } catch (e) {
    logger.error(e)
    await page.screenshot({ path: 'log\\error.png' });
  }
})()

// ブラウザ起動
async function newBrowser() {
  try {
    // headless:true ブラウザ非表示
    // defaultViewportを指定していないと、スクロール位置が狭いため、すべてロードしないので、想定するcssセレクタが見つからない可能性が高い
    // 10個目以降はhttps://www.bannerbear.com/blog/ways-to-speed-up-puppeteer-screenshots/を参考にした
    const launchOption = {
      headless: !conf.isBrowse,
      args: [
        '--no-first-run',
        '--no-sandbox',
        '--no-zygote',
        '--single-process',    
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--disable-dev-shm-usage',
        '--proxy-server="direct://"',
        '--proxy-bypass-list=*',
        '--autoplay-policy=user-gesture-required',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-breakpad',
        '--disable-client-side-phishing-detection',
        '--disable-component-update',
        '--disable-default-apps',
        '--disable-dev-shm-usage',
        '--disable-domain-reliability',
        '--disable-extensions',
        '--disable-features=AudioServiceOutOfProcess',
        '--disable-hang-monitor',
        '--disable-ipc-flooding-protection',
        '--disable-notifications',
        '--disable-offer-store-unmasked-wallet-cards',
        '--disable-popup-blocking',
        '--disable-print-preview',
        '--disable-prompt-on-repost',
        '--disable-renderer-backgrounding',
        '--disable-setuid-sandbox',
        '--disable-speech-api',
        '--disable-sync',
        '--hide-scrollbars',
        '--ignore-gpu-blacklist',
        '--metrics-recording-only',
        '--mute-audio',
        '--no-default-browser-check',
        '--no-first-run',
        '--no-pings',
        '--no-sandbox',
        '--no-zygote',
        '--password-store=basic',
        '--use-gl=swiftshader',
        '--use-mock-keychain',
      ],
      defaultViewport: {
        width: 1000,
        height: 1000
      },
      userDataDir: './myUserDataDir',
      // browserWSEndpoint: 'wss://chrome.browserless.io?--user-data-dir=/tmp/session-123',
    };

    // ブラウザ起動
    const browser = await puppeteer.launch(launchOption)

    // 新ページ作成
    const page = await browser.newPage()    
    
    // ヘッドレスモードでは有用になる?
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36')

    await page.emulate(iPhone);


    // 不要な情報をカット
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      if (['image', 'font'].indexOf(request.resourceType()) !== -1) {
          request.abort();
      } else {
          request.continue();
      }
    });
    // タイムアウト無効化
    await page.setDefaultNavigationTimeout(0);

    // headerからwebdriverの表記を消します。botだとばれにくくなる。
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', ()=>{});
      delete navigator.__proto__.webdriver; 
    });
    logger.info("ブラウザ起動後準備完了");

    // ログインページに
    await page.goto(conf.targetUrl, { waitUntil: 'networkidle2' });
    // await jamErrorTry(page);

    logger.info("ログインページに移動完了");

    // ログイン
    let resultSelectorErr = false;
    if (conf.isMobile) {
      await page.waitForSelector('#responsiveBaseFrame > header > section > nav > div > a, span#remain_sec', { timeout: 0 })
      resultSelectorErr = page.$('span#remain_sec');
      if (resultSelectorErr) {
        await jamErrorTry(page);
      }
    }
    const wasLogin = await newLogin(page);
    if (!wasLogin) {
      logger.error("ログインエラー");
      throw new Error();
    }

    // 本処理
    const req = {};
    req.type = '';
    req.redirect_url = 'https://t.livepocket.jp/purchase/'
    req.is_discontinuous = '';
    req.is_unused_code = '';
    req.event_id = '91741';
    req.event_cname = '5mxcg';
    req.ticket_type = 'nomal';
    req.facebook_ticket_count = '0';
    req.twitter_tciket_count = '0';
    req.referer_type = '';
    req.discount_code = '';
    req.use_discount_code_time = '';
    req.plusid_linkage_invalidation_flg = '0';
    req.ticket_id_419417 = '1';
    req.ticket_id_419418 = '';

    page.on('request', interceptedRequest => {

      // Here, is where you change the request method and 
      // add your post data
      var data = {
          'method': 'POST',
          'headers': {
            'Content-Type': 'application/x-www-form-urlencoded;',
          },
          'postData': 'paramFoo=valueBar&paramThis=valueThat'
      };

      // Request modified... finish sending! 
      interceptedRequest.continue(data);
  });


  
    // ブラウザ終了
    if (conf.isClose) {
      browser.close();
    }


  } catch (e) {
    logger.error(e)
    await page.screenshot({ path: 'log\\error.png' });
  }
}

// ログイン処理
async function newLogin(page) {
  try {

    // 新規ログイン
    if (conf.isMobile) {
      await page.waitForSelector('#responsiveBaseFrame > header > section > nav > div > a', { timeout: 0 })
      await Promise.all([
        // ページ遷移を伴うクリックの場合
        // Execution context was destroyed, most likely because of a navigation 対策
        // https://qiita.com/monaka_ben_mezd/items/4cb6191458b2d7af0cf7
        page.waitForNavigation({waitUntil: ['load', 'networkidle2']}),
        page.click('#responsiveBaseFrame > header > section > nav > div > a')
      ]);
    } else {      
      await page.goto(conf.mypageUrl, { waitUntil: 'networkidle2' });
    }
    // await jamErrorTry(page);

    // ユーザ名、パスワード入力
    await page.type('#email', conf.confUser);
    await page.type('#password', conf.confPass);

    // 自動ログインチェック確認
    const autoLoginCheck = await page.$('input[name="auto_login"]');
    const checked = await (await autoLoginCheck.getProperty('checked')).jsonValue();
    if (conf.autoLogin !== checked) {
      await autoLoginCheck.click();
    }

    // ログインボタンを押す
    // ※普通に押そうとすると被っている日本語と英語切り替えにひっかかるので、Enterで対応

    if (conf.isMobile) {
      // 検証1
      // await page.waitForSelector('#form > nav > ul > li:nth-child(1) > a', { timeout: 0 })
      // await page.click('#form > nav > ul > li:nth-child(1) > a')


      // 検証2
      // ※mobileの場合、ログインはマウス処理じゃないと反応しない
      const mouse = page.mouse;
      const clickElement = await page.$('#form > nav > ul > li:nth-child(1) > a', { timeout: 0 })
      const rect = await clickElement.boundingBox();
      await Promise.all([
          page.waitForNavigation({waitUntil: ['load', 'networkidle2']}),
          mouse.move(parseFloat(rect.x + 20), parseFloat(rect.y + 20)),
          page.waitForTimeout(1000),
          mouse.click(parseFloat(rect.x + 20), parseFloat(rect.y + 20), {
              button: 'left',
              clickCount: 1,
              delay: 0,
          }),
      ]);


      // 検証3
      // logger.info("クリックボタン検知前")
      // await page.waitForSelector('#form > nav > ul > li:nth-child(1) > a', { timeout: 0 })
      // logger.info("クリックボタン検知")
      // await page.evaluate(elm => elm.normallogin);

    } else {
      await page.keyboard.press("Enter");
      await page.waitForNavigation();
    }
    

    logger.info("ログイン完了");

    return true;
  } catch (e) {
    logger.error(e)
    await page.screenshot({ path: 'log\\error.png' });

    return false;
  }

}

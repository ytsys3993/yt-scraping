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
module.exports = (req) => !(async () => {
  try {

    // OS判定
    conf.isWindows = os.type().toString().match('Windows')
    if (conf.isWindows) {
      logger.info('【Windows版起動】');
    } else {
      logger.info('【Linux版起動】');
    }
 
    // マージ
    if (req) {
      Object.assign(conf, req); 
      logger.info(`キック：${JSON.stringify(conf)}`);
    }

    // テスト
    if (conf.isTest) {
      logger.info('【テスト】');
    }

    // メール送信
    let textArea = !conf.isTest ? 'start' : 'start Test';
    let subjectArea;
    
    if (!conf.notCheckOnly) {
      subjectArea = 'lpkick reserve check start';
    } else {
      subjectArea = !conf.isTest ? 'lpkick reserve start' : 'lpkick reserve test start';
    } 
    statusSendMail(message={subject: subjectArea, text: textArea});

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
    if (conf.isJamCheck) {
      // 最大3回までトライ
      let tryCnt = 0;
      for (let i = 1; i <= 3; i++) {
  
        // エラー時
        let resultSelectorErr = await page.$('span#remain_sec');
  
        // 指定時間を待ち、リロード
        if (resultSelectorErr) {
          // トライ回数インクリメント
          tryCnt++;
          let value = await (await resultSelectorErr.getProperty('textContent')).jsonValue()
          
          logger.info(`混線のため${value}秒待機開始...`);        
          page.screenshot({ path: `log\\JamErrorTrying${value}.png` });
          await awaitTime(value * 1000);
          // リロード
          await page.reload({ waitUntil: 'networkidle2' });
        }
  
        // 成功もしくは3回チャレンジして無理だったら強制終了
        if (!resultSelectorErr || tryCnt >= 3) {
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
    // defaultViewportを指定していないと、スクロール位置が狭いため、すべてロードしないので、想定するcssセレクタが見つからない可能性が高い
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
      ],
      defaultViewport: {
        width: 1000,
        height: 1000
      }
    };

    // ブラウザ起動
    const browser = await puppeteer.launch(launchOption)

    // 新ページ作成
    const page = await browser.newPage()    
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
    const wasLogin = await newLogin(page);
    if (!wasLogin) {
      logger.error("ログインエラー");
      throw new Error();
    }

    // 対象ページチェック
    const wasCheckPage = await checkTargetPage(page);
    if (!wasCheckPage) {
      logger.error("設定不備の可能性があります");
      logger.error(JSON.stringify(conf))
      throw new Error();
    }

    // チェック処理じゃなければ本処理へ
    if (!conf.notCheckOnly) {
      if (wasCheckPage) {
        // メール送信
        statusSendMail(message={subject: 'lpkick reserve check end', text: 'チェック完了／設定に問題ありません'});
        logger.info('チェック完了／設定に問題ありません');
      }
      return wasCheckPage
    } else {
      // 指定時刻まで待つ
      const _now = moment();
      const _set = moment(conf.startTime);
      if (_now.isBefore(_set)) {
        logger.info(`${_set.format("YYYY-MM-DD HH:mm")}まで購入処理待機中...`);
      } else {
        logger.info(`${_set.format("YYYY-MM-DD HH:mm")}にすでに到達`);
      }
      await awaitTime(_set.diff(_now));
      logger.info("購入処理想定時間到達");

      // 時間カウント開始
      logger.info("<成績時間カウント開始>");
      countTime = moment();

      // 購入可能状態確認
      for (let i = 1; i <= 100; i++) {
        logger.info(`購入可能状態確認start(${i}回目)`);
        await page.goto(conf.targetUrl, { waitUntil: 'networkidle2' });
        const resultSelectorErr = await page.$('span#remain_sec');
        if (resultSelectorErr) {
          jamErrorTry(page);
        } else {
          const wasLoadingSucceeded = await page.$('.buy_ticket_info_area > #purchase_form > #submit > .btn-procedure-pc-only > .register_input_submit').then(res => !!res);
          if (wasLoadingSucceeded) {
            break;
          } else {      
            const resultPasswordErr = await page.$('#password');
            if (resultPasswordErr) {
              logger.error("resultPasswordErr")
            }
            logger.error("購入可能状態確認NG");
            throw new Error();
          }
        }
      }
      logger.info("購入可能状態確認end");

      // 枚数選択
      for (let i = 1; i <= 100; i++) {        
        logger.info(`枚数選択start(${i}回目)`);
        await targetPageBuySelect(page);
        const resultSelectorErr = await page.$('span#remain_sec');
        if (resultSelectorErr) {
          jamErrorTry(page);
        } else {
          // ページ遷移先の情報を期待(有償 or 無償 or error or 再ログイン)
          await page.waitForSelector('.base-wrapper #other_payment_method_select_img, .buy-conf #receive_info, #password', { timeout: 0 })          
          const resultPasswordErr = await page.$('#password');
          if (resultPasswordErr) {
            logger.error("resultPasswordErr")
          }
          break;
        }
      }
      logger.info("枚数選択end");
      
      // 決済処理
      let wasBuyEnd = false;
      for (let i = 1; i <= 100; i++) {    
        logger.info(`決済処理start(${i}回目)`);    
        await targetPageBuyConfirm(page);
        const resultSelectorErr = await page.$('span#remain_sec');
        if (resultSelectorErr) {
          jamErrorTry(page);
        } else {
          // ページ遷移先の情報を期待(有償版購入後))
          // ※本当は無償版購入後のものも欲しい
          if (!conf.isTest) {
            // await page.waitForSelector('body > .base-wrapper > .ticket-info > .buy-end-ticket-top-link > .btn-flat, #password', { timeout: 0 })       
            await page.waitForSelector('#pageTitle > section > h1', { timeout: 0 });
            const wasLoadingSucceeded = await page.$x('//h1[contains(text(), "購入完了")]').then(res => !!res.length);
            if (wasLoadingSucceeded) { 
              wasBuyEnd = true;
              break;
            } else {
              const resultPasswordErr = await page.$('#password');
              if (resultPasswordErr) {
                logger.error("resultPasswordErr")
              }
              break;
            }
          } else {
            break;
          }          
        }
      }
                 
      if (conf.isTest) {
        logger.info("テスト処理完了");
        logger.info(`<現在時刻：${moment()}／成績：${moment().diff(countTime) / 1000}秒>`);  
      } else {
        if (wasBuyEnd) {
          logger.info("決済処理end");    
          logger.info(`<現在時刻：${moment()}／成績：${moment().diff(countTime) / 1000}秒>`);  
          logger.info(`<成績：${moment().diff(countTime) / 1000}秒>`);
        } else {
          logger.info("決済処理失敗？");
        }
        await page.screenshot({ path: 'log\\byend2.png' });
      }

      // if (!conf.isTest) {
      //   if (conf.isCredit) {
      //     // 未検証
      //     // 決済終了画面を待つor 3D決済が入るので念のため30秒待つ
      //     await page.waitForSelector('.buy-end-ticket-top-link', { timeout: 0 });
      //     await page.screenshot({ path: 'log\\byend.png' });
      //     // ※もしくは下記URLのチェック(complete込)ができれば完璧
      //     // https://t.livepocket.jp/purchase/complete?order_id=7323492

      //   }
      // } else {      
      // }

      let textArea = '';
      // if (!conf.isTest) {
      //   const us = conf.confUser.substr(0,3);
      //   if (wasBuy) {
      //     textArea = `Congratulations!!(${us})`;
      //   } else {
      //     textArea = `No Good!!(${us})`;
      //   }
      // } else {
      //   textArea = 'Test Run!!'
      // }

      // メール送信
      statusSendMail(message={subject: 'lpkick end', text: textArea});

      // 念のため60秒待つ
      await awaitTime(60 * 1000);
      // ブラウザ終了
      if (conf.isClose) {
        browser.close();
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

    // 新規ログイン
    if (conf.isMobile) {
      await page.waitForSelector('#submit > p.button.register.center-block.btn-proceed > button', { timeout: 0 })
      await Promise.all([
        // ページ遷移を伴うクリックの場合
        // Execution context was destroyed, most likely because of a navigation 対策
        // https://qiita.com/monaka_ben_mezd/items/4cb6191458b2d7af0cf7
        page.waitForNavigation({waitUntil: ['load', 'networkidle2']}),
        page.click('#submit > p.button.register.center-block.btn-proceed > button')
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
      // await page.waitForSelector('#form > nav > ul > li:nth-child(1) > a', { timeout: 0 })
      // await page.click('#form > nav > ul > li:nth-child(1) > a')
      // ※mobileの場合、ログインはマウス処理じゃないと反応しない
      const mouse = page.mouse;
      const clickElement = await page.$('#form > nav > ul > li:nth-child(1) > a', { timeout: 0 })
      const rect = await clickElement.boundingBox();
      await Promise.all([
          page.waitForNavigation({waitUntil: ['load', 'networkidle2']}),
          mouse.move(parseFloat(rect.x + 20), parseFloat(rect.y + 20)),
          page.waitFor(1000),
          mouse.click(parseFloat(rect.x + 20), parseFloat(rect.y + 20), {
              button: 'left',
              clickCount: 1,
              delay: 0,
          }),
      ]);
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

// 対象ページチェック
async function checkTargetPage(page) {
  try {

    let isTargetPageChecked = false;

    if (conf.isMobile) {
      // conf.targetTiecktを有効にする
      isTargetPageChecked = true;
    } else {
      // ターゲットチケット検索
      const rows = await page.$$('section.ticket');
      const targetTickets = [];
      conf.targetTicket = null;
      conf.isFree = true;
      await rows.forEachAsync(async (row) => {
        const text = await (await (await row.$('.table > .title > h4')).getProperty("textContent")).jsonValue();
        if (conf.targetName.split(',').includes(text)) {
          const targetTicket = await (await (await row.$('.table > .num > div > label > select')).getProperty("id")).jsonValue();
          const price = await (await (await row.$('.table > .price > div > p')).getProperty("textContent")).jsonValue();
          if (!conf.isFree || price !== '無料') {
            // 1つでも有料が含まれているなら
            conf.isFree = false;
          }
          targetTickets.push(`.table #${targetTicket}`);
          isTargetPageChecked = true;
        } 
      })
      conf.targetTicket = targetTickets.join(',');
    }
    if (isTargetPageChecked) {
      logger.info(`「${conf.targetName}」の存在を確認(${conf.targetTicket})`);
    }
    return isTargetPageChecked;

  } catch (e) {
    logger.error(e)
    await page.screenshot({ path: 'log\\error.png' });

    return false;
  }
}

// 対象ページ移動
async function moveTargetPage(page) {
  try {

    let wasLoadingSucceeded = false;

    // 最大3回までトライ
    let tryCnt = 0;
    for (let i = 1; i <= 3; i++) {

      // トライ回数インクリメント
      tryCnt++;

      // 対象ページに移動
      await page.goto(conf.targetUrl, { waitUntil: 'networkidle2' });
      await jamErrorTry(page);

      // 購入状態にあるか
      wasLoadingSucceeded = await page.$('.buy_ticket_info_area > #purchase_form > #submit > .btn-procedure-pc-only > .register_input_submit').then(res => !!res);

      // 成功もしくは3回チャレンジして無理だったら強制終了
      if (wasLoadingSucceeded || tryCnt >= 3) {
        break;
      }
    }

    if (wasLoadingSucceeded) {
      logger.info(`購入状態確認(${tryCnt}回目に成功)`);
    }
    return wasLoadingSucceeded;
  } catch (e) {
    logger.error(e)
    await page.screenshot({ path: 'log\\error.png' });

    return false;
  }

}

// 購入処理-枚数選択
async function targetPageBuySelect(page) {
  try {

    // logger.info("購入処理開始(確定前)");

    // 購入前確認
    // await page.waitForSelector('.ui-page > .ui-content > #responsiveBaseFrame > .gheader > .clearfix', { timeout: 0 })
    // await page.click('.ui-page > .ui-content > #responsiveBaseFrame > .gheader > .clearfix')

    let cnt = 0;
    await conf.targetTicket.split(',').forEachAsync(async (targetTicket) => {
      await page.waitForSelector(targetTicket, { timeout: 0 })
      await page.click(targetTicket)
  
      // 枚数選択
      await page.select(targetTicket, conf.targetNumber.split(',')[cnt])
  
      await page.waitForSelector(targetTicket, { timeout: 0 })
      await page.click(targetTicket)

      cnt++;
    });
    
    // 1秒待つ (0.5秒だと失敗する可能性あり)
    await awaitDare(1);
    // 選択されたかをチェックする処理があれば最強
    
    // 決済処理
    await page.waitForSelector('.buy_ticket_info_area > #purchase_form > #submit > .btn-procedure-pc-only > .register_input_submit', { timeout: 0 })
    await Promise.all([
      // ページ遷移を伴うクリックの場合
      // Execution context was destroyed, most likely because of a navigation 対策
      // https://qiita.com/monaka_ben_mezd/items/4cb6191458b2d7af0cf7
      page.waitForNavigation({waitUntil: ['load', 'networkidle2']}),
      page.click('.buy_ticket_info_area > #purchase_form > #submit > .btn-procedure-pc-only > .register_input_submit')
    ]);
    
  } catch (e) {
    logger.error(e)
    await page.screenshot({ path: 'log\\error.png' });
    return false;
  }
}
  
// 購入処理-決済処理
async function targetPageBuyConfirm(page) {
  try {
    // ※現状は設定に入れているが無料かの判定を入れる余地あり
    logger.info(`購入処理確定開始(freeBuy:${conf.isFree})`);
    let wasBuy = null;
    if (conf.isFree) {
      wasBuy = await targetFree(page);
    } else {
      wasBuy = await targetPayment(page);
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

    if (!conf.isCredit) {
      // コンビニ決済＆ローソン
      await page.waitForSelector('.base-wrapper #other_payment_method_select_img', { timeout: 0 })
      await page.click('.base-wrapper #other_payment_method_select_img')

      await page.waitForSelector('.form-flat #cvs_select', { timeout: 0 })
      await page.click('.form-flat #cvs_select')

      // コンビニ決済も選びたい　
      await page.select('.form-flat #cvs_select', conf.storeTypeId)

      await page.waitForSelector('.form-flat #cvs_select', { timeout: 0 })
      await page.click('.form-flat #cvs_select')
    } else {
      await page.waitForSelector('.card_list_radio', { timeout: 0 })
    }

    // 規約に同意
    await page.waitForSelector('.base-wrapper > .buy-conf > .content > .form-info > .agreement-text', { timeout: 0 })
    await page.click('.base-wrapper > .buy-conf > .content > .form-info > .agreement-text')

    logger.info("規約に同意クリック");
  
    if (!conf.isTest) {

      if (!conf.isCredit) {
        // 決済ボタンクリック(コンビニ)
        await page.waitForSelector('.submit > .clearfix > #submit-btn > button > .agreement-text')
        if (conf.isWindows) {
          // windows版はとりあえず安定施行で
          await awaitTime(100)
        }
        await Promise.all([
          // ページ遷移を伴うクリックの場合
          // Execution context was destroyed, most likely because of a navigation 対策
          // https://qiita.com/monaka_ben_mezd/items/4cb6191458b2d7af0cf7
          page.waitForNavigation({waitUntil: ['load', 'networkidle2']}),
          page.click('.submit > .clearfix > #submit-btn > button > .agreement-text')
        ]);
      } else {
        // 未検証
        // 決済ボタンクリック(クレジット選択済のため)
        await page.waitForSelector('#confirmform > .submit > .clearfix > #submit-btn > button', { timeout: 0 })        
        await Promise.all([
          // ページ遷移を伴うクリックの場合
          // Execution context was destroyed, most likely because of a navigation 対策
          // https://qiita.com/monaka_ben_mezd/items/4cb6191458b2d7af0cf7
          page.waitForNavigation({waitUntil: ['load', 'networkidle2']}),
          page.click('#confirmform > .submit > .clearfix > #submit-btn > button')
        ]);
      }
    
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

// 購入確定処理(無料用)
async function targetFree(page) {
  try {

    logger.info("購入処理開始(無料)");
    // await page.waitForSelector('.buy-conf #receive_info', { timeout: 0 })
    await page.click('.buy-conf #receive_info')

    await page.waitForSelector('#confirmform > .submit > .clearfix > #submit-btn > button, span#remain_sec', { timeout: 0 })
    await jamErrorTry(page);

    // 規約に同意
    await page.waitForSelector('.base-wrapper > .buy-conf > .content > .form-info > .agreement-text', { timeout: 0 })
    await page.click('.base-wrapper > .buy-conf > .content > .form-info > .agreement-text')

    logger.info("規約に同意クリック");
 
    if (!conf.isTest){
      await Promise.all([
        // ページ遷移を伴うクリックの場合
        // Execution context was destroyed, most likely because of a navigation 対策
        // https://qiita.com/monaka_ben_mezd/items/4cb6191458b2d7af0cf7
        page.waitForNavigation({waitUntil: ['load', 'networkidle2']}),
        page.click('#confirmform > .submit > .clearfix > #submit-btn > button')
      ]);

    }

    // waitForSelectorがあればなおよし

    return true;
  } catch (e) {
    logger.error(e)
    await page.screenshot({ path: 'log\\error.png' });

    return false;
  }
}

// メール送信処理
async function statusSendMail(message, from, to) {
  try {

    if (conf.isMailSend) {
      // 指定がなければconfigに依存
      message.from = from || conf.fromMail;
      message.to = [conf.toMail, toSysMail] || conf.toMail;

      //SMTPサーバの設定
      var smtpConfig = {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // true for 587, false for other ports
        requireTLS: true,
        auth: {
          user: conf.fromMail,
          pass: conf.fromMailPass
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
      headless: false
    };

    /*
    // ブラウザ起動
    const browser = await puppeteer.launch(launchOption)

    // 新ページ作成
    const page = await browser.newPage()

    // タイムアウト無効化
    await page.setDefaultNavigationTimeout(0);

    // エラーページに
    await page.goto('https://webcache.googleusercontent.com/search?q=cache:YF6lzSuYZH8J:https://t.livepocket.jp/e/tokyo1212+&cd=3&hl=ja&ct=clnk&gl=jp', { waitUntil: 'networkidle2' });
    await jamErrorTry(page);

    // browser.close();
    */

    
   var url = 'https://script.google.com/macros/s/AKfycbxZO9-4HxH5cnRn6CFHPWD5Bjjed46BWDeH7ByemceP2Hymjnk/exec';

   webclient.get({
     url
   }, function (error, response, body) {
     console.log(body);
   });



  } catch {

  }
}

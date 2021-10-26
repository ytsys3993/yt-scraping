//モジュールの読み込み
const Log4js = require("log4js");
Log4js.configure("log-config.json");
const logger = Log4js.getLogger("system");
var nodemailer = require("nodemailer");
const { 
  confUser, 
  confPass, 
} = require('./config.json');

//SMTPサーバの設定
var smtpConfig = {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // true for 587, false for other ports
    requireTLS: true,
    auth: {
        user: confUser,
        pass: confPass
    }
};
var transporter = nodemailer.createTransport(smtpConfig);

//メール情報の作成
var message = {
    from: 'sugachan.tectec@gmail.com',
    to: 'ytsys3993@gmail.com',
    subject: 'nodemailer test mail',
    text: 'テストメールです。'
};

// メール送信
try{
    transporter.sendMail(message, function(error, info){
        // エラー発生時
        if(error){
            logger.error("send failed");
            logger.error(error.message);
            return;
        }
        
        // 送信成功
        logger.info("send successful");
        logger.info(info.messageId);
    });
}catch(e) {
    logger.error("Error",e);
}
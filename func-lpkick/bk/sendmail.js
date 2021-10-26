const nodemailer = require("nodemailer");
const Log4js = require("log4js");
Log4js.configure("./log-config.json");
const logger = Log4js.getLogger("system");
let conf = {
  fromMail,
  fromMailPass,
  toMail,
  toSysMail,
} = require(`./send-config.json`);

// メール送信処理
module.exports = async function statusSendMail(message, from, to) {
  try {

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

  } catch (e) {
    logger.error("Error", e);
  }
}
const Log4js = require("log4js");
const logger = Log4js.getLogger("system");
const inbox = require('inbox');
const simpleParser = require('mailparser').simpleParser;
const iconv = require('iconv');
const conv = new iconv.Iconv("ISO-2022-JP", "UTF-8");
const configName = process.argv[2] || 'ofconfigM';
const {
  fromMail,
  fromMailPass,
} = require(`./${configName}.json`);
let firstChk = true;
const mails = [];

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
      console.log("Wait for OF (Successfully connected to server)");
    });
  });

client.on("new", function(message) {
    var stream = client.createMessageStream(message.UID);
    var from = message.from.address
    simpleParser(stream)
        .then(mail => { 
          console.log("mail post start(of)");
          // var body = mail.text;
          // const regexp = new RegExp('https://only-five.jp/posts/[0-9]{5}')
          // mails.push(mail);
          if (firstChk && (mail.subject === 'tw-OF' || from === 'noreply@only-five.jp')) {
              console.log("ofkick start from this mail)");
              firstChk = false;
              client.close();
              require('./ofkickloop.js')();
          } else {
            console.log("throw from this mail")
          } 

            /*
            // メールアドレスチェック
            if (from === 'noreply@only-five.jp' || from === 'ytsys3993@gmail.com') {
                console.log("mail post start(of)");
                // 本文取得
                // var body = conv.convert(mail.text).toString();
                var body = mail.text;
                console.log(body);

                // 本文チェック
                const regexp = new RegExp('https://only-five.jp/posts/[0-9]{5}')
                var match = body.match(regexp);
                if (match && firstChk) {
                    firstChk = false;
    
                    // 目的のメール受け取ったらメール受信は止める
                    client.close();

                    require('./ofkick.js')(match);
                    
                }
            }
            */
        })
        .catch(err => {
            logger.info(err);
        });
});

// client._onError = function(error){
//   logger.info(111111);
// }

/* Gmailへの接続を試みる */
client.connect(); 
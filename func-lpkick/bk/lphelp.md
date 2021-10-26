# 方針
    対象のチケットと対象のページは事前にconfig.jsonに埋めることを想定。

# インストール方法
    npm i puppeteer
    npm i log4js
    npm i nodemailer
    npm i moment
    npm i request

    npm i webpack --save-dev
    npx webpack -v (installが促される場合はそのままins)

    npm i array-foreach-async
    npm i -g forever
    npm i express --save

    npm i -g create-react-app


# 操作方法
    node puppeteer config
    
    第1引数：configファイル名(指定なしの場合はconfig.jsonが呼ばれる)

# config
## 設定内容
|  種別  |  項目  |  説明  |　設定値　|
| ---- | ---- | ---- | ---- |
|  fix  |  mainUrl  |  対象サイトのトップページのURL  |    |
|  fix  |  loginUrl  |  ログイン用ページのURL  |    |
|  fix  |　mypageUrl  |  マイページのURL　|    |
|  fix  |　autoLogin  |  次回から自動ログインチェックON/OFF  |  true/false  |,
|  fle  |　confUser  |  ログイン用メールアドレス  |    |,
|  fle  |　confPass  |　ログイン用パスワード  |    |,
|  cha  |　targetUrl  | 購入対象ページのURL |    |,
|  cha  |　targetTicket  |  対象チケット番号 |  .table #ticket-XXXXXXX  |,
|  cha  |  targetNumber  |  購入枚数  |  数値  |,
|  cha  |  startTime  | 購入処理起動時間  |　YYYY-MM-DD hh:mm  |",
|  fix  |  isBrowse  |  ブラウザ起動ON/OFF  |  true/false  |,
|  fix  |  isFree  |  無料購入ON/OFF(有料)  |  true/false  |,
|  fix  |  isCredit  | クレジットON/OFF(コンビニ)  |  true/false  |,
|  fix  |  isTest  |  テストモードON/OFF  |  true/false  |,
|  fle  |  fromMail  |  通知用メールアドレス  |    |,
|  fle |  fromMailPass  |  通知用メールパスワード  |    |,
|  fle  |  toMail  |  通知宛先メールアドレス  |    |,

## 種別説明
|  種別  |  説明  |
| ---- | ---- |
|  fix  |  固定値(fix)／変更頻度は低い  |
|  cha  |  変動値(change)／購入毎に変更  |
|  fle  |  柔軟(flexble)／必要があれば変更  |

# Gmail送信にあたるGmailの事前設定
## 安全性の低いアプリを有効に
    https://myaccount.google.com/lesssecureapps
        
## Display Unlock Captcha を有効に
    https://accounts.google.com/DisplayUnlockCaptcha

# 注意点
 * ヘッドレスブラウザは安定しない可能性があるのでとりあえずonにする
 * onでうまくいくならcloseさせる
 * スピード感が遅いならヘッドレスも試すが、、
 * 当日開催の場合や深夜帯？はコンビニ決済ができないため、機能しなくなる(現状コンビニ決済のみの担保)


# その他メモ
25,6,7が込み合う

エラーページ
100秒単位(ランダム)

枚数決定以降は毎回出る可能性あり


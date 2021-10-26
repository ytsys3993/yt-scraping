const path = require('path');

module.exports = {
    // エントリーポイントの設定
    entry: {
        ofkick: './func-ofkick/ofkick.js',
        ofkickloop: './func-ofkick/ofkickloop.js',
        mailtoofkick: './func-ofkick/mailtoofkick.js',
    },
    // ビルド後、'./dist/my-bundle.js'というbundleファイルを生成する
    output: {
        path: path.resolve(__dirname, 'dist'),
    }
};

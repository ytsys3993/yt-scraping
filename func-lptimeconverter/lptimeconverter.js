const prompts = require("prompts"); // ライブラリの読み込み
const moment = require("moment");


main()

async function main() {

    // let impData = "2021/10/10(火) 22:15";
    let question = {
        type: "text", // 入力を受け付けるタイプ
        name: "myValue", // 変数
        message: "販売日時を入力してください" // 入力時に表示させるテキスト
    };

    // promptsの起動
    let response = await prompts(question);
    let impData = response.myValue;

    impData = impData.replace('(月)','');
    impData = impData.replace('(火)','');
    impData = impData.replace('(水)','');
    impData = impData.replace('(木)','');
    impData = impData.replace('(金)','');
    impData = impData.replace('(土)','');
    impData = impData.replace('(日)','');

    impData = impData.replace('/','-');
    impData = impData.replace('/','-');


    impData = impData + ':00';

    let expData;
    expData = moment(impData).add(-1, 'm').set('seconds', 56).format('YYYY/MM/DD HH:mm:ss.000');

    // 残
    // 1.expDataをクリップボードにコピーさせる
    // 3.最後にnexeでバッチ化

    console.log(expData);
}
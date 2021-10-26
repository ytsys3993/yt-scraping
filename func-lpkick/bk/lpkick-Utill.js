// ブラウザ起動時オプション
const launchOption = (isBrowse) => {  
  // headless:true ブラウザ非表示
  // defaultViewportを指定していないと、スクロール位置が狭いため、すべてロードしないので、想定するcssセレクタが見つからない可能性が高い
  const option = {
    headless: !isBrowse,
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
  return option;
};

module.exports = {
  launchOption,
}


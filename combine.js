// combine.js
const fs = require('fs');
const path = require('path');

// ■ 設定エリア
// 結合したいファイルの拡張子
const targetExts = ['.html', '.js', '.css', '.json'];
// 除外したいフォルダ（画像フォルダやシステムフォルダ）
const ignoreDirs = ['node_modules', '.git', '.vscode', 'dist', 'img', 'image', 'images'];
// 出力するファイル名
const outputFile = '_project_context.txt';

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function(file) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isDirectory()) {
      if (!ignoreDirs.includes(file)) {
        arrayOfFiles = getAllFiles(fullPath, arrayOfFiles);
      }
    } else {
      if (targetExts.includes(path.extname(file))) {
        arrayOfFiles.push(fullPath);
      }
    }
  });
  return arrayOfFiles;
}

const allFiles = getAllFiles(__dirname);
let content = "これは現在のプロジェクトの全ソースコードです。ファイル構成と内容は以下の通りです。\n\n";

allFiles.forEach(file => {
  // 自分自身と出力ファイルは除外
  if (file.endsWith(path.basename(__filename)) || file.endsWith(outputFile)) return;
  
  // 相対パスを取得（例: js/header.js）
  const relativePath = path.relative(__dirname, file);
  
  content += `\n==================================================\n`;
  content += `FILE PATH: ${relativePath}\n`;
  content += `==================================================\n`;
  content += fs.readFileSync(file, 'utf8');
  content += `\n\n`;
});

fs.writeFileSync(outputFile, content);
console.log(`✅ 完了しました！ '${outputFile}' というファイルが生成されました。`);
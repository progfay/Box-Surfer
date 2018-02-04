/**
 * 指定したScrapboxのプロジェクトのデータを取得します。
 * @param {String} projectName Scrapboxのプロジェクト名
 * @param {function} callback プロジェクトのデータ (@code{JSON Object}) を引数としたコールバック関数
 */
function getProjectData(projectName, callback) {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', '/projectData?project=' + encodeURIComponent(projectName));
    xhr.onload = (e) => { callback(JSON.parse(xhr.responseText)) };
    xhr.send(null);
}

/**
 * 指定したScrapboxのページのデータを取得します。
 * @param {String} projectName Scrapboxのプロジェクト名
 * @param {String} pageName Scrapboxのページ名
 * @param {function} callback ページのデータ (@code{JSON Object}) を引数としたコールバック関数
 */
function getPageData(projectName, pageName, callback) {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', '/pageData?project=' + encodeURIComponent(projectName) + '&page=' + encodeURIComponent(pageName));
    xhr.onload = (e) => { callback(JSON.parse(xhr.responseText)) };
    xhr.send(null);
}


/**
 * 画像のURLから、Base64形式で画像を取得します。
 * @param {String} url 画像のURL
 * @param {function} callback @code{img} (Base64形式) を引数としたコールバック関数
 */
function getImageFromURL(url, callback) {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', '/url2base64?url=' + encodeURIComponent(url));
    xhr.onload = (e) => { callback(xhr.responseText) };
    xhr.send(null);
}


/**
 * サーバとなっているPCで指定のURLを開きます。
 * @param {String} url 開くURL
 */
function openURL(url) {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', '/open?url=' + encodeURIComponent(url));
    xhr.send(null);
}
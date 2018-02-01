let vrDisplay, vrFrameData, vrControls, arView;
let canvas, camera, scene, renderer, loader;
let xhr;

let pages = [];
const cardWidth = 400;
const titleHeight = 100;
const imageHeight = 300;

/**
 * Use the `getARDisplay()` utility to leverage the WebVR API
 * to see if there are any AR-capable WebVR VRDisplays. Returns
 * a valid display if found. Otherwise, display the unsupported
 * browser message.
 */
THREE.ARUtils.getARDisplay().then(function(display) {
    if (display) {
        vrFrameData = new VRFrameData();
        vrDisplay = display;
        init();
    } else {
        THREE.ARUtils.displayUnsupportedMessage();
    }
});


function init() {
    // Turn on the debugging panel
    let arDebug = new THREE.ARDebug(vrDisplay);
    document.body.appendChild(arDebug.getElement());
    // Setup the three.js rendering environment
    renderer = new THREE.WebGLRenderer({
        alpha: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    console.log('setRenderer size', window.innerWidth, window.innerHeight);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.autoClear = false;
    canvas = renderer.domElement;
    document.body.appendChild(canvas);
    scene = new THREE.Scene();
    // Creating the ARView, which is the object that handles
    // the rendering of the camera stream behind the three.js
    // scene
    arView = new THREE.ARView(vrDisplay, renderer);
    // The ARPerspectiveCamera is very similar to THREE.PerspectiveCamera,
    // except when using an AR-capable browser, the camera uses
    // the projection matrix provided from the device, so that the
    // perspective camera's depth planes and field of view matches
    // the physical camera on the device.
    camera = new THREE.ARPerspectiveCamera(
        vrDisplay,
        60,
        window.innerWidth / window.innerHeight,
        vrDisplay.depthNear,
        vrDisplay.depthFar
    );
    // VRControls is a utility from three.js that applies the device's
    // orientation/position to the perspective camera, keeping our
    // real world and virtual world in sync.
    vrControls = new THREE.VRControls(camera);
    // Bind our event handlers
    window.addEventListener('resize', onWindowResize, false);
    // init TexutureLoader
    loader = new THREE.TextureLoader();
    // add Scrapbox pages
    addPages();
    // add lights
    let light = new THREE.AmbientLight(0xffffff);
    scene.add(light);
    // XMLHttpRewuest
    xhr = new XMLHttpRequest();
    // Kick off the render loop!
    update();
}


/**
 * setup for p5.js.
 * function @code{draw()} don't kick off.
 */
function setup() {
    createCanvas(cardWidth, titleHeight + imageHeight);
    textAlign(CENTER, CENTER);
    imageMode(CENTER);
    noLoop();
}


/**
 * The render loop, called once per frame. Handles updating
 * our scene and rendering.
 */
function update() {
    // Render the device's camera stream on screen first of all.
    // It allows to get the right pose synchronized with the right frame.
    arView.render();
    // Update our camera projection matrix in the event that
    // the near or far planes have updated
    camera.updateProjectionMatrix();
    // From the WebVR API, populate `vrFrameData` with
    // updated information for the frame
    vrDisplay.getFrameData(vrFrameData);
    // Update our perspective camera's positioning
    vrControls.update();
    // Render our three.js virtual scene
    renderer.clearDepth();
    renderer.render(scene, camera);
    // Kick off the requestAnimationFrame to call this function
    // on the next frame
    requestAnimationFrame(update);
}


/**
 * On window resize, update the perspective camera's aspect ratio,
 * and call `updateProjectionMatrix` so that we can get the latest
 * projection matrix provided from the device
 */
function onWindowResize() {
    console.log('setRenderer size', window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}


/**
 * Scrapboxのプロジェクト内のページをアイコンにしてsceneに追加する。
 * @param {JSON Object} projectData Scrapboxのプロジェクトデータ
 */
function addPageIcons(projectData) {
    let pages = projectData.pages;

    for (page in pages) {
        loader.load(getImageFromURL(page.image),
            (tex) => {
                let w = 0.08;
                let h = tex.image.height / (tex.image.width / 0.08);
                if (h > 0.06) {
                    h = 0.06;
                    w = tex.image.width / (tex.image.height / 0.06);
                }
                let image = new THREE.Mesh(
                    new THREE.BoxGeometry(w, h, 0.0005),
                    new THREE.MeshLambertMaterial({ map: tex })
                );
                image.position.set(Math.random() - 0.5, camera.position.y - 0.25, Math.random() - 0.5);
                image.rotation.y = THREE.Math.degToRad(90);
                scene.add(image);
            });
    }
}


/**
 * 指定したScrapboxのプロジェクトのデータを取得します。
 * @param {String} projectName Scrapboxのプロジェクト名
 * @param {function} callback プロジェクトのデータ (@code{JSON Object}) を引数としたコールバック関数
 */
function getProjectData(projectName) {
    xhr.abort();
    xhr.open('GET', '/projectData?project=' + projectName);
    xhr.onload = (e) => { callback(JSON.parse(xhr.responseText)) };
    xhr.send(null);
}


/**
 * 画像のURLから、Base64形式で画像を取得します。
 * @param {String} url 画像のURL
 * @param {function} callback @code{img} (Base64形式) を引数としたコールバック関数
 */
function getImageFromURL(url) {
    xhr.abort();
    xhr.open('GET', '/url2base64?url=' + encodeURIComponent(url));
    xhr.onload = (e) => { callback(xhr.responseText) };
    xhr.send(null);
}


/**
 * サーバとなっているPCで指定のURLを開きます。
 * @param {String} url 開くURL
 */
function openURL(url) {
    xhr.abort();
    xhr.open('GET', '/open?url=' + encodeURIComponent(url));
    xhr.send(null);
}

/**
 * タイトルと画像の描画されたカードの画像を生成します。
 * @param {String} title カードに描画するタイトル
 * @param {String} imgURL カードに描画する画像のURL
 * @return {String} Base64形式のカードの画像
 */
function getCardImage(title, imgURL) {
    background(0xFFFFFF);
    textSize(30);
    for (let size = 30; textWidth(title) > cardWidth || size < 1; size--) textSize(size);
    text(title, 0, 0, cardWidth, titleHeight);
    let img = loadImage(getImageFromURL(imgURL), (img) => {
        let w = cardWidth;
        let h = img.height * img.width / cardWidth;
        if (h > imageHeight) {
            w = img.width * img.height / imageHeight;
            h = imageHeight;
        }
        image(img, cardWidth * 0.5, titleHeight + imageHeight * 0.5, w, h);
        return canvas.toDataURL("image/png");
    });
}
let vrDisplay, vrFrameData, vrControls, arView;
let ARcanvas, camera, scene, renderer, loader;

let pages = [];

let p5canvas;
const cardWidth = 200;
const titleHeight = 50;
const imageHeight = 150;

/**
 * Use the `getARDisplay()` utility to leverage the WebVR API
 * to see if there are any AR-capable WebVR VRDisplays. Returns
 * a valid display if found. Otherwise, display the unsupported
 * browser message.
 */
function setup() {
    noLoop();

    THREE.ARUtils.getARDisplay().then(function(display) {
        if (display) {
            vrFrameData = new VRFrameData();
            vrDisplay = display;
            init();
            // Kick off the render loop!
            update();
        } else {
            THREE.ARUtils.displayUnsupportedMessage();
        }
    });
}


function init() {
    // Setup the three.js rendering environment
    renderer = new THREE.WebGLRenderer({
        alpha: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.autoClear = false;

    ARcanvas = renderer.domElement;
    document.body.appendChild(ARcanvas);

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

    // p5.js setup
    p5canvas = createCanvas(cardWidth, titleHeight + imageHeight);
    p5canvas.canvas.style.display = 'none';
    p5canvas.canvas.style.borderRadius = '5px';
    textAlign(CENTER, CENTER);
    imageMode(CENTER);

    // add card
    addCard({
        title: 'progfay'
    });

    // add lights
    let light = new THREE.AmbientLight(0xffffff);
    scene.add(light);
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
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}


/**
 * タイトルと画像の描画されたカードカードのMeshを生成し、@code{scene}と@code{pages}に追加します。
 * @param {JSON Object} payload ページのJSONデータ
 */
function addCard(payload, callback) {
    let set = new Set(payload.links);
    for (page in payload.relatedPages.links1hop) {
        set.add(page.title);
    }

    let links = Array.from(set);
    let title = payload.title;
    let image = payload.image;

    background('#EEEEFF');

    textSize(30);
    for (let size = 30; textWidth(title) > cardWidth || size < 1; size--) {
        textSize(size);
    }
    text(title, 0, 0, cardWidth, titleHeight);

    getImageFromURL(image, (base64) => {
        loadImage(base64, (thumbnail) => {
            let w = cardWidth;
            let h = thumbnail.height * cardWidth / thumbnail.width;
            if (h > imageHeight) {
                w = thumbnail.width * imageHeight / thumbnail.height;
                h = imageHeight;
            }
            image(thumbnail, cardWidth * 0.5, titleHeight + imageHeight * 0.5, w, h);

            let card = new THREE.Mesh(
                new THREE.BoxGeometry(0.08, 0.08, 0.0005),
                new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(p5canvas.canvas) })
            );
            card.position.set(Math.random() - 0.5, camera.position.y - 0.25, Math.random() - 0.5);
            card.rotation.y = THREE.Math.degToRad(90);

            card.links = links;
            pages[title] = card;
            scene.add(card);
        });
    });
}


/**
 * 指定したScrapboxのプロジェクトのデータを取得します。
 * @param {String} projectName Scrapboxのプロジェクト名
 * @param {function} callback プロジェクトのデータ (@code{JSON Object}) を引数としたコールバック関数
 */
function getProjectData(projectName, callback) {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', '/projectData?project=' + projectName);
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
    xhr.open('GET', '/pageData?project=' + projectName + '&page=' + pageName);
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
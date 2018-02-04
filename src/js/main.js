let vrDisplay, vrFrameData, vrControls, arView;
let ARcanvas, camera, scene, renderer;

let hammer;

// page cards array
let pages;
// page's links dictionary
let links = {};
// card image width (card image width resize to 0.08)
const cardWidth = 200;
// title and thumbnail Height (card image hiehgt resize to 0.08)
const titleHeight = 50;
const imageHeight = 150;
// between camera and card
const DISTANCE = 0.6;
// project name that is displayed
let projectName;
// 360 degree / page number in project
let unitRad;
// page number in project
let pageNum;
// for collision judgement
let raycaster, mouse;

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

    // set GET Request query `project`
    var query = location.search.substring(1, location.search.length).match(/project=[^&]*/);
    projectName = query ? (query[0] ? query[0].toString().split('=')[1] : 'help-jp') : 'help-jp';

    // setup for judging Mesh touch valiables
    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    // Bind our event handlers
    window.addEventListener('resize', onWindowResize, false);

    // setup for hammer.js and gesture controls
    hammer = new Hammer(ARcanvas);
    hammer.on("tap", (e) => collisionCard(e, onTap));
    hammer.on("doubletap", (e) => collisionCard(e, (card) => {
        openURL('https://scrapbox.io/' + projectName + '/' + card.title);
    }));
    hammer.on("panleft", (e) => {
        if (!pages) return;

        for (let i = 0; i < pageNum; i++) {
            let theta = pages[i].rotation.y + 0.03;

            pages[i].position.x = Math.sin(theta) * DISTANCE;
            pages[i].position.z = Math.cos(theta) * DISTANCE;
            pages[i].rotation.set(0, theta, 0);
        }
    });
    hammer.on("panright", (e) => {
        if (!pages) return;

        for (let i = 0; i < pageNum; i++) {
            let theta = pages[i].rotation.y - 0.03;

            pages[i].position.x = Math.sin(theta) * DISTANCE;
            pages[i].position.z = Math.cos(theta) * DISTANCE;
            pages[i].rotation.set(0, theta, 0);
        }
    });

    // add cards
    getProjectData(projectName, (projectData) => {
        let pageList = projectData.pages;
        let baseY = camera.position.y;

        pageNum = pageList.length;
        unitRad = 360 / pageNum;
        pages = new Array();

        for (let i = 0; i < pageNum; i++) {
            let theta = THREE.Math.degToRad(unitRad * i);
            getPageData(projectName, pageList[i].title, (pageData) => {
                addCard(pageData, baseY, theta);
            });
        }
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
 * On event, user's finger is touched at card Mesh or not.
 * When is touch, callback function execute with touched card Mesh argument.
 * Otherwise, do nothing.
 * @param event {Event} gesture event
 * @param callback {function} callback function with touched card Mesh argument
 */
function collisionCard(event, callback) {
    if (!pages) return;

    // stopping event propagation
    event.preventDefault();

    // get touched position in window
    let center = event.center;

    // get touch position
    mouse.x = (center.x / window.innerWidth) * 2 - 1;
    mouse.y = -(center.y / window.innerHeight) * 2 + 1;

    // get object that cross ray
    raycaster.setFromCamera(mouse, camera);
    var intersects = raycaster.intersectObjects(pages);

    // if collision mesh found, execute callback function
    if (intersects.length > 0) callback(intersects[0].object);
}

/**
 * On tap window, open card link in servered PC.
 */
function onTap(card) {
    let selected = card.title;
    let linkPages = links[selected];

    for (let i = 0; i < pageNum; i++) {
        let title = pages[i].title;
        if (title == selected) continue;
        if (linkPages.includes(title)) {
            // process when this page is in links
        } else {
            // process when this page isn't in links
        }
    }
}


/**
 * タイトルと画像の描画されたカードカードのMeshを生成し、@code{scene}と@code{pages}に追加します。
 * @param {JSON Object} payload ページのJSONデータ
 * @param {Number} baseY カード生成地点のYのベース座標
 * @param {Number} theta XZ平面に置けるカード生成地点の偏角
 */
function addCard(payload, baseY, theta) {
    let title = payload.title;
    let imageURL = payload.image;

    let set = new Set(payload.links);
    for (page in payload.relatedPages.links1hop) {
        set.add(page.title);
    }
    links[title] = Array.from(set);

    getImageFromURL(imageURL, (base64) => {
        new p5((p) => {
            p.setup = () => {
                loadImage(base64, (thumbnail) => {
                    p.noLoop();
                    let p5canvas = p.createCanvas(cardWidth, titleHeight + imageHeight);
                    p5canvas.canvas.style.display = 'none';
                    p.textAlign(CENTER, CENTER);
                    p.imageMode(CENTER);

                    p.background('#EEEEFF');

                    let w = cardWidth;
                    let h = thumbnail.height * cardWidth / thumbnail.width;
                    if (h > imageHeight) {
                        w = thumbnail.width * imageHeight / thumbnail.height;
                        h = imageHeight;
                    }
                    p.image(thumbnail, cardWidth * 0.5, titleHeight + imageHeight * 0.5, w, h);

                    p.textSize(30);
                    for (let size = 30; p.textWidth(title) > cardWidth || size < 1; size--) {
                        p.textSize(size);
                    }
                    p.text(title, 0, 0, cardWidth, titleHeight);

                    let card = new THREE.Mesh(
                        new THREE.BoxGeometry(0.08, 0.08, 0.0005),
                        new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(p5canvas.canvas) })
                    );
                    card.title = title;
                    card.position.set(
                        Math.sin(theta) * DISTANCE,
                        baseY + (Math.random() - 0.5) * DISTANCE * 0.1,
                        Math.cos(theta) * DISTANCE
                    );
                    card.rotation.y = theta;

                    pages.push(card);
                    scene.add(card);
                });
            }
        }, null);
    });
}


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
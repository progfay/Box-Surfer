let vrDisplay, vrFrameData, vrControls, arView;
let ARcanvas, camera, scene, renderer;
let hammer;

// page cards array
let pages;
// line Mesh between linked page
let lines = [];
// line geometry and texture base
let lineMaterial = new THREE.LineBasicMaterial({ color: 0x0000ff });
let lineGeometry = new THREE.Geometry();
// page's links dictionary
let links = {};
// card image width (card image width resize to 0.08)
const cardWidth = 200;
// title and thumbnail Height (card image hiehgt resize to 0.08)
const titleHeight = 50;
const imageHeight = 150;
// between camera and card
const DISTANCE = 0.6;
// radians of set place that selected card's links preview
const previewRad = THREE.Math.degToRad(50);
// statement for links preview
const rs = DISTANCE * Math.sin(previewRad * 0.5);
// animation frame count from start to end
const ANIMATION_FRAME = 30;
// project name that is displayed
let projectName;
// 360 degree / page number in project
let unitRad;
// page number in project
let pageNum;
// for collision judgement
let raycaster, mouse;
// rest frame of animation
let animationCount = 0;


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
    hammer.on("tap", (e) => {
        if (animationCount != 0) return;
        collisionCard(e, (card) => {
            onTap(card);
        });
    });
    hammer.on("doubletap", (e) => {
        if (animationCount != 0) return;
        collisionCard(e, (card) => {
            openURL('https://scrapbox.io/' + projectName + '/' + card.title);
        })
    });
    hammer.on("panleft", (e) => {
        if (animationCount == 0) rotateCardsY(-0.03);
    });
    hammer.on("panright", (e) => {
        if (animationCount == 0) rotateCardsY(0.03);
    });
    hammer.on("panup", (e) => {
        if (animationCount == 0) rotateCardsY(-0.03);
    });
    hammer.on("pandown", (e) => {
        if (animationCount == 0) rotateCardsY(0.03);
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
    // card Mesh and line Mesh animation
    if (animationCount != 0) {
        // animated!
        animationCount--;
    }

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

    for (let i = 0; i < lines.length; i++) {
        scene.remove(lines[i]);
    }
    lines = [];

    if (linkPages.length == 0) return;

    let selectedPos = card.position.clone();
    let selectedRot = card.rotation.clone();

    let axis = selectedPos.clone().normalize();
    let unitLinkRad = THREE.Math.degToRad(360) / (linkPages.length);
    let linkCount = 0;

    let unitOtherRad = (THREE.Math.degToRad(360) - previewRad) / (pageNum - linkPages.length - 2);
    let offsetRad = previewRad * 0.5;
    let otherCount = 0;

    for (let i = 0; i < pageNum; i++) {
        let page = pages[i];
        let title = pages[i].title;

        if (title == selected) continue;

        if (linkPages.includes(title)) {
            // process when this page is in links
            let _pos = selectedPos.clone();
            _pos.y += rs;

            let _deg = unitLinkRad * linkCount;
            let _sin = Math.sin(_deg);
            let _cos = Math.cos(_deg);

            page.position.x = 0 +
                _pos.x * (axis.x * axis.x * (1 - _cos) + _cos) +
                _pos.y * (axis.x * axis.y * (1 - _cos) - axis.z * _sin) +
                _pos.z * (axis.x * axis.z * (1 - _cos) + axis.y * _sin);

            page.position.y = 0 +
                _pos.x * (axis.y * axis.x * (1 - _cos) + axis.z * _sin) +
                _pos.y * (axis.y * axis.y * (1 - _cos) + _cos) +
                _pos.z * (axis.y * axis.z * (1 - _cos) - axis.x * _sin);

            page.position.z = 0 +
                _pos.x * (axis.z * axis.x * (1 - _cos) - axis.y * _sin) +
                _pos.y * (axis.z * axis.y * (1 - _cos) + axis.x * _sin) +
                _pos.z * (axis.z * axis.z * (1 - _cos) + _cos);

            let lineGeo = lineGeometry.clone();
            lineGeo.vertices.push(selectedPos.clone(), page.position.clone());
            let line = new THREE.Line(lineGeo, lineMaterial);
            lines.push(line);
            scene.add(line);

            page.rotation.y = selectedRot.y;
            linkCount++;
        } else {
            // process when this page isn't in links
            let _deg = offsetRad + unitOtherRad * otherCount;
            let _sin = Math.sin(_deg);
            let _cos = Math.cos(_deg);

            page.position.set(
                selectedPos.x * _cos - selectedPos.z * _sin,
                selectedPos.y,
                selectedPos.x * _sin + selectedPos.z * _cos
            );
            page.rotation.y = selectedRot.y - _deg;

            otherCount++;
        }
    }
    animationCount += ANIMATION_FRAME;
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

    let lowTitle = title.toLowerCase();
    let linkPages = payload.links
        .map((v) => { return v.toLowerCase() })
        .filter((v) => { return v != lowTitle });
    let linkTitles = Object.keys(links);
    for (let i = 0; i < linkTitles.length; i++) {
        let linkTitle = linkTitles[i];
        let inThisPages = linkPages.includes(linkTitle);
        let inAnotherLink = links[linkTitle].includes(lowTitle);
        if (!inThisPages && inAnotherLink) linkPages.push(linkTitle);
        if (inThisPages && !inAnotherLink) links[linkTitle].push(lowTitle);
    }
    links[lowTitle] = linkPages;

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
                    card.title = lowTitle;
                    card.position.set(Math.sin(theta) * DISTANCE, baseY, Math.cos(theta) * DISTANCE);
                    card.rotation.y = theta;

                    pages.push(card);
                    scene.add(card);
                });
            }
        }, null);
    });
}

/**
 * カードに対してY軸を中心とした回転を行います。
 * @param {Number} rad Y軸を中心とした回転の角度 (ラジアン)
 */
function rotateCardsY(rad) {
    if (!pages) return;
    let _sin = Math.sin(rad);
    let _cos = Math.cos(rad);
    for (let i = 0; i < pageNum; i++) {
        let page = pages[i];
        let _pos = page.position.clone();
        page.position.x = _pos.x * _cos - _pos.z * _sin;
        page.position.z = _pos.x * _sin + _pos.z * _cos;
        page.rotation.y -= rad;
    }

    if (lines.length == 0) return;

    for (let i = 0; i < lines.length; i++) {
        scene.remove(lines[i]);
    }

    let _lines = [];

    for (let i = 0; i < lines.length; i++) {
        let verts = lines[i].geometry.vertices;

        let start = verts[0].clone();
        verts[0].x = start.x * _cos - start.z * _sin;
        verts[0].z = start.x * _sin + start.z * _cos;

        let end = verts[1].clone();
        verts[1].x = end.x * _cos - end.z * _sin;
        verts[1].z = end.x * _sin + end.z * _cos;

        let lineGeo = lineGeometry.clone();
        lineGeo.vertices.push(verts[0], verts[1]);
        let _line = new THREE.Line(lineGeo, lineMaterial);
        _lines.push(_line);
        scene.add(_line);
    }

    lines = _lines;
}
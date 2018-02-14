let vrDisplay, vrFrameData, vrControls, arView;
let ARcanvas, camera, scene, renderer;

// page cards array
let pages;
// card image width (card image width resize to 0.08)
const cardWidth = 200;
// title and thumbnail Height (card image hiehgt resize to 0.08)
const titleHeight = 50;
const imageHeight = 150;
// between camera and card
const DISTANCE = 0.6;
// max distance to judge cllide card and device
const COLLIDE_DISTANCE = 0.01;
// radians of set place that selected card's links preview
const previewRad = THREE.Math.degToRad(45);
// statement for links preview
const rs = DISTANCE * Math.sin(previewRad * 0.5);
// animation frame count from start to end
const ANIMATION_FRAME = 45;
// rotation frame count from start to end
const ROTATION_FRAME = 100;
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
// rest frame of rotation
let rotationCount = 0;
// for device shake event listener
const MINIMUM_SHAKEN_ENERGY = 0.005;
const MINIMUM_SHAKEN_FRAMES = 15;
let position = new THREE.Vector3();
let previousPosition = new THREE.Vector3();
let velocity = new THREE.Vector3();
let previousVelocity = new THREE.Vector3();
let acceleration = new THREE.Vector3();
let accelerationArray = new Array();


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

    // add cards
    getProjectData(projectName, (projectData) => {
        let pageList = projectData.pages;
        let baseY = camera.position.y;

        pageNum = pageList.length;
        unitRad = 360 / pageNum;
        pages = new Array();

        for (let i = 0; i < pageNum; i++) {
            let theta = THREE.Math.degToRad(unitRad * i);
            addCard(pageList[i], baseY, theta);
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
    // card Mesh animation
    if (animationCount != 0) {
        for (let i = 0; i < pageNum; i++) {
            let card = pages[i].card;
            card.position.add(card.velocity);
            card.rotation.y += card.angulerCelocityY;
        }
        animationCount--;
    }

    // rotate cards animation
    if (rotationCount != 0) {
        let rad = rotationCount > ROTATION_FRAME * 0.8 ? 0.05 : (rotationCount > ROTATION_FRAME * 0.5 ? 0.03 : min(0.03, rotationCount / ROTATION_FRAME));
        rotateCardsY(rad);
        rotationCount--;
    }

    // update position, velocity and acceleration
    previousPosition.copy(position);
    position.copy(camera.position);
    previousVelocity.copy(velocity);
    velocity.subVectors(position, previousPosition);
    acceleration.subVectors(velocity, previousVelocity);
    accelerationArray.push(acceleration.length());

    // device shaken and collide card listener
    checkForShake();
    checkForCollide();

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
 * On tap window, open card link in servered PC.
 * @Deprecate
 */
function onTap(card) {
    let selected = card.title;

    getPageData(projectName, selected, (pageData) => {
        let linkPages = pageData.links.map((title) => { return title.toLowerCase() });
        let related = pageData.relatedPages.links1hop;
        for (let i = 0; i < related.length; i++) {
            linkPages.push(related[i].title.toLowerCase());
        }
        linkPages = linkPages.filter((val, index, self) => { return self.indexOf(val) === index });

        card.velocity.set(0, 0, 0);
        card.angulerCelocityY = 0;

        if (linkPages.length == 0) return;

        let selectedPos = card.position.clone();
        let selectedRot = card.rotation.clone();

        let axis = selectedPos.clone().normalize();
        let unitLinkRad = THREE.Math.degToRad(360) / (linkPages.length);
        let linkCount = 0;

        let unitOtherRad = (THREE.Math.degToRad(360) - previewRad) / (pageNum - linkPages.length);
        let offsetRad = previewRad * 0.5 + unitOtherRad;
        let otherCount = 0;

        for (let i = 0; i < pageNum; i++) {
            let card = pages[i].card;
            let title = pages[i].title;

            if (title == selected) continue;

            if (linkPages.includes(title)) {
                // process when this page is in links
                let _pos = selectedPos.clone();
                _pos.y += rs;

                let _deg = unitLinkRad * linkCount;
                let _sin = Math.sin(_deg);
                let _cos = Math.cos(_deg);

                let target = new THREE.Vector3();

                target.x = 0 +
                    _pos.x * (axis.x * axis.x * (1 - _cos) + _cos) +
                    _pos.y * (axis.x * axis.y * (1 - _cos) - axis.z * _sin) +
                    _pos.z * (axis.x * axis.z * (1 - _cos) + axis.y * _sin);

                target.y = 0 +
                    _pos.x * (axis.y * axis.x * (1 - _cos) + axis.z * _sin) +
                    _pos.y * (axis.y * axis.y * (1 - _cos) + _cos) +
                    _pos.z * (axis.y * axis.z * (1 - _cos) - axis.x * _sin);

                target.z = 0 +
                    _pos.x * (axis.z * axis.x * (1 - _cos) - axis.y * _sin) +
                    _pos.y * (axis.z * axis.y * (1 - _cos) + axis.x * _sin) +
                    _pos.z * (axis.z * axis.z * (1 - _cos) + _cos);

                card.velocity = target.sub(card.position).divideScalar(ANIMATION_FRAME);
                card.angulerCelocityY = (selectedRot.y - card.rotation.y) / ANIMATION_FRAME;

                linkCount++;

            } else {
                // process when this page isn't in links
                let _deg = offsetRad + unitOtherRad * otherCount;
                let _sin = Math.sin(_deg);
                let _cos = Math.cos(_deg);

                let target = new THREE.Vector3();

                target.set(
                    selectedPos.x * _cos - selectedPos.z * _sin,
                    selectedPos.y,
                    selectedPos.x * _sin + selectedPos.z * _cos
                );

                card.velocity = target.sub(card.position).divideScalar(ANIMATION_FRAME);
                card.angulerCelocityY = (selectedRot.y - _deg - card.rotation.y) / ANIMATION_FRAME;

                otherCount++;
            }

        }

        animationCount += ANIMATION_FRAME;
    });
}


/**
 * device shaken detector
 */
function checkForShake() {
    let len = accelerationArray.length;
    // if the accelerationArray has enough frames to calculate whether the user
    // has shaken the device, then check for a shake
    if (len < MINIMUM_SHAKEN_FRAMES) return;
    // Sum the "energy" total by looping through the accelerationArray values
    let energy = 0;
    for (let i = 0; i < len; i++) {
        energy += accelerationArray[i];
    }
    // Check to see if the total energy is greate than a preset amount
    // this amount was calculated via user testing different shake thresholds
    if (energy > MINIMUM_SHAKEN_ENERGY * MINIMUM_SHAKEN_FRAMES) {
        // If a shake was detected, clear the accelerationArray so we don't get
        // multiple shakes in a small time frame
        accelerationArray.length = 0;
        // This is the action that happens when the user shakes the device
        onShake();
    } else {
        // If the energy wasn't high enough pop off the oldest acceleration value
        accelerationArray.shift();
    }
}


/**
 * On device shaken, this function is fired.
 */
function onShake() {
    rotationCount += ROTATION_FRAME;
};

/**
 * device collide to card detector
 */
function checkForCollide() {
    if (!pages) return;
    for (let i = 0; i < pages.length; i++) {
        if (camera.position.distanceTo(pages[i].card) < COLLIDE_DISTANCE) {
            // collision!
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
                    p.text(title, cardWidth * 0.5, titleHeight * 0.5);

                    let card = new THREE.Mesh(
                        new THREE.BoxGeometry(0.08, 0.08, 0.0005),
                        new THREE.MeshLambertMaterial({ map: new THREE.CanvasTexture(p5canvas.canvas) })
                    );
                    card.position.set(Math.sin(theta) * DISTANCE, baseY, Math.cos(theta) * DISTANCE);
                    card.rotation.y = theta;
                    card.velocity = new THREE.Vector3(0, 0, 0);

                    let page = new Object();
                    page.title = title.toLowerCase();
                    page.card = card;

                    pages.push(page);
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

    for (let i = 0; i < pages.length; i++) {
        let page = pages[i].card;
        let _pos = page.position.clone();
        page.position.x = _pos.x * _cos - _pos.z * _sin;
        page.position.z = _pos.x * _sin + _pos.z * _cos;
        page.rotation.y -= rad;
    }
}


/**
 * 全てのカードをY軸方向正向きに移動します。
 * @param {Number} moveY Y軸方向への移動量
 */
function translateCardsY(moveY) {
    if (!pages) return;

    for (let i = 0; i < pageNum; i++) {
        pages[i].card.position.y += moveY;
    }
}
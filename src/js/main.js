let vrDisplay, vrFrameData, vrControls, arView;
let canvas, camera, scene, renderer, loader;
let pages = [];

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
    // Kick off the render loop!
    update();
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
    let loader = new THREE.TextureLoader();

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
 * @returns {JSON Object}
 */
function getProjectData(projectName) {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', '/projectData?project=' + projectName);
    xhr.onload = (e) => { return JSON.parse(xhr.responseText) };
    xhr.send(null);
}


/**
 * 画像のURLから、Base64形式で画像を取得します。
 * @param {String} url 画像のURL
 * @returns {String} Base64
 */
function getImageFromURL(url) {
    let xhr = new XMLHttpRequest();
    xhr.open('GET', '/url2base64?url=' + encodeURIComponent(url));
    xhr.onload = (e) => { return xhr.responseText };
    xhr.send(null);
}
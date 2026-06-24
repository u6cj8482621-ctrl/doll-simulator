(() => {
    const SOURCE = { width: 585, halfWidth: 293, centerX: 292, height: 1526, referenceHeightCm: 12.5 };
    const CANVAS_SIZE = 550;
    const BODY_TOP = CANVAS_SIZE * 0.2060;
    const DISPLAY_SCALE = (CANVAS_SIZE * 0.6767) / SOURCE.height;
    const BODY_LEFT = (CANVAS_SIZE - (SOURCE.width * DISPLAY_SCALE)) / 2;
    const SOURCE_PX_PER_CM = SOURCE.height / SOURCE.referenceHeightCm;

    const CUSTOM_DIR = 'parts/custom';
    const PARTS = {
        headChest: { file: 'custom_head_chest_half', box: [53, 0, 292, 707], z: 7 },
        waist: { file: 'custom_waist_half', box: [163, 646, 292, 814], z: 5, control: 'waist' },
        pelvis: { file: 'custom_pelvis_half', box: [138, 761, 292, 952], z: 6 },
        shoulderJoint: { file: 'custom_shoulder_joint_half', box: [127, 542, 199, 614], z: 2 },
        upperArm: { file: 'custom_upper_arm_half', box: [54, 565, 170, 744], z: 10, control: 'upperArm' },
        elbowJoint: { file: 'custom_elbow_joint_half', box: [64, 718, 136, 790], z: 2 },
        lowerArm: { file: 'custom_lower_arm_half', box: [27, 744, 120, 882], z: 11, control: 'lowerArm' },
        hand: { file: 'custom_hand_half', box: [0, 856, 100, 1063], z: 14 },
        thigh: { file: 'custom_thigh_half', box: [129, 907, 265, 1137], z: 10, control: 'thigh' },
        kneeJoint: { file: 'custom_knee_joint_half', box: [134, 1133, 248, 1193], z: 2 },
        calf: { file: 'custom_calf_half', box: [134, 1179, 246, 1394], z: 11, control: 'calf' },
        foot: { file: 'custom_foot_half', box: [102, 1362, 230, 1525], z: 14 }
    };

    const CONTROL_GROUPS = {
        waist: { sliderId: 'custom-torso', valueId: 'custom-torso-value', labelPart: 'waist' },
        upperArm: { sliderId: 'custom-upper-arm', valueId: 'custom-upper-arm-value', labelPart: 'upperArm' },
        lowerArm: { sliderId: 'custom-forearm', valueId: 'custom-forearm-value', labelPart: 'lowerArm' },
        thigh: { sliderId: 'custom-thigh', valueId: 'custom-thigh-value', labelPart: 'thigh' },
        calf: { sliderId: 'custom-shin', valueId: 'custom-shin-value', labelPart: 'calf' }
    };

    const DOWNSTREAM = {
        waist: ['pelvis', 'thigh', 'kneeJoint', 'calf', 'foot'],
        upperArm: ['elbowJoint', 'lowerArm', 'hand'],
        lowerArm: ['hand'],
        thigh: ['kneeJoint', 'calf', 'foot'],
        calf: ['foot']
    };

    const rendered = {};
    let active = false;
    let currentDeltas = {};
    let currentSkinColor = '#e3d2b9';

    function partPath(file, suffix) {
        return `${CUSTOM_DIR}/${file}_${suffix}.png`;
    }

    function loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error(`Cannot load ${src}`));
            img.src = src;
        });
    }

    function fullBoxFromHalfBox(box) {
        const [x1, y1, x2, y2] = box;
        const halfWidth = SOURCE.centerX - x1 + 1;
        return {
            sourceX: x1,
            sourceY: y1,
            sourceWidth: halfWidth,
            sourceHeight: y2 - y1 + 1,
            fullX: x1,
            fullY: y1,
            fullWidth: halfWidth * 2,
            fullHeight: y2 - y1 + 1
        };
    }

    function drawMirroredCrop(ctx, img, box) {
        ctx.drawImage(img, box.sourceX, box.sourceY, box.sourceWidth, box.sourceHeight, 0, 0, box.sourceWidth, box.sourceHeight);
        ctx.save();
        ctx.translate(box.fullWidth, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(img, box.sourceX, box.sourceY, box.sourceWidth, box.sourceHeight, 0, 0, box.sourceWidth, box.sourceHeight);
        ctx.restore();
    }

    function drawMask(canvas, img, box, color) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawMirroredCrop(ctx, img, box);
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'source-over';
    }

    function drawLine(canvas, img, box) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawMirroredCrop(ctx, img, box);
    }

    function createCanvas(width, height) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.style.position = 'absolute';
        canvas.style.inset = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        canvas.style.pointerEvents = 'none';
        return canvas;
    }

    async function renderCustomBody() {
        const host = document.getElementById('custom-body-host');
        if (!host || Object.keys(rendered).length) return;

        const entries = Object.entries(PARTS);
        await Promise.all(entries.map(async ([name, part]) => {
            const box = fullBoxFromHalfBox(part.box);
            const [maskImage, lineImage] = await Promise.all([
                loadImage(partPath(part.file, 'mask')),
                loadImage(partPath(part.file, 'line'))
            ]);

            const element = document.createElement('div');
            element.style.position = 'absolute';
            element.style.left = `${BODY_LEFT + (box.fullX * DISPLAY_SCALE)}px`;
            element.style.top = `${BODY_TOP + (box.fullY * DISPLAY_SCALE)}px`;
            element.style.width = `${box.fullWidth * DISPLAY_SCALE}px`;
            element.style.height = `${box.fullHeight * DISPLAY_SCALE}px`;
            element.style.zIndex = part.z;
            element.style.pointerEvents = 'none';

            const maskCanvas = createCanvas(box.fullWidth, box.fullHeight);
            const lineCanvas = createCanvas(box.fullWidth, box.fullHeight);
            drawMask(maskCanvas, maskImage, box, currentSkinColor);
            drawLine(lineCanvas, lineImage, box);

            element.append(maskCanvas, lineCanvas);
            host.appendChild(element);
            rendered[name] = {
                element,
                maskCanvas,
                maskImage,
                box,
                baseTop: BODY_TOP + (box.fullY * DISPLAY_SCALE),
                baseHeight: box.fullHeight * DISPLAY_SCALE,
                control: part.control || null
            };
        }));
    }

    function readControlScales() {
        const scales = {};
        Object.entries(CONTROL_GROUPS).forEach(([key, config]) => {
            const slider = document.getElementById(config.sliderId);
            scales[key] = slider ? Number(slider.value) : 1;
        });
        return scales;
    }

    function updateValueLabels(scales) {
        Object.entries(CONTROL_GROUPS).forEach(([key, config]) => {
            const part = PARTS[config.labelPart];
            const box = fullBoxFromHalfBox(part.box);
            const value = document.getElementById(config.valueId);
            if (value) value.textContent = ((box.fullHeight * scales[key]) / SOURCE_PX_PER_CM).toFixed(2);
        });
    }

    function applyCustomBodyShape() {
        if (!Object.keys(rendered).length) return;
        const scales = readControlScales();
        const deltas = {};

        Object.entries(rendered).forEach(([name, item]) => {
            const scale = item.control ? scales[item.control] : 1;
            item.element.style.height = `${item.baseHeight * scale}px`;
            if (item.control) {
                deltas[name] = item.baseHeight * (scale - 1);
            }
        });

        const offsets = {};
        Object.entries(DOWNSTREAM).forEach(([upstream, downstream]) => {
            downstream.forEach(name => {
                offsets[name] = (offsets[name] || 0) + (deltas[upstream] || 0);
            });
        });

        Object.entries(rendered).forEach(([name, item]) => {
            item.element.style.top = `${item.baseTop + (offsets[name] || 0)}px`;
        });

        currentDeltas = deltas;
        updateValueLabels(scales);
        if (active && typeof window.applyBagPlacement === 'function') {
            requestAnimationFrame(window.applyBagPlacement);
        }
    }

    function resetCustomBody() {
        Object.values(CONTROL_GROUPS).forEach(config => {
            const slider = document.getElementById(config.sliderId);
            if (slider) slider.value = '1';
        });
        applyCustomBodyShape();
    }

    function updateCustomBodySkin(color) {
        currentSkinColor = color || currentSkinColor;
        Object.values(rendered).forEach(item => {
            drawMask(item.maskCanvas, item.maskImage, item.box, currentSkinColor);
        });
    }

    function getCustomBodyAnchors() {
        const waistDelta = currentDeltas.waist || 0;
        return {
            shoulder: {
                x: BODY_LEFT + (199 * DISPLAY_SCALE),
                y: BODY_TOP + (542 * DISPLAY_SCALE)
            },
            hip: {
                x: BODY_LEFT + (446 * DISPLAY_SCALE),
                y: BODY_TOP + (930 * DISPLAY_SCALE) + waistDelta
            }
        };
    }

    function setCustomBodyActive(isActive) {
        active = isActive;
        const host = document.getElementById('custom-body-host');
        const controls = document.getElementById('custom-body-controls');
        if (host) host.style.display = active ? 'block' : 'none';
        if (controls) controls.style.display = active ? 'flex' : 'none';
        if (active) applyCustomBodyShape();
    }

    async function initialize() {
        await renderCustomBody();
        Object.values(CONTROL_GROUPS).forEach(config => {
            const slider = document.getElementById(config.sliderId);
            if (slider) slider.addEventListener('input', applyCustomBodyShape);
        });
        const resetButton = document.getElementById('reset-custom-body');
        if (resetButton) resetButton.addEventListener('click', resetCustomBody);
        updateValueLabels(readControlScales());
        if (active) applyCustomBodyShape();
    }

    window.setCustomBodyActive = setCustomBodyActive;
    window.getCustomBodyAnchors = getCustomBodyAnchors;
    window.resetCustomBody = resetCustomBody;
    window.updateCustomBodySkin = updateCustomBodySkin;
    initialize();
})();

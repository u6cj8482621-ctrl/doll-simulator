(() => {
    const SOURCE = { width: 575, height: 1526, referenceHeightCm: 12.5 };
    const CANVAS_SIZE = 550;
    const BODY_TOP = CANVAS_SIZE * 0.2060;
    const DISPLAY_SCALE = (CANVAS_SIZE * 0.6767) / SOURCE.height;
    const BODY_LEFT = (CANVAS_SIZE - (SOURCE.width * DISPLAY_SCALE)) / 2;
    const SOURCE_PX_PER_CM = SOURCE.height / SOURCE.referenceHeightCm;

    const PARTS = {
        hip: [118, 763, 456, 923],
        torso: [137, 442, 438, 942],
        head: [38, 0, 537, 496],
        upper_arm_L: [50, 560, 176, 750],
        upper_arm_R: [400, 560, 525, 750],
        forearm_L: [24, 740, 126, 888],
        forearm_R: [450, 740, 551, 888],
        thigh_L: [118, 918, 277, 1150],
        thigh_R: [296, 918, 455, 1150],
        shin_L: [131, 1175, 252, 1400],
        shin_R: [324, 1176, 445, 1400],
        hand_L: [0, 854, 111, 1068],
        hand_R: [463, 854, 575, 1068],
        foot_L: [98, 1406, 236, 1526],
        foot_R: [340, 1406, 477, 1526],
        shoulder_ball_L: [120, 541, 196, 617],
        shoulder_ball_R: [378, 541, 454, 617],
        elbow_ball_L: [64, 719, 138, 793],
        elbow_ball_R: [437, 719, 511, 793],
        wrist_ball_L: [31, 859, 95, 923],
        wrist_ball_R: [480, 859, 544, 923],
        knee_ball_L: [154, 1127, 230, 1203],
        knee_ball_R: [345, 1127, 421, 1203],
        ankle_ball_L: [161, 1378, 211, 1428],
        ankle_ball_R: [364, 1378, 414, 1428]
    };

    const SLICES = {
        upper_arm_L: { top: 41, mid: 108, bot: 41, width: 126 },
        upper_arm_R: { top: 41, mid: 108, bot: 41, width: 125 },
        forearm_L: { top: 26, mid: 93, bot: 29, width: 102 },
        forearm_R: { top: 26, mid: 93, bot: 29, width: 101 },
        thigh_L: { top: 41, mid: 150, bot: 41, width: 159 },
        thigh_R: { top: 41, mid: 150, bot: 41, width: 159 },
        shin_L: { top: 36, mid: 153, bot: 36, width: 121 },
        shin_R: { top: 35, mid: 154, bot: 35, width: 121 },
        torso: { top: 225, mid: 75, bot: 200, width: 301 }
    };

    const DOWNSTREAM = {
        torso: ['hip', 'thigh_L', 'knee_ball_L', 'shin_L', 'ankle_ball_L', 'foot_L', 'thigh_R', 'knee_ball_R', 'shin_R', 'ankle_ball_R', 'foot_R'],
        upper_arm_L: ['elbow_ball_L', 'forearm_L', 'wrist_ball_L', 'hand_L'],
        upper_arm_R: ['elbow_ball_R', 'forearm_R', 'wrist_ball_R', 'hand_R'],
        forearm_L: ['wrist_ball_L', 'hand_L'],
        forearm_R: ['wrist_ball_R', 'hand_R'],
        thigh_L: ['knee_ball_L', 'shin_L', 'ankle_ball_L', 'foot_L'],
        thigh_R: ['knee_ball_R', 'shin_R', 'ankle_ball_R', 'foot_R'],
        shin_L: ['ankle_ball_L', 'foot_L'],
        shin_R: ['ankle_ball_R', 'foot_R']
    };

    const CONTROL_GROUPS = {
        torso: { sliderId: 'custom-torso', valueId: 'custom-torso-value', parts: ['torso'] },
        upperArm: { sliderId: 'custom-upper-arm', valueId: 'custom-upper-arm-value', parts: ['upper_arm_L', 'upper_arm_R'] },
        forearm: { sliderId: 'custom-forearm', valueId: 'custom-forearm-value', parts: ['forearm_L', 'forearm_R'] },
        thigh: { sliderId: 'custom-thigh', valueId: 'custom-thigh-value', parts: ['thigh_L', 'thigh_R'] },
        shin: { sliderId: 'custom-shin', valueId: 'custom-shin-value', parts: ['shin_L', 'shin_R'] }
    };

    const Z_ORDER = {
        torso: 5, hip: 6, head: 7,
        upper_arm_L: 10, upper_arm_R: 10, thigh_L: 10, thigh_R: 10,
        forearm_L: 11, forearm_R: 11, shin_L: 11, shin_R: 11,
        shoulder_ball_L: 12, shoulder_ball_R: 12,
        elbow_ball_L: 13, elbow_ball_R: 13, wrist_ball_L: 13, wrist_ball_R: 13,
        knee_ball_L: 13, knee_ball_R: 13, ankle_ball_L: 13, ankle_ball_R: 13,
        hand_L: 14, hand_R: 14, foot_L: 14, foot_R: 14
    };

    const rendered = {};
    let active = false;
    let currentDeltas = {};

    function partPath(name, suffix = '') {
        return `parts/ob11/body/${name}${suffix}.png`;
    }

    function stylePartElement(element, bbox, zIndex) {
        const [x1, y1, x2, y2] = bbox;
        element.style.position = 'absolute';
        element.style.left = `${BODY_LEFT + (x1 * DISPLAY_SCALE)}px`;
        element.style.top = `${BODY_TOP + (y1 * DISPLAY_SCALE)}px`;
        element.style.width = `${(x2 - x1) * DISPLAY_SCALE}px`;
        element.style.zIndex = zIndex;
        element.style.pointerEvents = 'none';
    }

    function renderCustomBody() {
        const host = document.getElementById('custom-body-host');
        if (!host || Object.keys(rendered).length) return;

        Object.entries(PARTS).forEach(([name, bbox]) => {
            const zIndex = Z_ORDER[name] || 1;
            const slice = SLICES[name];

            if (slice) {
                const container = document.createElement('div');
                stylePartElement(container, bbox, zIndex);

                const topImage = document.createElement('img');
                topImage.src = partPath(name, '_top');
                topImage.style.cssText = `display:block;width:100%;height:${slice.top * DISPLAY_SCALE}px;`;

                const midImage = document.createElement('img');
                midImage.src = partPath(name, '_mid');
                midImage.style.cssText = `display:block;width:100%;height:${slice.mid * DISPLAY_SCALE}px;`;

                const bottomImage = document.createElement('img');
                bottomImage.src = partPath(name, '_bot');
                bottomImage.style.cssText = `display:block;width:100%;height:${slice.bot * DISPLAY_SCALE}px;`;

                container.append(topImage, midImage, bottomImage);
                host.appendChild(container);
                rendered[name] = {
                    element: container,
                    midImage,
                    baseTop: BODY_TOP + (bbox[1] * DISPLAY_SCALE),
                    slice
                };
            } else {
                const image = document.createElement('img');
                image.src = partPath(name);
                stylePartElement(image, bbox, zIndex);
                image.style.height = `${(bbox[3] - bbox[1]) * DISPLAY_SCALE}px`;
                host.appendChild(image);
                rendered[name] = {
                    element: image,
                    baseTop: BODY_TOP + (bbox[1] * DISPLAY_SCALE)
                };
            }
        });
    }

    function readControlScales() {
        const scales = {};
        Object.entries(CONTROL_GROUPS).forEach(([key, config]) => {
            const slider = document.getElementById(config.sliderId);
            scales[key] = slider ? Number(slider.value) : 1;
        });
        return scales;
    }

    function getScaleForPart(partName, scales) {
        for (const [key, config] of Object.entries(CONTROL_GROUPS)) {
            if (config.parts.includes(partName)) return scales[key];
        }
        return 1;
    }

    function updateValueLabels(scales) {
        Object.entries(CONTROL_GROUPS).forEach(([key, config]) => {
            const partName = config.parts[0];
            const slice = SLICES[partName];
            const effectivePx = slice.top + (slice.mid * scales[key]) + slice.bot;
            const value = document.getElementById(config.valueId);
            if (value) value.textContent = (effectivePx / SOURCE_PX_PER_CM).toFixed(2);
        });
    }

    function applyCustomBodyShape() {
        if (!Object.keys(rendered).length) return;
        const scales = readControlScales();
        const deltas = {};

        Object.entries(SLICES).forEach(([name, slice]) => {
            const scale = getScaleForPart(name, scales);
            const newMidHeight = slice.mid * DISPLAY_SCALE * scale;
            rendered[name].midImage.style.height = `${newMidHeight}px`;
            deltas[name] = (slice.mid * (scale - 1)) * DISPLAY_SCALE;
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

    function getCustomBodyAnchors() {
        const torsoDelta = currentDeltas.torso || 0;
        return {
            shoulder: {
                x: BODY_LEFT + (197 * DISPLAY_SCALE),
                y: BODY_TOP + (506 * DISPLAY_SCALE)
            },
            hip: {
                x: BODY_LEFT + (470 * DISPLAY_SCALE),
                y: BODY_TOP + (930 * DISPLAY_SCALE) + torsoDelta
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

    function initialize() {
        renderCustomBody();
        Object.values(CONTROL_GROUPS).forEach(config => {
            const slider = document.getElementById(config.sliderId);
            if (slider) slider.addEventListener('input', applyCustomBodyShape);
        });
        const resetButton = document.getElementById('reset-custom-body');
        if (resetButton) resetButton.addEventListener('click', resetCustomBody);
        updateValueLabels(readControlScales());
    }

    window.setCustomBodyActive = setCustomBodyActive;
    window.getCustomBodyAnchors = getCustomBodyAnchors;
    window.resetCustomBody = resetCustomBody;
    initialize();
})();

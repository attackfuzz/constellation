        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);

        renderer.setClearColor(0x000011);

        const earthGroup = new THREE.Group();
        const earthGeometry = new THREE.SphereGeometry(200, 32, 32);
        const earthMaterial = new THREE.MeshBasicMaterial({
            color: 0x008800,
            wireframe: true,
            opacity: 0.3,
            transparent: true
        });
        const earth = new THREE.Mesh(earthGeometry, earthMaterial);
        earthGroup.add(earth);
        scene.add(earthGroup);

        const starGroup = new THREE.Group();
        const lineGroup = new THREE.Group();
        scene.add(starGroup);
        scene.add(lineGroup);

        const constellationSelect = document.getElementById('constellationSelect');
        const cameraFocusToggle = document.getElementById('cameraFocusToggle');

        const starPositions = {};
        const starMeshes = {};
        const lineMeshes = {};

        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };
        let previousTouchPosition = { x: 0, y: 0 };

        const moveSpeed = 50;  // カメラスピードを50に設定
        const rotationSpeed = 0.01; // 天球の回転速度

        let focusOnNorthStar = true;

        // クォータニオンによるカメラの回転制御
        let cameraQuaternion = new THREE.Quaternion();
        camera.quaternion.copy(cameraQuaternion);

        cameraFocusToggle.addEventListener('change', function() {
            focusOnNorthStar = cameraFocusToggle.checked;
        });

        const northStarPosition = convertToCartesian(2.530301028 * 15, 89.26413889); 

        if (focusOnNorthStar) {
            camera.lookAt(northStarPosition); 
        }

        // マウス操作
        document.addEventListener('mousedown', function (event) {
            if (event.button === 0) {
                isDragging = true;
                previousMousePosition = { x: event.clientX, y: event.clientY };
            }
        });

        document.addEventListener('mousemove', function (event) {
            if (isDragging) {
                handleDrag(event.clientX, event.clientY);
                previousMousePosition = { x: event.clientX, y: event.clientY };
            }
        });

        document.addEventListener('mouseup', function () {
            isDragging = false;
        });

        // タッチ操作
        document.addEventListener('touchstart', function (event) {
            if (event.touches.length === 1) {
                isDragging = true;
                previousTouchPosition = { x: event.touches[0].clientX, y: event.touches[0].clientY };
            }
        });

        document.addEventListener('touchmove', function (event) {
            if (isDragging && event.touches.length === 1) {
                handleDrag(event.touches[0].clientX, event.touches[0].clientY);
                previousTouchPosition = { x: event.touches[0].clientX, y: event.touches[0].clientY };
            }
        });

        document.addEventListener('touchend', function () {
            isDragging = false;
        });

        function handleDrag(clientX, clientY) {
            const deltaX = clientX - previousMousePosition.x;
            const deltaY = clientY - previousMousePosition.y;

            if (focusOnNorthStar) {
                // カメラを北極星に向ける場合の移動処理
                camera.position.x += deltaX * moveSpeed * 0.01;
                camera.position.y += deltaY * moveSpeed * 0.01;
                camera.lookAt(northStarPosition);
            } else {
                // クォータニオンでカメラの回転を操作
                const rotationQuatX = new THREE.Quaternion();
                const rotationQuatY = new THREE.Quaternion();

                rotationQuatX.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -deltaX * rotationSpeed); // Y軸回転（水平ドラッグ）
                rotationQuatY.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -deltaY * rotationSpeed); // X軸回転（垂直ドラッグ）

                // カメラの回転にX軸とY軸の回転を適用
                cameraQuaternion.multiplyQuaternions(rotationQuatX, cameraQuaternion);
                cameraQuaternion.multiplyQuaternions(cameraQuaternion, rotationQuatY);

                camera.quaternion.copy(cameraQuaternion);
            }
        }


        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        function convertToCartesian(ra, dec) {
            const radius = 400;
            const phi = (90 - dec) * (Math.PI / 180);
            const theta = ra * (Math.PI / 180);
            const x = radius * Math.sin(phi) * Math.cos(theta);
            const y = radius * Math.cos(phi);
            const z = radius * Math.sin(phi) * Math.sin(theta);
            return new THREE.Vector3(x, y, z);
        }

        function createStar(starName, position, constellation) {
            const starGeometry = new THREE.BufferGeometry();
            const vertices = [position.x, position.y, position.z];
            starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
            const starMaterial = new THREE.PointsMaterial({ color: 0xffffff, size: 2 });
            const star = new THREE.Points(starGeometry, starMaterial);
            starGroup.add(star);

            starPositions[starName] = position;
            if (!starMeshes[constellation]) {
                starMeshes[constellation] = [];
            }
            starMeshes[constellation].push(star);
        }

        function createStarLine(starName1, starName2, constellation) {
            const pos1 = starPositions[starName1];
            const pos2 = starPositions[starName2];

            if (pos1 && pos2) {
                const lineGeometry = new THREE.BufferGeometry().setFromPoints([pos1, pos2]);
                const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
                const line = new THREE.Line(lineGeometry, lineMaterial);
                lineGroup.add(line);

                if (!lineMeshes[constellation]) {
                    lineMeshes[constellation] = [];
                }
                lineMeshes[constellation].push(line);
            } else {
                console.warn(`星が見つかりません: ${starName1}, ${starName2}`);
            }
        }

        // stars.js と starline.js からデータを使って星座と線を作成する
        const constellations = new Set();

        stars.forEach(star => {
            const ra = (parseFloat(star.raHour) + parseFloat(star.raMin) / 60 + parseFloat(star.raSec) / 3600) * 15;
            const dec = (star.decSign === '-' ? -1 : 1) * (parseFloat(star.decDeg) + parseFloat(star.decMin) / 60 + parseFloat(star.decSec) / 3600);
            const position = convertToCartesian(ra, dec);
            createStar(star.starName, position, star.constellation);
            constellations.add(star.constellation);
        });

        starlines.forEach(line => {
            createStarLine(line.starName1, line.starName2, line.constellation);
        });

        // 星座リストの作成
        constellations.forEach(constellation => {
            const option = document.createElement('option');
            option.value = constellation;
            option.textContent = constellation;
            constellationSelect.appendChild(option);
        });



        function animate() {
            requestAnimationFrame(animate);
            renderer.render(scene, camera);
        }

        animate();

        constellationSelect.addEventListener('change', function() {
            const selectedConstellation = constellationSelect.value;

            Object.keys(starMeshes).forEach(constellation => {
                starMeshes[constellation].forEach(star => {
                    star.material.color.set(0xffffff);
                    star.material.size = 2;
                });
            });

            Object.keys(lineMeshes).forEach(constellation => {
                lineMeshes[constellation].forEach(line => {
                    line.material.color.set(0x00ff00);
                    line.material.linewidth = 1;
                });
            });

            if (selectedConstellation) {
                starMeshes[selectedConstellation].forEach(star => {
                    star.material.color.set(0xff0000);
                    star.material.size = 5;
                });
                lineMeshes[selectedConstellation].forEach(line => {
                    line.material.color.set(0xff0000);
                    line.material.linewidth = 3;
                });


        // カメラを回転して選択した星座の方向を向く

        const firstStarPosition = starPositions[starMeshes[selectedConstellation][0].name];
if (firstStarPosition) {
    const lookDirection = firstStarPosition.clone().sub(camera.position).normalize();
    const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 0, -1), // カメラの初期方向
        lookDirection
    );
    camera.quaternion.slerp(targetQuaternion, 0.1); // なめらかに方向を向く
            camera.updateMatrixWorld(); // カメラの行列更新
            camera.updateProjectionMatrix(); // 投影行列の更新]
    renderer.render(scene, camera);

}


        }

        });
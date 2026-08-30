 (function() {
        const container = document.getElementById('three-canvas');
        if (!container) return;

        // Scene setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x0f172a);

        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 4, 14);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: false,
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        container.appendChild(renderer.domElement);

        // --- Lights ---
        const ambientLight = new THREE.AmbientLight(0x1a2a4a, 0.5);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0x60a5fa, 0.6);
        directionalLight.position.set(5, 10, 7);
        scene.add(directionalLight);

        const pointLight = new THREE.PointLight(0x8b5cf6, 0.4);
        pointLight.position.set(-4, 6, 4);
        scene.add(pointLight);

        // --- Main Ring (Shield) ---
        const ringGeo = new THREE.TorusGeometry(3.2, 0.06, 32, 64);
        const ringMat = new THREE.MeshStandardMaterial({
            color: 0x60a5fa,
            emissive: 0x2563eb,
            emissiveIntensity: 0.15,
            metalness: 0.8,
            roughness: 0.2,
            transparent: true,
            opacity: 0.9,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 3;
        ring.rotation.z = Math.PI / 6;
        scene.add(ring);

        // Secondary ring
        const ringGeo2 = new THREE.TorusGeometry(3.8, 0.03, 24, 64);
        const ringMat2 = new THREE.MeshStandardMaterial({
            color: 0x8b5cf6,
            emissive: 0x7c3aed,
            emissiveIntensity: 0.1,
            metalness: 0.6,
            roughness: 0.3,
            transparent: true,
            opacity: 0.6,
        });
        const ring2 = new THREE.Mesh(ringGeo2, ringMat2);
        ring2.rotation.x = Math.PI / 4;
        ring2.rotation.z = -Math.PI / 5;
        scene.add(ring2);

        // --- Shield Core (Hexagon) ---
        const hexShape = new THREE.Shape();
        const radius = 1.8;
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);
            if (i === 0) hexShape.moveTo(x, y);
            else hexShape.lineTo(x, y);
        }
        hexShape.closePath();

        const hexGeo = new THREE.ShapeGeometry(hexShape);
        const hexMat = new THREE.MeshStandardMaterial({
            color: 0x60a5fa,
            emissive: 0x2563eb,
            emissiveIntensity: 0.05,
            metalness: 0.9,
            roughness: 0.3,
            transparent: true,
            opacity: 0.15,
            side: THREE.DoubleSide,
        });
        const hexMesh = new THREE.Mesh(hexGeo, hexMat);
        hexMesh.position.z = 0.05;
        scene.add(hexMesh);

        // Hex wireframe overlay
        const hexWire = new THREE.ShapeGeometry(hexShape);
        const wireMat = new THREE.MeshBasicMaterial({
            color: 0x60a5fa,
            wireframe: true,
            transparent: true,
            opacity: 0.2,
        });
        const hexWireMesh = new THREE.Mesh(hexWire, wireMat);
        hexWireMesh.position.z = 0.06;
        scene.add(hexWireMesh);

        // --- Orbiting Particles (Security Nodes) ---
        const particleCount = 60;
        const particleGeo = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount; i++) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = 4.5 + Math.random() * 2;

            positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
            positions[i * 3 + 1] = r * Math.cos(phi) * 0.6;
            positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

            const color = new THREE.Color().setHSL(0.55 + Math.random() * 0.15, 0.8, 0.5);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }

        particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const particleMat = new THREE.PointsMaterial({
            size: 0.08,
            vertexColors: true,
            transparent: true,
            opacity: 0.8,
            blending: THREE.AdditiveBlending,
        });
        const particles = new THREE.Points(particleGeo, particleMat);
        scene.add(particles);

        // --- Glow Ring ---
        const glowGeo = new THREE.RingGeometry(3.0, 4.5, 64);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0x60a5fa,
            transparent: true,
            opacity: 0.04,
            side: THREE.DoubleSide,
            blending: THREE.AdditiveBlending,
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.rotation.x = -Math.PI / 2;
        glow.position.y = -0.5;
        scene.add(glow);

        // --- Security Lock Icons ---
        const lockGroup = new THREE.Group();
        const lockMat = new THREE.MeshStandardMaterial({
            color: 0x8b5cf6,
            emissive: 0x7c3aed,
            emissiveIntensity: 0.1,
            metalness: 0.7,
            roughness: 0.3,
        });

        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const radius = 4.2;
            const lock = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), lockMat);
            lock.position.set(radius * Math.cos(angle), 0.3 + Math.sin(angle * 2) * 0.5, radius * Math.sin(angle));
            lockGroup.add(lock);
        }
        scene.add(lockGroup);

        // --- Floating Security Badge ---
        const badgeGroup = new THREE.Group();
        const badgeMat = new THREE.MeshStandardMaterial({
            color: 0x60a5fa,
            emissive: 0x2563eb,
            emissiveIntensity: 0.05,
            metalness: 0.5,
            roughness: 0.4,
        });

        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2 + 0.2;
            const r = 2.5;
            const cube = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.04), badgeMat);
            cube.position.set(r * Math.cos(angle), 0.2 + Math.sin(angle * 3) * 0.4, r * Math.sin(angle));
            badgeGroup.add(cube);
        }
        scene.add(badgeGroup);

        // --- Mouse tracking for parallax ---
        let mouseX = 0;
        let mouseY = 0;
        let targetRotationX = 0;
        let targetRotationY = 0;

        document.addEventListener('mousemove', (event) => {
            const x = (event.clientX / window.innerWidth) * 2 - 1;
            const y = -(event.clientY / window.innerHeight) * 2 + 1;
            mouseX = x * 0.15;
            mouseY = y * 0.1;
        });

        // --- Resize ---
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // --- Animation Loop ---
        function animate() {
            requestAnimationFrame(animate);

            const time = Date.now() * 0.001;

            // Smooth rotation following mouse
            targetRotationX += (mouseX * 0.3 - targetRotationX) * 0.03;
            targetRotationY += (mouseY * 0.3 - targetRotationY) * 0.03;

            // Rotate rings
            ring.rotation.y += 0.003;
            ring2.rotation.y -= 0.004;
            ring.rotation.x = Math.PI / 3 + Math.sin(time * 0.2) * 0.05;
            ring2.rotation.x = Math.PI / 4 + Math.cos(time * 0.25) * 0.05;

            // Rotate particles
            particles.rotation.y += 0.001;
            particles.rotation.x = Math.sin(time * 0.05) * 0.03;

            // Rotate lock group
            lockGroup.rotation.y += 0.005;
            lockGroup.rotation.x = Math.sin(time * 0.1) * 0.04;

            // Rotate badge group
            badgeGroup.rotation.y += 0.008;
            badgeGroup.rotation.z = Math.sin(time * 0.08) * 0.02;

            // Pulse glow
            glow.material.opacity = 0.03 + Math.sin(time * 0.3) * 0.015;

            // Pulse hex opacity
            hexMat.opacity = 0.12 + Math.sin(time * 0.5) * 0.06;

            // Parallax effect
            const group = scene;
            group.rotation.x = targetRotationY * 0.05;
            group.rotation.y = targetRotationX * 0.05;

            renderer.render(scene, camera);
        }

        animate();

        console.log('Flaxon Security page loaded with Three.js animations.');
    })();
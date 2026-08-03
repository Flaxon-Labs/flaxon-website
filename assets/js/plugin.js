 // ============================================================
        // TAB SYSTEM
        // ============================================================
        function switchTab(tabId) {
            // Hide all tabs
            document.querySelectorAll('.tab-content').forEach(el => {
                el.classList.remove('active');
            });

            // Show selected tab
            const target = document.getElementById('tab-' + tabId);
            if (target) {
                target.classList.add('active');
            }

            // Update button states
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.tab === tabId) {
                    btn.classList.add('active');
                }
            });

            // Update URL hash
            history.pushState(null, '', '#tab-' + tabId);

            // Re-highlight code blocks
            hljs.highlightAll();
        }

        // ============================================================
        // COPY COMMAND
        // ============================================================
        function copyCommand(cmd) {
            navigator.clipboard.writeText(cmd).then(() => {
                const el = event.target.closest('.install-cmd');
                const icon = el.querySelector('.copy-icon');
                icon.innerHTML = '<i class="fas fa-check" style="color:#22c55e;"></i>';
                setTimeout(() => {
                    icon.innerHTML = '<i class="far fa-copy"></i>';
                }, 2000);
            });
        }

        // ============================================================
        // INIT ON LOAD
        // ============================================================
        document.addEventListener('DOMContentLoaded', function() {
            // Check URL hash for tab
            const hash = window.location.hash;
            if (hash.startsWith('#tab-')) {
                const tabId = hash.replace('#tab-', '');
                switchTab(tabId);
            }

            // Initialize highlight.js
            hljs.highlightAll();

            // Dark mode check
            if (localStorage.getItem('dark-mode') === 'true') {
                document.documentElement.classList.add('dark');
            }
        });

        // ============================================================
        // THREE.JS BACKGROUND (LIGHT THEME)
        // ============================================================
        (function() {
            const bgContainer = document.getElementById('three-bg');
            if (!bgContainer) return;

            const bgScene = new THREE.Scene();
            bgScene.background = new THREE.Color(0xf0f4ff);

            const bgCamera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
            bgCamera.position.z = 30;

            const bgRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
            bgRenderer.setSize(window.innerWidth, window.innerHeight);
            bgRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            bgRenderer.setClearColor(0xf0f4ff, 0);
            bgContainer.appendChild(bgRenderer.domElement);

            // Floating particles (blue/purple glow)
            const particleCount = 100;
            const particleGeo = new THREE.BufferGeometry();
            const positions = new Float32Array(particleCount * 3);
            const colors = new Float32Array(particleCount * 3);

            for (let i = 0; i < particleCount; i++) {
                positions[i * 3] = (Math.random() - 0.5) * 50;
                positions[i * 3 + 1] = (Math.random() - 0.5) * 30;
                positions[i * 3 + 2] = (Math.random() - 0.5) * 20;

                const color = new THREE.Color().setHSL(0.58 + Math.random() * 0.15, 0.7, 0.7);
                colors[i * 3] = color.r;
                colors[i * 3 + 1] = color.g;
                colors[i * 3 + 2] = color.b;
            }

            particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

            const particleMat = new THREE.PointsMaterial({
                size: 0.12,
                vertexColors: true,
                transparent: true,
                opacity: 0.4,
                blending: THREE.AdditiveBlending,
            });

            const particles = new THREE.Points(particleGeo, particleMat);
            bgScene.add(particles);

            function animateBg() {
                requestAnimationFrame(animateBg);
                particles.rotation.y += 0.0005;
                particles.rotation.x = Math.sin(Date.now() * 0.0001) * 0.02;
                bgRenderer.render(bgScene, bgCamera);
            }
            animateBg();

            window.addEventListener('resize', () => {
                bgCamera.aspect = window.innerWidth / window.innerHeight;
                bgCamera.updateProjectionMatrix();
                bgRenderer.setSize(window.innerWidth, window.innerHeight);
            });
        })();

        // ============================================================
        // PLUGIN CARD SCENES
        // ============================================================
        (function() {
            const containers = document.querySelectorAll('.scene-container');

            containers.forEach((container) => {
                const plugin = container.dataset.plugin;
                const width = container.clientWidth || 400;
                const height = container.clientHeight || 140;

                const scene = new THREE.Scene();
                scene.background = new THREE.Color(0xf0f4ff);

                const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
                camera.position.z = 5;

                const renderer = new THREE.WebGLRenderer({
                    antialias: true,
                    alpha: true,
                });
                renderer.setSize(width, height);
                renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
                renderer.setClearColor(0xf0f4ff, 0);
                container.appendChild(renderer.domElement);

                // Lights
                const ambient = new THREE.AmbientLight(0x8888cc, 0.5);
                scene.add(ambient);
                const dirLight = new THREE.DirectionalLight(0x60a5fa, 0.8);
                dirLight.position.set(5, 10, 7);
                scene.add(dirLight);

                let animationFn = null;

                // Simplified scenes for each plugin
                switch (plugin) {
                    case 'ai': {
                        const group = new THREE.Group();
                        const mat = new THREE.MeshStandardMaterial({
                            color: 0x60a5fa,
                            emissive: 0x3b82f6,
                            emissiveIntensity: 0.2,
                        });
                        for (let i = 0; i < 20; i++) {
                            const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.05 + Math.random() * 0.08, 8, 8), mat);
                            sphere.position.set((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 2);
                            sphere.userData = { speed: 0.005 + Math.random() * 0.01, phase: Math.random() * Math.PI * 2 };
                            group.add(sphere);
                        }
                        scene.add(group);
                        animationFn = (time) => {
                            group.children.forEach((child) => {
                                child.position.y += Math.sin(time * child.userData.speed + child.userData.phase) *
                                    0.002;
                            });
                            group.rotation.y += 0.003;
                        };
                        break;
                    }
                    case 'mobile': {
                        const group = new THREE.Group();
                        const body = new THREE.Mesh(
                            new THREE.BoxGeometry(0.8, 1.5, 0.2),
                            new THREE.MeshStandardMaterial({ color: 0x1a1a2e, metalness: 0.8, roughness: 0.2 })
                        );
                        group.add(body);
                        const screen = new THREE.Mesh(
                            new THREE.BoxGeometry(0.65, 1.2, 0.05),
                            new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x0891b2, emissiveIntensity: 0.1 })
                        );
                        screen.position.z = 0.13;
                        group.add(screen);
                        scene.add(group);
                        animationFn = (time) => {
                            group.rotation.y = Math.sin(time * 0.3) * 0.2;
                            screen.material.emissiveIntensity = 0.05 + Math.sin(time * 2) * 0.05;
                        };
                        break;
                    }
                    case 'oauth': {
                        const group = new THREE.Group();
                        const shield = new THREE.Mesh(
                            new THREE.CylinderGeometry(0.8, 0.8, 0.1, 6),
                            new THREE.MeshStandardMaterial({ color: 0x60a5fa, emissive: 0x3b82f6, emissiveIntensity: 0.1 })
                        );
                        shield.rotation.z = Math.PI / 6;
                        group.add(shield);
                        const lock = new THREE.Mesh(
                            new THREE.TorusGeometry(0.15, 0.04, 8, 8, Math.PI),
                            new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x0891b2, emissiveIntensity: 0.2 })
                        );
                        lock.position.set(0, 0.15, 0.08);
                        group.add(lock);
                        scene.add(group);
                        animationFn = (time) => {
                            group.rotation.y = Math.sin(time * 0.3) * 0.1;
                            shield.material.emissiveIntensity = 0.05 + Math.sin(time * 1.5) * 0.05;
                        };
                        break;
                    }
                    case 'inertia': {
                        const group = new THREE.Group();
                        const nodeMat = new THREE.MeshStandardMaterial({ color: 0x8b5cf6, emissive: 0x6d28d9,
                            emissiveIntensity: 0.2 });
                        const positions = [
                            [-1.2, 0, 0],
                            [0, 1.0, 0],
                            [1.2, 0, 0],
                            [0, -1.0, 0]
                        ];
                        positions.forEach((pos) => {
                            const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), nodeMat);
                            sphere.position.set(pos[0], pos[1], pos[2]);
                            group.add(sphere);
                        });
                        const ring = new THREE.Mesh(
                            new THREE.RingGeometry(0.7, 1.4, 32),
                            new THREE.MeshBasicMaterial({ color: 0x8b5cf6, transparent: true, opacity: 0.08,
                                side: THREE.DoubleSide })
                        );
                        ring.rotation.x = -Math.PI / 2;
                        ring.position.z = -0.05;
                        group.add(ring);
                        scene.add(group);
                        animationFn = (time) => {
                            group.rotation.z = Math.sin(time * 0.2) * 0.05;
                            ring.material.opacity = 0.05 + Math.sin(time * 0.5) * 0.05;
                        };
                        break;
                    }
                    case 'fyr': {
                        const particleCount = 100;
                        const geo = new THREE.BufferGeometry();
                        const pos = new Float32Array(particleCount * 3);
                        for (let i = 0; i < particleCount; i++) {
                            pos[i * 3] = (Math.random() - 0.5) * 4;
                            pos[i * 3 + 1] = (Math.random() - 0.5) * 3;
                            pos[i * 3 + 2] = (Math.random() - 0.5) * 1;
                        }
                        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
                        const mat = new THREE.PointsMaterial({
                            color: 0xff6633,
                            size: 0.06,
                            transparent: true,
                            opacity: 0.5,
                            blending: THREE.AdditiveBlending,
                            sizeAttenuation: true,
                        });
                        const points = new THREE.Points(geo, mat);
                        scene.add(points);
                        animationFn = (time) => {
                            const positions = points.geometry.attributes.position.array;
                            for (let i = 0; i < particleCount; i++) {
                                positions[i * 3 + 1] += 0.005;
                                if (positions[i * 3 + 1] > 1.5) {
                                    positions[i * 3 + 1] = -1.5;
                                    positions[i * 3] = (Math.random() - 0.5) * 4;
                                }
                            }
                            points.geometry.attributes.position.needsUpdate = true;
                            points.rotation.y += 0.001;
                        };
                        break;
                    }
                    case 'debug': {
                        const group = new THREE.Group();
                        const mat = new THREE.MeshBasicMaterial({ color: 0x22c55e, transparent: true, opacity: 0.3 });
                        for (let i = 0; i < 15; i++) {
                            const line = new THREE.Mesh(
                                new THREE.BoxGeometry(0.2 + Math.random() * 0.6, 0.02, 0.02),
                                mat
                            );
                            line.position.set(-0.7 + Math.random() * 0.2, -1.0 + i * 0.13, 0);
                            group.add(line);
                        }
                        scene.add(group);
                        animationFn = () => {
                            group.rotation.z = Math.sin(Date.now() * 0.0005) * 0.01;
                        };
                        break;
                    }
                    case 'sentry': {
                        const group = new THREE.Group();
                        const disc = new THREE.Mesh(
                            new THREE.RingGeometry(0.5, 1.6, 32),
                            new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.08,
                                side: THREE.DoubleSide })
                        );
                        disc.rotation.x = -Math.PI / 2;
                        group.add(disc);
                        const sweep = new THREE.Mesh(
                            new THREE.PlaneGeometry(0.03, 1.6),
                            new THREE.MeshBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.15 })
                        );
                        sweep.position.z = 0.01;
                        group.add(sweep);
                        scene.add(group);
                        animationFn = (time) => {
                            sweep.rotation.z = time * 0.5;
                            disc.material.opacity = 0.05 + Math.sin(time * 0.3) * 0.05;
                        };
                        break;
                    }
                    case 'pytest': {
                        const group = new THREE.Group();
                        const check = new THREE.Mesh(
                            new THREE.CylinderGeometry(0.3, 0.3, 0.05, 3),
                            new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x16a34a,
                            emissiveIntensity: 0.2 })
                        );
                        check.rotation.y = Math.PI / 6;
                        group.add(check);
                        const gear = new THREE.Mesh(
                            new THREE.TorusGeometry(0.4, 0.04, 8, 12),
                            new THREE.MeshStandardMaterial({ color: 0x60a5fa, emissive: 0x3b82f6,
                            emissiveIntensity: 0.1 })
                        );
                        gear.rotation.x = Math.PI / 3;
                        group.add(gear);
                        scene.add(group);
                        animationFn = (time) => {
                            gear.rotation.z += 0.01;
                            check.material.emissiveIntensity = 0.1 + Math.sin(time * 1.5) * 0.1;
                        };
                        break;
                    }
                    default: {
                        const cube = new THREE.Mesh(
                            new THREE.BoxGeometry(0.6, 0.6, 0.6),
                            new THREE.MeshStandardMaterial({ color: 0x60a5fa, emissive: 0x3b82f6,
                            emissiveIntensity: 0.1 })
                        );
                        scene.add(cube);
                        animationFn = (time) => {
                            cube.rotation.x += 0.01;
                            cube.rotation.y += 0.02;
                        };
                    }
                }

                function resizeScene() {
                    const w = container.clientWidth || 400;
                    const h = container.clientHeight || 140;
                    camera.aspect = w / h;
                    camera.updateProjectionMatrix();
                    renderer.setSize(w, h);
                }

                const resizeObserver = new ResizeObserver(resizeScene);
                resizeObserver.observe(container);

                function animatePlugin() {
                    requestAnimationFrame(animatePlugin);
                    if (animationFn) animationFn(Date.now() * 0.001);
                    renderer.render(scene, camera);
                }
                animatePlugin();

                container._resizeObserver = resizeObserver;
            });
        })();
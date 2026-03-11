// ============================================
// Customatch - Complete Application Script
// Global Styling System Integration
// ============================================

// ============================================
// COMPONENT UTILITIES - Interaction Handlers
// ============================================

/**
 * Switch tabs functionality
 */
window.switchTab = function(tabElement, index) {
    // Remove active class from all tabs
    const tabs = document.querySelectorAll('.tab');
    const contents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => tab.classList.remove('active'));
    contents.forEach(content => content.classList.remove('active'));
    
    // Add active class to clicked tab
    tabElement.classList.add('active');
    contents[index].classList.add('active');
};

/**
 * Toggle modal visibility
 */
window.toggleModal = function(modalId, state) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    
    if (state === 'open') {
        modal.classList.add('active');
    } else if (state === 'close') {
        modal.classList.remove('active');
    } else {
        // Toggle
        modal.classList.toggle('active');
    }
};

/**
 * Toast notification system
 */
window.createToast = function(message, type = 'info', duration = 3000) {
    const toastContainer = document.getElementById('toast-container') || 
                          createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} animate-slide-bottom`;
    toast.innerHTML = `
        <i class="fas fa-${getIconForType(type)}"></i>
        <span>${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('animate-fade-out');
        setTimeout(() => toast.remove(), 300);
    }, duration);
};

/**
 * Create toast container if it doesn't exist
 */
function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = `
        position: fixed;
        top: 1rem;
        right: 1rem;
        z-index: 5000;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    `;
    document.body.appendChild(container);
    return container;
}

/**
 * Get icon for toast type
 */
function getIconForType(type) {
    const icons = {
        'info': 'info-circle',
        'success': 'check-circle',
        'warning': 'exclamation-triangle',
        'danger': 'times-circle'
    };
    return icons[type] || 'info-circle';
}

/**
 * Smooth scroll to element
 */
window.smoothScroll = function(target) {
    const element = typeof target === 'string' 
        ? document.querySelector(target) 
        : target;
    
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
};

/**
 * Toggle class on elements
 */
window.toggleClass = function(selector, className) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(el => el.classList.toggle(className));
};

// ============================================
// 1. THREE.JS - 3D Graphics
// ============================================
let scene, camera, renderer;

function initThreeJS() {
    const container = document.getElementById('canvas-container');
    
    // Scene setup
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0a);
    
    // Camera setup
    camera = new THREE.PerspectiveCamera(
        75,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
    );
    camera.position.z = 5;
    
    // Renderer setup
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    
    // Add multiple geometries
    const objects = [];
    
    // Cube
    const geometry1 = new THREE.BoxGeometry(1, 1, 1);
    const material1 = new THREE.MeshPhongMaterial({ 
        color: 0x7699D4,
        wireframe: false
    });
    const cube = new THREE.Mesh(geometry1, material1);
    cube.position.x = -2;
    cube.castShadow = true;
    scene.add(cube);
    objects.push(cube);
    
    // Sphere
    const geometry2 = new THREE.SphereGeometry(0.7, 32, 32);
    const material2 = new THREE.MeshPhongMaterial({ 
        color: 0x005377
    });
    const sphere = new THREE.Mesh(geometry2, material2);
    sphere.castShadow = true;
    scene.add(sphere);
    objects.push(sphere);
    
    // Torus
    const geometry3 = new THREE.TorusGeometry(1, 0.3, 16, 100);
    const material3 = new THREE.MeshPhongMaterial({ 
        color: 0x331E38
    });
    const torus = new THREE.Mesh(geometry3, material3);
    torus.position.x = 2;
    torus.castShadow = true;
    scene.add(torus);
    objects.push(torus);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
    
    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        
        // Rotate objects
        objects.forEach((obj, index) => {
            obj.rotation.x += 0.002 + (index * 0.001);
            obj.rotation.y += 0.003 + (index * 0.002);
        });
        
        renderer.render(scene, camera);
    }
    animate();
    
    // Handle window resize
    window.addEventListener('resize', () => {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });
}

// ============================================
// 2. GSAP - Animation Library
// ============================================
function initGSAP() {
    // Register ScrollTrigger plugin
    gsap.registerPlugin(ScrollTrigger);
    
    // Animate header on load
    gsap.from('h1', {
        duration: 1,
        opacity: 0,
        y: -30,
        ease: 'power2.out'
    });
    
    // Card hover animations
    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('mouseenter', () => {
            gsap.to(card, {
                duration: 0.3,
                y: -5,
                boxShadow: '0 0 30px rgba(118, 153, 212, 0.2)',
                ease: 'power2.out'
            });
        });
        
        card.addEventListener('mouseleave', () => {
            gsap.to(card, {
                duration: 0.3,
                y: 0,
                boxShadow: 'var(--shadow-lg)',
                ease: 'power2.out'
            });
        });
    });
    
    // Scroll animations
    document.querySelectorAll('section').forEach(section => {
        gsap.from(section, {
            scrollTrigger: {
                trigger: section,
                start: 'top 80%',
                end: 'top 20%',
                scrub: 1,
                markers: false
            },
            opacity: 0,
            y: 50,
            duration: 1
        });
    });
}

// ============================================
// 3. CHART.JS - Data Visualization
// ============================================
function initChartJS() {
    const ctx = document.getElementById('myChart');
    
    if (!ctx) return;
    
    const chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['January', 'February', 'March', 'April', 'May', 'June'],
            datasets: [
                {
                    label: 'Product A',
                    data: [12, 19, 8, 15, 22, 18],
                    backgroundColor: 'rgba(118, 153, 212, 0.6)',
                    borderColor: 'rgba(118, 153, 212, 1)',
                    borderWidth: 2,
                    borderRadius: 6
                },
                {
                    label: 'Product B',
                    data: [8, 14, 12, 10, 16, 14],
                    backgroundColor: 'rgba(0, 83, 119, 0.6)',
                    borderColor: 'rgba(0, 83, 119, 1)',
                    borderWidth: 2,
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: {
                        color: 'rgba(241, 250, 254, 0.8)',
                        font: { size: 12 },
                        padding: 15
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: 'rgba(241, 250, 254, 0.8)',
                        stepSize: 5
                    },
                    grid: {
                        color: 'rgba(118, 153, 212, 0.05)',
                        drawBorder: false
                    }
                },
                x: {
                    ticks: {
                        color: 'rgba(241, 250, 254, 0.8)'
                    },
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

// ============================================
// 4. INTERACT.JS - Touch & Drag Interactions
// ============================================
function initInteractJS() {
    const interactiveBox = document.getElementById('interactive-box');
    
    if (!interactiveBox) return;
    
    // Resizable
    interact(interactiveBox).resizable({
        edges: { left: true, right: true, bottom: true, top: true },
        listeners: {
            move(event) {
                event.target.style.width = event.rect.width + 'px';
                event.target.style.height = event.rect.height + 'px';
            }
        },
        modifiers: [
            interact.modifiers.restrictSize({
                min: { width: 80, height: 80 }
            })
        ]
    });
    
    // Draggable
    interact(interactiveBox).draggable({
        inertia: true,
        modifiers: [
            interact.modifiers.restrictRect({
                restriction: 'parent',
                endOnly: true
            })
        ],
        autoScroll: true,
        listeners: {
            move: dragMoveListener
        }
    });
    
    function dragMoveListener(event) {
        let { x, y } = event.pageOffset;
        
        event.target.style.transform = `translate(${x}px, ${y}px)`;
    }
}

// ============================================
// 5. COMPONENT LIFECYCLE MANAGEMENT
// ============================================

/**
 * Initialize all button click handlers
 */
function initButtonHandlers() {
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', function() {
            createToast(`Button clicked: ${this.textContent.trim()}`, 'info', 2000);
        });
    });
}

/**
 * Observe DOM changes for dynamic components
 */
function observeDOMChanges() {
    const observer = new MutationObserver(() => {
        initButtonHandlers();
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// ============================================
// 6. UTILITY FUNCTIONS
// ============================================

/**
 * Get responsive breakpoints
 */
window.getBreakpoint = function() {
    const width = window.innerWidth;
    if (width < 576) return 'xs';
    if (width < 768) return 'sm';
    if (width < 992) return 'md';
    if (width < 1200) return 'lg';
    if (width < 1600) return 'xl';
    return '2k';
};

/**
 * Print current breakpoint (for debugging)
 */
window.debugBreakpoint = function() {
    console.log(`Current breakpoint: ${getBreakpoint()}`);
};

/**
 * Get CSS variable value
 */
window.getCSSVar = function(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
};

/**
 * Set CSS variable value
 */
window.setCSSVar = function(varName, value) {
    document.documentElement.style.setProperty(varName, value);
};

/**
 * Print all CSS variables (for debugging)
 */
window.debugCSSVars = function() {
    const styles = getComputedStyle(document.documentElement);
    const vars = Array.from(styles).filter(prop => prop.startsWith('--'));
    console.table(vars);
};

// ============================================
// INITIALIZE ALL SYSTEMS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('%c🎨 Customatch Initialization', 'color: #00ff00; font-size: 16px; font-weight: bold;');
    console.log('%cLoading all systems...', 'color: #00ff00; font-size: 12px;');
    
    try {
        initThreeJS();
        console.log('✓ Three.js initialized');
    } catch (e) {
        console.error('✗ Three.js initialization error:', e);
    }
    
    try {
        initGSAP();
        console.log('✓ GSAP initialized');
    } catch (e) {
        console.error('✗ GSAP initialization error:', e);
    }
    
    try {
        initChartJS();
        console.log('✓ Chart.js initialized');
    } catch (e) {
        console.error('✗ Chart.js initialization error:', e);
    }
    
    try {
        initInteractJS();
        console.log('✓ Interact.js initialized');
    } catch (e) {
        console.error('✗ Interact.js initialization error:', e);
    }
    
    try {
        initButtonHandlers();
        observeDOMChanges();
        console.log('✓ Component handlers initialized');
    } catch (e) {
        console.error('✗ Component handler initialization error:', e);
    }
    
    console.log('%c✓ All systems loaded successfully!', 'color: #00ff00; font-size: 12px; font-weight: bold;');
    console.log('%cAvailable utilities:', 'color: #00d4ff; font-weight: bold;');
    console.log('• switchTab(tabElement, index)');
    console.log('• toggleModal(modalId, state)');
    console.log('• createToast(message, type, duration)');
    console.log('• smoothScroll(target)');
    console.log('• toggleClass(selector, className)');
    console.log('• getBreakpoint()');
    console.log('• debugBreakpoint()');
    console.log('• getCSSVar(varName)');
    console.log('• setCSSVar(varName, value)');
    console.log('• debugCSSVars()');
});

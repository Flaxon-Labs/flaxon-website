// assets/js/examples/ecommerce.js
/**
 * Flaxon Website - E-Commerce Demo
 * Product catalog with offline support
 */

(function() {
    'use strict';

    // ============================================================
    // Data
    // ============================================================
    const products = [
        { id: 1, name: 'Laptop Pro', price: 1299.99, stock: 10, category: 'Electronics', image: '💻' },
        { id: 2, name: 'Wireless Mouse', price: 29.99, stock: 25, category: 'Accessories', image: '🖱️' },
        { id: 3, name: 'Mechanical Keyboard', price: 89.99, stock: 15, category: 'Accessories', image: '⌨️' },
        { id: 4, name: 'USB-C Hub', price: 49.99, stock: 8, category: 'Electronics', image: '🔌' },
        { id: 5, name: 'Monitor 27"', price: 349.99, stock: 5, category: 'Electronics', image: '🖥️' },
        { id: 6, name: 'Desk Mat', price: 19.99, stock: 30, category: 'Accessories', image: '🧹' },
    ];

    // ============================================================
    // State
    // ============================================================
    let cart = [];
    let isOnline = navigator.onLine;

    // ============================================================
    // DOM Elements
    // ============================================================
    const productGrid = document.getElementById('product-grid');
    const cartItems = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    const syncStatus = document.getElementById('sync-status');
    const checkoutBtn = document.getElementById('checkout-btn');
    const clearCartBtn = document.getElementById('clear-cart-btn');

    // ============================================================
    // Local Storage
    // ============================================================
    function loadCart() {
        try {
            const saved = localStorage.getItem('flaxon_cart');
            if (saved) {
                cart = JSON.parse(saved);
            }
        } catch (e) {
            cart = [];
        }
    }

    function saveCart() {
        try {
            localStorage.setItem('flaxon_cart', JSON.stringify(cart));
        } catch (e) {
            console.error('Failed to save cart:', e);
        }
    }

    // ============================================================
    // Rendering
    // ============================================================
    function renderProducts(filter) {
        if (!productGrid) return;

        let filtered = products;
        if (filter === 'in-stock') {
            filtered = products.filter(function(p) { return p.stock > 0; });
        } else if (filter === 'out-of-stock') {
            filtered = products.filter(function(p) { return p.stock === 0; });
        }

        productGrid.innerHTML = '';
        filtered.forEach(function(product) {
            const div = document.createElement('div');
            div.className = 'ecommerce-product';
            div.innerHTML = `
                <div style="font-size: 2rem; text-align: center; margin-bottom: 0.5rem;">${product.image}</div>
                <h4>${product.name}</h4>
                <div class="price">$${product.price.toFixed(2)}</div>
                <div class="stock ${product.stock > 0 ? 'in-stock' : 'out-of-stock'}">
                    ${product.stock > 0 ? '✓ In Stock' : '✗ Out of Stock'}
                </div>
                <button class="add-to-cart" data-id="${product.id}" style="
                    margin-top: 0.5rem;
                    padding: 0.4rem 0.8rem;
                    border-radius: 6px;
                    border: none;
                    background: linear-gradient(135deg, #2563eb, #06b6d4);
                    color: white;
                    cursor: pointer;
                    font-size: 0.8rem;
                    transition: all 0.2s;
                " ${product.stock === 0 ? 'disabled style="opacity:0.5;cursor:not-allowed;"' : ''}>
                    Add to Cart
                </button>
            `;
            productGrid.appendChild(div);
        });

        // Add event listeners
        document.querySelectorAll('.add-to-cart').forEach(function(btn) {
            btn.addEventListener('click', function() {
                const id = parseInt(this.dataset.id);
                addToCart(id);
            });
        });
    }

    function renderCart() {
        if (!cartItems || !cartTotal) return;

        if (cart.length === 0) {
            cartItems.innerHTML = '<p class="text-slate-500 dark:text-slate-400 text-sm">Your cart is empty.</p>';
            cartTotal.textContent = '$0.00';
            return;
        }

        let html = '';
        let total = 0;

        cart.forEach(function(item) {
            const product = products.find(function(p) { return p.id === item.id; });
            if (product) {
                const subtotal = product.price * item.quantity;
                total += subtotal;
                html += `
                    <div class="ecommerce-cart-item">
                        <span>${product.name} x${item.quantity}</span>
                        <span>$${subtotal.toFixed(2)}</span>
                    </div>
                `;
            }
        });

        cartItems.innerHTML = html;
        cartTotal.textContent = '$' + total.toFixed(2);
    }

    // ============================================================
    // Cart Operations
    // ============================================================
    function addToCart(productId) {
        const product = products.find(function(p) { return p.id === productId; });
        if (!product || product.stock === 0) return;

        const existing = cart.find(function(item) { return item.id === productId; });
        if (existing) {
            existing.quantity++;
        } else {
            cart.push({ id: productId, quantity: 1 });
        }

        product.stock--;
        saveCart();
        renderProducts();
        renderCart();
        updateSyncStatus();
        showToast('Added to cart! 🛒', 'success');
    }

    function clearCart() {
        // Restore stock
        cart.forEach(function(item) {
            const product = products.find(function(p) { return p.id === item.id; });
            if (product) {
                product.stock += item.quantity;
            }
        });
        cart = [];
        saveCart();
        renderProducts();
        renderCart();
        updateSyncStatus();
        showToast('Cart cleared', 'info');
    }

    function checkout() {
        if (cart.length === 0) {
            showToast('Your cart is empty!', 'warning');
            return;
        }

        const total = cart.reduce(function(sum, item) {
            const product = products.find(function(p) { return p.id === item.id; });
            return sum + (product ? product.price * item.quantity : 0);
        }, 0);

        showToast(`Order placed! Total: $${total.toFixed(2)} 🎉`, 'success');
        // Simulate order processing
        setTimeout(function() {
            clearCart();
        }, 2000);
    }

    // ============================================================
    // Sync Status
    // ============================================================
    function updateSyncStatus() {
        if (!syncStatus) return;
        if (isOnline) {
            syncStatus.innerHTML = '<i class="fas fa-check-circle mr-1"></i> Synced';
            syncStatus.className = 'text-sm text-emerald-500';
        } else {
            syncStatus.innerHTML = '<i class="fas fa-cloud mr-1"></i> Offline';
            syncStatus.className = 'text-sm text-amber-500';
        }
    }

    // ============================================================
    // Toast Notification
    // ============================================================
    function showToast(message, type) {
        const toast = document.createElement('div');
        const colors = {
            success: '#065f46',
            error: '#7f1d1d',
            warning: '#78350f',
            info: '#1e3a5f'
        };
        const textColors = {
            success: '#6ee7b7',
            error: '#fca5a5',
            warning: '#fcd34d',
            info: '#93c5fd'
        };
        const bgColor = colors[type] || colors.info;
        const textColor = textColors[type] || textColors.info;

        toast.style.cssText = `
            position: fixed;
            bottom: 90px;
            right: 30px;
            background: ${bgColor};
            color: ${textColor};
            padding: 12px 24px;
            border-radius: 12px;
            font-size: 0.9rem;
            box-shadow: 0 8px 30px rgba(0,0,0,0.3);
            z-index: 1000;
            transform: translateX(120%);
            transition: transform 0.4s ease;
            max-width: 400px;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(function() {
            toast.style.transform = 'translateX(0)';
        }, 100);

        setTimeout(function() {
            toast.style.transform = 'translateX(120%)';
            setTimeout(function() {
                toast.remove();
            }, 400);
        }, 3000);
    }

    // ============================================================
    // Network Events
    // ============================================================
    function updateOnlineStatus() {
        isOnline = navigator.onLine;
        updateSyncStatus();
        if (isOnline) {
            showToast('Back online! Syncing...', 'success');
        } else {
            showToast('You are offline. Changes will sync later.', 'warning');
        }
    }

    // ============================================================
    // Initialize
    // ============================================================
    function init() {
        loadCart();

        // Restore stock from cart
        cart.forEach(function(item) {
            const product = products.find(function(p) { return p.id === item.id; });
            if (product) {
                product.stock -= item.quantity;
            }
        });

        renderProducts();
        renderCart();
        updateSyncStatus();

        if (checkoutBtn) {
            checkoutBtn.addEventListener('click', checkout);
        }

        if (clearCartBtn) {
            clearCartBtn.addEventListener('click', clearCart);
        }

        // Network events
        window.addEventListener('online', updateOnlineStatus);
        window.addEventListener('offline', updateOnlineStatus);

        console.log('E-commerce demo initialized! 🛒');
    }

    // Wait for DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
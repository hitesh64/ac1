// Global State
let currentUser = null;
let cart = [];
let products = [];
let currentView = 'home';

// API Base URL
const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3000/api'
    : '/api';
const menuItems = {
    'varan_batti': {
        id: 'varan_batti',
        name: 'Varan Batti',
        description: 'Traditional Maharashtrian dish.',
        price: 250,
        category: 'Maharashtrian',
        image: 'https://i.ytimg.com/vi/io7C2sqcHTY/maxresdefault.jpg'
    },
    'vangyachi_bhaji': {
        id: 'vangyachi_bhaji',
        name: 'Vangyachi Bhaji',
        description: 'Spicy stuffed eggplant curry.',
        price: 180,
        category: 'Maharashtrian',
        image: 'https://i.ytimg.com/vi/mi1u1Vww5Bs/maxresdefault.jpg'
    },
    'gulab_jamun': {
        id: 'gulab_jamun',
        name: 'Gulab Jamun',
        description: 'Soft milk solids balls.',
        price: 120,
        category: 'Sweets',
        image: 'https://tse4.mm.bing.net/th/id/OIP.CAtBpWIDodCzw7gVR5MS1wHaE-?pid=Api&P=0&h=180'
    },
    'kaju_barfi': {
        id: 'kaju_barfi',
        name: 'Kaju Barfi',
        description: 'Rich cashew fudge.',
        price: 200,
        category: 'Sweets',
        image: 'https://tse1.mm.bing.net/th/id/OIP.sx-WMFTfW1tFCHrIdGgVFAHaEK?pid=Api&P=0&h=180'
    },
    // 👇 NEW ITEMS ADDED
    'sprite': {
        id: 'sprite',
        name: 'Sprite',
        description: 'Chilled Lemon-Lime Flavored Soft Drink.',
        price: 50,
        category: 'Cold Drinks',
        image: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=600&q=80'
    },
    'thums_up': {
        id: 'thums_up',
        name: 'Thums Up',
        description: 'Strong & Fizzy Cola Drink.',
        price: 50,
        category: 'Cold Drinks',
        image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&q=80'
    }
};
window.handleGoogleLogin = async function (response) {
    console.log("Google response received", response);
    const googleToken = response.credential;

    try {
        const res = await fetch(`${API_BASE}/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: googleToken })
        });

        // Backend se response check karein
        const data = await res.json();

        if (res.ok) {
            // Token save karein
            localStorage.setItem('token', data.token);

            // Global user update karein
            currentUser = data.user;

            // UI update karein (Sidebar mein naam dikhana)
            showUserUI(data.user);

            // Modals band karein
            closeAllOverlays();

            // 👇 YAHAN CHANGE KIYA HAI (User ka NAAM dikhega ab)
            showToast(`Welcome, ${data.user.name}!`);

            fetchCart(); // 👈 Load cart

        } else {
            showToast(data.message || 'Google Login failed');
        }
    } catch (error) {
        console.error("Google Login Error:", error);
        showToast('Network Error: Please check if server is running');
    }
};
// DOM Ready
document.addEventListener('DOMContentLoaded', function () {
    initApp();
    checkAuth();
    updateCartCount();
    setupEventListeners();
});

// Initialize App
function initApp() {
    // Initialize products array
    products = Object.values(menuItems);
}

// Setup event listeners
function setupEventListeners() {
    // Event booking form
    const eventForm = document.getElementById('event-booking-form');
    if (eventForm) {
        eventForm.addEventListener('submit', handleEventBooking);
    }
}

// ======================
// AUTHENTICATION
// ======================

async function checkAuth() {
    const token = localStorage.getItem('token');

    // Agar Token nahi hai -> Turant Login Kholo
    if (!token) {
        showGuestUI();
        openAuth('login'); // Login Modal Kholo

        // Close Button Chhupa do
        const btn = document.getElementById('login-close-btn');
        if (btn) btn.style.display = 'none';

        return;
    }

    // Agar Token hai -> Verify karo
    try {
        const response = await fetch(`${API_BASE}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const user = await response.json();
            currentUser = user;
            showUserUI(user);

            // Login ho gaya? Ab Close button wapis dikha do (Just in case)
            const btn = document.getElementById('login-close-btn');
            if (btn) btn.style.display = 'block';

            // Fetch user cart
            fetchCart(); // 👈 Load cart from DB

        } else {
            // Token Invalid hai -> Login Kholo
            localStorage.removeItem('token');
            showGuestUI();
            openAuth('login');

            const btn = document.getElementById('login-close-btn');
            if (btn) btn.style.display = 'none';
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        showGuestUI();
        openAuth('login');
    }
}

// Handle Login
async function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-pass').value;

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            showUserUI(data.user);
            closeAllOverlays();
            showToast('Welcome back!');
            fetchCart(); // 👈 Load cart
        } else {
            showToast(data.message || 'Login failed');
        }
    } catch (error) {
        showToast('Network error. Please try again.');
    }
}

// Handle Register
async function handleRegister(event) {
    event.preventDefault();

    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-pass').value;

    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            localStorage.setItem('token', data.token);
            currentUser = data.user;
            showUserUI(data.user);
            closeAllOverlays();
            showToast('Account created successfully!');
            fetchCart(); // 👈 Load cart (mostly empty but good practice)
        } else {
            showToast(data.message || 'Registration failed');
        }
    } catch (error) {
        showToast('Network error. Please try again.');
    }
}

// Logout
async function logout() {
    try {
        const token = localStorage.getItem('token');
        if (token) {
            await fetch(`${API_BASE}/auth/logout`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
        }
    } catch (error) {
        console.error('Logout error:', error);
    }

    localStorage.removeItem('token');
    currentUser = null;
    cart = [];
    showGuestUI();
    closeAllOverlays();
    navigate('home');
    showToast('Logged out successfully');
}

// Save Profile
async function saveProfile(event) {
    event.preventDefault();

    if (!currentUser) {
        showToast('Please login to update profile');
        return;
    }

    const name = document.getElementById('prof-name').value;
    const phone = document.getElementById('prof-mobile').value;
    const address = document.getElementById('prof-address').value;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/auth/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name, phone, address })
        });

        if (response.ok) {
            const data = await response.json();
            currentUser = data.user;
            showUserUI(data.user);
            showToast('Profile updated successfully!');
        } else {
            showToast('Failed to update profile');
        }
    } catch (error) {
        showToast('Network error. Please try again.');
    }
}

// ======================
// UI UPDATES
// ======================

function showUserUI(user) {
    // Update sidebar
    document.getElementById('sidebar-user-info').classList.remove('hidden');
    document.getElementById('sidebar-guest-info').classList.add('hidden');
    document.getElementById('sidebar-logout-btn').style.display = 'block';

    document.getElementById('sidebar-name').textContent = user.name || 'Guest';
    document.getElementById('sidebar-email').textContent = user.email;

    // 👇 SIDEBAR AVATAR LOGIC (Image vs Text)
    const sidebarAvatar = document.getElementById('sidebar-avatar');
    if (user.image) {
        sidebarAvatar.innerHTML = `<img src="${user.image}" class="w-full h-full object-cover rounded-full">`;
        // Background aur text color hata dein taaki image saaf dikhe
        sidebarAvatar.classList.remove('bg-orange-50', 'text-orange-600');
    } else {
        sidebarAvatar.innerHTML = '';
        sidebarAvatar.textContent = user.name?.charAt(0).toUpperCase() || 'G';
        sidebarAvatar.classList.add('bg-orange-50', 'text-orange-600');
    }

    // Update profile view (Agar user profile page par hai)
    if (document.getElementById('prof-name')) {
        document.getElementById('prof-name').value = user.name || '';
        document.getElementById('prof-mobile').value = user.phone || '';
        document.getElementById('prof-address').value = user.address || '';
        document.getElementById('profile-display-name').textContent = user.name || 'Guest';
        document.getElementById('profile-display-email').textContent = user.email;

        // 👇 PROFILE BIG AVATAR LOGIC
        const profileAvatarBig = document.getElementById('profile-avatar-big');
        if (user.image) {
            profileAvatarBig.innerHTML = `<img src="${user.image}" class="w-full h-full object-cover rounded-full">`;
            profileAvatarBig.classList.remove('bg-orange-100', 'text-orange-600');
        } else {
            profileAvatarBig.innerHTML = '';
            profileAvatarBig.textContent = user.name?.charAt(0).toUpperCase() || 'G';
            profileAvatarBig.classList.add('bg-orange-100', 'text-orange-600');
        }
    }
}

function showGuestUI() {
    document.getElementById('sidebar-user-info').classList.add('hidden');
    document.getElementById('sidebar-guest-info').classList.remove('hidden');
    document.getElementById('sidebar-logout-btn').style.display = 'none';

    // Clear profile data
    if (document.getElementById('prof-name')) {
        document.getElementById('prof-name').value = '';
        document.getElementById('prof-mobile').value = '';
        document.getElementById('prof-address').value = '';
        document.getElementById('profile-display-name').textContent = 'Guest';
        document.getElementById('profile-display-email').textContent = 'guest@email.com';
        document.getElementById('profile-avatar-big').textContent = 'G';
    }
}

// ======================
// CART FUNCTIONS
// ======================

// Helper: Sync Cart with Server
async function syncCart() {
    if (!currentUser) return; // Only sync if logged in

    try {
        const token = localStorage.getItem('token');
        await fetch(`${API_BASE}/cart`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ cart })
        });
    } catch (error) {
        console.error("Failed to sync cart:", error);
    }
}

// Helper: Fetch Cart from Server
async function fetchCart() {
    if (!currentUser) return;

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/cart`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const serverCart = await res.json();
            if (serverCart && serverCart.length > 0) {
                cart = serverCart;
                updateCartCount();
                if (currentView === 'cart') renderCart();
            }
        }
    } catch (error) {
        console.error("Failed to fetch cart:", error);
    }
}

function addToCart(productId) {
    const product = menuItems[productId];
    if (!product) {
        showToast('Product not found');
        return;
    }

    // Check if already in cart
    const existingItem = cart.find(item => item.id === productId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: productId,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: 1
        });
    }

    updateCartCount();
    showToast(`${product.name} added to cart!`);

    if (currentView === 'cart') {
        renderCart();
    }

    // Sync with server
    syncCart();
}

function updateCartCount() {
    const count = cart.reduce((total, item) => total + item.quantity, 0);

    const elements = [
        'header-cart-count',
        'sidebar-cart-count',
        'bottom-cart-count'
    ];

    elements.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (count > 0) {
                el.textContent = count;
                el.classList.remove('hidden');
            } else {
                el.classList.add('hidden');
            }
        }
    });
}

function renderCart() {
    const container = document.getElementById('cart-items');
    const empty = document.getElementById('cart-empty');
    const summary = document.getElementById('cart-summary');

    if (!container || !empty || !summary) return;

    if (cart.length === 0) {
        container.innerHTML = '';
        empty.classList.remove('hidden');
        summary.classList.add('hidden');
        return;
    }

    empty.classList.add('hidden');
    summary.classList.remove('hidden');

    container.innerHTML = cart.map(item => `
        <div class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm mb-4">
            <div class="flex items-center gap-6">
                <div class="w-24 h-24 rounded-2xl overflow-hidden bg-gray-100 flex-shrink-0">
                    <img src="${item.image}" class="w-full h-full object-cover">
                </div>
                <div class="flex-1">
                    <h3 class="font-bold text-gray-900 mb-1">${item.name}</h3>
                    <p class="text-gray-500 text-sm mb-3">${item.id.includes('varan') || item.id.includes('vangyachi') ? 'Maharashtrian' : 'Sweets'}</p>
                    <div class="flex items-center justify-between">
                        <div class="flex items-center gap-4">
                            <div class="flex items-center bg-gray-100 rounded-lg">
                                <button onclick="updateCartItem('${item.id}', ${item.quantity - 1})" 
                                    class="w-8 h-8 flex items-center justify-center bg-white rounded hover:text-orange-600 transition">-</button>
                                <span class="w-8 text-center font-bold">${item.quantity}</span>
                                <button onclick="updateCartItem('${item.id}', ${item.quantity + 1})" 
                                    class="w-8 h-8 flex items-center justify-center bg-white rounded hover:text-orange-600 transition">+</button>
                            </div>
                            <button onclick="removeFromCart('${item.id}')" 
                                class="text-red-500 text-sm font-bold hover:text-red-700 transition">Remove</button>
                        </div>
                        <span class="font-bold text-gray-900">₹${item.price * item.quantity}</span>
                    </div>
                </div>
            </div>
        </div>
    `).join('');

    // Update summary
    const subtotal = calculateCartTotal();
    document.getElementById('summary-subtotal').textContent = `₹${subtotal}`;
    document.getElementById('summary-total').textContent = `₹${subtotal + 30}`;
    document.getElementById('checkout-final-amount').textContent = `₹${subtotal + 30}`;
}

function updateCartItem(productId, quantity) {
    if (quantity <= 0) {
        removeFromCart(productId);
        return;
    }

    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity = quantity;
        updateCartCount();
        renderCart();
        syncCart(); // Sync
    }
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    updateCartCount();
    renderCart();
    showToast('Removed from cart');
    syncCart(); // Sync
}

function calculateCartTotal() {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

// ======================
// UI NAVIGATION
// ======================

function navigate(view) {
    currentView = view;

    // Hide all views
    document.querySelectorAll('.section-view').forEach(el => {
        el.classList.remove('active');
    });

    // Show selected view
    const targetView = document.getElementById(`view-${view}`);
    if (targetView) {
        targetView.classList.add('active');
    }

    // Update nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    const navBtn = document.getElementById(`nav-${view}`);
    if (navBtn) {
        navBtn.classList.add('active');
    }

    // Load data if needed
    if (view === 'events') {
        loadMyEvents();
    }
    if (view === 'cart') {
        renderCart();
    }
    if (view === 'orders') {
        loadMyOrders();
    }
    if (view === 'my-events') {
        loadMyEvents();
    }
    if (view === 'blog') {
        loadBlogs();
    }
    if (view === 'reviews') {
        loadReviews();
    }
}
// 1. Global variable to store orders for invoice access
window.myOrdersData = [];

async function loadMyOrders() {
    const container = document.getElementById('orders-list');
    const token = localStorage.getItem('token');

    if (!token) {
        container.innerHTML = `<div class="text-center py-12">Please login to view orders.</div>`;
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/orders/my-orders`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const orders = await response.json();
            window.myOrdersData = orders; // Save data globally

            if (orders.length === 0) {
                container.innerHTML = `<div class="text-center py-12 text-gray-400">No orders found.</div>`;
                return;
            }

            container.innerHTML = orders.map(order => {
                // Image Logic: Prefer MENU image (if product exists), else use stored image
                let displayImage = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&q=80';

                if (order.items && order.items.length > 0) {
                    const firstItem = order.items[0];
                    if (menuItems[firstItem.productId]) {
                        displayImage = menuItems[firstItem.productId].image;
                    } else if (firstItem.image) {
                        displayImage = firstItem.image;
                    }
                }

                // Calculation Logic
                let subtotal = 0;
                if (order.items) {
                    subtotal = order.items.reduce((sum, item) => sum + (Number(item.price) * Number(item.quantity)), 0);
                }
                const finalTotal = order.total || (subtotal + 30);

                // --- NEW BUTTON LOGIC ---
                let actionButtons = '';

                if (order.status === 'delivered') {
                    // Review Eligibility Logic
                    let reviewBtn = '';
                    if (!order.isReviewed) {
                        // Check 7-day limit
                        const deliveredDate = order.deliveredAt ? new Date(order.deliveredAt) : null;

                        // Show button if NO delivered date (legacy/testing) OR within 7 days
                        let isEligible = true;

                        if (deliveredDate) {
                            const now = new Date();
                            const diffTime = Math.abs(now - deliveredDate);
                            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                            if (diffDays > 7) isEligible = false;
                        }

                        if (isEligible) {
                            reviewBtn = `
                            <button onclick="openReviewModal('${order._id}')" 
                                class="px-4 py-2 bg-orange-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-orange-700 transition shadow-lg flex items-center gap-2">
                                <i data-lucide="star" class="w-4 h-4"></i> Review
                            </button>`;
                        }
                    } else {
                        reviewBtn = `
                        <span class="px-4 py-2 bg-green-100 text-green-700 font-bold rounded-xl text-xs uppercase tracking-wider flex items-center gap-2">
                            <i data-lucide="check-circle" class="w-4 h-4"></i> Reviewed
                        </span>`;
                    }

                    // Delivered: Show BILL Button
                    actionButtons = `
                        ${reviewBtn}
                        <button onclick="openCustomerInvoice('${order._id}')" 
                            class="px-4 py-2 bg-slate-800 text-white font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-slate-700 transition shadow-lg flex items-center gap-2">
                            <i data-lucide="receipt" class="w-3 h-3"></i> View Bill
                        </button>`;
                } else if (order.status === 'cancelled') {
                    // Cancelled: Show Nothing or text
                    actionButtons = `<span class="text-xs font-bold text-red-400 uppercase">Cancelled</span>`;
                } else {
                    // Active (Pending/Shipped): Show TRACK & CANCEL
                    if (order.status === 'pending') {
                        actionButtons += `
                        <button onclick="cancelOrder('${order._id}')" class="px-3 py-2 bg-white border border-red-200 text-red-600 font-bold rounded-xl text-xs hover:bg-red-50 transition mr-2">
                            Cancel
                        </button>`;
                    }
                    actionButtons += `
                        <button onclick='openTrackModal(${JSON.stringify(order).replace(/'/g, "&#39;")})' 
                            class="px-4 py-2 bg-orange-600 text-white font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-orange-700 transition shadow-lg shadow-orange-200 flex items-center gap-2">
                            <i data-lucide="map-pin" class="w-3 h-3"></i> Track
                        </button>`;
                }

                return `
                <div class="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm mb-6 transition hover:shadow-md overflow-hidden">
                    <div class="flex justify-between items-center mb-4 border-b border-gray-50 pb-3">
                        <div>
                            <span class="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Order ID</span>
                            <div class="font-mono font-bold text-gray-700">#${order._id.slice(-6).toUpperCase()}</div>
                        </div>
                        <span class="px-3 py-1 rounded-full text-xs font-bold ${getOrderStatusColor(order.status)}">
                            ${order.status.replace(/_/g, ' ').toUpperCase()}
                        </span>
                    </div>

                    <div class="flex gap-4 mb-5">
                        <div class="w-20 h-20 rounded-xl bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-200">
                            <img src="${displayImage}" class="w-full h-full object-cover">
                        </div>
                        <div class="flex-1 space-y-1 overflow-y-auto max-h-20 custom-scrollbar">
                            ${order.items.map(item => `
                                <div class="flex justify-between text-xs border-b border-dashed border-gray-100 pb-1 last:border-0">
                                    <span class="text-gray-700 font-medium"><span class="text-orange-600 font-bold">${item.quantity}x</span> ${item.name}</span>
                                    <span class="font-bold text-gray-900">₹${Number(item.price) * Number(item.quantity)}</span>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <div class="bg-orange-50/50 -mx-5 -mb-5 p-5 border-t border-orange-50 flex items-center justify-between">
                        <div>
                            <p class="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Amount</p>
                            <p class="text-xl font-black text-orange-600">₹${finalTotal}</p>
                        </div>
                        <div class="flex items-center">
                            ${actionButtons}
                        </div>
                    </div>
                </div>`;
            }).join('');
            lucide.createIcons();
        }
    } catch (error) {
        console.error("Order Load Error:", error);
    }
}

// 2. Invoice Function (With Image & Design)
function openCustomerInvoice(orderId) {
    const order = window.myOrdersData.find(o => o._id === orderId);
    if (!order) return;

    // Fill Details
    document.getElementById('inv-order-id').textContent = `#${order._id.slice(-6).toUpperCase()}`;
    document.getElementById('inv-date').textContent = new Date(order.createdAt).toLocaleDateString();
    document.getElementById('inv-cust-name').textContent = order.customerName;
    document.getElementById('inv-cust-phone').textContent = order.customerPhone;
    document.getElementById('inv-cust-addr').textContent = order.deliveryAddress;

    // Fill Items with Image
    const tbody = document.getElementById('inv-items-list');
    let subtotal = 0;

    tbody.innerHTML = order.items.map(item => {
        const total = Number(item.price) * Number(item.quantity);
        subtotal += total;
        // Image fallback - Prefer MENU image (if product exists), else use stored item.image
        let img = item.image || 'https://via.placeholder.com/40';
        if (menuItems[item.productId] && menuItems[item.productId].image) {
            img = menuItems[item.productId].image;
        }

        return `
            <tr class="border-b border-dashed border-gray-100 last:border-0">
                <td class="py-3 flex items-center gap-3">
                    <img src="${img}" class="w-8 h-8 rounded-md object-cover border border-gray-200">
                    <span class="font-medium text-gray-700">${item.name}</span>
                </td>
                <td class="py-3 text-center font-bold text-orange-600">x${item.quantity}</td>
                <td class="py-3 text-right font-bold text-gray-800">₹${total}</td>
            </tr>
        `;
    }).join('');

    // Fill Totals
    document.getElementById('inv-subtotal').textContent = `₹${subtotal}`;
    document.getElementById('inv-total').textContent = `₹${order.total}`;

    // Show Modal
    document.getElementById('cust-invoice-modal').classList.remove('hidden');
}

function closeCustInvoice() {
    document.getElementById('cust-invoice-modal').classList.add('hidden');
}
async function cancelOrder(orderId) {
    if (!confirm('Are you sure you want to cancel this order?')) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/orders/${orderId}/cancel`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Order cancelled successfully');
            loadMyOrders(); // UI refresh karein
        } else {
            showToast(data.message || 'Could not cancel order');
        }
    } catch (e) {
        console.error(e);
        showToast('Error cancelling order');
    }
}

// 2. Track Order Modal Logic
function openTrackModal(order) {
    const modal = document.getElementById('tracking-modal');
    modal.classList.remove('hidden');

    document.getElementById('track-order-id').textContent = `Order #${order._id.slice(-6).toUpperCase()}`;

    // Show OTP only if Out For Delivery
    const otpContainer = document.getElementById('track-otp-container');
    if (order.status === 'out_for_delivery' || order.status === 'delivered') {
        otpContainer.classList.remove('hidden');
        document.getElementById('track-otp-value').textContent = order.deliveryOtp;
    } else {
        otpContainer.classList.add('hidden');
    }

    // Update Steps Colors
    const steps = ['confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered'];
    let isActive = true;

    steps.forEach(step => {
        const el = document.getElementById(`step-icon-${step}`);
        if (!el) return;

        // Reset
        el.className = "w-10 h-10 rounded-full flex items-center justify-center z-10 border-2 border-white shadow-sm transition-colors duration-300";

        if (order.status === 'cancelled') {
            el.classList.add('bg-gray-100', 'text-gray-400');
            return;
        }

        if (isActive) {
            el.classList.add('bg-green-100', 'text-green-600');
            if (order.status === step) isActive = false; // Stop highlighting after current step
        } else {
            el.classList.add('bg-gray-100', 'text-gray-400');
        }
    });
}

function closeTracking() {
    document.getElementById('tracking-modal').classList.add('hidden');
}
function getOrderStatusColor(status) {
    const colors = {
        pending: 'bg-yellow-100 text-yellow-800',
        confirmed: 'bg-blue-100 text-blue-800',
        delivered: 'bg-green-100 text-green-800',
        cancelled: 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
}

// ======================
// PRODUCT DETAIL
// ======================

function openProductDetail(type) {
    if (type === 'maharashtrian') {
        // Show Maharashtrian dishes
        navigate('menu');
    } else if (type === 'sweets') {
        // Show Sweets
        navigate('menu');
    }
}

// ======================
// EVENT BOOKING
// ======================
async function handleEventBooking(event) {
    event.preventDefault();

    const formData = new FormData(event.target);

    // 1. Smart Item Selection Logic
    // Checkbox aur Quantity dono ko check karega
    const itemKeys = ['varan_batti', 'vangyachi_bhaji', 'gulab_jamun', 'kaju_barfi', 'sprite', 'thums_up'];
    const selectedFoodItems = [];

    itemKeys.forEach(key => {
        // HTML elements dhoondhein
        const checkbox = event.target.querySelector(`input[value="${key}"]`);
        const qtyInput = event.target.querySelector(`input[name="${key}_qty"]`);

        const isChecked = checkbox ? checkbox.checked : false;
        let quantity = qtyInput ? parseInt(qtyInput.value) : 0;

        // LOGIC FIX:
        // Agar tick kiya hai par qty khali hai -> Quantity 1 maan lo
        if (isChecked && (isNaN(quantity) || quantity <= 0)) {
            quantity = 1;
        }

        // Agar quantity dali hai par tick nahi kiya -> Tick maan lo
        if (quantity > 0) {
            // Item ka naam label se nikal lo
            const itemName = checkbox
                ? checkbox.nextElementSibling.innerText.split('(')[0].trim()
                : key.replace(/_/g, ' ');

            selectedFoodItems.push({
                itemId: key,
                itemName: itemName,
                quantity: quantity
            });
        }
    });

    // 2. Validation
    if (selectedFoodItems.length === 0) {
        showToast('Please select at least one food item');
        return;
    }

    // 3. Prepare Data for Backend
    const bookingData = {
        customerName: formData.get('name'),
        customerEmail: formData.get('email'),
        customerPhone: formData.get('phone'),
        eventType: formData.get('event_type'),
        eventDate: formData.get('event_date'),
        guests: formData.get('guests'),
        eventAddress: formData.get('address'),
        specialRequirements: formData.get('requirements'),
        foodItems: selectedFoodItems
    };

    // 4. Send to Server (Real Working)
    try {
        const submitBtn = event.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerText;
        submitBtn.innerText = "Booking...";
        submitBtn.disabled = true;

        const response = await fetch(`${API_BASE}/events`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(bookingData)
        });

        const result = await response.json();

        if (response.ok) {
            showToast('✅ Booking Request Sent Successfully!');
            event.target.reset();
            // Optional: Redirect to home after 2 seconds
            setTimeout(() => navigate('home'), 2000);
        } else {
            showToast(result.message || 'Booking Failed');
        }

        submitBtn.innerText = originalText;
        submitBtn.disabled = false;

    } catch (error) {
        console.error("Booking Error:", error);
        showToast('Network Error. Please try again.');
    }
}
async function loadMyEvents() {
    const container = document.getElementById('my-events-list');
    const token = localStorage.getItem('token');

    if (!token) {
        container.innerHTML = `<div class="text-center py-8 text-gray-500">Login to view your bookings.</div>`;
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/events/my-events`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const events = await response.json();

            if (events.length === 0) {
                container.innerHTML = `<div class="text-center py-8 text-gray-400">No bookings found.</div>`;
                return;
            }

            // Events Global Store (for Invoice access)
            window.myEventsData = events;

            container.innerHTML = events.map(event => `
                <div class="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition">
                    <div class="flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div>
                            <div class="flex items-center gap-2 mb-1">
                                <span class="font-bold text-lg text-gray-800 capitalize">${event.eventType} Event</span>
                                <span class="text-xs px-2 py-1 rounded bg-orange-100 text-orange-700 font-bold uppercase">${event.status}</span>
                            </div>
                            <p class="text-sm text-gray-500">
                                <i data-lucide="calendar" class="w-3 h-3 inline mr-1"></i> ${new Date(event.eventDate).toLocaleDateString()} 
                                <span class="mx-2">•</span> 
                                <i data-lucide="users" class="w-3 h-3 inline mr-1"></i> ${event.guests} Guests
                            </p>
                        </div>
                        
                        <div class="flex items-center gap-4">
                            <div class="text-right">
                                <p class="text-xs text-gray-400 uppercase font-bold">Total Estimate</p>
                                <p class="text-xl font-black text-orange-600">₹${event.totalAmount.toLocaleString()}</p>
                            </div>
                            <button onclick="openEventInvoice('${event._id}')" 
                                class="px-4 py-2 bg-slate-800 text-white font-bold rounded-xl text-sm hover:bg-slate-700 transition flex items-center gap-2">
                                <i data-lucide="receipt" class="w-4 h-4"></i> View Bill
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');

            lucide.createIcons();
        }
    } catch (error) {
        console.error("Event Load Error:", error);
        container.innerHTML = `<div class="text-center text-red-400">Failed to load bookings.</div>`;
    }
}

// Reuse existing Invoice Modal for Events
function openEventInvoice(eventId) {
    const event = window.myEventsData.find(e => e._id === eventId);
    if (!event) return;

    // 1. Fill Header Details
    document.getElementById('inv-order-id').textContent = `#EVT-${eventId.slice(-6).toUpperCase()}`;
    document.getElementById('inv-date').textContent = new Date(event.createdAt).toLocaleDateString();

    // 2. Fill Customer Details
    document.getElementById('inv-cust-name').textContent = event.customerName;
    document.getElementById('inv-cust-phone').textContent = event.customerPhone;
    document.getElementById('inv-cust-addr').textContent = event.eventAddress; // Event Location uses Address field

    // 3. Fill Items (Food Plates)
    const tbody = document.getElementById('inv-items-list');
    let subtotal = 0;

    tbody.innerHTML = event.foodItems.map(item => {
        const itemTotal = Number(item.price) * Number(item.quantity);
        subtotal += itemTotal;

        return `
            <tr class="border-b border-dashed border-gray-100 last:border-0">
                <td class="py-3 flex items-center gap-3">
                    <div class="w-8 h-8 rounded bg-orange-50 flex items-center justify-center text-orange-500">
                        <i data-lucide="utensils" class="w-4 h-4"></i>
                    </div>
                    <span class="font-medium text-gray-700">${item.itemName}</span>
                </td>
                <td class="py-3 text-center font-bold text-gray-600">${item.quantity} Plates</td>
                <td class="py-3 text-right font-bold text-gray-800">₹${itemTotal.toLocaleString()}</td>
            </tr>
        `;
    }).join('');

    // 4. Totals (Events don't have delivery fee usually in this logic)
    document.getElementById('inv-subtotal').textContent = `₹${subtotal.toLocaleString()}`;
    // Hide delivery fee row strictly for events logic if needed, but keeping simple:
    // Hum Delivery Fee ko 0 dikhayenge ya ignore karenge agar calculation match karni hai
    document.getElementById('inv-total').textContent = `₹${event.totalAmount.toLocaleString()}`;

    // 5. Show Modal
    document.getElementById('cust-invoice-modal').classList.remove('hidden');
    lucide.createIcons();
}
// ======================
// ORDER PROCESSING
// ======================
async function processOrder(event) {
    event.preventDefault();

    if (cart.length === 0) {
        showToast('Cart is empty');
        return;
    }

    const token = localStorage.getItem('token');

    // Prepare Order Data
    const orderData = {
        customerName: document.getElementById('checkout-name').value,
        customerEmail: currentUser ? currentUser.email : 'guest@example.com', // Fallback for guest
        customerPhone: document.getElementById('checkout-phone').value,
        deliveryAddress: document.getElementById('checkout-street').value + ', ' + document.getElementById('checkout-pincode').value,
        items: cart,
        paymentMethod: document.querySelector('input[name="payment-mode"]:checked').value
    };

    try {
        const response = await fetch(`${API_BASE}/orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                // Send token if user is logged in (optional for guest checkout)
                ...(token && { 'Authorization': `Bearer ${token}` })
            },
            body: JSON.stringify(orderData)
        });

        if (response.ok) {
            showToast('Order placed successfully!');
            closeCheckout();
            cart = [];
            updateCartCount();
            renderCart();
            event.target.reset();

            // If user is on Order History page, refresh it
            if (currentView === 'orders') loadMyOrders();
        } else {
            const data = await response.json();
            showToast(data.message || 'Failed to place order');
        }
    } catch (error) {
        showToast('Network error. Please try again.');
        console.error(error);
    }
}
// ======================
// HELPER FUNCTIONS
// ======================

function showToast(message) {
    const toast = document.getElementById('toast');
    const msg = document.getElementById('toast-msg');

    if (!toast || !msg) return;

    msg.textContent = message;
    toast.classList.remove('opacity-0', 'pointer-events-none');
    toast.classList.add('opacity-100');

    setTimeout(() => {
        toast.classList.remove('opacity-100');
        toast.classList.add('opacity-0', 'pointer-events-none');
    }, 3000);
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay-backdrop');

    sidebar.classList.toggle('-translate-x-full');
    overlay.classList.toggle('hidden');
}

function closeAllOverlays() {
    document.getElementById('sidebar').classList.add('-translate-x-full');
    document.getElementById('overlay-backdrop').classList.add('hidden');
    document.getElementById('auth-modal').classList.add('hidden');
    document.getElementById('login-box').classList.add('hidden');
    document.getElementById('register-box').classList.add('hidden');
}

function openAuth(type) {
    closeAllOverlays();

    const modal = document.getElementById('auth-modal');
    const loginBox = document.getElementById('login-box');
    const registerBox = document.getElementById('register-box');

    modal.classList.remove('hidden');

    if (type === 'login') {
        loginBox.classList.remove('hidden', 'scale-95', 'opacity-0');
        loginBox.classList.add('scale-100', 'opacity-100');
        registerBox.classList.add('hidden');
    } else {
        registerBox.classList.remove('hidden', 'scale-95', 'opacity-0');
        registerBox.classList.add('scale-100', 'opacity-100');
        loginBox.classList.add('hidden');
    }
}

function switchAuth(type) {
    openAuth(type);
}

function openCheckout() {
    if (cart.length === 0) {
        showToast('Cart is empty');
        return;
    }

    const modal = document.getElementById('checkout-modal');
    modal.classList.remove('hidden');

    // Pre-fill user data if available
    if (currentUser) {
        document.getElementById('checkout-name').value = currentUser.name || '';
        document.getElementById('checkout-street').value = currentUser.address || '';
        document.getElementById('checkout-phone').value = currentUser.phone || '';
    }
}

function closeCheckout() {
    document.getElementById('checkout-modal').classList.add('hidden');
}
// Updated Blog Data for Services & Delivery
const blogPosts = [
    {
        id: 1,
        title: "⚡ Lightning Fast Delivery",
        category: "Promise",
        // Apni photo ka naam yahan likhein (folder: images)
        image: "https://cdn.create.vista.com/downloads/f1696169-10e7-4fbf-bcae-f2a748e9e76f_1024.jpeg",
        desc: "We value your time! Our dedicated delivery fleet ensures your Varan Batti and Sweets reach you piping hot within the promised time frame. No delays, just happiness.",
        date: "Service Guarantee"
    },
    {
        id: 2,
        title: "🎉 Bulk Orders for Weddings & Parties",
        category: "Catering",
        // Apni photo ka naam yahan likhein
        image: "https://astawolf.com/wp-content/uploads/2023/12/Bulk-Orders.jpg",
        desc: "Planning a big event? We handle bulk orders for marriages and birthdays with precision. From 50 to 500 guests, we ensure consistent taste and timely setup.",
        date: "Event Services"
    },
    {
        id: 3,
        title: "🛡️ 100% Hygienic & Sanitized Kitchen",
        category: "Hygiene",
        // Apni photo ka naam yahan likhein
        image: "https://www.shutterstock.com/image-vector/100-hygienic-rubber-stamp-seal-260nw-2258537221.jpg",
        desc: "Your health is our priority. Our kitchen follows strict ISO standards. Chefs wear gloves, caps, and masks to ensure every bite is safe and pure.",
        date: "Quality Check"
    },
    {
        id: 4,
        title: "📦 Premium Spill-Proof Packaging",
        category: "Packaging",
        // Apni photo ka naam yahan likhein
        image: "https://tse2.mm.bing.net/th/id/OIP.OxWtskQdBgc-gtn7vsHzGwHaHa?pid=Api&P=0&h=180",
        desc: "No messy leaks! We use high-grade, eco-friendly containers that keep the curry hot and the sweets intact during transit.",
        date: "Delivery Standards"
    }
];

// Load Blogs Function (Ye same rahega, bas ek chhota design tweak hai)
function loadBlogs() {
    const container = document.getElementById('blog-container');
    if (!container) return;

    container.innerHTML = blogPosts.map(post => `
        <div class="bg-white rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 group border border-gray-100 flex flex-col h-full transform hover:-translate-y-1">
            <div class="h-56 overflow-hidden relative">
                <img src="${post.image}" onerror="this.src='https://via.placeholder.com/400x300?text=Service+Image'" class="w-full h-full object-cover group-hover:scale-110 transition duration-700">
                <div class="absolute top-4 left-4 bg-orange-600 text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-md">
                    ${post.category}
                </div>
            </div>
            <div class="p-6 flex flex-col flex-grow">
                <div class="flex items-center gap-2 text-xs text-orange-600 mb-3 font-bold uppercase tracking-wide">
                    <i data-lucide="check-circle" class="w-4 h-4"></i> ${post.date}
                </div>
                <h3 class="text-xl font-bold text-gray-900 mb-3 group-hover:text-orange-600 transition leading-tight">${post.title}</h3>
                <p class="text-gray-500 text-sm mb-4 line-clamp-3 flex-grow leading-relaxed">${post.desc}</p>
                <div class="pt-4 border-t border-gray-100 mt-auto">
                    <span class="text-xs font-bold text-gray-400">HOT FOOD SERVICES</span>
                </div>
            </div>
        </div>
    `).join('');

    if (window.lucide) lucide.createIcons();
}
// ==========================================
// 🔒 GLOBAL SECURITY: BLOCK CLICKS IF NOT LOGGED IN
// ==========================================

document.addEventListener('click', function (e) {
    const token = localStorage.getItem('token');

    // 1. Agar User Login hai, to kuch mat karo (Normal chalne do)
    if (token) return;

    // 2. Agar User 'Login Modal' ya 'Register Modal' ke andar click kar raha hai, to allow karo
    // (Taaki wo email/password type kar sake aur submit kar sake)
    if (e.target.closest('#auth-modal')) return;

    // 3. Agar User Login NAHI hai aur kahi aur click kar raha hai:
    e.preventDefault();  // Click ka action roko (Button press nahi hoga)
    e.stopPropagation(); // Event ko aage mat jane do

    console.log("🚫 Access Denied: Redirecting to Login");

    // Login Modal Open Karo
    openAuth('login');

    // Close Button (X) ko chhupa do taaki wo modal band na kar sake
    const closeBtn = document.getElementById('login-close-btn');
    const regCloseBtn = document.getElementById('reg-close-btn');
    const overlay = document.getElementById('overlay-backdrop');

    if (closeBtn) closeBtn.style.display = 'none';
    if (regCloseBtn) regCloseBtn.style.display = 'none';

    // Background click disable karo
    if (overlay) overlay.onclick = null;

}, true); // 👈 IMPORTANT: 'true' ka matlab hai "Capture Phase" (Sabse pehle ye chalega)
// Initialize icons
// ======================
// REVIEW SYSTEM
// ======================

let currentReviewOrderId = null;

function openReviewModal(orderId) {
    currentReviewOrderId = orderId;
    document.getElementById('review-order-id').value = orderId;
    document.getElementById('review-modal').classList.remove('hidden');
    // Reset form
    document.getElementById('review-comment').value = '';
    document.querySelectorAll('input[name="rating"]').forEach(el => el.checked = false);
    clearImage();
}

function closeReviewModal() {
    document.getElementById('review-modal').classList.add('hidden');
    currentReviewOrderId = null;
}

function previewImage(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        if (file.size > 500 * 1024) { // 500KB limit
            showToast('Image too large. Max 500KB.', 'error');
            input.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = function (e) {
            document.getElementById('image-preview').src = e.target.result;
            document.getElementById('image-preview-container').classList.remove('hidden');
            document.getElementById('upload-placeholder').classList.add('hidden');
        }
        reader.readAsDataURL(file);
    }
}

function clearImage() {
    document.getElementById('review-image').value = '';
    document.getElementById('image-preview').src = '';
    document.getElementById('image-preview-container').classList.add('hidden');
    document.getElementById('upload-placeholder').classList.remove('hidden');
}

async function handleReviewSubmit(e) {
    e.preventDefault();
    const orderId = document.getElementById('review-order-id').value;
    const comment = document.getElementById('review-comment').value;
    const ratingEl = document.querySelector('input[name="rating"]:checked');
    const imageInput = document.getElementById('review-image');

    if (!ratingEl) {
        showToast('Please select a star rating.', 'error');
        return;
    }
    const rating = ratingEl.value;

    let imageBase64 = '';
    if (imageInput.files && imageInput.files[0]) {
        const reader = new FileReader();
        reader.readAsDataURL(imageInput.files[0]);
        await new Promise(resolve => reader.onload = () => {
            imageBase64 = reader.result;
            resolve();
        });
    }

    try {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE}/reviews`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ orderId, rating, comment, image: imageBase64 })
        });

        const data = await res.json();
        if (res.ok) {
            showToast('Review submitted successfully!');
            closeReviewModal();
            loadMyOrders(); // Refresh buttons
            if (typeof loadReviews === 'function') loadReviews(); // Refresh review list if viewing
        } else {
            showToast(data.message || 'Failed to submit review', 'error');
        }
    } catch (error) {
        console.error("Review Submit Error:", error);
        showToast('Server error', 'error');
    }
}

// XSS Protection Helper
function escapeHtml(text) {
    if (!text) return '';
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

async function loadReviews() {
    const container = document.getElementById('reviews-container');
    const loading = document.getElementById('loading-reviews');
    const noReviews = document.getElementById('no-reviews');

    container.innerHTML = '';
    loading.classList.remove('hidden');
    noReviews.classList.add('hidden');

    try {
        const res = await fetch(`${API_BASE}/reviews`);
        const reviews = await res.json();

        loading.classList.add('hidden');

        if (reviews.length === 0) {
            noReviews.classList.remove('hidden');
            return;
        }

        container.innerHTML = reviews.map(review => `
            <div class="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 flex gap-4">
                <div class="flex-shrink-0">
                    <div class="w-12 h-12 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xl">
                        ${escapeHtml(review.userName).charAt(0).toUpperCase()}
                    </div>
                </div>
                <div class="flex-1">
                    <div class="flex justify-between items-start mb-2">
                        <div>
                            <h4 class="font-bold text-gray-900">${escapeHtml(review.userName)}</h4>
                            <div class="flex text-yellow-400 text-xs">
                                ${'★'.repeat(review.rating)}${'☆'.repeat(5 - review.rating)}
                            </div>
                        </div>
                        <span class="text-xs text-gray-400">${new Date(review.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p class="text-gray-600 text-sm mb-3">"${escapeHtml(review.comment)}"</p>
                    ${review.image ? `<img src="${review.image}" class="w-20 h-20 object-cover rounded-lg border border-gray-200 cursor-pointer hover:opacity-80 transition" onclick="openImageModal('${review.image}')">` : ''}
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error("Load Reviews Error:", error);
        loading.classList.add('hidden');
        container.innerHTML = '<p class="text-center text-red-500">Failed to load reviews.</p>';
    }
}

// Lightbox Functions
function openImageModal(src) {
    document.getElementById('modal-image-full').src = src;
    document.getElementById('image-modal').classList.remove('hidden');
}

function closeImageModal() {
    document.getElementById('image-modal').classList.add('hidden');
    // Clear src to stop video/memory if needed, though strictly img here
    setTimeout(() => {
        document.getElementById('modal-image-full').src = '';
    }, 300);
}

window.addEventListener('load', () => {
    loadReviews(); // Load reviews on startup for home page slider
    if (window.lucide) {
        lucide.createIcons();
    }
});
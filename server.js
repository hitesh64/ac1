// server.js - Complete Backend for HOT FOOD Event Management
const { OAuth2Client } = require('google-auth-library');
require('dotenv').config();

// --- ENV CHECK ---
const REQUIRED_ENV = ['MONGODB_URI', 'JWT_SECRET', 'GOOGLE_CLIENT_ID'];
const missingEnv = REQUIRED_ENV.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
    console.error(`❌ FATAL ERROR: Missing required environment variables: ${missingEnv.join(', ')}`);
    console.error(`💡 Please create a .env file with these keys.`);
    process.exit(1);
}

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use('/images', express.static('images'));

// Health Check Route (No DB required)
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date(),
        env_check: {
            mongo: !!process.env.MONGODB_URI,
            jwt: !!process.env.JWT_SECRET
        }
    });
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(async () => {
        console.log('MongoDB connected');

        // --- AUTO-SEED LOGIC START ---
        // Check karein agar products missing hain toh add karein
        try {
            // Check current count
            const count = await Product.countDocuments();

            // Agar products 6 se kam hain (mtlb purana data hai), to update karo
            if (count < 6) {
                console.log("Database incomplete. Updating to 6 products...");

                // 1. Purana data safayi (Safe tareeka)
                await Product.deleteMany({});

                // 2. Nayi List (6 Items)
                const products = [
                    {
                        id: 'varan_batti',
                        name: 'Varan Batti',
                        description: 'Traditional Maharashtrian dish consisting of spicy dal (varan) and wheat dumplings (batti).',
                        price: 250,
                        category: 'Maharashtrian',
                        image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=600&q=80',
                        stock: 100
                    },
                    {
                        id: 'vangyachi_bhaji',
                        name: 'Vangyachi Bhaji',
                        description: 'Spicy and flavorful stuffed eggplant curry cooked in peanut masala gravy.',
                        price: 180,
                        category: 'Maharashtrian',
                        image: 'https://images.unsplash.com/photo-1626505927885-3e284a1421c9?w=600&q=80',
                        stock: 100
                    },
                    {
                        id: 'gulab_jamun',
                        name: 'Gulab Jamun',
                        description: 'Soft milk solids balls soaked in rose-flavored sugar syrup. (4 pieces)',
                        price: 120,
                        category: 'Sweets',
                        image: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=600&q=80',
                        stock: 100
                    },
                    {
                        id: 'kaju_barfi',
                        name: 'Kaju Barfi',
                        description: 'Diamond-shaped rich cashew fudge topped with silver leaf. (250g)',
                        price: 200,
                        category: 'Sweets',
                        image: 'https://images.unsplash.com/photo-1599577779774-72213d297924?w=600&q=80',
                        stock: 100
                    },
                    // 👇 NEW ITEMS ADDED HERE
                    {
                        id: 'sprite',
                        name: 'Sprite',
                        description: 'Chilled Lemon-Lime Flavored Soft Drink (750ml).',
                        price: 50,
                        category: 'Cold Drinks',
                        image: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=600&q=80',
                        stock: 100
                    },
                    {
                        id: 'thums_up',
                        name: 'Thums Up',
                        description: 'Strong & Fizzy Cola Drink (750ml).',
                        price: 50,
                        category: 'Cold Drinks',
                        image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&q=80',
                        stock: 100
                    }
                ];

                await Product.insertMany(products);

            } else {
                console.log(`✅ Database already has ${count} products (Up to date).`);
            }
        } catch (err) {
            console.error("Auto-seed error:", err);
        }
        // --- AUTO-SEED LOGIC END ---
    })
    .catch(err => console.error('MongoDB connection error:', err));

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET;

// ======================
// SCHEMAS & MODELS
// ======================

// User Schema (for customers)
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String }, // Google users ke liye null ho sakta hai
    phone: { type: String },
    address: { type: String },
    image: { type: String },
    isBlocked: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    role: { type: String, default: 'customer' },
    // 👇 NAYA FIELD: Google se login ka record rakhein
    authProvider: {
        type: String,
        enum: ['local', 'google'],
        default: 'local'
    },
    googleId: { type: String }, // Optional: Google ka unique ID store karein
    // 👇 Cart Persistence Field
    cart: [{
        id: String,
        name: String,
        price: Number,
        image: String,
        quantity: Number
    }]
});

const User = mongoose.model('User', userSchema);

// Admin Schema (separate for admin users)
const adminSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    role: { type: String, default: 'admin' }
});

const Admin = mongoose.model('Admin', adminSchema);

// Product Schema
const productSchema = new mongoose.Schema({
    id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    category: { type: String, required: true },
    image: { type: String },
    stock: { type: Number, default: 100 },
    createdAt: { type: Date, default: Date.now }
});

const Product = mongoose.model('Product', productSchema);

// Event Booking Schema
const eventSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Link to User
    customerName: { type: String, required: true },
    customerEmail: { type: String, required: true },
    customerPhone: { type: String, required: true },
    eventType: { type: String, required: true },
    eventDate: { type: Date, required: true },
    guests: { type: Number, required: true },
    eventAddress: { type: String, required: true },
    specialRequirements: { type: String },
    foodItems: [{
        itemId: String,
        itemName: String,
        quantity: Number,
        price: Number
    }],
    status: {
        type: String,
        enum: ['pending', 'confirmed', 'completed', 'cancelled'],
        default: 'pending'
    },
    totalAmount: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Event = mongoose.model('Event', eventSchema);

// Review Schema
const reviewSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String },
    image: { type: String }, // Base64 image
    createdAt: { type: Date, default: Date.now }
});
const Review = mongoose.model('Review', reviewSchema);

const orderSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    customerName: { type: String, required: true },
    customerEmail: { type: String },
    customerPhone: { type: String, required: true },
    items: [{
        productId: String,
        name: String,
        quantity: Number,
        price: Number,
        image: String
    }],
    total: { type: Number, required: true },
    deliveryAddress: { type: String, required: true },
    paymentMethod: { type: String, default: 'Cash on Delivery' },
    status: {
        type: String,
        // 👇 Yahan 'packed' aur 'shipped' add kiya gaya hai
        enum: ['pending', 'confirmed', 'packed', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'],
        default: 'pending'
    },
    deliveryOtp: { type: String },
    deliveryFee: { type: Number, default: 30 },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', orderSchema);

// ======================
// MIDDLEWARE
// ======================

// Authenticate user (customer)
const authenticateUser = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }

        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
};

// Authenticate admin
const authenticateAdmin = async (req, res, next) => {
    try {
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const decoded = jwt.verify(token, JWT_SECRET);
        const admin = await Admin.findById(decoded.adminId);

        if (!admin) {
            return res.status(401).json({ message: 'Admin not found' });
        }

        req.admin = admin;
        req.token = token;
        next();
    } catch (error) {
        res.status(401).json({ message: 'Invalid token' });
    }
};

// ======================
// CUSTOMER AUTH ROUTES
// ======================

// Customer Registration
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const user = new User({
            name,
            email,
            password: hashedPassword
        });

        await user.save();

        // Generate token
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            message: 'Account created successfully',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                address: user.address
            },
            token
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
app.put('/api/admin/customers/:id/block', authenticateAdmin, async (req, res) => {
    try {
        const { isBlocked } = req.body;

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { isBlocked: isBlocked },
            { new: true }
        );

        if (!user) return res.status(404).json({ message: 'User not found' });

        res.json({
            message: isBlocked ? 'User Blocked Successfully' : 'User Unblocked Successfully',
            user
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
// Customer Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // 1. Pehle User find karein (Ye line upar honi chahiye)
        const user = await User.findOne({ email });

        // 2. Agar user nahi mila
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // 3. AB check karein ki blocked hai ya nahi (User milne ke baad)
        if (user.isBlocked) {
            return res.status(403).json({ message: 'Your account has been BLOCKED by Admin.' });
        }

        // 4. Check if user has a password (Google users might not)
        if (!user.password) {
            return res.status(400).json({
                message: 'This account uses Google Login. Please sign in with Google.',
                isGoogleAuth: true
            });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            message: 'Login successful',
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                address: user.address,
                image: user.image
            },
            token
        });
    } catch (error) {
        console.error("Login Error:", error); // Improved logging
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get Current User
app.get('/api/auth/me', authenticateUser, async (req, res) => {
    try {
        res.json({
            _id: req.user._id,
            name: req.user.name,
            email: req.user.email,
            phone: req.user.phone,
            address: req.user.address,
            image: req.user.image
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Update User Profile
app.put('/api/auth/profile', authenticateUser, async (req, res) => {
    try {
        const { name, phone, address } = req.body;

        req.user.name = name || req.user.name;
        req.user.phone = phone || req.user.phone;
        req.user.address = address || req.user.address;

        await req.user.save();

        res.json({
            message: 'Profile updated successfully',
            user: {
                _id: req.user._id,
                name: req.user.name,
                email: req.user.email,
                phone: req.user.phone,
                address: req.user.address
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Customer Logout
app.post('/api/auth/logout', authenticateUser, (req, res) => {
    res.json({ message: 'Logged out successfully' });
});

// ======================
// CART ROUTES
// ======================

// Get User Cart
app.get('/api/cart', authenticateUser, async (req, res) => {
    try {
        const user = await User.findById(req.user._id);
        res.json(user.cart || []);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching cart' });
    }
});

// Sync/Update Cart
app.put('/api/cart', authenticateUser, async (req, res) => {
    try {
        const { cart } = req.body;

        // Update user's cart in DB
        const user = await User.findByIdAndUpdate(
            req.user._id,
            // $set operator entirely replaces the cart array
            { $set: { cart: cart } },
            { new: true }
        );

        res.json({ message: 'Cart updated', cart: user.cart });
    } catch (error) {
        console.error("Cart Update Error:", error);
        res.status(500).json({ message: 'Server error updating cart' });
    }
});

// ======================
// REVIEW ROUTES
// ======================

// Submit a Review
// Submit a Review
app.post('/api/reviews', authenticateUser, async (req, res) => {
    try {
        const { orderId, rating, comment, image } = req.body;

        console.log(`[REVIEW] Submitting for Order: ${orderId} | User: ${req.user.name} (${req.user.email})`);

        // 1. Verify Order (Match by ID AND (User ID OR Email))
        const order = await Order.findOne({
            _id: orderId,
            $or: [
                { user: req.user._id },
                { customerEmail: req.user.email } // Fallback for legacy orders
            ]
        });

        if (!order) {
            console.log(`[REVIEW] Order not found for ID: ${orderId}`);
            return res.status(404).json({ message: 'Order not found' });
        }

        // 2. Verify Status & Time Limit
        if (order.status !== 'delivered') {
            return res.status(400).json({ message: 'Only delivered orders can be reviewed' });
        }

        if (order.isReviewed) {
            return res.status(400).json({ message: 'You have already reviewed this order' });
        }

        // 7-Day Limit Check (Only if deliveredAt exists)
        if (order.deliveredAt) {
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            if (new Date(order.deliveredAt) < sevenDaysAgo) {
                return res.status(400).json({ message: 'Review period expired (7 days limit)' });
            }
        }

        // 3. Create Review
        const review = new Review({
            user: req.user._id,
            userName: req.user.name || 'Customer', // Fallback
            orderId: order._id,
            rating,
            comment: comment || '',
            image // Base64 string
        });

        console.log('[REVIEW] Saving review...');
        await review.save();

        // 4. Update Order
        order.isReviewed = true;
        await order.save();

        console.log('[REVIEW] Success!');
        res.status(201).json({ message: 'Review submitted successfully', review });

    } catch (error) {
        console.error("Review Error Stack:", error.stack);
        console.error("Review Error Message:", error.message);
        res.status(500).json({ message: 'Server error submitting review: ' + error.message });
    }
});

// Get All Reviews (Public)
app.get('/api/reviews', async (req, res) => {
    try {
        const reviews = await Review.find().sort({ createdAt: -1 });
        res.json(reviews);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching reviews' });
    }
});

// ======================
// ADMIN AUTH ROUTES
// ======================

// Admin Registration (protected in production)
app.post('/api/auth/admin-register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Check if admin exists
        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
            return res.status(400).json({ message: 'Admin already exists' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create admin
        const admin = new Admin({
            name,
            email,
            password: hashedPassword
        });

        await admin.save();

        // Generate token
        const token = jwt.sign({ adminId: admin._id }, JWT_SECRET, { expiresIn: '7d' });

        res.status(201).json({
            message: 'Admin registered successfully',
            user: {
                _id: admin._id,
                name: admin.name,
                email: admin.email
            },
            token
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Admin Login
app.post('/api/auth/admin-login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Find admin
        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, admin.password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Invalid credentials' });
        }

        // Generate token
        const token = jwt.sign({ adminId: admin._id }, JWT_SECRET, { expiresIn: '7d' });

        res.json({
            message: 'Admin login successful',
            user: {
                _id: admin._id,
                name: admin.name,
                email: admin.email
            },
            token
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Verify Admin Token
app.get('/api/auth/verify-admin', authenticateAdmin, (req, res) => {
    res.json({
        valid: true,
        admin: {
            _id: req.admin._id,
            name: req.admin.name,
            email: req.admin.email
        }
    });
});

// ======================
// PRODUCT ROUTES
// ======================

// Get all products
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Seed initial products
app.post('/api/seed-products', async (req, res) => {
    try {
        const products = [
            {
                id: 'varan_batti',
                name: 'Varan Batti',
                description: 'Traditional Maharashtrian dish consisting of spicy dal (varan) and wheat dumplings (batti) served with ghee.',
                price: 250,
                category: 'Maharashtrian',
                image: 'https://i.ytimg.com/vi/io7C2sqcHTY/maxresdefault.jpg', // Fixed Image
                stock: 100
            },
            {
                id: 'vangyachi_bhaji',
                name: 'Vangyachi Bhaji',
                description: 'Spicy and flavorful stuffed eggplant curry cooked in peanut masala gravy.',
                price: 180,
                category: 'Maharashtrian',
                image: 'https://i.ytimg.com/vi/mi1u1Vww5Bs/maxresdefault.jpg', // Fixed Image
                stock: 100
            },
            {
                id: 'gulab_jamun',
                name: 'Gulab Jamun',
                description: 'Soft milk solids balls soaked in rose-flavored sugar syrup. (4 pieces)',
                price: 120,
                category: 'Sweets',
                image: 'https://tse4.mm.bing.net/th/id/OIP.CAtBpWIDodCzw7gVR5MS1wHaE-?pid=Api&P=0&h=180', // Fixed Image
                stock: 100
            },
            {
                id: 'kaju_barfi',
                name: 'Kaju Barfi',
                description: 'Diamond-shaped rich cashew fudge topped with silver leaf. (250g)',
                price: 200,
                category: 'Sweets',
                image: 'https://tse1.mm.bing.net/th/id/OIP.sx-WMFTfW1tFCHrIdGgVFAHaEK?pid=Api&P=0&h=180', // Fixed Image
                stock: 100
            },
            {
                id: 'sprite',
                name: 'Sprite',
                description: 'Chilled Lemon-Lime Flavored Soft Drink (750ml).',
                price: 50,
                category: 'Cold Drinks',
                image: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=600&q=80',
                stock: 100
            },
            {
                id: 'thums_up',
                name: 'Thums Up',
                description: 'Strong & Fizzy Cola Drink (750ml).',
                price: 50,
                category: 'Cold Drinks',
                image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&q=80',
                stock: 100
            }
        ];

        // Clear existing products
        await Product.deleteMany({});

        // Insert new products
        await Product.insertMany(products);

        res.json({ message: 'Products seeded successfully with correct images', count: products.length });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});


// ======================
// EVENT BOOKING ROUTES
// ======================

// Create Event Booking
app.post('/api/events', async (req, res) => {
    try {
        const {
            customerName,
            customerEmail,
            customerPhone,
            eventType,
            eventDate,
            guests,
            eventAddress,
            specialRequirements,
            foodItems
        } = req.body;

        // 👇 OPTIONAL: TOKEN VERIFICATION TO LINK USER
        let userId = null;
        try {
            const token = req.header('Authorization')?.replace('Bearer ', '');
            if (token) {
                const decoded = jwt.verify(token, JWT_SECRET);
                userId = decoded.userId;
            }
        } catch (err) {
            console.log("Event Booking: Guest checkout or invalid token");
        }

        // Calculate total amount
        let totalAmount = 0;
        const itemDetails = [];

        // Define item prices
        // Process food items - Fetch prices from DB
        for (const item of foodItems) {
            // Find product by ID to get current price
            const product = await Product.findOne({ id: item.itemId });

            // Default to 0 if not found (or handle error)
            const price = product ? product.price : 0;
            const itemTotal = price * (item.quantity || 1);
            totalAmount += itemTotal;

            itemDetails.push({
                itemId: item.itemId,
                itemName: item.itemName, // You might want to use product.name here too for consistency
                quantity: item.quantity || 1,
                price: price
            });
        }

        // Create event
        const event = new Event({
            user: userId, // 👈 Link to User (if available)
            customerName,
            customerEmail,
            customerPhone,
            eventType,
            eventDate: new Date(eventDate),
            guests: parseInt(guests),
            eventAddress,
            specialRequirements,
            foodItems: itemDetails,
            totalAmount,
            status: 'pending'
        });

        await event.save();

        res.status(201).json({
            message: 'Event booking submitted successfully! We will contact you within 24 hours.',
            event
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
app.get('/api/events/my-events', authenticateUser, async (req, res) => {
    try {
        // 👇 UPDATED: Search by User ID OR Email
        const events = await Event.find({
            $or: [
                { user: req.user._id },
                { customerEmail: { $regex: new RegExp(`^${req.user.email}$`, 'i') } }
            ]
        }).sort({ createdAt: -1 });
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
// ======================
// ORDER ROUTES
// ======================

// Create Order
app.post('/api/orders', async (req, res) => {
    try {
        const {
            customerName, customerEmail, customerPhone,
            items, deliveryAddress, paymentMethod
        } = req.body;

        let total = 0;
        const itemDetails = [];

        // Generate 4-digit OTP
        const otp = Math.floor(1000 + Math.random() * 9000).toString();

        for (const item of items) {
            const product = await Product.findOne({ id: item.id });
            if (product) {
                total += product.price * item.quantity;
                itemDetails.push({
                    productId: item.id,
                    name: product.name,
                    quantity: item.quantity,
                    price: product.price,
                    image: product.image // Save image URL
                });
            }
        }

        total += 30; // Delivery fee

        const order = new Order({
            customerName,
            customerEmail,
            customerPhone,
            items: itemDetails,
            total,
            deliveryAddress,
            paymentMethod,
            status: 'pending',
            deliveryOtp: otp // Save OTP
        });

        await order.save();

        res.status(201).json({ message: 'Order placed', order });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ======================
// ADMIN ROUTES
// ======================

app.get('/api/admin/dashboard-stats', authenticateAdmin, async (req, res) => {
    try {
        const totalEvents = await Event.countDocuments();
        const pendingEvents = await Event.countDocuments({ status: 'pending' });
        const confirmedEvents = await Event.countDocuments({ status: 'confirmed' });

        const totalOrders = await Order.countDocuments();
        const pendingOrders = await Order.countDocuments({ status: 'pending' });

        // Calculate total revenue from completed orders
        const completedOrders = await Order.find({ status: 'delivered' });
        const ordersRevenue = completedOrders.reduce((sum, order) => sum + order.total, 0);

        // Calculate event revenue
        const completedEvents = await Event.find({ status: 'completed' });
        const eventRevenue = completedEvents.reduce((sum, event) => sum + event.totalAmount, 0);

        const totalRevenueAll = ordersRevenue + eventRevenue;

        res.json({
            totalEvents,
            pendingEvents,
            confirmedEvents,
            totalOrders,
            pendingOrders,
            totalRevenue: totalRevenueAll,
            // 👇 NEW: Breakdown add kiya
            revenueBreakdown: {
                orders: ordersRevenue,
                events: eventRevenue
            },
            monthlyRevenue: totalRevenueAll * 0.3,
            customers: await User.countDocuments()
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get All Events
app.get('/api/admin/events', authenticateAdmin, async (req, res) => {
    try {
        const events = await Event.find().sort({ createdAt: -1 });
        res.json(events);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get Event by ID
app.get('/api/admin/events/:id', authenticateAdmin, async (req, res) => {
    try {
        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }
        res.json(event);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update Event Status
app.put('/api/admin/events/:id/status', authenticateAdmin, async (req, res) => {
    try {
        const { status } = req.body;

        const event = await Event.findById(req.params.id);
        if (!event) {
            return res.status(404).json({ message: 'Event not found' });
        }

        event.status = status;
        event.updatedAt = new Date();
        await event.save();

        res.json({
            message: 'Event status updated successfully',
            event
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get All Orders
app.get('/api/admin/orders', authenticateAdmin, async (req, res) => {
    try {
        const orders = await Order.find().sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get Order by ID
app.get('/api/admin/orders/:id', authenticateAdmin, async (req, res) => {
    try {
        const order = await Order.findById(req.params.id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        res.json(order);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update Order Status
app.put('/api/admin/orders/:id/status', authenticateAdmin, async (req, res) => {
    try {
        const { status, otp } = req.body; // Accept OTP from admin

        const order = await Order.findById(req.params.id);
        if (!order) return res.status(404).json({ message: 'Order not found' });

        // Logic for Delivery Verification
        if (status === 'delivered') {
            if (order.deliveryOtp !== otp) {
                return res.status(400).json({ message: 'Invalid OTP. Delivery cannot be verified.' });
            }
        }

        order.status = status;

        // Update deliveredAt if status is 'delivered'
        if (status === 'delivered' && !order.deliveredAt) {
            order.deliveredAt = new Date();
        }

        order.updatedAt = new Date();
        await order.save();

        res.json({ message: 'Order status updated', order });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// Get All Customers
app.get('/api/admin/customers', authenticateAdmin, async (req, res) => {
    try {
        // Sabhi users lao, password field chhodkar
        const customers = await User.find().select('-password').sort({ createdAt: -1 });

        // Har customer ka Total Spent calculate karein (BOTH REGULAR & GOOGLE USERS)
        const customersWithStats = await Promise.all(customers.map(async (user) => {
            // User ki email se orders aur events dhoondhein
            const orders = await Order.find({
                customerEmail: user.email,
                status: { $ne: 'cancelled' }
            });

            const events = await Event.find({
                customerEmail: user.email,
                status: { $ne: 'cancelled' }
            });

            const orderTotal = orders.reduce((sum, order) => sum + (order.total || 0), 0);
            const eventTotal = events.reduce((sum, event) => sum + (event.totalAmount || 0), 0);

            return {
                ...user.toObject(),
                totalSpent: orderTotal + eventTotal, // Total Bill
                // Extra info for admin
                authType: user.authProvider || 'local', // 'local' ya 'google'
                hasPassword: !!user.password, // Password hai ya nahi
                orderCount: orders.length,
                eventCount: events.length
            };
        }));

        res.json(customersWithStats);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
// User Cancel Order Route
app.put('/api/orders/:id/cancel', authenticateUser, async (req, res) => {
    try {
        const order = await Order.findOne({ _id: req.params.id, customerEmail: req.user.email });
        if (!order) return res.status(404).json({ message: 'Order not found' });

        if (['shipped', 'out_for_delivery', 'delivered'].includes(order.status)) {
            return res.status(400).json({ message: 'Cannot cancel order at this stage' });
        }

        order.status = 'cancelled';
        await order.save();
        res.json({ message: 'Order cancelled' });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
// Get Customer by ID - IMPROVED VERSION
app.get('/api/admin/customers/:id', authenticateAdmin, async (req, res) => {
    try {
        // 1. Customer details find karein
        const customer = await User.findById(req.params.id).select('-password');
        if (!customer) {
            return res.status(404).json({ message: 'Customer not found' });
        }

        // 2. Customer ki email se orders aur events dhoondhein
        // Case-insensitive search karein kyunki Google users ka email case sensitive ho sakta hai
        const customerEmail = customer.email;

        // Find orders - email ko lowercase mein convert karke match karein
        const orders = await Order.find({
            customerEmail: { $regex: new RegExp(`^${customerEmail}$`, 'i') }
        }).sort({ createdAt: -1 }).limit(50); // Limit lagayein taaki data overload na ho

        // Find events
        const events = await Event.find({
            customerEmail: { $regex: new RegExp(`^${customerEmail}$`, 'i') }
        }).sort({ createdAt: -1 }).limit(50);

        // 3. Calculate totals
        const orderTotal = orders
            .filter(o => o.status !== 'cancelled')
            .reduce((sum, order) => sum + (order.total || 0), 0);

        const eventTotal = events
            .filter(e => e.status !== 'cancelled')
            .reduce((sum, event) => sum + (event.totalAmount || 0), 0);

        // 4. Detailed response bhejein
        res.json({
            success: true,
            customer: {
                ...customer.toObject(),
                totalSpent: orderTotal + eventTotal,
                totalOrders: orders.length,
                totalEvents: events.length
            },
            orders: orders.map(order => ({
                _id: order._id,
                customerName: order.customerName,
                items: order.items,
                total: order.total,
                status: order.status,
                deliveryAddress: order.deliveryAddress,
                createdAt: order.createdAt,
                deliveryFee: order.deliveryFee || 30
            })),
            events: events.map(event => ({
                _id: event._id,
                eventType: event.eventType,
                eventDate: event.eventDate,
                guests: event.guests,
                totalAmount: event.totalAmount,
                status: event.status,
                foodItems: event.foodItems,
                createdAt: event.createdAt
            }))
        });
    } catch (error) {
        console.error('Customer details error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error.message
        });
    }
});
// Get Reports Data
app.get('/api/admin/reports', authenticateAdmin, async (req, res) => {
    try {
        const { period = 'month' } = req.query;

        // Date Range Calculation
        const now = new Date();
        let startDate;

        // Simple logic for Last 7 days, Last 30 days, Last 365 days
        switch (period) {
            case 'week':
                startDate = new Date();
                startDate.setDate(now.getDate() - 7);
                break;
            case 'month':
                startDate = new Date();
                startDate.setMonth(now.getMonth() - 1);
                break;
            case 'year':
                startDate = new Date();
                startDate.setFullYear(now.getFullYear() - 1);
                break;
            default:
                startDate = new Date();
                startDate.setMonth(now.getMonth() - 1);
        }

        // Data Fetching
        const orders = await Order.find({ createdAt: { $gte: startDate } });
        const events = await Event.find({ createdAt: { $gte: startDate } });

        // --- FIX: Calculate Revenue Breakdown Separately ---
        const ordersRevenue = orders
            .filter(o => o.status === 'delivered')
            .reduce((sum, o) => sum + o.total, 0);

        const eventsRevenue = events
            .filter(e => e.status === 'completed')
            .reduce((sum, e) => sum + e.totalAmount, 0);

        // Total Revenue
        const totalRevenue = ordersRevenue + eventsRevenue;

        // Stats Calculation
        const orderStats = {
            total: orders.length,
            delivered: orders.filter(o => o.status === 'delivered').length,
            pending: orders.filter(o => o.status === 'pending').length,
            cancelled: orders.filter(o => o.status === 'cancelled').length
        };

        const eventStats = {
            total: events.length,
            completed: events.filter(e => e.status === 'completed').length,
            pending: events.filter(e => e.status === 'pending').length,
            confirmed: events.filter(e => e.status === 'confirmed').length,
            cancelled: events.filter(e => e.status === 'cancelled').length
        };

        // Popular Products Logic
        const allOrderItems = orders.flatMap(o => o.items);
        const productCounts = {};
        allOrderItems.forEach(item => {
            productCounts[item.productId] = (productCounts[item.productId] || 0) + item.quantity;
        });

        const popularProducts = Object.entries(productCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([productId, count]) => ({ productId, count }));

        // --- SEND RESPONSE ---
        res.json({
            period,
            startDate,
            endDate: new Date(),
            totalRevenue,
            // 👇 Yahan Revenue Breakdown add kiya gaya hai
            revenueBreakdown: {
                orders: ordersRevenue,
                events: eventsRevenue
            },
            orderStats,
            eventStats,
            popularProducts,
            recentOrders: orders.slice(0, 10),
            recentEvents: events.slice(0, 10)
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});
app.get('/api/orders/my-orders', authenticateUser, async (req, res) => {
    try {
        // Find orders matching the user's email
        const orders = await Order.find({ customerEmail: req.user.email }).sort({ createdAt: -1 });
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});
// ======================
// UTILITY ROUTES
// ======================

// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Initialize Database
app.post('/api/init', async (req, res) => {
    try {
        // 1. Purana Data Clear Karein
        await Product.deleteMany({});

        // 2. Nayi Images ke saath Products Add Karein
        const products = [
            {
                id: 'varan_batti',
                name: 'Varan Batti',
                description: 'Traditional Maharashtrian dish consisting of spicy dal (varan) and wheat dumplings (batti) served with ghee.',
                price: 250,
                category: 'Maharashtrian',
                // 👇 Updated Image
                image: 'https://i.ytimg.com/vi/io7C2sqcHTY/maxresdefault.jpg',
                stock: 100
            },
            {
                id: 'vangyachi_bhaji',
                name: 'Vangyachi Bhaji',
                description: 'Spicy and flavorful stuffed eggplant curry cooked in peanut masala gravy.',
                price: 180,
                category: 'Maharashtrian',
                // 👇 Updated Image
                image: 'https://i.ytimg.com/vi/mi1u1Vww5Bs/maxresdefault.jpg',
                stock: 100
            },
            {
                id: 'gulab_jamun',
                name: 'Gulab Jamun',
                description: 'Soft milk solids balls soaked in rose-flavored sugar syrup. (4 pieces)',
                price: 120,
                category: 'Sweets',
                // 👇 Updated Image
                image: 'https://tse4.mm.bing.net/th/id/OIP.CAtBpWIDodCzw7gVR5MS1wHaE-?pid=Api&P=0&h=180',
                stock: 100
            },
            {
                id: 'sprite',
                name: 'Sprite',
                description: 'Chilled Lemon-Lime Flavored Soft Drink (750ml).',
                price: 50,
                category: 'Cold Drinks',
                image: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=600&q=80',
                stock: 100
            },
            {
                id: 'thums_up',
                name: 'Thums Up',
                description: 'Strong & Fizzy Cola Drink (750ml).',
                price: 50,
                category: 'Cold Drinks',
                image: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=600&q=80',
                stock: 100
            },
            {
                id: 'kaju_barfi',
                name: 'Kaju Barfi',
                description: 'Diamond-shaped rich cashew fudge topped with silver leaf. (250g)',
                price: 200,
                category: 'Sweets',
                // 👇 Updated Image
                image: 'https://tse1.mm.bing.net/th/id/OIP.sx-WMFTfW1tFCHrIdGgVFAHaEK?pid=Api&P=0&h=180',
                stock: 100
            }
        ];

        await Product.insertMany(products);

        // 3. Admin Account Check/Create
        const adminExists = await Admin.findOne({ email: 'admin@hotfood.com' });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            const admin = new Admin({
                name: 'Admin',
                email: 'admin@hotfood.com',
                password: hashedPassword
            });
            await admin.save();
        }

        res.json({
            message: 'Database initialized successfully with NEW images!',
            products: products.length,
            defaultAdmin: 'admin@hotfood.com / admin123'
        });
    } catch (error) {
        res.status(500).json({ message: 'Initialization failed', error: error.message });
    }
});

// GOOGLE LOGIN ROUTE
app.post('/api/auth/google', async (req, res) => {
    try {
        const { token } = req.body;

        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();

        let user = await User.findOne({ email: payload.email });

        if (!user) {
            user = new User({
                name: payload.name,
                email: payload.email,
                image: payload.picture,
                authProvider: 'google', // 👈 NAYA FIELD
                googleId: payload.sub // Google ka unique ID
            });
            await user.save();
        }

        const jwtToken = jwt.sign(
            { userId: user._id },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({ user, token: jwtToken });

    } catch (err) {
        console.log(err);
        res.status(401).json({ message: "Google login failed" });
    }
});


// ======================
// ERROR HANDLING
// ======================

// 404 Handler
app.use((req, res) => {
    res.status(404).json({ message: 'Endpoint not found' });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal server error' });
});

// Start Server
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📊 API Base URL: http://localhost:${PORT}/api`);
        console.log(`🔐 Default Admin: admin@hotfood.com / admin123`);
        console.log(`🔄 Initialize DB: POST http://localhost:${PORT}/api/init`);
    });
}

module.exports = app;
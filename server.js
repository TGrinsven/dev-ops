const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '/')));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100
});
app.use('/api', limiter);

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jdm-portal';
mongoose.connect(MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log('✅ Connected to MongoDB');
}).catch(err => {
    console.error('MongoDB connection error:', err);
    // Continue without database for demo purposes
});

// User Schema
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    name: { type: String, required: true },
    patientId: { type: String, unique: true },
    dateOfBirth: Date,
    diagnosisDate: Date,
    cmasHistory: [{
        date: { type: Date, default: Date.now },
        score: Number,
        exercises: [{
            name: String,
            score: Number,
            maxScore: Number
        }]
    }],
    role: { type: String, enum: ['patient', 'doctor', 'admin'], default: 'patient' },
    createdAt: { type: Date, default: Date.now }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

const User = mongoose.model('User', userSchema);

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'jdm-portal-secret-key-2024';

// Demo users for testing (will work even without MongoDB)
const demoUsers = [
    {
        email: 'patient@jdm-portal.nl',
        password: '$2a$10$YKrOqN7gZ0qHpCfCqKqqueQhoKFXxXqrNpMq5K7oRXcGqfXqvM1TS', // password: demo123
        name: 'Demo Patient',
        patientId: 'JDM-2024-001',
        role: 'patient'
    },
    {
        email: 'doctor@jdm-portal.nl',
        password: '$2a$10$YKrOqN7gZ0qHpCfCqKqqueQhoKFXxXqrNpMq5K7oRXcGqfXqvM1TS', // password: demo123
        name: 'Dr. Van Der Berg',
        role: 'doctor'
    }
];

// Authentication endpoints
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Check demo users first
        const demoUser = demoUsers.find(u => u.email === email);
        if (demoUser) {
            const isValid = await bcrypt.compare(password, demoUser.password);
            if (isValid) {
                const token = jwt.sign(
                    { id: demoUser.email, email: demoUser.email, role: demoUser.role },
                    JWT_SECRET,
                    { expiresIn: '24h' }
                );
                return res.json({ 
                    success: true, 
                    token, 
                    user: { 
                        email: demoUser.email, 
                        name: demoUser.name, 
                        role: demoUser.role,
                        patientId: demoUser.patientId 
                    } 
                });
            }
        }
        
        // Try MongoDB if connected
        if (mongoose.connection.readyState === 1) {
            const user = await User.findOne({ email });
            if (!user) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }
            
            const isValid = await bcrypt.compare(password, user.password);
            if (!isValid) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }
            
            const token = jwt.sign(
                { id: user._id, email: user.email, role: user.role },
                JWT_SECRET,
                { expiresIn: '24h' }
            );
            
            res.json({ 
                success: true, 
                token, 
                user: { 
                    email: user.email, 
                    name: user.name, 
                    role: user.role,
                    patientId: user.patientId 
                } 
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, name, dateOfBirth, diagnosisDate } = req.body;
        
        // Generate patient ID
        const patientId = `JDM-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
        
        if (mongoose.connection.readyState === 1) {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ success: false, message: 'Email already registered' });
            }
            
            const user = new User({
                email,
                password,
                name,
                patientId,
                dateOfBirth,
                diagnosisDate
            });
            
            await user.save();
            
            const token = jwt.sign(
                { id: user._id, email: user.email, role: user.role },
                JWT_SECRET,
                { expiresIn: '24h' }
            );
            
            res.json({ 
                success: true, 
                token, 
                user: { 
                    email: user.email, 
                    name: user.name, 
                    role: user.role,
                    patientId: user.patientId 
                } 
            });
        } else {
            // Demo mode - just return success
            const token = jwt.sign(
                { email, name, role: 'patient' },
                JWT_SECRET,
                { expiresIn: '24h' }
            );
            
            res.json({ 
                success: true, 
                token, 
                user: { email, name, role: 'patient', patientId },
                message: 'Demo registration (database not connected)' 
            });
        }
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Verify token middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ success: false, message: 'No token provided' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Invalid token' });
        }
        req.user = user;
        next();
    });
};

// Protected route example
app.get('/api/auth/verify', authenticateToken, (req, res) => {
    res.json({ success: true, user: req.user });
});

// CMAS endpoints
app.post('/api/cmas/measurement', authenticateToken, async (req, res) => {
    try {
        const { score, exercises } = req.body;
        
        if (mongoose.connection.readyState === 1) {
            await User.findByIdAndUpdate(req.user.id, {
                $push: {
                    cmasHistory: {
                        score,
                        exercises,
                        date: new Date()
                    }
                }
            });
        }
        
        res.json({ 
            success: true, 
            measurement: { score, exercises, date: new Date() } 
        });
    } catch (error) {
        console.error('CMAS measurement error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get('/api/cmas/history', authenticateToken, async (req, res) => {
    try {
        if (mongoose.connection.readyState === 1) {
            const user = await User.findById(req.user.id);
            res.json({ success: true, history: user.cmasHistory || [] });
        } else {
            // Demo data
            res.json({ 
                success: true, 
                history: [
                    { date: new Date('2024-01-15'), score: 35 },
                    { date: new Date('2024-02-15'), score: 37 },
                    { date: new Date('2024-03-15'), score: 39 }
                ] 
            });
        }
    } catch (error) {
        console.error('History error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
    });
});

// Serve HTML pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║         JDM Portal Server Running          ║
╠════════════════════════════════════════════╣
║  🚀 Server: http://localhost:${PORT}         ║
║  📧 Demo Login:                            ║
║     Email: patient@jdm-portal.nl           ║
║     Password: demo123                      ║
║  📧 Doctor Login:                          ║
║     Email: doctor@jdm-portal.nl            ║
║     Password: demo123                      ║
╚════════════════════════════════════════════╝
    `);
});
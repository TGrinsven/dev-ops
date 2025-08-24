/**
 * Integration Tests for JDM Portal API
 * Tests API endpoints, database interactions, and service integrations
 * @module tests/integration/api.test
 */

const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const redis = require('redis-mock');
const jwt = require('jsonwebtoken');
const { expect } = require('chai');
const nock = require('nock');

// Mock Application Insights
jest.mock('applicationinsights', () => ({
    setup: jest.fn().mockReturnThis(),
    start: jest.fn(),
    defaultClient: {
        trackEvent: jest.fn(),
        trackMetric: jest.fn(),
        trackException: jest.fn()
    }
}));

describe('JDM Portal API Integration Tests', () => {
    let app;
    let mongoServer;
    let redisClient;
    let authToken;
    let adminToken;
    let patientId;

    beforeAll(async () => {
        // Setup in-memory MongoDB
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        
        // Connect to MongoDB
        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        // Setup Redis mock
        redisClient = redis.createClient();

        // Initialize app with test configuration
        process.env.NODE_ENV = 'test';
        process.env.MONGODB_URI = mongoUri;
        process.env.JWT_SECRET = 'test-secret-key';
        process.env.PORT = 3001;

        // Import app after environment setup
        app = require('../../src/app');
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
        redisClient.quit();
    });

    beforeEach(async () => {
        // Clear database collections
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            await collections[key].deleteMany();
        }

        // Reset nock interceptors
        nock.cleanAll();
    });

    describe('Authentication Endpoints', () => {
        describe('POST /api/auth/register', () => {
            it('should register a new patient successfully', async () => {
                const newPatient = {
                    email: 'patient@jdm-portal.nl',
                    password: 'SecurePass123!',
                    firstName: 'Jan',
                    lastName: 'de Vries',
                    dateOfBirth: '2010-05-15',
                    role: 'patient'
                };

                const response = await request(app)
                    .post('/api/auth/register')
                    .send(newPatient)
                    .expect(201);

                expect(response.body).to.have.property('success', true);
                expect(response.body).to.have.property('message', 'Registration successful');
                expect(response.body.data).to.have.property('patientId');
                expect(response.body.data).to.have.property('token');
                expect(response.body.data.patientId).to.match(/^JDM-\d{4}-\d{3}$/);

                patientId = response.body.data.patientId;
                authToken = response.body.data.token;
            });

            it('should prevent duplicate email registration', async () => {
                const patient = {
                    email: 'duplicate@jdm-portal.nl',
                    password: 'SecurePass123!',
                    firstName: 'Test',
                    lastName: 'User',
                    dateOfBirth: '2010-01-01',
                    role: 'patient'
                };

                await request(app)
                    .post('/api/auth/register')
                    .send(patient)
                    .expect(201);

                const response = await request(app)
                    .post('/api/auth/register')
                    .send(patient)
                    .expect(409);

                expect(response.body).to.have.property('error', true);
                expect(response.body).to.have.property('message', 'Email already registered');
            });

            it('should validate required fields', async () => {
                const invalidPatient = {
                    email: 'invalid-email',
                    password: 'weak'
                };

                const response = await request(app)
                    .post('/api/auth/register')
                    .send(invalidPatient)
                    .expect(400);

                expect(response.body).to.have.property('error', true);
                expect(response.body).to.have.property('errors');
                expect(response.body.errors).to.be.an('array');
            });
        });

        describe('POST /api/auth/login', () => {
            beforeEach(async () => {
                // Create a test user
                const patient = {
                    email: 'test@jdm-portal.nl',
                    password: 'SecurePass123!',
                    firstName: 'Test',
                    lastName: 'Patient',
                    dateOfBirth: '2010-01-01',
                    role: 'patient'
                };

                await request(app)
                    .post('/api/auth/register')
                    .send(patient);
            });

            it('should login with valid credentials', async () => {
                const response = await request(app)
                    .post('/api/auth/login')
                    .send({
                        email: 'test@jdm-portal.nl',
                        password: 'SecurePass123!'
                    })
                    .expect(200);

                expect(response.body).to.have.property('success', true);
                expect(response.body.data).to.have.property('token');
                expect(response.body.data).to.have.property('refreshToken');
                expect(response.body.data).to.have.property('user');
            });

            it('should reject invalid credentials', async () => {
                const response = await request(app)
                    .post('/api/auth/login')
                    .send({
                        email: 'test@jdm-portal.nl',
                        password: 'WrongPassword!'
                    })
                    .expect(401);

                expect(response.body).to.have.property('error', true);
                expect(response.body).to.have.property('message', 'Invalid credentials');
            });

            it('should implement rate limiting', async () => {
                const loginAttempts = [];
                
                // Make 6 rapid login attempts (assuming limit is 5)
                for (let i = 0; i < 6; i++) {
                    loginAttempts.push(
                        request(app)
                            .post('/api/auth/login')
                            .send({
                                email: 'test@jdm-portal.nl',
                                password: 'WrongPassword!'
                            })
                    );
                }

                const responses = await Promise.all(loginAttempts);
                const lastResponse = responses[5];

                expect(lastResponse.status).to.equal(429);
                expect(lastResponse.body).to.have.property('message', 'Too many login attempts');
            });
        });

        describe('POST /api/auth/refresh', () => {
            it('should refresh access token with valid refresh token', async () => {
                // First login to get tokens
                const loginResponse = await request(app)
                    .post('/api/auth/login')
                    .send({
                        email: 'test@jdm-portal.nl',
                        password: 'SecurePass123!'
                    });

                const refreshToken = loginResponse.body.data.refreshToken;

                const response = await request(app)
                    .post('/api/auth/refresh')
                    .send({ refreshToken })
                    .expect(200);

                expect(response.body).to.have.property('success', true);
                expect(response.body.data).to.have.property('accessToken');
                expect(response.body.data.accessToken).to.not.equal(loginResponse.body.data.token);
            });
        });

        describe('POST /api/auth/logout', () => {
            it('should logout successfully and invalidate token', async () => {
                const response = await request(app)
                    .post('/api/auth/logout')
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(200);

                expect(response.body).to.have.property('success', true);
                expect(response.body).to.have.property('message', 'Logout successful');

                // Verify token is invalidated
                await request(app)
                    .get('/api/patient/profile')
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(401);
            });
        });
    });

    describe('CMAS Measurement Endpoints', () => {
        beforeEach(async () => {
            // Setup authenticated user
            const response = await request(app)
                .post('/api/auth/register')
                .send({
                    email: 'cmas-test@jdm-portal.nl',
                    password: 'SecurePass123!',
                    firstName: 'CMAS',
                    lastName: 'Tester',
                    dateOfBirth: '2010-01-01',
                    role: 'patient'
                });

            authToken = response.body.data.token;
            patientId = response.body.data.patientId;
        });

        describe('POST /api/cmas/measurement', () => {
            it('should create a new CMAS measurement', async () => {
                const measurement = {
                    patientId: patientId,
                    exercises: [
                        { name: 'Head lift', score: 4 },
                        { name: 'Leg lift', score: 3 },
                        { name: 'Straight leg raise', score: 4 },
                        { name: 'Supine to sit', score: 3 },
                        { name: 'Sit-ups', score: 2 },
                        { name: 'Prone head lift', score: 4 },
                        { name: 'Hands to head', score: 4 },
                        { name: 'Hands on table', score: 4 },
                        { name: 'Arms raised', score: 3 },
                        { name: 'Stand from floor', score: 2 },
                        { name: 'Heel raise', score: 3 },
                        { name: 'Pick up object', score: 4 },
                        { name: 'Stand on one leg', score: 2 },
                        { name: 'Running', score: 1 }
                    ],
                    notes: 'Patient showed improvement in upper body exercises'
                };

                const response = await request(app)
                    .post('/api/cmas/measurement')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(measurement)
                    .expect(201);

                expect(response.body).to.have.property('success', true);
                expect(response.body.data).to.have.property('measurementId');
                expect(response.body.data).to.have.property('totalScore', 43);
                expect(response.body.data).to.have.property('percentage', 83);
                expect(response.body.data).to.have.property('interpretation', 'Mild impairment');
            });

            it('should validate exercise scores', async () => {
                const invalidMeasurement = {
                    patientId: patientId,
                    exercises: [
                        { name: 'Head lift', score: 5 }, // Invalid score > 4
                        { name: 'Leg lift', score: -1 }  // Invalid negative score
                    ]
                };

                const response = await request(app)
                    .post('/api/cmas/measurement')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(invalidMeasurement)
                    .expect(400);

                expect(response.body).to.have.property('error', true);
                expect(response.body).to.have.property('message').that.includes('Invalid score');
            });

            it('should require all 14 exercises', async () => {
                const incompleteMeasurement = {
                    patientId: patientId,
                    exercises: [
                        { name: 'Head lift', score: 4 },
                        { name: 'Leg lift', score: 3 }
                    ]
                };

                const response = await request(app)
                    .post('/api/cmas/measurement')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(incompleteMeasurement)
                    .expect(400);

                expect(response.body).to.have.property('error', true);
                expect(response.body.message).to.include('14 exercises required');
            });
        });

        describe('GET /api/cmas/measurements/:patientId', () => {
            beforeEach(async () => {
                // Create multiple measurements
                const measurements = [
                    { date: '2024-01-01', totalScore: 35 },
                    { date: '2024-02-01', totalScore: 38 },
                    { date: '2024-03-01', totalScore: 42 }
                ];

                for (const m of measurements) {
                    await request(app)
                        .post('/api/cmas/measurement')
                        .set('Authorization', `Bearer ${authToken}`)
                        .send({
                            patientId: patientId,
                            exercises: generateExercisesWithScore(m.totalScore),
                            measurementDate: m.date
                        });
                }
            });

            it('should retrieve patient measurements history', async () => {
                const response = await request(app)
                    .get(`/api/cmas/measurements/${patientId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(200);

                expect(response.body).to.have.property('success', true);
                expect(response.body.data).to.have.property('measurements');
                expect(response.body.data.measurements).to.be.an('array');
                expect(response.body.data.measurements).to.have.lengthOf(3);
                expect(response.body.data).to.have.property('trend', 'improving');
                expect(response.body.data).to.have.property('averageScore');
            });

            it('should support pagination', async () => {
                const response = await request(app)
                    .get(`/api/cmas/measurements/${patientId}?page=1&limit=2`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(200);

                expect(response.body.data.measurements).to.have.lengthOf(2);
                expect(response.body.data).to.have.property('pagination');
                expect(response.body.data.pagination).to.have.property('total', 3);
                expect(response.body.data.pagination).to.have.property('pages', 2);
            });

            it('should filter by date range', async () => {
                const response = await request(app)
                    .get(`/api/cmas/measurements/${patientId}?startDate=2024-02-01&endDate=2024-03-31`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(200);

                expect(response.body.data.measurements).to.have.lengthOf(2);
            });
        });

        describe('GET /api/cmas/statistics/:patientId', () => {
            it('should return comprehensive statistics', async () => {
                const response = await request(app)
                    .get(`/api/cmas/statistics/${patientId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(200);

                expect(response.body.data).to.have.property('totalMeasurements');
                expect(response.body.data).to.have.property('averageScore');
                expect(response.body.data).to.have.property('highestScore');
                expect(response.body.data).to.have.property('lowestScore');
                expect(response.body.data).to.have.property('improvementRate');
                expect(response.body.data).to.have.property('exerciseBreakdown');
            });
        });
    });

    describe('Patient Management Endpoints', () => {
        describe('GET /api/patient/profile', () => {
            it('should retrieve patient profile', async () => {
                const response = await request(app)
                    .get('/api/patient/profile')
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(200);

                expect(response.body).to.have.property('success', true);
                expect(response.body.data).to.have.property('patientId');
                expect(response.body.data).to.have.property('email');
                expect(response.body.data).to.have.property('firstName');
                expect(response.body.data).to.have.property('lastName');
                expect(response.body.data).to.not.have.property('password');
            });

            it('should require authentication', async () => {
                await request(app)
                    .get('/api/patient/profile')
                    .expect(401);
            });
        });

        describe('PUT /api/patient/profile', () => {
            it('should update patient profile', async () => {
                const updates = {
                    phoneNumber: '+31612345678',
                    address: {
                        street: 'Hoofdstraat 1',
                        city: 'Amsterdam',
                        postalCode: '1000 AA',
                        country: 'Netherlands'
                    },
                    emergencyContact: {
                        name: 'Parent Name',
                        relationship: 'Mother',
                        phone: '+31687654321'
                    }
                };

                const response = await request(app)
                    .put('/api/patient/profile')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(updates)
                    .expect(200);

                expect(response.body).to.have.property('success', true);
                expect(response.body.data).to.have.property('phoneNumber', updates.phoneNumber);
                expect(response.body.data.address).to.deep.equal(updates.address);
            });

            it('should not allow email changes', async () => {
                const response = await request(app)
                    .put('/api/patient/profile')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({ email: 'newemail@example.com' })
                    .expect(400);

                expect(response.body).to.have.property('error', true);
                expect(response.body.message).to.include('Email cannot be changed');
            });
        });
    });

    describe('Report Generation Endpoints', () => {
        describe('GET /api/reports/cmas/:patientId', () => {
            it('should generate CMAS report PDF', async () => {
                const response = await request(app)
                    .get(`/api/reports/cmas/${patientId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .query({ format: 'pdf' })
                    .expect(200);

                expect(response.headers['content-type']).to.include('application/pdf');
                expect(response.headers['content-disposition']).to.include('attachment');
            });

            it('should generate CMAS report Excel', async () => {
                const response = await request(app)
                    .get(`/api/reports/cmas/${patientId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .query({ format: 'excel' })
                    .expect(200);

                expect(response.headers['content-type']).to.include('application/vnd.openxmlformats');
            });

            it('should support custom date ranges', async () => {
                const response = await request(app)
                    .get(`/api/reports/cmas/${patientId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .query({
                        format: 'json',
                        startDate: '2024-01-01',
                        endDate: '2024-12-31'
                    })
                    .expect(200);

                expect(response.body).to.have.property('reportPeriod');
                expect(response.body.reportPeriod).to.have.property('start', '2024-01-01');
                expect(response.body.reportPeriod).to.have.property('end', '2024-12-31');
            });
        });
    });

    describe('Notification Endpoints', () => {
        describe('POST /api/notifications/send', () => {
            beforeEach(() => {
                // Mock email service
                nock('https://api.sendgrid.com')
                    .post('/v3/mail/send')
                    .reply(202, { message: 'Accepted' });
            });

            it('should send appointment reminder', async () => {
                const notification = {
                    type: 'appointment_reminder',
                    patientId: patientId,
                    data: {
                        appointmentDate: '2024-12-01T10:00:00Z',
                        location: 'Amsterdam UMC',
                        doctor: 'Dr. van der Berg'
                    }
                };

                const response = await request(app)
                    .post('/api/notifications/send')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(notification)
                    .expect(200);

                expect(response.body).to.have.property('success', true);
                expect(response.body).to.have.property('message', 'Notification sent successfully');
            });

            it('should send measurement reminder', async () => {
                const notification = {
                    type: 'measurement_reminder',
                    patientId: patientId,
                    data: {
                        dueDate: '2024-11-15',
                        lastMeasurement: '2024-10-15'
                    }
                };

                const response = await request(app)
                    .post('/api/notifications/send')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(notification)
                    .expect(200);

                expect(response.body).to.have.property('success', true);
            });
        });

        describe('GET /api/notifications/:patientId', () => {
            it('should retrieve patient notifications', async () => {
                const response = await request(app)
                    .get(`/api/notifications/${patientId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .expect(200);

                expect(response.body).to.have.property('success', true);
                expect(response.body.data).to.have.property('notifications');
                expect(response.body.data.notifications).to.be.an('array');
            });
        });
    });

    describe('Health Check Endpoints', () => {
        describe('GET /api/health', () => {
            it('should return service health status', async () => {
                const response = await request(app)
                    .get('/api/health')
                    .expect(200);

                expect(response.body).to.have.property('status', 'healthy');
                expect(response.body).to.have.property('timestamp');
                expect(response.body).to.have.property('services');
                expect(response.body.services).to.have.property('database');
                expect(response.body.services).to.have.property('redis');
                expect(response.body.services).to.have.property('email');
            });
        });

        describe('GET /api/health/ready', () => {
            it('should indicate readiness', async () => {
                const response = await request(app)
                    .get('/api/health/ready')
                    .expect(200);

                expect(response.body).to.have.property('ready', true);
                expect(response.body).to.have.property('checks');
            });
        });

        describe('GET /api/health/live', () => {
            it('should indicate liveness', async () => {
                const response = await request(app)
                    .get('/api/health/live')
                    .expect(200);

                expect(response.body).to.have.property('alive', true);
            });
        });
    });

    describe('WebSocket Events', () => {
        let io;
        let clientSocket;

        beforeEach((done) => {
            // Setup socket.io client
            const Client = require('socket.io-client');
            clientSocket = new Client(`http://localhost:${process.env.PORT}`, {
                auth: {
                    token: authToken
                }
            });

            clientSocket.on('connect', done);
        });

        afterEach(() => {
            if (clientSocket.connected) {
                clientSocket.disconnect();
            }
        });

        it('should receive real-time CMAS updates', (done) => {
            clientSocket.on('cmas:update', (data) => {
                expect(data).to.have.property('patientId');
                expect(data).to.have.property('score');
                expect(data).to.have.property('timestamp');
                done();
            });

            // Trigger an update
            request(app)
                .post('/api/cmas/measurement')
                .set('Authorization', `Bearer ${authToken}`)
                .send({
                    patientId: patientId,
                    exercises: generateExercisesWithScore(40)
                })
                .end();
        });

        it('should handle room-based messaging', (done) => {
            clientSocket.emit('join:patient', patientId);

            clientSocket.on('joined', (room) => {
                expect(room).to.equal(`patient:${patientId}`);
                done();
            });
        });
    });

    describe('Error Handling', () => {
        it('should handle 404 for non-existent routes', async () => {
            const response = await request(app)
                .get('/api/non-existent-route')
                .expect(404);

            expect(response.body).to.have.property('error', true);
            expect(response.body).to.have.property('message', 'Route not found');
        });

        it('should handle malformed JSON', async () => {
            const response = await request(app)
                .post('/api/auth/login')
                .set('Content-Type', 'application/json')
                .send('{ invalid json }')
                .expect(400);

            expect(response.body).to.have.property('error', true);
            expect(response.body.message).to.include('Invalid JSON');
        });

        it('should handle database connection errors gracefully', async () => {
            // Temporarily disconnect database
            await mongoose.disconnect();

            const response = await request(app)
                .get('/api/patient/profile')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(503);

            expect(response.body).to.have.property('error', true);
            expect(response.body).to.have.property('message', 'Service temporarily unavailable');

            // Reconnect for other tests
            await mongoose.connect(mongoServer.getUri());
        });
    });

    describe('Performance Tests', () => {
        it('should handle concurrent requests efficiently', async () => {
            const requests = [];
            const startTime = Date.now();

            // Send 50 concurrent requests
            for (let i = 0; i < 50; i++) {
                requests.push(
                    request(app)
                        .get('/api/health')
                );
            }

            const responses = await Promise.all(requests);
            const endTime = Date.now();
            const totalTime = endTime - startTime;

            responses.forEach(response => {
                expect(response.status).to.equal(200);
            });

            // Should complete within 5 seconds
            expect(totalTime).to.be.lessThan(5000);
        });

        it('should implement response caching', async () => {
            // First request - should hit database
            const start1 = Date.now();
            const response1 = await request(app)
                .get(`/api/cmas/measurements/${patientId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            const time1 = Date.now() - start1;

            // Second request - should hit cache
            const start2 = Date.now();
            const response2 = await request(app)
                .get(`/api/cmas/measurements/${patientId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);
            const time2 = Date.now() - start2;

            expect(response1.body).to.deep.equal(response2.body);
            expect(time2).to.be.lessThan(time1 * 0.5); // Cache should be at least 50% faster
        });
    });
});

// Helper function to generate exercises with a target total score
function generateExercisesWithScore(targetScore) {
    const exercises = [
        'Head lift', 'Leg lift', 'Straight leg raise', 'Supine to sit',
        'Sit-ups', 'Prone head lift', 'Hands to head', 'Hands on table',
        'Arms raised', 'Stand from floor', 'Heel raise', 'Pick up object',
        'Stand on one leg', 'Running'
    ];
    
    const result = [];
    let remainingScore = targetScore;
    
    for (let i = 0; i < exercises.length; i++) {
        const maxPossible = Math.min(4, remainingScore);
        const score = i < exercises.length - 1 
            ? Math.floor(Math.random() * maxPossible) 
            : Math.min(remainingScore, 4);
        
        result.push({
            name: exercises[i],
            score: score
        });
        
        remainingScore -= score;
    }
    
    return result;
}
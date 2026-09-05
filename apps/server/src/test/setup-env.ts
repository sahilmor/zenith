import mongoose from 'mongoose';

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/zenith-test';
process.env.JWT_SECRET = 'test-access-secret-for-ci-and-local-runs';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-for-ci-and-local-runs';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.APP_URL = 'http://localhost:3000';
process.env.RESEND_API_KEY = '';
process.env.SMTP_HOST = '';
process.env.SMTP_PORT = '2525';
process.env.SMTP_USER = '';
process.env.SMTP_PASS = '';
process.env.SMTP_FROM = '';

// Each test file opens its own mongoose connection against a fresh
// mongodb-memory-server instance and disconnects in afterAll. With the
// default autoIndex:true, Mongoose kicks off background index builds for
// every registered schema on connect; if afterAll's disconnect/stop runs
// before that finishes, it surfaces as an unhandled MongoClientClosedError
// rejection at the end of the whole run. Indexes aren't needed for these
// unit tests, so disable them globally to remove the race.
mongoose.set('autoIndex', false);

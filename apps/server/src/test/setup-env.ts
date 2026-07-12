process.env.NODE_ENV ??= 'test';
process.env.MONGODB_URI ??= 'mongodb://127.0.0.1:27017/zenith-test';
process.env.JWT_SECRET ??= 'test-access-secret-for-ci-and-local-runs';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-for-ci-and-local-runs';
process.env.CLIENT_URL ??= 'http://localhost:3000';
process.env.APP_URL ??= 'http://localhost:3000';

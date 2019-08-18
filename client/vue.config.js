module.exports = {
    liveServer: {
        proxy: {
            '/api/v1': { target: 'http://localhost:3000' },
        },
    },
};

const path = require('path');
module.exports = {
    outputDir: path.resolve(__dirname, '../public'),
    devServer: {
        proxy: {
            '/api/logs': {
                target: 'http://localhost:3000/logs',
            },
        },
    },
};

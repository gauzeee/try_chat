const path = require('path');

module.exports = {
    mode: 'production',
    entry: './client.js',
    watch: true,
    output: {
        path: path.resolve(__dirname, 'public/js'),
        filename: 'client.js'
    }
};
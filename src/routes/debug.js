'use strict';
const express = require('express');
const router = express.Router();
router.get('/debug-env', (req, res) => {
    res.json({
        BASE_URL: process.env.BASE_URL,
        NODE_ENV: process.env.NODE_ENV,
        PORT: process.env.PORT,
        host: req.get('host'),
        protocol: req.protocol
    });
});
module.exports = router;

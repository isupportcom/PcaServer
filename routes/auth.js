// main package
const express = require('express');

// initialize router
const router = express.Router();
// initialize controller 
const authController = require('../controllers/auth');
router.post('/login',authController.login);


module.exports = router;
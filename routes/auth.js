// main package
const express = require('express');

// initialize router
const router = express.Router();
// initialize controller 
const authController = require('../controllers/auth');
router.post('/login',authController.login);
router.post('/userLogin',authController.userLogin);


module.exports = router;
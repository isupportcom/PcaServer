const express = require('express');

const router = express.Router();
const dashboardController = require('../controllers/dashboard')

router.post('/getPosts',dashboardController.getAllPosts);
router.post('/addPosts',dashboardController.addPosts);
router.post('/updatePosts',dashboardController.updatePosts);
router.post('/deletePost',dashboardController.deletePost);
router.post('/getActions',dashboardController.getAllActions);
router.post('/addActions',dashboardController.addActions);
router.post('/updateActions',dashboardController.updateActions);
module.exports = router;
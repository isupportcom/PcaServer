const express = require('express');

const router = express.Router();
const dashboardController = require('../controllers/dashboard')

//Ποστα
router.post('/getPosts',dashboardController.getAllPosts);
router.post('/addPosts',dashboardController.addPosts);
router.post('/updatePosts',dashboardController.updatePosts);
router.post('/deletePost',dashboardController.deletePost);

//Χρηστες
router.post('/getUsers',dashboardController.getUsers);
router.post('/addUsers',dashboardController.addUsers);
router.post('/updateUsers',dashboardController.updateUsers);
router.post('/deleteUser',dashboardController.deleteUser);

//Ενεργειες
router.post('/getActions',dashboardController.getAllActions);
router.post('/addActions',dashboardController.addActions);
router.post('/updateActions',dashboardController.updateActions);
router.post('/deleteAction',dashboardController.deleteAction);

//Παραγγελειες
router.post('/getCatPost',dashboardController.getcatPost);
router.post('/addcatPost',dashboardController.addcatPost);
router.post('/updatecatPost',dashboardController.updatecatPost);
router.post('/deletecatPost',dashboardController.deletecatPost);

module.exports = router;
const express = require('express');

const router = express.Router();
const dashboardController = require('../controllers/dashboard')

//Ποστα
router.post('/getPosts',dashboardController.getAllPosts);
router.post('/addPosts',dashboardController.addPosts);
router.post('/updatePosts',dashboardController.updatePosts);
router.post('/deletePost',dashboardController.deletePost);
// Ποστα join Χρηστες
router.post('/getUsersInPosts',dashboardController.usersInPost);
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

//Kατηγοριες
router.post('/getCatPost',dashboardController.getcatPost);
router.post('/addcatPost',dashboardController.addcatPost);
router.post('/updatecatPost',dashboardController.updatecatPost);
router.post('/deletecatPost',dashboardController.deletecatPost);



//production
router.post('/getProduction',dashboardController.getProduction);
router.post('/addProduction',dashboardController.addProduction);
router.post('/sendProduction',dashboardController.sendProduction);
router.post('/getSingleProduction',dashboardController.getSingleProduction);
router.post('/pausePost',dashboardController.pausePost);
// router.post('/updateProduction',dashboardController.updateProduction);
// router.post('/deleteProduction',dashboardController.deleteProduction);
// production Line 
router.post('/updateProductionLine',dashboardController.updateProdLine);
// time 
router.post('/getTime',dashboardController.getTime);
router.post('/addTime',dashboardController.addTime);
router.post('/updateTime',dashboardController.updateTime);
//action line
router.post('/updateActionLines',dashboardController.updateActionLines)
//machinetime 
router.post('/getMachineTime',dashboardController.getMachineTime);



module.exports = router;




// main package
const express = require("express");
const bodyParser = require("body-parser");
// initialize server
const app = express();
// port
const port = 8080;

// initialize routes
const authRoute = require('./routes/auth');
const adminDashboard = require('./routes/dashboard')
//application/jason
app.use(bodyParser.json());
// headers
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "OPTIONS, GET, POST, PUT, PATCH, DELETE"
  );
  res.header("Access-Control-Allow-Headers", "X-Requested-With");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

// soft1 updates

// auth
app.use('/auth',authRoute);

//dashboard
app.use('/dashboard',adminDashboard);

// error
app.use((error, req, res, next) => {
    console.log(error);
    const status = error.statusCode || 500;
    const message = error.message;
    const data = error.data;
    res.status(status).json({ message: message ,data:data});
});

// app listener
const server =app.listen(port, (req, res, next) => {
  console.log("App Is Listening on http://localhost:" + port);
});
const io = require('./socket').init(server);
io.on('connection',socket =>{
  console.log("Client Connected");
  socket.emit('response',{peos:"peos"})
})
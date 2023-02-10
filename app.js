// main package
const express = require("express");
const bodyParser = require("body-parser");
<<<<<<< HEAD
const fs = require('fs');
const privateKey  = fs.readFileSync('sslcert/server.key', 'utf8');
const certificate = fs.readFileSync('sslcert/server.crt', 'utf8');
const credentials = {key: privateKey, cert: certificate};
const logger = require('morgan');
=======
// const fs = require('fs');
// const privateKey  = fs.readFileSync('sslcert/server.key', 'utf8');
// const certificate = fs.readFileSync('sslcert/server.crt', 'utf8');
// const credentials = {key: privateKey, cert: certificate};
>>>>>>> 0a97cac75ee0f4959677d5b1a24b8e58c2cd4c0b

// initialize server
const app = express();
// port
const port = 8080;
try {
  require('fs').mkdirSync('./log');
} catch (e) {
  if (e.code != 'EEXIST') {
    console.error("Could not set up log directory, error was: ", e);
    process.exit(1);
  }
}


// initialize logger first
// var log4js = require("log4js");
// log4js.configure('./config/log4js.json');
// var log = log4js.getLogger("startup");
// var applogger = log4js.getLogger("app");
// initialize routes
const authRoute = require("./routes/auth");
const adminDashboard = require("./routes/dashboard");
//application/jason
<<<<<<< HEAD
app.use(logger('dev'));
app.use(log4js.connectLogger(log4js.getLogger("http"), { level: 'auto' }));
=======
// app.use(log4js.connectLogger(log4js.getLogger("http"), { level: 'auto' }));
>>>>>>> 0a97cac75ee0f4959677d5b1a24b8e58c2cd4c0b
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
app.use("/auth", authRoute);

//dashboard
app.use("/dashboard", adminDashboard);

// error
app.use((error, req, res, next) => {
  // applogger.error("Something Went Wrong", error);
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(status).json({ message: message, data: data });
});

// app listener
<<<<<<< HEAD
var https = require('https');
var server = https.createServer(credentials, app).listen(port,()=>{
  log.info('Express server listening on port ', port, " with pid ", process.pid);
  console.log('Express server listening on port ', port, " with pid ", process.pid);
})

const io = require("./socket").init(server);
io.on("connection", (https) => {
=======
const server = app.listen(port,()=>{
  // log.info('Express server listening on port ', server.address().port, " with pid ", process.pid);
  console.log('Express server listening on port ', server.address().port, " with pid ", process.pid);
})


const io = require("./socket").init(server);
io.on("connection", (socket) => {
>>>>>>> 0a97cac75ee0f4959677d5b1a24b8e58c2cd4c0b
  console.log("Client Connected");
});

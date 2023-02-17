// main package
const express = require("express");
const bodyParser = require("body-parser");


const logger = require('morgan');

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
var log4js = require("log4js");
 log4js.configure('./config/log4js.json');
 var log = log4js.getLogger("startup");
// initialize routes
const authRoute = require("./routes/auth");
const adminDashboard = require("./routes/dashboard");
//application/jason
app.use(logger('dev'));
app.use(log4js.connectLogger(log4js.getLogger("http"), { level: 'auto' }));
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
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(status).json({ message: message, data: data });
});

var serverApp=app.listen(port,"192.168.1.110", () => {
   log.info('Express server listening on port ', port, " with pid ", process.pid);
   console.log('Express server listening on port ', port, " with pid ", process.pid);
});

const io = require("./socket").init(serverApp);
io.on("connection", (https) => {
  console.log("Client Connected");
});


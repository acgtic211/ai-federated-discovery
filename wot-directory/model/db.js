// Bring Mongoose into the project
var mongoose = require( 'mongoose' );
const dotenv = require('dotenv');
const axios = require('axios');

dotenv.config();


/*********************/
/*******MONGODB*******/
/*********************/

// Create the database connection
mongoose.connect(process.env.MONGODB_URI_DEVELOPMENT + process.env.MONGODB_DATABASE);
mongoose.set('useFindAndModify', false);

// Catch connection event
mongoose.connection.on('connected', function () {
  //console.log('Mongoose connected to ' + "mongodb://wot_admin:cosas_acg21@10.0.7.3:27017/wot-directory");
});

// Catch connection error event
mongoose.connection.on('error',function (err) {
  console.log('Mongoose connection error: ' + err);
  process.exit(1);
});

// Catch disconnection event
mongoose.connection.on('disconnected', function () {
  console.log('Mongoose disconnected');
});

// Catch end Node application event
process.on('SIGINT', function() {
  mongoose.connection.close(function () {
    console.log('Mongoose disconnected through app termination');
    process.exit(0);
  });
});




// Models
require('./thing_description');

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Operation = require("../models/operation");
require("dotenv").load();
var logger = require("../utils/logger");

const db = process.env.MONGO_DB;
const oracledb = require("oracledb");
const config = {
  user: process.env.ORACLE_USER,
  password: process.env.ORACLE_PASSWORD,
  connectString: process.env.ORACLE_CONNECT_STRING
};

mongoose.Promise = global.Promise;

router.get("/", async (req, res) => {
  logger.logApiAccess("GET", req.headers, "/healthcheck");

  var mongoStatus = "KO";
  var oracleStatus = "OK";
  var apiStatus = "OK";

  // Check Mongo Status
  if (mongoose.connection.readyState === 1) {
    mongoStatus = "OK";
  }

  // Check Oracle Status
  /*
  var connOracle
  try {
    connOracle = await oracledb.getConnection(config);
    console.log(connOracle);
    if (connOracle != null) {
		oracleStatus = "OK";
    }
  } catch (err) {// Rien à faire.  Status mis à jour }
  finally {
      if (connOracle) {
        // connOracle assignment worked, need to close
        await connOracle.close();
      }
    }
  */

  var myResponse = {
    status: apiStatus,
    mongo: mongoStatus,
    oracle: oracleStatus
  };
  res.status(200).send(myResponse);
});

module.exports = router;

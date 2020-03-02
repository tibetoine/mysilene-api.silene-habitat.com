const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const request = require("request-promise-lite");
const News = require("../models/news");
const NewsSilene = require("../models/newsSilene");
const Contacts = require("../models/contacts");
const Users = require("../models/users");
var logger  = require('../utils/logger');
require("dotenv").load();

const db = process.env.MONGO_DB;
mongoose.Promise = global.Promise;

mongoose.connect(db, function(err) {
  if (err) {
    logger.error("Erreur de connection à la base " , err);
    // console.error("Erreur de connection à la base " + err);
  }
});


router.get("/", function(req, res) {
  logger.error("Erreur de connection à la base " , err);
  res.send("api admin works");
});
/**
 * @swagger
 * definitions:
 *   Users:
 *     properties:
 *       _id:
 *         type: string
 *       prefs:
 *         type: [string]
 */


/**
 * @swagger
 * /api/users:
 *   delete:
 *     description: Permet de supprimer un user
 *     tags:
 *      - Users
 *     produces:
 *      - application/json
 *     responses:
 *       200:
 *         description: users
 */
router.delete("/users/:id", function (req, res) {
  logger.logApiAccess("DELETE", req.headers, "/api/users");

  Users.findById(req.params.id,

    function (err, user) {
      var userId = req.params.id
      if (err) {
        logger.logError("Erreur dans la suppression du user " + userId, err);
        res.sendStatus(500)
        return;
      }
      console.log(user)
      if (!user) {
        logger.logError("Cet user n'existe pas ", userId);
        res.sendStatus(404)
        return;
      }

      user.remove(function (err) {
        if (err) {
          logger.logError("Erreur dans la suppression du user " + userId, err);
          res.sendStatus(500)
          return;
        }
        res.sendStatus(200)
        return;
      });
    });
});

module.exports = router;

const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const request = require("request-promise-lite");
const News = require("../models/news");
const NewsSilene = require("../models/newsSilene");
const Contacts = require("../models/contacts");
const Users = require("../models/users");
var logger = require("../utils/logger");
require("dotenv").load();
const ActiveDirectory = require("activedirectory");

const db = process.env.MONGO_DB;
mongoose.Promise = global.Promise;

mongoose.connect(db, function(err) {
  if (err) {
    logger.error.error("Erreur de connection à la base ", err);
    // console.error("Erreur de connection à la base " + err);
  }
});

router.get("/", function(req, res) {
  logger.error.error("Erreur de connection à la base ", err);
  res.send("api works");
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
 * definitions:
 *   News:
 *     properties:
 *       _id:
 *         type: string
 *       type:
 *         type: string
 *       title:
 *         type: string
 *       date:
 *         type: string
 *       author:
 *         type: string
 *       image:
 *         type: string
 *       content:
 *         type: string
 *       link:
 *         type: string
 */

/**
 * @swagger
 * definitions:
 *   Contacts:
 *     properties:
 *       _id:
 *         type: string
 *       mail:
 *         type: string
 *       sn:
 *         type: string
 *       givenName:
 *         type: string
 *       thumbnailPhoto:
 *         type: string
 *       mobile:
 *         type: string
 *       telephoneNumber:
 *         type: string
 *       department:
 *         type: string
 *       otherTelephone:
 *         type: string
 *       sileneProcessus:
 *         type: string
 *       silenesst:
 *         type: string
 *       sileneserrefile:
 *         type: string
 *       sileneguidefile:
 *         type: string
 *       title:
 *         type: string
 */

/**
 * @swagger
 * /api/news:
 *   get:
 *     description: Retourne toutes les News Silène trié par date de publication décroissante
 *     tags:
 *      - News
 *     produces:
 *      - application/json
 *     responses:
 *       200:
 *         description: news
 */
router.get("/news", function(req, res) {
  logger.logApiAccess("GET", req.headers, "/api/news");

  NewsSilene.find({})
    .sort("-date")
    .exec(function(err, news) {
      if (err) {
        logger.logError(
          "Erreur dans la récupération des news en base",
          "GET",
          req.headers,
          "/api/news"
        );
      } else {
        res.json(news);
      }
    });
});

/**
 * @swagger
 * /api/contacts:
 *   get:
 *     description: Retourne l'ensemble des contacts de Silène
 *     tags:
 *      - Contacts
 *     produces:
 *      - application/json
 *     responses:
 *       200:
 *         description: contacts
 */
router.get("/contacts", function(req, res) {
  logger.logApiAccess("GET", req.headers, "/api/contacts");
  Contacts.find({})
    .sort({ sn: 1 })
    .exec(function(err, contacts) {
      if (err) {
        logger.logError(
          "Erreur dans la récupération des contacts en base",
          "GET",
          req.headers,
          "/api/contacts"
        );
      } else {
        res.json(contacts);
      }
    });
});

/**
 * @swagger
 * /api/users:
 *   put:
 *     description: Permet de mettre à jour les prefs de l'utilisateur
 *     tags:
 *      - Users
 *     produces:
 *      - application/json
 *     responses:
 *       200:
 *         description: users
 */
router.put("/users/:id", function(req, res) {
  logger.logApiAccess("PUT", req.headers, "/api/users");
  Users.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        prefs: req.body.prefs
      }
    },
    {
      new: true
    },
    function(err, updatedUser) {
      if (err) {
        console.log("Erreur dans la mise à jour du user", err);
      } else {
        updatedUser.tokens = undefined;
        res.json(updatedUser);
      }
    }
  );
});

/**
 * @swagger
 * /api/users:
 *   get:
 *     description: Permet de récupérer les informations d'un user (Sans les tokens)
 *     tags:
 *      - Users
 *     produces:
 *      - application/json
 *     responses:
 *       200:
 *         description: users
 */
router.get("/users/:id", function(req, res) {
  logger.logApiAccess("GET", req.headers, "/api/users");
  Users.findById(
    req.params.id,

    function(err, user) {
      if (err) {
        console.log(
          "Erreur dans la récupération du user " + req.params.id,
          err
        );
      } else {
        user.tokens = undefined;
        res.json(user);
      }
    }
  );
});

/**
 * @swagger
 * /api/users/admin:
 *   get:
 *     description: Permet de savoir si l'utilisateur passé en paramètre est admin ou non 
 *     tags:
 *      - Users
 *     produces:
 *      - application/json
 *     responses:
 *       204:
 *         description: L'utilisateur est administrateur
 *       404:
 *         description: L'utilisateur n'est pas administrateur
 */
router.get("/users/admin/:id", function(req, res) {
  var ldapConfig = {
    url: process.env.LDAP_URL,
    baseDN: process.env.LDAP_BASE_DN,
    username: process.env.LDAP_USERNAME,
    password: process.env.LDAP_PASSWORD
  };

  var ad = new ActiveDirectory(ldapConfig);

  let groupName = "_Informatique";

  ad.getUsersForGroup(groupName, function(err, users) {
    if (err) {
      logger.logError("ERROR: " + JSON.stringify(err));
      return res.sendStatus(401);
    }

    if (!users) {
      logger.logError("Group: " + groupName + " not found.");
      return res.sendStatus(401);
    }

    var isAdmin;
    users.forEach(element => {
      if (
        element &&
        element.sAMAccountName.trim().toLowerCase() === req.params.id
      ) {
        isAdmin = "isAdmin";
      }
    });

    if (isAdmin === "isAdmin") {
      return res.sendStatus(204);
    } else {
      return res.sendStatus(404);
    }
  });
});

module.exports = router;

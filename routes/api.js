const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

const NewsSilene = require("../models/newsSilene");
const Contacts = require("../models/contacts");
const Users = require("../models/users");
const Roles = require('../models/roles')
var logger = require("../utils/logger");
require("dotenv").load();
const ActiveDirectory = require("activedirectory");

const db = process.env.MONGO_DB;
mongoose.Promise = global.Promise;
mongoose.set('useFindAndModify', false)

mongoose.connect(db, { useNewUrlParser: true, useUnifiedTopology: true }, function (err) {
  if (err) {
    logger.logError("Erreur de connection à la base ", err);
    // console.error("Erreur de connection à la base " + err);
  }
});

router.get("/", function (req, res) {
  logger.logError("Erreur de connection à la base ", err);
  res.send("api works");
});

var loadContacts = []
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
router.get("/news", function (req, res) {
  logger.logApiAccess("GET", req.headers, "/api/news");

  NewsSilene.find({})
    .sort("-date")
    .exec(function (err, news) {
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
router.get("/contacts", function (req, res) {
  logger.logApiAccess("GET", req.headers, "/api/contacts");
  Contacts.find({"deleted":false})
    .sort({ sn: 1 })
    .exec(function (err, contacts) {
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


router.get('/groups', function (req, res) {
  // db.getCollection('contacts').aggregate([{$unwind:"$groups"},{$group:{_id:"$groups.cn"}}, {$sort : {_id:1}}])
  Contacts.aggregate([
    { $unwind: '$groups' },
    { $group: { _id: '$groups.cn' } },
    { $sort: { _id: 1 } }
  ]).exec(function (err, groups) {
    if (err) {
      logger.logError(
        'Erreur dans la récupération des groups en base',
        'GET',
        req.headers,
        '/api/groups'
      )
    } else {
      res.json(groups)
    }
  })
})

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
router.put("/users/:id", function (req, res) {
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
    function (err, updatedUser) {
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
router.get("/users/:id", function (req, res) {
  logger.logApiAccess("GET", req.headers, "/api/users/:id");
  Users.findById(
    req.params.id,

    function (err, user) {
      if (err) {
        console.log(
          "Erreur dans la récupération du user [%s]", req.params.id,
          err
        )
        let errorMessage = `Get User - Impossible de trouver le user [${req.params.id}] `
        res.status(500).send(errorMessage)
        return
      }
      if (!user) {
        console.log(
          "Get User - Utilisateur non trouvé [%s] ", req.params.id,
          err
        )
        res.status(500).send(`Impossible de trouver le user [${req.params.id}]`)
        return
      }
      user.tokens = undefined;
      res.json(user);
      return

    }
  );
});


/**
 * @swagger
 * /api/users:
 *   get:
 *     description: Permet de récupérer une liste d'utilisateurs enregistrés dans MySilene
 *     tags:
 *      - Users
 *     produces:
 *      - application/json
 *     responses:
 *       200:
 *         description: users
 */
router.get("/users", function (req, res) {
  logger.logApiAccess("GET", req.headers, "/api/users");
  Users.find({})
    .sort("_id")
    .exec(function (err, users) {
      if (err) {
        logger.logError(
          "Erreur dans la récupération des utilisateurs en base",
          "GET",
          req.headers,
          "/api/users"
        )

      } else {
        res.json(users);
      }
    });
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
router.get("/users/admin/:id", function (req, res) {
  var ldapConfig = {
    url: process.env.LDAP_URL,
    baseDN: process.env.LDAP_BASE_DN,
    username: process.env.LDAP_USERNAME,
    password: process.env.LDAP_PASSWORD
  };

  var ad = new ActiveDirectory(ldapConfig);

  let groupName = "_Informatique";

  ad.getUsersForGroup(groupName, function (err, users) {
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

/**
 * Permet d'enregistrer en base qu'un utilisateur travaille le samedi
 */
router.post('/contacts/:id/saturday', async function (req, res) {
  let userId = req.params.id
  try {
    let result = await Contacts.findOneAndUpdate(
      { sAMAccountName: userId },
      { saturday: true },
      {
        returnOriginal: false
      }
    )
    res.status(200).send('Contact mis à jour')
  } catch (error) {
    res.status(500).send('Erreur recording saturday in Mongo', error)
  }
})

/**
 * Permet d'enregistrer en base qu'un utilisateur ne travaille pas le samedi
 */
router.delete('/contacts/:id/saturday', async function (req, res) {
  let userId = req.params.id
  try {
    let result = await Contacts.findOneAndUpdate(
      { sAMAccountName: userId },
      { saturday: false },
      {
        returnOriginal: false
      }
    )
    res.status(200).send('Contact mis à jour')
  } catch (error) {
    res.status(500).send('Erreur recording saturday in Mongo', error)
  }
})

/**
 * Permet de récupérer les rôles d'un utilisateur dont l'id est passé en paramètre
 * Cette fonction se base sur la collection Contacts (qui est enrichit via ETL)
 */
router.get('/users/:id/roles', async function (req, res) {
  var userId = req.params.id
  /* Recherche l'utilisateur dans la table contact */
  let contact
  let roles = []
  try {
    contact = await Contacts.findOne({ sAMAccountName: userId }).lean()
  } catch (err) {
    let errorMessage = `GET Roles - Erreur lors de la recherche des roles de [${userId}]`
    console.error(errorMessage)
    res.status(500).send(errorMessage)
    return
  }

  if (!contact) {
    console.error('GET Roles - Utilisateur non trouvé [%s] : ', userId)
    let errorMessage = `GET Roles - Utilisateur non trouvé [${userId}]`
    res.status(404).send(errorMessage)
    return
  }
  /* 1/ Si le contact est manager  */
  // console.log('contact', contact)
  if (contact.isManager === true) {
    roles.push['MANAGER']
  }

  /* 2/ Cherche les rôles associé à cet utilisateur */
  let foundroles = await Roles.find({ users: { $in: [userId] } })
  // console.log('roles trouvés : ', foundroles)

  if (foundroles) {
    foundroles.forEach((role) => {
      roles.push(role._id)
    })
  }

  /* 3/ Cherches les rôles associé à cet utilisateur via ces groupes */
  if (contact.groups && contact.groups.length > 0) {
    // console.log(contact.groups.length)
    let userGroups = []
    for (let index = 0; index < contact.groups.length; index++) {
      const group = contact.groups[index]
      // console.log(group)
      userGroups.push(group.cn)
    }

    let foundroles2 = await Roles.find({ groups: { $in: userGroups } })
    if (foundroles2) {
      // console.log(foundroles2)
      foundroles2.forEach((role2) => {
        roles.push(role2._id)
      })
    }
  }
  // roles.push('admin')

  roles = roles.reduce(
    (unique, item) => (unique.includes(item) ? unique : [...unique, item]),
    []
  )
  res.json(roles)
  return
})

/**
* Retourne les information d'un utilisateur
*/
router.get('/contacts/:id', async function (req, res) {
  var userId = req.params.id
  let contact
  try {
    contact = await Contacts.findOne({ sAMAccountName: userId }).lean()
  } catch (err) {
    console.error("Erreur la recherche de l'utilisateur " + userId, err)
    res.sendStatus(500)
    return
  }

  res.json(contact)
})

/**
* Retourne l'ensemble des employés silène
*/
router.get('/users/rh/:id/all', async function (req, res) {
  var userId = req.params.id
  /* TODO - Vérifier que l'utilisateur connecté est bien manager */

  var jsonResult = {}

  let allContacts
  /* 0/ Charge tous les contacts pour éviter les appels répétés à la base */
  try {
    allContacts = await Contacts.find({$and : [{ matricule: { $ne: 'Non trouvé' }},{deleted:false} ]})
      .sort({ givenName: 1 })
      .lean()
  } catch (err) {
    console.error("Erreur la recherche de l'utilisateur " + userId, err)
    res.sendStatus(500)
    return
  }

  for (let index = 0; index < allContacts.length; index++) {
    const contact = allContacts[index]
    loadContacts[contact.sAMAccountName] = contact
  }

  /* 1/ Récupération des enfants */
  let userRh = loadContacts[userId]

  if (!userRh) {
    console.error('/users/rh/:id/all - Utilisateur non trouvé : ' + userId)
    res.sendStatus(404)
    return
  }

  let isRh = false
  userRh.groups.forEach(element => {
    /* Si dans le groupe _Ressource_humaines ==> Role rh */
    if (element.dn && element.dn.includes('_Ressource_humaines')) {
      isRh = true
    }
  })

  if (!isRh) {
    console.error(`/users/rh/:id/all - Cet utilisateur n'est pas du service RH:  ` + userId)

    res.status(401).send(
      `/users/rh/:id/all - Cet utilisateur n'est pas du service RH:  ` + userId
    )
    return
  }
  // TODO vérifier que l'user est RH

  jsonResult.directChildren = _getAll(allContacts)

  res.json(jsonResult)
})

/**
* Retourne l'ensemble des employés visibles par un manager
*/
router.get('/users/manager/:id/children', async function (req, res) {
  var userId = req.params.id
  /* TODO - Vérifier que l'utilisateur connecté est bien manager */

  var jsonResult = {}

  let allContacts
  /* 0/ Charge tous les contacts pour éviter les appels répétés à la base */
  try {
    allContacts = await Contacts.find({$and : [{ matricule: { $ne: 'Non trouvé' }},{deleted:false} ]})
      .sort({ givenName: 1 })
      .lean()
  } catch (err) {
    console.error("Erreur la recherche de l'utilisateur " + userId, err)
    res.sendStatus(500)
    return
  }

  /* Construction d'un json avec le sAMAccountName en Clé. (Facilitant la recherche de contact par identifiant) */
  for (let index = 0; index < allContacts.length; index++) {
    const contact = allContacts[index]
    loadContacts[contact.sAMAccountName] = contact
  }

  /* 1/ Récupération des enfants */
  let manager = loadContacts[userId]

  if (!manager) {
    console.error('Utilisateur non trouvé : ' + userId)
    res.sendStatus(404)
    return
  }

  if (!manager.isManager) {
    console.error(`Cet utilisateur n'est pas un manager:  ` + userId)

    res.status(401).send(`Cet utilisateur n'est pas un manager:  ` + userId)
    return
  }

  jsonResult.directChildren = _getChildren(manager.children)
  jsonResult.indirectChildren = []

  _getIndirectChildren(jsonResult, manager.children)

  // console.log(jsonResult)

  res.json(jsonResult)
})

/**
* Retourne un tableau formaté des collaborateurs du manager
* @param {*} children
*/
function _getChildren(children) {
  let returnedChildren = []
  for (let index = 0; index < children.length; index++) {
    const child = children[index]
    let infoContact = getContactInfo(child)
    if (infoContact) {
      returnedChildren.push(infoContact)
    }
  }

  return returnedChildren
}

/**
* Tous les utilisateurs
* @param {*} children
*/
function _getAll(allContacts) {
  let returnedChildren = []

  for (let index = 0; index < allContacts.length; index++) {
    const contact = allContacts[index]
    let infoContact = getContactInfo(contact.sAMAccountName)
    returnedChildren.push(infoContact)
  }

  return returnedChildren
}

/**
* Ajoute à jsonResult.indirectChildren la liste des collaborateurs indirects d'un manager
* @param {*} jsonResult
* @param {*} children
*/
function _getIndirectChildren(jsonResult, children) {
  for (let index = 0; index < children.length; index++) {
    const child = children[index]
    /* Est ce que l'enfant a lui meme des enfants? */
    let contact = getContact(child)
    /* Si pas de contact. Cela peut etre le cas, si  l'utilisateur n'a pas de matricule dans Orhus --> il aura été filtré de la table de référence. */
    if (!contact) {
      continue
    }
    if (contact.isManager == true) {
      let jsonElement = {
        owner: getContactInfo(child),
        children: _getChildren(contact.children)
      }
      jsonResult.indirectChildren.push(jsonElement)

      /* Récursif */
      _getIndirectChildren(jsonResult, contact.children)
    }
  }
}

/**
* Retourne un contact
* @param {*} userId
*/
function getContact(userId) {
  let contact = loadContacts[userId]

  if (!contact) {
    console.error('Function interne getContact - Utilisateur non trouvé : ' + userId)
    return null
  }
  return contact
}

/**
* Retourne les informations d'un utilisateur
*/
function getContactInfo(userId) {
  let contact = loadContacts[userId]

  if (!contact) {
    console.error('Function getContactInfo - Utilisateur non trouvé dans la table Contacts filtré sur le matricule présent : ' + userId)
    return null
  }

  return {
    sAMAccountName: userId,
    prenom: contact.givenName,
    nom: contact.sn,
    thumbnailPhoto: contact.thumbnailPhoto
  }
}

module.exports = router;

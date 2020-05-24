const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const Roles = require('../models/roles')
const Permissions = require('../models/permissions')
const Users = require('../models/users')
const Groups = require('../models/groups')
const dotenv = require('dotenv')
dotenv.config()

const db = process.env.MONGO_DB
mongoose.Promise = global.Promise
mongoose.set('useFindAndModify', false)

mongoose.connect(
  db,
  { useNewUrlParser: true, useUnifiedTopology: true },
  function (err) {
    if (err) {
      console.error('Erreur de connection à la base ' + err)
    }
  }
)

router.get('/', function (req, res) {
  console.error('Erreur de connection à la base ', err)
  res.send('api works')
})

/* == Gestion des roles (CRUD) == */

/**
 * Create (POST) - Make something
Read (GET)- Get something
Update (PUT) - Change something
Delete (DELETE)- Remove something
 */

/**
 *
 */
router.get('/permissions', function (req, res) {
  /* TODO ? Récupérer les modules liés à ce rôle ?  */
  Permissions.find({})
    .sort('order')
    .exec(function (err, permissions) {
      if (err) {
        console.error(
          'Erreur dans la récupération des permissions en base',
          'GET',
          req.headers,
          '/api-access/permissions',
          err
        )
      } else {
        res.json(permissions)
      }
    })
})
/**
 *
 */
router.get('/roles', function (req, res) {
  /* TODO ? Récupérer les modules liés à ce rôle ?  */
  Roles.find({})
    .sort('-role')
    .exec(function (err, roles) {
      if (err) {
        console.error(
          'Erreur dans la récupération des roles en base',
          'GET',
          req.headers,
          '/api-access/roles',
          err
        )
      } else {
        res.json(roles)
      }
    })
})
/**
 * Suppression d'un role
 */
router.delete('/roles/:role_id', function (req, res) {
  Roles.deleteOne({ _id: req.params.role_id }, function (err, role) {
    if (err) {
      res.send(err)
    }
    res.json({ message: 'Bravo, role supprimé' })
  })
})
/**
 *
 */
router.post('/roles', function (req, res) {
  // console.log('req.body')
  // console.log(req.body)
  var role = new Roles()
  role._id = req.body._id
  role.description = req.body.description
  role.color = req.body.color
  role.save(function (err, insertedRole) {
    if (err) {
      console.log(err)
      let codeError = err.code
      if (codeError && codeError === 11000) {
        res.status(403).send('Ce rôle existe déjà')
        return
      } else {
        console.error(err)
        res.status(500).send('Erreur lors de la création d un rôle')
        return
      }
    } else {
      res.json(insertedRole)
    }
  })
})

/**
 * Sauvegarde tous les roles passés en body (Replace)
 */
router.put('/roles/usersAndGroups', async function (req, res) {
  // console.log('req.body /roles')

  // console.log(req.body)
  let rolesToSave = req.body

  try {
    for (let index = 0; index < rolesToSave.length; index++) {
      const element = rolesToSave[index]
      // console.log('findOneAndUpdate pour  :', element._id, element.users)
      let users = []
      if (element.users) {
        element.users.forEach((user) => {
          users.push(user._id)
        })
      }
      // console.log('users : ', users)
      let res = await Roles.findOneAndUpdate(
        { _id: element._id },
        { users: users, groups: element.groups || [] },
        {
          returnOriginal: false
        }
      )
      // console.log('res : ', res)
    }
    // console.log('ok')
    res.status(200).send('Rôles mis à jour')
  } catch (error) {
    res.status(500).send('Erreur lors de la sauvegarde des rôles', error)
  }

  return
})

/**
 * Sauvegarde tous les roles passés en body (Replace)
 */
router.put('/permissions', async function (req, res) {
  // console.log('req.body')
  // console.log(req.body)
  let permissionsToSave = req.body
  try {
    for (let index = 0; index < permissionsToSave.length; index++) {
      const element = permissionsToSave[index]
      // console.log('findOneAndUpdate pour  :', element._id, element.users)
      let roles = []
      if (element.roles) {
        element.roles.forEach((role) => {
          roles.push(role._id)
        })
      }
      // console.log('users : ', users)
      let res = await Permissions.findOneAndUpdate(
        { _id: element._id },
        { roles: roles },
        {
          returnOriginal: false
        }
      )
      // console.log('res : ', res)
    }
    // console.log('ok')
    res.status(200).send('Permissions mis à jour')
    return
  } catch (error) {
    res.status(500).send('Erreur lors de la sauvegarde des permissions', error)
    return
  }
})

/**
 *
 */
router.put('/roles/:role_id', function (req, res) {
  Roles.findOneAndUpdate(
    { _id: req.params.role_id },
    { description: req.body.description, color: req.body.color },
    function (err, role) {
      if (err) {
        res
          .status(404)
          .send('Impossible de trouver le rôle ' + req.params.role_id)
        return
      }
      // Mise à jour des données pour un role
      role._id = req.body._id
      role.description = req.body.description
      role.color = req.body.color
      role.save(function (err) {
        if (err) {
          console.error(err)
          res.status(500).send('Erreur lors de la modification d un rôle')
          return
        }
        // Si tout est ok
        res.json({ message: 'Bravo, mise à jour des données OK' })
      })
    }
  )
})

/* ======================= */
/* == Gestion des users == */
/* ======================= */
/**
 * Récupère tous les roles de tous les utilisateurs
 */
router.get('/users/roles', async function (req, res) {
  /* TODO ? Récupérer les modules liés à ce rôle ?  */
  try {
    let usersRoles = await Users.find({}).sort('_id').exec()

    if (!usersRoles) {
      res.send(500, {
        message: 'Aucun rôles trouvés dans les tables des utilisateurs ?'
      })
      return
    }

    // console.log(usersRoles)
    let returnRoles = []
    usersRoles.forEach((element) => {
      returnRoles.push({
        _id: element._id,
        roles: element.roles
      })
    })
    res.json(returnRoles)
    return
  } catch (err) {
    console.error(err)
    res.send(500, {
      message: 'Erreur lors de la récupération des rôles des utilisateurs'
    })
    return
  }
})
/**
 * Suppression d'un role
 */
router.delete('/roles/:role_id', async function (req, res) {
  // console.log('delete role')
  let roleToDelete = req.params.role_id
  try {
    await Roles.remove({ _id: roleToDelete })

    /* Supprimer les roles dans users */
    await Users.update({}, { $pull: { roles: roleToDelete } }, { multi: true })

    /* Supprimer les roles dans groups */
    await Groups.update({}, { $pull: { roles: roleToDelete } }, { multi: true })
  } catch (error) {
    res.send(500, { message: 'Erreur lors de la création d un rôle' })
    return
  }
})
/**
 *
 */
router.post('/users/:user_id/roles/:role_name', function (req, res) {
  var role = new Roles()
  role.role = req.body.role
  role.description = req.body.description
  role.save(function (err, insertedRole) {
    if (err) {
      let codeError = err.code
      if (codeError && codeError === 11000) {
        res.send(403, { message: 'Ce rôle existe déjà' })
        return
      } else {
        res.send(500, { message: 'Erreur lors de la création d un rôle' })
        return
      }
    } else {
      res.json(insertedRole)
    }
  })
})

/**
 * ==>
 */
router.put('/users/:user_id/roles', async function (req, res) {
  // console.log('==>')
  /* 1/ Validate roles */
  // Vérifier que le ROLE existe ?
  // console.log(req.body.roles)
  // logger.logApiAccess('PUT', req.headers, '/api-access/users/<userId>/roles')
  Users.findByIdAndUpdate(
    req.params.user_id,
    {
      $set: {
        roles: req.body.roles
      }
    },
    function (err, updatedUser) {
      if (err) {
        console.log('Erreur dans la mise à jour des roles du user', err)
        res.send(500, {
          message: 'Erreur lors de la mise à jour des roles pour l utilisateur'
        })
        return
      }
      updatedUser.tokens = undefined
      updatedUser.token = undefined
      res.json(updatedUser)
    }
  )
})

module.exports = router

const express = require('express')
const router = express.Router()
const mongoose = require('mongoose')
const multer = require('multer')
const dotenv = require('dotenv')
const InteressementConfig = require('../models/interessementConfig')
const Interessement = require('../models/interessement')
const Contacts = require('../models/contacts')
const excelToJson = require('convert-excel-to-json')

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
  res.send('api-itt works')
})
var upload = multer({ dest: 'uploads/' })

/**
 * Import fichier excel des interessement
 */
router.post('/upload', upload.single('file'), async function (req, res) {
  // console.log(req.file)
  let year = new Date().getFullYear()

  /* Etape 1 - Récupération du fichier excel */
  const result = excelToJson({
    sourceFile: req.file.path
  })

  /* On récupère les données du premier onglet */

  let keys = Object.keys(result)
  let data = result[keys[0]]
  console.log(data)

  /* Etape 2 - Verif Structure Excel */
  /* 1.1/ Verif le nombre de colonne */
  if (Object.keys(data[0]) < 13) {
    let errorMessage =
      "Fichier excel envoyé n'est pas valide. Nombre de colonnes attendu = 13. (Consulter documentation sur MySilene - OneNote)"
    console.log(errorMessage)
    res.status(500).send(errorMessage)
    return
  }

  /* 1.2/ Verif le nom des colonnes */
  let expectedStruct = {
    A: 'matricule',
    B: 'civilite',
    C: 'nom',
    D: 'prenom',
    E: 'nir',
    F: 'cle_nir',
    G: 'base_annuelle',
    H: 'nb_jrs_maladie',
    I: 'nb_jrs_enfants_malade',
    J: 'nb_jrs_service_non_fait',
    K: 'nb_jrs_conges_sans_solde',
    L: 'nb_jrs_cif',
    M: 'nb_jrs_autres_absences',
    N: 'nb_jrs_ouvres_annee_NmoinsUn_apres_absence',
    O: 'montant_brut',
    P: 'csg_crds',
    Q: 'quote_part_net'
  }

  console.log('A : ', JSON.stringify(data[0]))
  console.log('B : ', JSON.stringify(expectedStruct))
  if (JSON.stringify(data[0]) !== JSON.stringify(expectedStruct)) {
    let errorMessage =
      'Les colonnes ne sont pas les bonnes. (Consulter documentation sur MySilene - OneNote)'
    console.log(errorMessage)
    res.status(500).send(errorMessage)
    return
  }

  /* Etape 3 - Création de la datum */
  let returnResult = []

  for (let index = 1; index < data.length; index++) {
    const userInteressement = data[index]

    let interessementToRecord = {}
    /* On ajoute l'année courante */
    interessementToRecord['year'] = `${year}`

    Object.keys(data[0]).forEach((key) => {
      interessementToRecord[data[0][key]] = `${userInteressement[key]}`
    })
    /* On prépare les données - set default values ? */

    returnResult.push(interessementToRecord)
  }
  /**
   * Enregistre en base
   */
  let resMong

  // console.log(returnResult.length)
  returnResult = JSON.parse(JSON.stringify(returnResult))
  try {
    /* On supprime tout pour l'année XXX */
    resMong = await Interessement.deleteMany({ year: `${year}` })
    resMong = await Interessement.collection.insertMany(returnResult)
  } catch (error) {
    console.log(error)
    res.status(500).send("Impossible d'enregistrer les interessements en base")
    return
  }
  res.status(200).send(`upload ok`)
  return
})

/**
 * Retoure la configuration pour une année donnée.
 * Si l'année n'est pas précisée alors on prend l'année en cours
 */
router.get('/interessement/config/:annee', async function (req, res) {
  let year = req.params.annee
  if (!year || year === '' || year === 'undefined') {
    year = new Date().getFullYear()
  }
  // year = '2020'
  console.log('year : ', year)
  try {
    let intConfig = await InteressementConfig.findOne({ _id: year }).exec()

    if (!intConfig || intConfig.length <= 0) {
      res
        .status(500)
        .send(
          'Impossible de charger la configuration de l interessement pour cette année. Consultez la doc MySilene'
        )

      return
    }

    console.log(intConfig)

    res.json(intConfig)
    return
  } catch (err) {
    console.error(err)
    res.send(500, {
      message: 'Erreur lors de la récupération de la config interessement'
    })
    return
  }
})

/**
 *
 */
router.put('/interessement/closed/:annee', async function (req, res) {
  let year = req.params.annee
  console.log(year)
  closed = req.body
  console.log(closed)
  try {
    let res = await InteressementConfig.findOneAndUpdate(
      { _id: year },
      { closed: closed.closed === 'true' },
      {
        returnOriginal: false
      }
    )
  } catch (err) {
    console.error(err)
    let errorMessage =
      "Erreur lors de la fermeture ou ouverture de l'intéressements"
    res.status(500).send(errorMessage)
    return
  }

  res.status(200).send('Interessements ouverts / fermés avec succès')
  // console.log(userId, year, interessementUser)

  return

  return
})
/**
 *
 */
router.put('/interessement/:userId/:annee', async function (req, res) {
  let userId = req.params.userId
  let year = req.params.annee

  let interessementUser = req.body

  /* On ajoute la date de dernière modification */
  let currentDate = new Date()

  try {
    let res = await Interessement.findOneAndUpdate(
      { _id: interessementUser._id },
      { lastModified: currentDate, choix: interessementUser.choix },
      {
        returnOriginal: false
      }
    )
    console.log(res)
  } catch (err) {
    console.error(err)
    let errorMessage = "Erreur lors de la sauvegarde de l'interessement"
    res.status(500).send(errorMessage)
    return
  }

  res.status(200).send('Interessement enregistré avec succès')
  // console.log(userId, year, interessementUser)

  return
})

/**
 * Export Excel
 */
router.get('/interessement/export/:annee', async function (req, res) {
  let year = req.params.annee
  let interessements
  let configInteressements
  try {
    interessements = await Interessement.find({ year: year })
      .sort({ nom: 1 })
      .lean()
    configInteressements = await InteressementConfig.findOne({
      _id: year
    }).lean()
  } catch (err) {
    console.error(
      'Erreur dans la récupération des interessements en base',
      'GET',
      req.headers
    )
    res
      .status(500)
      .send('Erreur dans la récupération des interessements en base')
    return
  }

  // console.log('interessements', interessements)
  /* Mapping des données. */
  let result = await _getExtractionArray(
    interessements,
    configInteressements,
    year
  )

  res.xls('data.xlsx', result)
  return
})
/**
 * Charge les donnés d'intéressement d'un utilisateur pour une année donnée.
 */
router.get('/interessement/:userId/:annee', async function (req, res) {
  let userId = req.params.userId
  let year = req.params.annee
  if (!year || year === '' || year === 'undefined') {
    year = new Date().getFullYear()
  }
  // year = '2020'
  console.log('year : ', year)
  try {
    /* 1/ Chargement du contact associé au userName */
    let contact = await Contacts.findOne({ sAMAccountName: userId }).lean()
    if (!contact) {
      let errorMessage =
        "Impossible de charger un contact à partir de l'identifiant : " + userId
      console.log(errorMessage)
      res.status(500).send(errorMessage)
    }

    console.log(contact)
    console.log('contact.matricule', contact.matricule)
    console.log('contact.sAMAccountName:', contact.sAMAccountName)

    let matricule = contact.matricule

    let interessement = await Interessement.findOne({
      matricule: contact.matricule,
      year: year
    }).exec()

    if (!interessement || interessement.length <= 0) {
      let errorMessage = `Impossible de charger un interessement pour le user ${userId} (avec le matricule ${matricule}) et pour l'année ${year}`
      res.status(500).send(errorMessage)

      return
    }
    res.status(200).json(interessement)
    return
  } catch (err) {
    console.error(err)
    let errorMessage = `Impossible de charger un interessement pour le user ${userId} (avec le matricule ${matricule}) et pour l'année ${year}`
    res.status(500).send(errorMessage, err)
    return
  }
})

/**
 * Retourne les users en JSON
 * @param {*} jsonShifts
 */
async function _loadContacts() {
  /* Je charge dans un json, les users de la base contacts */
  let contacts
  try {
    contacts = await Contacts.find({}).sort('sn').lean()
  } catch (err) {
    throw err
  }

  return contacts
}

/**
 * Prend les données MOngo en paramètre et retourne un objet JSON adapté à l'extract
 * @param {*} interessements
 */
async function _getExtractionArray(interessements, configInteressements, year) {
  let contacts = await _loadContacts()
  // let done = false
  // let done2 = false

  console.log(configInteressements)

  let result = []
  // console.log(interessements[0])
  interessements.forEach((interessement) => {
    /*if (interessement.choix && !done) {
      console.log(interessement)
      console.log(interessement.choix.pee)
      done = true
    }*/
    var contact = contacts.filter(
      (contact) => contact.matricule === interessement.matricule
    )[0]

    /*if (!done2) {
      console.log(contact)
      done2 = true
    }*/
    let data
    if (!contact) {
      // console.log(element)
      console.error('Impossible de trouver le user  ', interessement.matricule)
      data = {
        annee: year,
        matricule: interessement.matricule,
        civilite: interessement.civilite,
        nom: interessement.nom,
        prenom: interessement.prenom
      }
    } else {
      data = {
        annee: year,
        matricule: interessement.matricule,
        civilite: interessement.civilite,
        nom: contact.sn,
        prenom: contact.givenName,
        nir: interessement.nir,
        cle_nir: interessement.cle_nir,
        base_annuelle: interessement.base_annuelle,
        nb_jrs_maladie: interessement.nb_jrs_maladie,
        nb_jrs_enfants_malade: interessement.nb_jrs_enfants_malade,
        nb_jrs_service_non_fait: interessement.nb_jrs_service_non_fait,
        nb_jrs_conges_sans_solde: interessement.nb_jrs_conges_sans_solde,
        nb_jrs_cif: interessement.nb_jrs_cif,
        nb_jrs_autres_absences: interessement.nb_jrs_autres_absences,
        nb_jrs_ouvres_annee_NmoinsUn_apres_absence:
          interessement.nb_jrs_ouvres_annee_NmoinsUn_apres_absence,
        direction: contact.st,
        service: contact.department,
        numeroCourt: contact.otherTelephone,
        tel: contact.telephoneNumber,
        mobile: contact.mobile,
        email: contact.mail,
        fonction: contact.title,
        manager: contact.managerParent,
        estFonctionnaire: contact.estFonctionnaire,
        repartitionBulletinDeSalaire: interessement.bulletin_de_salaire,
        lastModified: interessement.lastModified
      }
    }

    console.log(configInteressements.pee)
    if (
      interessement.choix &&
      interessement.choix.fonds &&
      interessement.choix.fonds.length > 0
    ) {
      interessement.choix.fonds.forEach((fond) => {
        data[fond.nom_du_fond] = fond.percent
      })
    } else {
      configInteressements.pee.forEach((configFond) => {
        data[configFond.nom_du_fond] = configFond.percent
      })
    }
    result.push(data)

    /*
    * {
  _id: '2020',
  date_accord_interessement: '2017-06-19',
  montant_global: 282678.23,
  nombre_jours_de_travail_effectif: 251,
  date_echeance_choix: '2020-06-15',
  abondement: '50',
  interet_retard: '',
  autofinancement: '13,63',
  pourcentage_masse_salariale: '4,73',
  estimation_montant_indiduel_brut: 1537.26,
  resultat_exploitation: 'x,xx',
  majoration_autofinancement: '0,73',
  repartition_defaut_sur_bulletin_de_salaire: '0',
  taux_csg_crds: '9,7',
  pee: [
    {
      index_du_fond: 1,
      nom_du_fond: 'SOREA MONETAIRE',
      numero_du_fond: 'A1',
      percent: '100',
      lien_notice_d_information: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
    },
    {
      index_du_fond: 2,
      nom_du_fond: 'SOREA Actions Euro',
      numero_du_fond: 'B1',
      percent: '0',
      lien_notice_d_information: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
    },
    {
      index_du_fond: 3,
      nom_du_fond: 'SOREA Obligations',
      numero_du_fond: 'C1',
      percent: '0',
      lien_notice_d_information: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
    },
    {
      index_du_fond: 4,
      nom_du_fond: 'SOREA Dynamique Solidaire',
      numero_du_fond: 'D1',
      percent: '0',
      lien_notice_d_information: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
    },
    {
      index_du_fond: 5,
      nom_du_fond: 'SOREA Croissance',
      numero_du_fond: 'E1',
      percent: '0',
      lien_notice_d_information: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
    }
  ],
  'critères': [
    {
      _id: 'qualite',
      titre: 'La qualité de service rendue au client',
      objectif: '+85%',
      'Réalisé': '87%',
      resultat: 150,
      repartition: '30%'
    },
    {
      _id: 'demande_financement',
      titre: 'Nombre de logements faisant l’objet d’une demande de financement',
      objectif: '240 logements',
      'Réalisé': '348 logements',
      resultat: 150,
      repartition: '20%'
    },
    {
      _id: 'logements_rehabilites',
      titre: 'Réception de logements réhabilités',
      objectif: '230 logements',
      'Réalisé': '97 logements',
      resultat: 0,
      repartition: '20%'
    },
    {
      _id: 'vacance',
      titre: 'Vacance',
      objectif: '2% du parc de logement',
      'Réalisé': '1,68%',
      resultat: 150,
      repartition: '20%'
    },
    {
      _id: 'impayes',
      titre: 'Impayés',
      objectif: '4,4%',
      'Réalisé': '3,23%',
      resultat: 150,
      repartition: '10%'
    }
  ]
}
    */
    /*
    {
      index_du_fond: 4,
      nom_du_fond: 'SOREA Dynamique Solidaire',
      numero_du_fond: 'D1',
      percent: '0',
      lien_notice_d_information: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf'
    }, */
    /*
    {
  _id: 5ec7153970d6831c6062fa10,
  year: '2020',
  matricule: '111474',
  civilite: 'Monsieur',
  nom: 'ROBERT',
  prenom: 'ANTOINE',
  nir: '1830444184041',
  cle_nir: '62',
  base_annuelle: '251',
  nb_jrs_maladie: '5',
  nb_jrs_enfants_malade: '7',
  nb_jrs_service_non_fait: '0',
  nb_jrs_conges_sans_solde: '0',
  nb_jrs_cif: '0',
  nb_jrs_autres_absences: '0',
  nb_jrs_ouvres_annee_NmoinsUn_apres_absence: '239',
  montant_brut: '1463.762652613178',
  csg_crds: '141.98497730347827',
  quote_part_net: '1321.7776753096998',
  choix: {
    bulletin_de_salaire: '50',
    pee: { repartition: 0, fonds: [Array] }
  },
  lastModified: 2020-05-23T01:18:36.521Z
}
    */
    /**
     * matricule
     * direction
     * service
     * nom
     * prenom
     * fait pas fait
     * Les jours de congés
     * repartition bds
     * repartition pee
     * repartition pee 1
     * repartition pee 2
     * repartition pee 3
     * repartition pee 4
     * quote part net
     * abondement
     * etc.
     */
  })

  return result
}
module.exports = router

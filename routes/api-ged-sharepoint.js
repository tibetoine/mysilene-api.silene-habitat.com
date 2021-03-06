const express = require("express")
const router = express.Router()
var logger = require("../utils/logger")
const rp = require("request-promise")
const helper = require("../helper/helper")

const spauth = require("node-sp-auth")
const externalConf = require("../conf/external-conf.json")

const mongoose = require("mongoose")
const Planotheque = require("../models/planotheque")

mongoose.Promise = global.Promise

const SHAREPOINT_PATRIMOINE_URI =
  process.env.SHAREPOINT_BASE_URL + "/patrimoine"
const sharepointAuth = () =>
  spauth.getAuth(SHAREPOINT_PATRIMOINE_URI, {
    username: process.env.SHAREPOINT_USERNAME,
    password: process.env.SHAREPOINT_PASSWORD,
    domain: process.env.SHAREPOINT_DOMAIN
  })

var extToMimes = {
  doc: "application/msword",
  docx:
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
  ppt: "application/vnd.ms-powerpoint",
  pptx:
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  tif: "image/tiff",
  tiff: "image/tiff",
  dwg: "application/dwg",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  bmp: "image/bmp",
  gif: "image/gif",
  png: "image/png"
}

/* TODO : DOcumentation, comment récupérer l'identifiant d'un type de document ? */
const filterTypeArray = externalConf.apiGedSharepointFilterType

/**
 * @swagger
 * /api-ged-sharepoint/residences:
 *   get:
 *     description: Retourne la liste des résidences connues des librairies Sharepoint sur le site "<isidoor>/patrimoine/"
 *     tags:
 *      - Residences
 *     produces:
 *      - application/json
 *     responses:
 *       200:
 *         description: Retourne la liste des residences avec l'id de résidence et l'URL vers la(ou les) librairie(s) associée(s).
 */
router.get("/residences", async (req, res) => {
  logger.logApiAccess("GET", req.headers, "/api-ged-sharepoint/residences/")
  logger.logInfo(
    "Récupération de la liste des résidences",
    "GET",
    req.headers,
    "/api-ged-sharepoint/residences"
  )

  /* 1/ Récupération des résidences via le helper */
  var result = await helper.getResidencesList()

  var jsonResidenceList = result.rows.map(element => {
    return {
      residenceId: element[0],
      residenceName: element[1]
    }
  })

  res.json(jsonResidenceList)
})

/**
 * @swagger
 * /api-ged-sharepoint/residences/:id/docs:
 *   get:
 *     description: Retourne la liste des documents Sharepoint liés à une librairie
 *     tags:
 *      - Residences
 *     produces:
 *      - application/json
 *     responses:
 *       200:
 *         description: Retourne la liste des residences avec l'id de résidence et l'URL vers la(ou les) librairie(s) associée(s).
 */
router.get("/residences/:id/docs", async (req, res) => {
  var jsonResponse = { result: [] }
  await getDocsFromPatrimoine(jsonResponse, req.params.id)
  /* Récupération des documents dans la planothèque */
  res.json(jsonResponse)
})

/**
 *Itère sur les URLs connu et va ensuite chercher les documents associés.
 * @param {*} urlArray
 */
async function getDocsFromUrlArray(urlArray, jsonResponse) {
  for (const anUrl of urlArray) {
    await getDocsFromUrl(anUrl, jsonResponse)
  }

  return jsonResponse
}

/**
 * Récupère les documents à partir d'une URL
 * @param {*} url
 */
async function getDocsFromUrl(url, jsonResponse) {
  const constructedUrl =
    process.env.SHAREPOINT_BASE_URL +
    "/patrimoine/_api/Web/GetFolderByServerRelativeUrl('" +
    url +
    "')/Files?$expand=ListItemAllFields"
  var list = await sharepointAuth().then(auth =>
    rp.get({
      ...auth.options,
      headers: { ...auth.headers, Accept: "application/json;odata=verbose" },
      uri: encodeURI(constructedUrl)
    })
  )

  /* Parser la list pour créer une réponse JSON avec les documents */

  if (!list) {
    return null
  }
  var jsonList = JSON.parse(list)
  if (
    jsonList &&
    jsonList.d &&
    jsonList.d.results &&
    jsonList.d.results.length > 0
  ) {
    var documents = jsonList.d.results
    /* On filtre les documents */
    var filteredDocuments = documents.filter(filterDocs)

    /* Construction de la réponse. */
    const responseDocuments = filteredDocuments.map(maperDocs)

    /*console.log("-- Je fusionne 2 tableaux --");
    console.log("Tableau 1 : ", jsonResponse.result);
    console.log("Tableau 2 : ", responseDocuments);*/
    Array.prototype.push.apply(jsonResponse.result, responseDocuments)
  }
}

/**
 * @swagger
 * /api-ged-sharepoint/residences/:id/plans:
 *   get:
 *     description: Retourne la liste des plans Sharepoint
 *     tags:
 *      - Residences
 *     produces:
 *      - application/json
 *     responses:
 *       200:
 *         description: Retourne la liste des plans d'une résidence
 */
router.get("/residences/:id/plans", async (req, res) => {
  try {
    var plansResidence = await getPlansFromMongo(req.params.id)
    if (
      plansResidence &&
      plansResidence.apiResult &&
      plansResidence.apiResult.result &&
      plansResidence.apiResult.result.length > 0
    ) {
      res.json(plansResidence.apiResult)
    } else {
      /* Retourne une 204 - No Content*/
      res
        .status(204)
        .send(
          `ErrorCode : #E0002 - Aucune donnée pour la résidence ${req.params.id}`
        )
      return
    }
  } catch (e) {
    console.error(e)
  }
})

/**
 * Promise pour récupérer les données en base Mongo.
 * @param {*} residenceId
 */
const getPlansFromMongo = residenceId =>
  new Promise((resolve, reject) =>
    Planotheque.findOne({ _id: residenceId }).exec((err, plansResidence) =>
      err ? reject(err) : resolve(plansResidence)
    )
  )

/**
 * Récupère les plans depuis Sharepoint
 */
async function getPlansFromSharepoint(jsonResponse, residenceId) {
  /* Liste des documents de la planothèque */
  const url =
    process.env.SHAREPOINT_BASE_URL +
    "/patrimoine/_api/Web/GetFolderByServerRelativeUrl('Planothque')/Files?$expand=ListItemAllFields&$filter=substringof('" +
    residenceId +
    "',Name)&$select=ListItemAllFields/SileneDocumentType,Name, ServerRelativeUrl"
  var list = await sharepointAuth().then(auth =>
    rp.get({
      ...auth.options,
      headers: {
        ...auth.headers,
        Connection: "keep-alive",
        Accept: "application/json;odata=verbose"
      },
      uri: encodeURI(url)
    })
  )

  /* Parser la list pour créer une réponse JSON avec les documents */
  if (!list) {
    return null
  }
  var jsonList = JSON.parse(list)
  if (
    jsonList &&
    jsonList.d &&
    jsonList.d.results &&
    jsonList.d.results.length > 0
  ) {
    var documents = jsonList.d.results
    /* On filtre les documents */
    var filteredDocuments = documents.filter(filterDocs)

    /* Construction de la réponse. */
    const responseDocuments = filteredDocuments.map(maperDocs)

    /*console.log('-- Je fusionne 2 tableaux --')
      console.log('Tableau 1 : ', jsonResponse.result )
      console.log('Tableau 2 : ', responseDocuments )*/
    Array.prototype.push.apply(jsonResponse.result, responseDocuments)
  }
  // console.log('returning jsonResponse : ' , jsonResponse)
  return jsonResponse
}

/**
 * Retourne l'URL à utiliser pour chercher les documents dans Sharepoint.
 * Cette URL est construite à partir de :
 * - L'identifiant de la résidence
 * - Les exstensions autorisées
 * - Les types de documents autorisées
 *
 * @param {*} residenceId
 */
function constructeSearchUrl(residenceId) {
  /* Query Text */
  const queryText = `residence:${residenceId}`

  /* Les propriétés à retourner dans le résultat */
  const selectProperties =
    "Path,Filename,Title,Residence,SileneDocumentType,SileneSensible"

  /* Les refiners : Indispensable pour pouvoir filtrer */
  const refiners = "fileExtension,SileneDocumentType,SileneSensible"

  /* Filtre : On filtre par extension de fichier et par Type de document  */
  let extensions = Object.keys(extToMimes)
    .map(element => '"' + element + '"')
    .join(",")
  let types = filterTypeArray.map(element => '"' + element + '"')
  const refinementfilters = `and(fileExtension:or(${extensions}),SileneDocumentType:or(${types}),SileneSensible:False)`

  /* L'URL construite */
  const baseUrl =
    process.env.SHAREPOINT_BASE_URL +
    `/patrimoine/_api/search/query?querytext='${queryText}'&selectproperties='${selectProperties}'&refiners='${refiners}'&refinementfilters='${refinementfilters}'`

  return baseUrl
}
/**
 * Récupère l'ensemble des documents à partir de l'API de recherche de Sharepoint.
 * En filtrant sur la résidence dont l'ID est passé en paramètre.
 *
 * @param {*} urlArray
 */
async function getDocsFromPatrimoine(jsonResponse, residenceId) {
  /* Liste des documents de la planothèque */
  let url = constructeSearchUrl(residenceId)
  var list = await sharepointAuth().then(auth =>
    rp.get({
      ...auth.options,
      headers: { ...auth.headers, Accept: "application/json;odata=verbose" },
      uri: encodeURI(url)
    })
  )

  if (!list) {
    return null
  }

  /* Parser la list pour créer une réponse JSON avec les documents */
  var jsonList = JSON.parse(list)
  var documents = null
  try {
    documents =
      jsonList.d.query.PrimaryQueryResult.RelevantResults.Table.Rows.results
  } catch (error) {
    return null
  }

  /* Construction de la réponse. */
  const responseDocuments = documents.map(maperSearchDocs)

  /*console.log('-- Je fusionne 2 tableaux --')
    console.log('Tableau 1 : ', jsonResponse.result )
    console.log('Tableau 2 : ', responseDocuments )*/
  Array.prototype.push.apply(jsonResponse.result, responseDocuments)

  return jsonResponse
}

/**
 * @swagger
 * /api-ged-sharepoint/residences/doc:
 *   get:
 *     description: Retourne un document à partir de l'url passée en paramètre
 *     tags:
 *      - Residences
 *     produces:
 *      - application/json
 *     responses:
 *       200:
 *         description: retourne un document (ou null)
 */
router.get("/residences/doc/", async (req, res) => {
  /* Récupération de (ou des) libraryName */
  var urlDoc = req.query.urlDoc

  var file = await getDocFromUrl(urlDoc)

  if (!file) {
    res.status(204).send({
      error: "Aucun document récupéré"
    })
  }

  /* Vérifie les droits d'ouverture du fichier */
  let rights = await checkRights(urlDoc)
  // console.log('rights : ', rights)
  if (!rights) {
    // console.log('Je passe ici, je devrai retourner 401')
    res
      .status(401)
      .send(
        "ErrorCode : #E0001 - Ce document ne dispose pas des autorisations pour être téléchargé. Veuillez contacter l'administrateur Sharepoint Silène"
      )
    return
  }

  /* Récupération du nom du fichier */
  let fileName = getFileNameFromUrl(urlDoc)
  let fileMime = getMimeFromUrl(urlDoc)

  // TODO  Récupérer le nom du fichier
  // console.log("The file : ", fileName, " with Mime : ", fileMime, " and buffer : ", file);
  res.writeHead(200, {
    "Content-Type": `${fileMime}`,
    "Content-Disposition": `attachment; filename=${fileName}`,
    "Content-Length": file.length
  })
  res.end(file)
})

/**
 * Vérifie que le fichier peut être ouvert par le grand public. (Voir compte "témoin")
 * @param {*} urlDoc
 */
async function checkRights(urlDoc) {
  /* Récupération des permissions depuis l'API Sharepoint */
  let normalAccount = externalConf.normalAccount

  let constructedUrl =
    SHAREPOINT_PATRIMOINE_URI +
    `/_api/Web/GetFileByServerRelativeUrl('${urlDoc}')/ListItemAllFields/getusereffectivepermissions(@u)?@u='${normalAccount}'`

  // console.log(constructedUrl)

  var json = await sharepointAuth().then(auth =>
    rp.get({
      ...auth.options,
      headers: { ...auth.headers, Accept: "application/json;odata=verbose" },
      uri: constructedUrl
    })
  )

  var jsonResponse = JSON.parse(json)

  /* Je récupère la valeur 'High' de la réponse (Voir doc OneNote) */
  /* Je transforme ce décimal en binaire */
  var high = jsonResponse.d.GetUserEffectivePermissions.High

  var dec = high
  var binaryInString = (dec >>> 0).toString(2)

  while (binaryInString.length <= 32) {
    binaryInString = "0" + binaryInString
  }

  var paramLength = binaryInString.length
  /* On regarde la valeur du digit à la 6ème position (Voir OneNote pour mieux comprendre) */
  var openItemsDigitValue = binaryInString.substring(
    paramLength - 6,
    paramLength - 6 + 1
  )
  // console.log('openItemsDigitValue : ', openItemsDigitValue)
  let returnBoolean = openItemsDigitValue === "1"
  // console.log('Returning : ', returnBoolean)
  return returnBoolean
}

/**
 *
 * @param {*} urlFile
 */
function getFileNameFromUrl(urlFile) {
  var parts = urlFile.split("/")
  var fileName = parts[parts.length - 1]

  return fileName
}

/**
 * Retourne le mime type à partir de l'URL d'un fichier puis de son extension.
 * @param {*} urlFile
 */
function getMimeFromUrl(urlFile) {
  var parts = urlFile.split(".")
  var extension = parts[parts.length - 1]
  return extToMimes[extension]
}
/**
 * Permet de récupérer un fichier.
 *
 * @param {*} urlFile l'url vers le fichier à récupérer
 */
async function getDocFromUrl(urlFile) {
  /* Construction de l'URL pour récupérer le fichier  */
  let sharepointURLFile =
    SHAREPOINT_PATRIMOINE_URI +
    `/_api/Web/GetFileByServerRelativeUrl('${urlFile}')/$value`
  // console.log("Getting file from : ", sharepointURLFile);

  /* Get File */
  var responseFile = await sharepointAuth().then(async auth => {
    return await rp
      .get({
        ...auth.options,
        encoding: null,
        headers: { ...auth.headers },
        uri: encodeURI(sharepointURLFile)
      })
      .catch(error => {
        console.error(error)
      })
  })
  // console.log("responseFile : ", responseFile);
  return responseFile
}
/**
 * @swagger
 * /api-ged-sharepoint/docs:
 *   get:
 *     description: Retourne un document à partir de son Id et de sa version.
 *     tags:
 *      - Docs
 *     produces:
 *      - application/json
 *     responses:
 *       200:
 */
router.get("/docs/:id", (req, res) => {})

function myLog(texte, objects) {
  let log = process.env.LOG
  if (log === "ON") console.log(texte, objects)
}

/**
 * Transforme un element passé en paramètre en objet Json
 *
 * @param {*} document
 */
const maperSearchDocs = jsonElement => {
  // console.log("maperSearchDocs - element : ", jsonElement)

  let documentName = null
  let link = null
  let sharepointServerRelativeUrl = null
  let typeLabel = null
  jsonElement.Cells.results.forEach(element => {
    switch (element.Key) {
      case "Path":
        link = element.Value
        sharepointServerRelativeUrl = element.Value.substring(
          element.Value.indexOf("/patrimoine/")
        )
        break
      case "Filename":
        documentName = element.Value
        break
      case "SileneDocumentType":
        typeLabel = element.Value
        break
      default:
        break
    }
  })
  return {
    documentName: documentName,
    link: link,
    sharepointServerRelativeUrl: sharepointServerRelativeUrl,
    typeLabel: typeLabel
  }
}

/**
 * Transforme un element passé en paramètre en objet Json
 *
 * @param {*} document
 */
const maperDocs = element => {
  return {
    documentName: element.Name,
    link: element.LinkingUrl,
    sharepointServerRelativeUrl: element.ServerRelativeUrl,
    type: element.ListItemAllFields.SileneDocumentType
      ? element.ListItemAllFields.SileneDocumentType.WssId
      : null,
    typeLabel: element.ListItemAllFields.SileneDocumentType
      ? element.ListItemAllFields.SileneDocumentType.Label
      : null
  }
}
/**
 * Fonction qui permet de filtrer des documents d'une library.
 */
const filterDocs = document => {
  /* Si le document est sensible on ne le montre pas */
  if (document.ListItemAllFields.Sensible) {
    return false
  }

  /* On filtre l'extension */
  if (!extToMimes.hasOwnProperty(document.Name.split(".").pop())) {
    return false
  }

  return true
}

module.exports = router

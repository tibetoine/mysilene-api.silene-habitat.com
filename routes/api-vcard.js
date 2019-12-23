const express = require("express");
const router = express.Router();
var logger = require("../utils/logger");
const rp = require("request-promise");
const helper = require("../helper/helper");
const vCardsJS = require('vcards-js');
const ActiveDirectory = require("activedirectory");

const spauth = require("node-sp-auth");

/**
 * @swagger
 * /api-vcard:
 *   get:
 *     description: Retourne une vcard d'une personne passé en parametre
 *     tags:
 *      - Residences
 *     produces:
 *      - application/json
 *     responses:
 *       200:
 *         description: Retourne la liste des residences avec l'id de résidence et l'URL vers la(ou les) librairie(s) associée(s).
 */
router.get("/contacts/:id/vcard", async (req, res) => {
  logger.logApiAccess("GET", req.headers, `/contacts/${req.params.id}/vcard`);
  logger.logInfo(
    "Export Vcard d'un contact",
    "GET",
    req.headers,
    "/api-vcard/contacts"
  );

  /* 1/ Controle de surface de l'id */

  /* 2/ Récupération des informations dans l'AD */

  var ldapConfig = {
    url: process.env.LDAP_URL,
    baseDN: process.env.LDAP_BASE_DN,
    username: process.env.LDAP_USERNAME,
    password: process.env.LDAP_PASSWORD,
    attributes: {
      user: [
        "sAMAccountName",
        "mail",
        "sn",
        "givenName",
        "department",
        "otherTelephone",
        "telephoneNumber",
        "mobile",
        "sileneProcessus",
        "silenesst",
        "sileneserrefile",
        "sileneguidefile",
        "title",
        "thumbnailPhoto"
      ]
    }
  };

  var ad = new ActiveDirectory(ldapConfig);
  var sAMAccountName = req.params.id;
  ad.findUser(sAMAccountName, function (err, user) {
    if (err) {
      console.log('ERROR: ' + JSON.stringify(err));
      return;
    }

    if (!user) res.status(404).send('User Not found');

    console.log(user)
    vCard = vCardsJS();

    //set properties
    vCard.firstName = user.givenName;    
    vCard.lastName = user.sn;
    vCard.email = user.mail;
    vCard.organization = 'Silène';
    vCard.title = user.title;
    if(user.telephoneNumber) vCard.workPhone = user.telephoneNumber
    if(user.mobile) vCard.cellPhone  = user.mobile
    if (user.thumbnailPhoto) vCard.photo.embedFromString(new Buffer(user.thumbnailPhoto).toString('base64'), 'image/jpg');
    //set content-type and disposition including desired filename
    res.set('Content-Type', `text/vcard; charset=utf-8; name="${sAMAccountName}.vcf"`);
    res.set('Content-Disposition', `inline; filename="${sAMAccountName}.vcf"`);

    //send the response
    res.send(vCard.getFormattedString());
  });






});


module.exports = router;

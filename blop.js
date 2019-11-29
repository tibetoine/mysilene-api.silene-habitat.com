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
};


const filterTypeArray = [
  "Annexe","Devis","CCTP"
];

var residenceId = '0070'
/* Query Text */
const queryText = `residence:${residenceId}`;

/* Les propriétés à retourner dans le résultat */
const selectProperties =
  "Path,Filename,Title,Residence,SileneDocumentType,SileneSensible";

/* Les refiners : Indispensable pour pouvoir filtrer */
const refiners = "fileExtension,SileneDocumentType";

/* Filtre : On filtre par extension de fichier et par Type de document  */
let extensions = Object.keys(extToMimes).map(element => '"'+element+'"').join(',')
let types = filterTypeArray.map(element => '"'+element+'"')
const refinementfilters =
  `and(fileExtension:or(${extensions}),SileneDocumentType:(${types}))`

/* L'URL construite */
const baseUrl =
  process.env.SHAREPOINT_BASE_URL +
  `/patrimoine/_api/search/query?querytext='${queryText}'&selectproperties='${selectProperties}'&refiners='${refiners}'&refinementfilters='${refinementfilters}'`;

console.log(baseUrl)
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


console.log(extToMimes.hasOwnProperty("pdfsdf"))
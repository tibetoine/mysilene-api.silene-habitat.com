const spauth = require("node-sp-auth");
const rp = require("request-promise");
const fs = require("fs");

const SHAREPOINT_BASE_URL = "http://spsshp04:8081";
const SHAREPOINT_USERNAME = "SPAdmin";
const SHAREPOINT_PASSWORD = "SPAdmin$44";
const SHAREPOINT_DOMAIN = "silene.local";

const sharepointPatrimoineURI = SHAREPOINT_BASE_URL + "/patrimoine";

const sharepointAuth = () =>
  spauth.getAuth(sharepointPatrimoineURI, {
    username: SHAREPOINT_USERNAME,
    password: SHAREPOINT_PASSWORD,
    domain: SHAREPOINT_DOMAIN
  });

test();

async function test() {
  await sharepointAuth().then(async auth => {
    
    rp
      .get({
        ...auth.options,
        headers: { ...auth.headers },
        uri: encodeURI(
          "http://spsshp04:8081/patrimoine/_api/Web/GetFileByServerRelativeUrl('/patrimoine/0023R4  Trbale/Notification DC4 à ATELIER ISAC.pdf')/$value"
        )
      })
      .then((response) => {
        console.log(' response : ', response)
        console.log(' type : ', response.type)
      })
      .catch(error => {
        console.log(error);
      });

    
  });
}

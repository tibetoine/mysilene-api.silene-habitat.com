


var ActiveDirectory = function (url, baseDN, username, password, defaults) {

};

ActiveDirectory.prototype.authenticate = function authenticate(username, password, callback) {
  var err = null;
  var auth = null;
  if (password && password.trim() === 'a') {
    auth = {ok:1}
  }
  callback(err, auth);
};

ActiveDirectory.prototype.findUser = function findUser(username, callback) {
  var err = null;
  var user = null;
  if (username && username.trim() === 'a') {
    user = true
  }
  if (username && username.trim() === 'aa') {
    user = true
  }
  if (username && username.trim() === 'robert') {
    user = true
  }
  callback(err, user);
  
};
module.exports = ActiveDirectory;

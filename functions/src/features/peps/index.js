const materiales = require("./materiales");
const racks = require("./racks");
const stock = require("./stock");

module.exports = {
  ...materiales,
  ...racks,
  ...stock,
};

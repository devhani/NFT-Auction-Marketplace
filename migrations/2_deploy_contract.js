const ArtAuction = artifacts.require("ArtAuction");

module.exports = function(deployer) {
  deployer.deploy(ArtAuction);
};
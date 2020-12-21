const { assert } = require("chai");
const { createChainedFunction } = require("react-bootstrap/lib/utils");

const ArtAuction = artifacts.require("ArtAuction");

contract("ArtAuction", function(accounts) {
  const AccountOne = accounts[0];
	const AccountTwo = accounts[1];
  
  before(async () => {
		contract = await DigitalArt.deployed();
  });
  
  it('should deploy smart contract properly', async()=>{
    const ArtAuction = await ArtAuction.deployed();
    console.log(ArtAuction.address);
    assert(ArtAuction.address!='');
  });

	it('It shoudl set an art item', async()=>{
    let error = null;
    try{
    const ArtAuction = await ArtAuction.deployed();
    await ArtAuction.addArtItem(100, "ipfshash", 10);
    }
    catch(error)
    {error=error;}
    assert.isNull(error);
  });

  it('It shoudl get art item', async()=>{
  // Arrange
  let err = null;
  let response = null;

  // Act
  try {
    response = await contract.getArtItem(tArtItemIdOne);
  } catch (error) {
    err = error;
  }

  // Assert
  assert.isNull(err);
});

it("should not add art item with price of zero", async () => {
  // Arrange
  let err = null;

  // Act
  try {
    await contract.addArtItem(0, tTokenURI, 10, { from: AccountTwo });
  } catch (error) {
    err = error;
  }

  // Assert
  assert.isNotNull(err);
});

it("shoudl not cancel an auction that does not exists",async() =>{
  let err=null;

  try{
    await contract.cancelAuction(100, {from: AccountOne});
  }
  catch(error)
  {
    err=error;
  }
  assert.isNotNull(err);
});
});

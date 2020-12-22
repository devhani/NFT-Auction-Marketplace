1.Widhrawl Pattern:
There is a seperate function to widhraw funds which let each user to widhraw their funds. It has two checks:
require(canceled==true);  //require that auction has been stopped
and
require(auctionstarted==true); // require that someone had bid for the auction

This lets user widhraw only after the auction is stopped. Funds of all the users are put in a mapping of their addresses and their funds.

2.State Machine
addArtItem(....) is avaialble only after file has been uploaded to IPFS and the frontend state of React has the hash stored in. Only then can the hash be passed on to the contract call.
Some functions like getArtItem(uint id) are only availaible after the first token has been minted. It requires tokenID. 

All the functions are relate to auction depend on the state. cancelAuction() can only be called if the auction has been started and same with widhraw() function. 


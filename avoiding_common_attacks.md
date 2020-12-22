Attacks avoided:

1.Reentrancy Attack
Users fund are added to a mapping of their deposits and address. The widhrawl function can only be called when the auction is cancelled. Each user calls widhrawl function to widhraw their own funds. send() call is the last step taken after all the internal processing and subtraction of balances has been done.

2.DDOS
Distributed Denial of Service Attack is prevented by keeping the funds of users in the mapping until the end. Instead of a fallback function that reverts if the amount is less than the maximum bid amount, we keep all the balances in the mapping. Even if the highest bidder send amount higher than his already highest bid, the amount is kept and is used as per incremental value set. 

Attacks that can be done:
If the owner of NFT Art never cancels the auction, the funds are stuck. A time limit to auction is further needed. 

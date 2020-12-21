# Promise Passthrough

See this short [article](https://medium.com/@gabrielctroia/side-effects-in-js-promise-chains-7db50b6302f3) to learn about what promise-passthrough attempts to solve.

## Install

`npm install promise-passthrough --save`

## Dependencies

- javascript es6
- or a globally available Promise (maybe this [polyfill](https://www.npmjs.com/package/promise-polyfill))

## Usage

```
import { passThrough } from 'promise-passthrough';

const cacheData = (response) => {
  cacheStore.put('user', response);

  return undefined;
}
const parseUserResponse = (response) => {
  return response.data.user;
}
const updateLocalDatabase = (user) => {
  localDB.update('user', user);

  return undefined;
}
const refreshUserCreditCards = (user) => {
  wallet.update('credits', user.credits)

  return undefined;
}

httpClient.get('https://facebook.com/user/' + id)
  .then(passThrough(cacheData))
  .then(responseToUser)
  .then(passThroughAwait(updateLocalDatabase))
  .then(passThrough(refreshUserCredits))
  .then((user) => {
    // Even though 'updateLocalDatabase' and 'refreshUserCredits'
    // both return undefined, by wrapping them in the 
    // passThrough/passThroughAwait functions, the user object is 
    // ensured to be returned and fed into the next line 
    // of the Promise chain.

    console.log(`Hello ${user.name}`);
  });
```

## Licence 

MIT © [Gabriel C. Troia](https://github.com/GabrielCTroia)

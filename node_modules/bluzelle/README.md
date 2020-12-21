[![Build Status](https://travis-ci.org/bluzelle/blzjs.svg?branch=devel)](https://travis-ci.org/bluzelle/blzjs) [![Coverage Status](https://coveralls.io/repos/github/bluzelle/blzjs/badge.svg)](https://coveralls.io/github/bluzelle/blzjs)
<a href="https://bluzelle.com/"><img src='https://raw.githubusercontent.com/bluzelle/api/master/source/images/Bluzelle%20-%20Logo%20-%20Big%20-%20Colour.png' alt="Bluzelle" style="width: 100%"/></a>

**blzjs** is a JavaScript library that can be used to access the Bluzelle database service.


# blzjs 2.0 Installation


```
yarn add bluzelle
or
npm install bluzelle
```

There are two versions of the bluzelle
library.  `bluzelle-node.js` and `bluzelle-js.js`.  
By default the NodeJS version will be used. 

#### To use the NodeJS version
```
import { bluzelle } from 'bluzelle';
or
const { bluzelle } = require('bluzelle');
```

#### To use the pure JS version
```
import { bluzelle } from 'bluzelle/lib/bluzelle-js';
or
const { bluzelle } = require('bluzelle/lib/bluzelle-js');
```
#### To load additional Typescript definitions
```typescript
import {bluzelle, API, BluzelleConfig} from 'bluzelle'
```

# Getting Started

The *examples* directory contains various examples for pure NodeJS express and single-page applications.

To start a connection simply call *bluzelle* with your configuration.
```
const bz = bluzelle({
        mnemonic: swarm_mnemonic,
        endpoint: swarm_endpoint,
        chain_id: swarm_chain_id
        uuid:     my_uuid,
    });

```



# Major changes from BluzelleJS 1.x

## Transactions

The major new feature in 2.0 is the ability to use transactions.  All functions that start with 'tx' can be bundled into transactions using the new withTransaction() wrapper.  See withTransaction() below.  This will allow you to write code that can provide a significant performance improvement over the 1.x library.

Transactions are also transactional, meaning that if a function fails in a transaction, they all fail.  This can help with reference integrity in your applications.

## Return types from 'tx' functions

All 'tx' functions now return an object that includes the txhash and block height of the transaction as well as the value instead of either a value or undefined.  The documentation below has been updated to reflect the return values.



# blzjs API documentation

![#1589F0](https://placehold.it/15/1589F0/000000?text=+) Keys and values in the Bluzelle database are plain strings. To store an object serialize your objects to a string using JSON or some other serializer.

![#1589F0](https://placehold.it/15/1589F0/000000?text=+) Some API functions take *gas_info* as a parameter. This is a object literal containing parameters related to gas consumption as follows:

```javascript
{
    gas_price: 10,  // maximum price to pay for gas (integer, in ubnt)
    max_gas: 20000, // maximum amount of gas to consume for this call (integer)
    max_fee: 20000  // maximum amount to charge for this call (integer, in ubnt)
};
```

All values are optional. The `max_gas` value will always be honored if present, otherwise a default value will be used. If both `max_fee` and `gas_price` are specified, `gas_price` will be ignored and calculated based on the provided `max_fee`.

![#1589F0](https://placehold.it/15/1589F0/000000?text=+) Some API functions take ***lease_info*** as a parameter. This is a JavaScript object containing parameters related to the minimum time a key should be maintained in the database, as follows:


    {
    	'days':    0, // number of days (integer)
    	'hours':   0, // number of hours (integer)
    	'minutes': 0  // number of minutes (integer)
    	'seconds': 0  // number of seconds (integer)
    };	
values are optional. If none are provided a default value of 10 days will be used.


![#1589F0](https://placehold.it/15/1589F0/000000?text=+) The example code in the `examples` directory require Node.js in order to run. For instructions on how to install Node.js for your platform, please see http://nodejs.org

## Exports

### bluzelle\({...}\)

Configures the Bluzelle connection

#### Plain Javascript

```javascript
const {bluzelle} = require('bluzelle');

const api = bluzelle({
    mnemonic: 'volcano arrest ceiling physical concert sunset absent hungry tobacco canal census era pretty car code crunch inside behind afraid express giraffe reflect stadium luxury',
    endpoint: "http://localhost:1317",
    uuid:     "20fc19d4-7c9d-4b5c-9578-8cedd756e0ea",
    chain_id: "bluzelle"
});
```

#### Typescript

```typescript
import {bluzelle, API} from 'bluzelle';


const api: API = bluzelle({
    mnemonic: 'volcano arrest ceiling physical concert sunset absent hungry tobacco canal census era pretty car code crunch inside behind afraid express giraffe reflect stadium luxury',
    endpoint: "http://localhost:1317",
    uuid:     "20fc19d4-7c9d-4b5c-9578-8cedd756e0ea",
    chain_id: "bluzelle"
});
```


| Argument | Description |
| :--- | :--- |
| **mnemonic** | The mnemonic of the private key for your Bluzelle account |
| endpoint | \(Optional\) The hostname and port of your rest server. Default: http://localhost:1317 |
| uuid | Bluzelle uses `UUID`'s to identify distinct databases on a single swarm. We recommend using [Version 4 of the universally unique identifier](https://en.wikipedia.org/wiki/Universally_unique_identifier#Version_4_%28random%29).  |
| chain_id | The chain id of your Bluzelle account. |


## General Functions

### account\()

Retrieve information about the currently active Bluzelle account.

```javascript
// promise syntax
api.account()
	.then((info) => { ... })
	.catch((error) => { ... });

// async/await syntax
const info = await api.account();
```

Returns: Promise=>object

```javascript
{
    address: 'bluzelle1lgpau85z0hueyz6rraqqnskzmcz4zuzkfeqls7',
	coins: [ { denom: 'bnt', amount: '9899567400' } ],
  	public_key: 'bluzellepub1addwnpepqd63w08dcrleyukxs4kq0n7ngalgyjdnu7jpf5khjmpykskyph2vypv6wms',
  	account_number: 3,
  	sequence: 218 
}
```



### getBNT({bunt: boolean})

Retrieve the amount of BNT/UBNT in an account

```typescript
// promise syntax
api.getBNT()
    .then(bntAmt => .....);

api.getBNT({ubnt: true})
	.then(ubntAmt => ....)

// async/await syntax
const bnt = api.getBnt();
```

Returns: Promise => number (amount of BNT rounded to 2 decimal places or UBNT)



### version\()

Retrieve the version of the Bluzelle service.

```javascript
// promise syntax
api.version()
    .then((version) => { ... })
    .catch(error => { ... });

// async/await syntax
const version = await api.version();

```

Returns: Promise=>string



## Database Functions

**NOTE: When a function has a 'tx' and non-'tx' version, the 'tx' version uses consensus.**

### count\(\)

Retrieve the number of keys in the current database/uuid. This function bypasses the consensus and cryptography mechanisms in favor of speed.

```javascript
// promise syntax
api.count()
	.then(number => { ... })
	.catch(error => { ... });

// async/await syntax
const number = await api.count();
```

Returns: Promise=>number



### create\(key, value, gas_info [, lease_info]\)

Create a field in the database.

```javascript
// promise syntax
api.create('mykey', 'myValue', {gas_price: 10}, {days: 100})
	.then((result) => { ... })
	.catch(error => { ... });

// async/await syntax
await api.create('mykey', 'myValue', {gas_price: 10}, {days: 100});
```

| Argument | Description |
| :--- | :--- |
| key | The name of the key to create |
| value | The string value |
| gas_info | Object containing gas parameters (see above) |
| lease_info (optional) | Minimum time for key to remain in database (see above) |

Returns: Promise=>`{txhash: string, height: number}`



### delete\(key, gas_info\)

Delete a key from the database.

```javascript
// promise syntax
api.delete('mykey', {gas_price: 10})
	.then(() => { ... })
	.catch(error => { ... });

// async/await syntax
await bluzelle.delete('mykey', {gas_price: 10});
```

| Argument | Description                                  |
| :------- | :------------------------------------------- |
| key      | The name of the key to delete                |
| gas_info | Object containing gas parameters (see above) |

Returns: Promise=>`{txhash: string, height: number}`



### deleteAll\(gas_info\)

Remove all keys in the current database/uuid.

```javascript
// promise syntax
api.deleteAll({gas_price: 10})
	.then(() => { ... })
	.catch(error => { ... });

// async/await syntax
await api.deleteAll({gas_price: 10});
```

| Argument | Description                                  |
| :------- | :------------------------------------------- |
| gas_info | Object containing gas parameters (see above) |

Returns: Promise=> `{txhash: string, height: number}`



### getAddress()

Returns the Bech32 address for a Bluzelle account.

```typescript
const bech32 = api.getAddress()
```

Returns: string (bech32 address)



### getLease(key\)

Retrieve the minimum time remaining on the lease for a key. This function bypasses the consensus and cryptography mechanisms in favor of speed.

```javascript
// promise syntax
api.getLease('mykey')
	.then(value => { ... })
	.catch(error => { ... });

// async/await syntax
const value = await api.getLease('mykey');
```

| Argument | Description                                   |
| :------- | :-------------------------------------------- |
| key      | The key to retrieve the lease information for |

Returns: Promise=>number (the minimum length of time remaining for the key's lease, in seconds)



### getNShortestLeases\(n\)

Retrieve a list of the n keys in the database with the shortest leases.  This function bypasses the consensus and cryptography mechanisms in favor of speed.

```javascript
// promise syntax
api.getNShortestLeases(10)
	.then(keys => { ... })
	.catch(error => { ... });

// async/await syntax
const keys = await api.getNShortestLeases(10);
```

| Argument | Description                                              |
| :------- | :------------------------------------------------------- |
| n        | The number of keys to retrieve the lease information for |

Returns: Promise=>object (containing key, lease (in seconds))
```
[ { key: "mykey", lease: 1234 }, {...}, ...]
```


### has\(key\)

Query to see if a key is in the database. This function bypasses the consensus and cryptography mechanisms in favor of speed.


```javascript
// promise syntax
api.has('mykey')
	.then(hasMyKey => { ... })
	.catch(error => { ... });

// async/await syntax
const hasMyKey = await api.has('mykey');
```

| Argument | Description                  |
| :------- | :--------------------------- |
| key      | The name of the key to query |

Returns: Promise=>boolean



### keys\(\)

Retrieve a list of all keys. This function bypasses the consensus and cryptography mechanisms in favor of speed.

```javascript
// promise syntax
api.keys()
	.then(keys => { ... }
	.catch(error => { ... });

// async/await syntax
const keys = await api.keys();
```

Returns: Promise=>array (array of keys)



### keyValues\(\)

Returns all keys and values in the current database/uuid. This function bypasses the consensus and cryptography mechanisms in favor of speed.

```javascript
// promise syntax
api.keyValues()
	.then(kvs => { ... })
	.catch(error => { ... });

// async/await syntax
const kvs = await api.keyValues();
```

Returns: Promise=>object

```
[{"key": "key1", "value": "value1"}, {"key": "key2", "value": "value2"}]
```



### multiUpdate\(key_values, gas_info\)

Update multiple fields in the database.

```javascript
// promise syntax
api.multiUpdate([{key: "key1", value: "value1"}, {key: "key2", value: "value2"}], {gas_price: 10})
	.then(() => { ... })
	.catch(error => { ... });

// async/await syntax
await api.multiUpdate([{key: "key1", value: "value1"}, {key: "key2", value: "value2"}, {gas_price: 10}');
```

| Argument   | Description                                                  |
| :--------- | :----------------------------------------------------------- |
| key_values | An array of objects containing keys and values (see example avove) |
| gas_info   | Object containing gas parameters (see above)                 |

Returns: Promise=> `{txhash: string, height: number}`

### owner\(key\)

Retrieve the owner of a key without consensus verification. 

```javascript
// promise syntax
api.owner('mykey')
	.then(value => { ... })
	.catch(error => { ... });

// async/await syntax
const value = await api.owner('mykey');
```

| Argument | Description |
| :--- | :--- |
| key | The key to retrieve the owner for |

Returns: Promise=>string (the owner address)

### read\(key, [prove]\)

Retrieve the value of a key without consensus verification. Can optionally require the result to have a cryptographic proof (slower).

```javascript
// promise syntax
api.read('mykey')
	.then(value => { ... })
	.catch(error => { ... });

// async/await syntax
const value = await api.read('mykey');
```

| Argument | Description |
| :--- | :--- |
| key | The key to retrieve |
| prove | A proof of the value is required from the network (requires 'config trust-node false' to be set) |

Returns: Promise=>string (the value)



### rename\(key, new_key, gas_info\)

Change the name of an existing key.

```javascript
// promise syntax
api.rename("key", "newkey", {gas_price: 10})
	.then(() => { ... })
	.catch(error => { ... });

// async/await syntax
await api.rename("key", "newkey", {gas_price: 10});
```

| Argument | Description                                  |
| :------- | :------------------------------------------- |
| key      | The name of the key to rename                |
| new_key  | The new name for the key                     |
| gas_info | Object containing gas parameters (see above) |

Returns: Promise=>`{txhash: string, height: number}`



### renewLease\(key, gas_info[, lease_info]\)

Update the minimum time remaining on the lease for a key.

```javascript
// promise syntax
api.renewLease('mykey', {gas_price: 10}, {days: 100})
	.then(value => { ... })
	.catch(error => { ... });

// async/await syntax
const value = await api.renewLease('mykey', {gas_price: 10}, {days: 100});
```

| Argument              | Description                                            |
| :-------------------- | :----------------------------------------------------- |
| key                   | The key to retrieve the lease information for          |
| gas_info              | Object containing gas parameters (see above)           |
| lease_info (optional) | Minimum time for key to remain in database (see above) |

Returns: Promise=> `{txhash: string, height: number}`



### renewLeaseAll\(gas_info[, lease_info]\)

Update the minimum time remaining on the lease for all keys.

```javascript
// promise syntax
api.renewLease('mykey', {gas_price: 10}, {days: 100})
.then(value => { ... })
.catch(error => { ... });

// async/await syntax
const value = await api.renewLease('mykey', {gas_price: 10}, {days: 100});
```

| Argument              | Description                                            |
| :-------------------- | :----------------------------------------------------- |
| gas_info              | Object containing gas parameters (see above)           |
| lease_info (optional) | Minimum time for key to remain in database (see above) |

Returns: Promise=> `{txhash: string, height: number}`

### search(\)

Returns all keys and values in the current database/uuid that match a provided prefix. This function bypasses the consensus and cryptography mechanisms in favor of speed.

```javascript
// promise syntax
api.search('my-prefix', {reverse: false, page: 1, limit: 10})
	.then(kvs => { ... })
	.catch(error => { ... });

// async/await syntax
const kvs = await api.search('my-prefix');
```

##### options

| Option  | Description                      |
| ------- | -------------------------------- |
| reverse | Show results in descending order |
| page    | Page number to display           |
| limit   | Number of items per page         |

Returns: Promise=>object

```
[{"key": "my-prefix.key1", "value": "value1"}, {"key": "my-prefix.key2", "value": "value2"}]
```



### transferTokensTo(address, amount, gas_info)

Transfer tokens to another user

| Argument | Description                                      |
| -------- | ------------------------------------------------ |
| address  | The address of the recipient                     |
| amount   | The amount in BNT                                |
| gas_info | Object containing the gas parameters (see above) |

```typescript
transferTokensTo('bluzellexxxxx', 10, {gas_price: 10})
```



### txCount\(gas_info\)

Retrieve the number of keys in the current database/uuid via a transaction.

```javascript
// promise syntax
api.txCount({gas_price: 10})
	.then(number => { ... })
	.catch(error => { ... });

// async/await syntax
const number = await api.txCount({gas_price: 10});
```

| Argument | Description                                  |
| :------- | :------------------------------------------- |
| gas_info | Object containing gas parameters (see above) |

Returns: Promise=> `{txhash: string, height: number, count: number}`



### txGetLease\(key, gas_info\)

Retrieve the minimum time remaining on the lease for a key, using a transaction.

```javascript
// promise syntax
api.txGetLease('mykey', {gas_price: 10})
	.then(value => { ... })
	.catch(error => { ... });

// async/await syntax
const value = await api.txGetLease('mykey', {gas_price: 10});
```

| Argument | Description                                   |
| :------- | :-------------------------------------------- |
| key      | The key to retrieve the lease information for |
| gas_info | Object containing gas parameters (see above)  |

Returns: Promise=> `{txhash: string, height: number, lease: number}`



### txHas\(key, gas_info\)

Query to see if a key is in the database via a transaction (i.e. uses consensus).

```javascript
// promise syntax
api.txHas('mykey', {gas_price: 10})
	.then(hasMyKey => { ... })
	.catch(error => { ... });

// async/await syntax
const hasMyKey = await api.txHas('mykey', {gas_price: 10});
```

| Argument | Description                                  |
| :------- | :------------------------------------------- |
| key      | The name of the key to query                 |
| gas_info | Object containing gas parameters (see above) |

Returns: Promise=>`{txhash: string, height: number, has: boolean}`



### txKeys\(gas_info\)

Retrieve a list of all keys via a transaction (i.e. uses consensus).

```javascript
// promise syntax
api.txKeys({gas_price: 10})
	.then(keys => { ... })
	.catch(error => { ... });

// async/await syntax
const keys = await api.txKeys({gas_price: 10});
```

| Argument | Description                                  |
| :------- | :------------------------------------------- |
| gas_info | Object containing gas parameters (see above) |

Returns: Promise=>`{txhash: string, height: number, keys: string[]}`



### txKeyValues\(gas_info\)

Returns all keys and values in the current database/uuid via a transaction.

```javascript
// promise syntax
api.txKeyValues({gas_price: 10})
	.then(kvs => { ... })
	.catch(error => { ... });

// async/await syntax
const kvs = await api.txKeyValues({gas_price: 10});
```

| Argument | Description                                  |
| :------- | :------------------------------------------- |
| gas_info | Object containing gas parameters (see above) |

Returns: Promise=> `{txhash: string, height: number, keyvalues: [{key: string, value: string}]}`



### txRead\(key, gas_info\)

Retrieve the value of a key with consensus.

```javascript
// promise syntax
api.txRead('mykey', {gas_price: 10})
	.then(obj => { ... })
	.catch(error => { ... });

// async/await syntax
const value = await api.txRead('mykey', {gas_price: 10});
```

| Argument | Description |
| :--- | :--- |
| key | The key to retrieve |
| gas_info | Object containing gas parameters (see above) |

Returns: Promise=>`{txhash: string, height: number, value: string}`



### update\(key, value, gas_info [, lease_info]\)

Update a field in the database.

```javascript
// promise syntax
api.update('myKey', 'myValue', {gas_price: 10}, {days: 100})
	.then(() => { ... })
	.catch(error => { ... });

// async/await syntax
await api.update('myKey', 'myValue', {gas_price: 10}, {days: 100});
```

| Argument | Description |
| :--- | :--- |
| key | The name of the key to create |
| value | The string value to set the key |
| gas_info | Object containing gas parameters (see above) |
| lease_info (optional) | Positive or negative amount of time to alter the lease by. If not specified, the existing lease will not be changed. |

Returns: Promise=>`{txhash: string, height: number}`



### upsert(key, value, gas_info [, lease_info]\)

Create or update a field in the database.

```javascript
// promise syntax
api.upsert('myKey', 'myValue', {gas_price: 10}, {days: 100})
	.then(() => { ... })
	.catch(error => { ... });

// async/await syntax
await api.upsert('myKey', 'myValue', {gas_price: 10}, {days: 100});
```

| Argument              | Description                                                  |
| :-------------------- | :----------------------------------------------------------- |
| key                   | The name of the key to create                                |
| value                 | The string value to set the key                              |
| gas_info              | Object containing gas parameters (see above)                 |
| lease_info (optional) | Positive or negative amount of time to alter the lease by. If not specified, the existing lease will not be changed. |

Returns: Promise=>`{txhash: string, height: number}`



### withTransaction(fn)

Execute commands inside of a transaction. 

```typescript
api.withTransaction(() => {
    api.create('foo', 'bar', {gas_price: 10});
    api.create('foo2', 'bar', {gas_price: 10});
    api.txRead('foo', {gas_price: 10}).then(printIt)
})
```

The above code will execute the two creates and the read in a single transaction.  If any of the commands fail, then they all will fail.  

withTransaction() returns whatever the function inside of it returns, so if you need to return a promise for items inside of the transaction, simply wrap them in Promise.all

```typescript
api.withTransaction(() => Promise.all([
    	api.create('foo', 'bar', {gas_price: 10}),
    	api.create('foo2', 'bar', {gas_price: 10}),
    	api.txRead('foo', {gas_price: 10}).then(printIt)
    ])
}).then(doSomething)
```















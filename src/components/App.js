import React, { Component } from 'react';
import logo from '../logo.png';
import ethlogo from '../Ethereum.png';
import Web3 from 'web3';
import './App.css';
import ArtAuction from '../abis/ArtAuction.json'


const ipfsClient = require('ipfs-http-client')
const ipfs = ipfsClient({ host: 'ipfs.infura.io', port: 5001, protocol: 'https' }) // Infura IPFS API

class App extends Component {

  //Metamask componenet appears on screen
  async componentWillMount() {
    await this.loadWeb3()
    await this.loadBlockchainData()
  }
   
  //Window.ethereum updated
  async loadWeb3() {
    if (window.ethereum) //Detect metamask
    {
      window.web3 = new Web3(window.ethereum) //If ussing window.ethereum
      await window.ethereum.enable()
    }
    else if (window.web3) {   //Else if using older version
      window.web3 = new Web3(window.web3.currentProvider)
    }
    else {  //No Metamask
      window.alert('No Metamask!')
    }
  }

  async loadBlockchainData() {
    const web3 = window.web3  //To be replaced!
    
    var accounts = await web3.eth.getAccounts()
    console.log("account  ",  accounts)
    this.setState({  account: accounts[0] })
    console.log("Account set", this.state.account)
    var networkId = await web3.eth.net.getId()
    var networkData = ArtAuction.networks[networkId]
    if(networkData) {
      var contract = new web3.eth.Contract(ArtAuction.abi, networkData.address)
      this.setState({ contract })
      const totalSupply = await contract.methods.totalSupply().call()
      this.setState({ totalSupply })

      //load hashes
    } else {
      window.alert('Smart contract not deployed to detected network.')
    }
  }

  constructor(props) {
    super(props)
     
    this.state = {
      ipfsHash: '',  //Final Hash 
      contract: null,
      web3: null,
      buffer: null,  //DAta to be sent to IPFS
      account: null,
      price: null,
      totalSupply: 0,
      arthash: []
    }
    this.handleSubmit = this.handleSubmit.bind(this);
  }  
  
  //Capture the File
  captureFile = (event) => {
    event.preventDefault()   //Prevent default behaviour like opening new tab
    var file = event.target.files[0]  //{0:File 1:Length}
    var reader = new window.FileReader()  //Convert to a buffer
    reader.readAsArrayBuffer(file)  //Pass file
    //Fired after reading operation is completed
    reader.onloadend = () => {  
      this.setState({ buffer: Buffer(reader.result) }) //Data to send to IPFS
      console.log('buffer', this.state.buffer)
      
    }
  }

  //Submitting file to IPFS
  onSubmit = (event) => {
    event.preventDefault()  //Preventing default behaviour
    console.log("Submitting file to ipfs")
    
    ipfs.add(this.state.buffer, (error, result) => {  //add file to ipfs. 2 args in callback fn
      console.log('Ipfs result', result)
      const ipfsHash = result[0].hash //Saving hash
      this.setState({ipfsHash: ipfsHash})
      if(error) {
        console.error(error)
        return
      }     
      
      })
   }

   getImage = (event) =>{
     event.preventDefault()
   
   }
   Bid = (event) =>{
    event.preventDefault()
    
  }

   handleSubmit(event) {
    event.preventDefault();

  }

  render() {
    return (
      <div>
        <nav className="navbar navbar-dark fixed-top bg-dark flex-md-nowrap p-0 shadow">
          <a
            className="navbar-brand col-sm-3 col-md-2 mr-0"
            href={"https://ipfs.infura.io/ipfs/" + this.state.ipfsHash}
            target="_blank"
            rel="noopener noreferrer"
          >
            Document IPFS CID is --> {this.state.ipfsHash}
          </a>
          <ul className="navbar-nav px-3">
            <li className="nav-item text-nowrap d-none d-sm-none d-sm-block">
             <small className="text-white">Connected account --> {this.state.account}</small>
            </li>
          </ul>
        </nav>
        <div className="container-fluid mt-5">
          <div className="row">
            <main role="main" className="col-lg-12 d-flex text-center">
              <div className="content mr-auto ml-auto">
                <a
                  href="https://in.linkedin.com/in/sachinmatta"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img src={logo} className="App-logo" alt="logo" />
                </a>
                <h2>Add document, price and increment value</h2>
                <form onSubmit={this.onSubmit} >
                  <input type='file' onChange={this.captureFile} />
                  <input type='submit' />
                  </form>
                <form onSubmit={(event) => {
                  event.preventDefault()
                  var price = document.getElementById("p").value 
                  var limit = document.getElementById("i").value 
                 this.state.contract.methods.addArtItem(price, this.state.ipfsHash, limit).send({ from: this.state.account })
                 
                }}>
                  <label>
                  Price:
                  <input id="p" type="number" name="price" />
                  </label>
                  <label>
                    Increment
                  <input id="i" type="number" name="limit" />
                  </label>
                  <input type='submit' />
                </form>  

                <label>
                  Token ID
                  <input id="t" type="number" name="price" />
                  </label> 
                 <button onClick={async(event) => {
                   var tid = document.getElementById("t").value 
                  event.preventDefault()
                 var x = await this.state.contract.methods.getArtItem(tid).call({ from: this.state.account })  
                 console.log(x)
                 
                }}
                >Show ERC721 that was minted</button>     
              </div>
            </main>
          </div>
        </div>
        <div className="container-fluid mt-5">
          <div className="row">
            <main role="main" className="col-lg-12 d-flex text-center">
              <div className="content mr-auto ml-auto">
                <a
                  href="https://in.linkedin.com/in/sachinmatta"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img src={ethlogo} className="App-logo" alt="logo" />
                </a>   
              </div>
            </main>
          </div>
        </div>
      </div>
    );
  }
}

export default App;

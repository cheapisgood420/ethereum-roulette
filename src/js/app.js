/* variables */
const BET_AMOUNT =  1000000000000000000; /* 0,01 ether, around $6 */
const GAS = 700000;
const GAS_PRICE = 2000000000;
const bets = [];
let contract;
let lastPosition = 0;
let wheelSpinCounter = 0;
let firstBetAfterSpin = true;
let web3Provider = null;
let lastBlockEvent = 0;

const betTypes = [
  'color', 'column', 'dozen',
  'eighteen', 'modulus', 'number'
];

function showWarning(msg) {
  var p = document.getElementById('warning');
  p.innerHTML = msg;
  p.style.display = 'block';
}

function init() {
  // return initWeb3();
}


function connectWeb3() {
initWeb3();
}

async function initWeb3() {

  console.log("init web3");

  // Is there an injected web3 instance?
  if (window.ethereum) {
    console.log("Meta detected");
    web3Provider = window.ethereum;
    ethereum.enable();

    // web3.eth.defaultAccount = web3.eth.accounts[0];

  } else {
    showWarning('You need <a href="https://metamask.io/">Metamask</a> installed and connected to the cheapEth network');
    // If no injected web3 instance is detected, fall back to Ganache
    // web3Provider = new Web3.providers.HttpProvider('http://localhost:7545');
    // return
  }
  const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
  const account = accounts[0];

  web3 = new Web3(web3Provider);

  // var balance = web3.eth.getBalance(account);

  web3.eth.getBalance(account, function (error, result) {
        if (!error) {
          console.log(account + ': ' + result);
        };
      });

  web3.eth.defaultAccount = account;

  var connected = await web3.eth.net.isListening();
  
  if (connected) return initContract();
  showWarning('You need <a href="https://metamask.io/">Metamask</a> installed and connected to the ropsten network');
}

async function initContract() {
  var networkID = await web3.eth.net.getId(); 
  // get abi and deployed address
  $.getJSON('Roulette.json', (data) => {

    

    if (networkID == 777) {
      showWarning("Connected to cheapEth network");
      address = '0x25D6870242D141629b8ee1d5d757920Fd31Cb913';
    } else {
      showWarning("Connected to cheapEth network");
      return;
    }

    const abi = data.abi;

      contract = new web3.eth.Contract(abi, address);

      updateUI();
      return initEventListeners();
    })
}

function initEventListeners() {
  /* listening for events from the smart contract */
  const event = contract.events.RandomNumber({}, (err, res) => {

    if (res.blockNumber > lastBlockEvent) {               /* prevent duplicated events */
      /* 'random' number generated by the smart contract */
      // const oneRandomNumber = res.args.number.toNumber();
      const oneRandomNumber = Number(res.returnValues.number);
      /* increment spin counter */
      wheelSpinCounter += 1;
      /* get wheel element */
      var wheel = document.getElementById("wheel");
      /* reset wheel */
      wheel.style.transform = "rotate(" + lastPosition + "deg)";
      /* numbers in the wheel, ordered clockwise */
      var numbers = [
        0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27,
        13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1,
        20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
      ];
      /* calculate how much do we need to rotate to have the random number chosen */
      var numberDegree = numbers.indexOf(oneRandomNumber) * 360 / numbers.length;
      /* add some rounds before to look like it's spinning */
      var numRoundsBefore = 3 * wheelSpinCounter;
      /* calculate total degrees we need to rotate */
      var totalDegrees = (numRoundsBefore * 360) + numberDegree;
      /* rotate the wheel */
      document.getElementById("wheel").style.transform = "rotate(-" + totalDegrees + "deg)";
      /* save position to be able to reset the wheel next time */
      lastPosition = numberDegree;
      /* show status on bets after wheel stops */
      setTimeout(function() {
        showBetsStatus(oneRandomNumber);
      }, 2000);
      lastBlockEvent = res.blockNumber;
    }
  });
}

function showError(msg, err) {
  console.log(err);
  const p = document.getElementById('errorPanel');
  p.innerText = msg;
  setTimeout(function() {
    p.innerHTML = '&nbsp;';
  }, 4000);
}

function hideBets() {
  var div = document.getElementById('betsList');
  while (div.firstChild) {
    div.removeChild(div.firstChild);
  }
}

function cleanBets() {
  bets.length = 0;
  hideBets();
}

async function placeBet() {
  let area = this.id;
  let bet = {};
  if (/^c\_\d/.test(area)) bet = {type: 0, value: parseInt(area.substr(2))};
  if (/^p\_\d/.test(area)) bet = {type: 1, value: parseInt(area.substr(2))};
  if (/^d\_\d/.test(area)) bet = {type: 2, value: parseInt(area.substr(2))};
  if (/^e\_\d/.test(area)) bet = {type: 3, value: parseInt(area.substr(2))};
  if (/^m\_\d/.test(area)) bet = {type: 4, value: parseInt(area.substr(2))};
  if (/^n\d\d/.test(area)) bet = {type: 5, value: parseInt(area.substr(1))};
  if (bet.hasOwnProperty('type') && bet.hasOwnProperty('value')) {
    const options = {from: web3.eth.defaultAccount, value:BET_AMOUNT, gas:GAS, gasPrice:GAS_PRICE};
    contract.methods.bet(bet.value, bet.type).send(options, (err, res) => {
      if (err) return void showError('not enough money in the bank', err);
      pushBet(bet);
    });
  }
}

function pushBet(hash) {
  if (firstBetAfterSpin) cleanBets();
  firstBetAfterSpin = false;
  bets.push(hash);
  printBet(hash);
}

function printBet(hash) {
  const labelForNum = {
    color: {
      0: 'black',
      1: 'red'
    },
    column: {
      0: 'left',
      1: 'middle',
      2: 'right'
    },
    dozen: {
      0: '1st',
      1: '2nd',
      2: '3rd'
    },
    eighteen: {
      0: '1-18',
      1: '19-36'
    },
    modulus: {
      0: 'even',
      1: 'odd'
    }
  }
  const type = betTypes[hash.type];
  const value = type === 'number' ? hash.value : labelForNum[type][hash.value];
  const div = document.getElementById('betsList');
  const p = document.createElement('p');
  p.innerText = type + ' ' + value + ' ';
  if (hash.hasOwnProperty('status')) {
    p.innerText += (hash.status ? 'WIN' : 'LOST');
  }
  div.appendChild(p);
}

function showBetsStatus(num) {
  hideBets();
  bets.map(function(bet) {
    if (num === 0) {
      bet.status = (bet.type === 5 && bet.value === 0);            // bet on 0
    } else {
      if (bet.type === 5) {                                        // bet on number
        bet.status = (bet.value === num);
      }
      if (bet.type === 4) {                                        // bet on modulus
        if (bet.value === 0) bet.status = (num % 2 === 0);
        if (bet.value === 1) bet.status = (num % 2 === 1);
      }
      if (bet.type === 3) {                                        // bet on eighteen
        if (bet.value === 0) bet.status = (num <= 18);
        if (bet.value === 1) bet.status = (num >= 19);
      }
      if (bet.type === 2) {                                        // bet on dozen
        if (bet.value === 0) bet.status = (num <= 12);
        if (bet.value === 1) bet.status = (num >= 13 && num <= 24);
        if (bet.value === 2) bet.status = (num >= 25);
      }
      if (bet.type === 1) {                                        // bet on column
        if (bet.value === 0) bet.status = (num % 3 === 1);
        if (bet.value === 1) bet.status = (num % 3 === 2);
        if (bet.value === 2) bet.status = (num % 3 === 0);
      }
      if (bet.type === 0) {                                        // bet on color
        if (num <= 10 || (num >= 20 && num <= 28)) {
          if (bet.value === 0) bet.status = (num % 2 === 0)
          if (bet.value === 1) bet.status = (num % 2 === 1)
        } else {
          if (bet.value === 0) bet.status = (num % 2 === 1)
          if (bet.value === 1) bet.status = (num % 2 === 0)
        }
      }
    }
    printBet(bet);
  })
}

function spinWheel() {

  contract.methods.spinWheel().send({from: web3.eth.defaultAccount, value:0, gas:GAS, gasPrice:GAS_PRICE}, (function (err, res)  {
    if (err) return void showError('to soon to play?', err);
    firstBetAfterSpin = true;
  }));

  // contract.methods.spinWheel({value:0, gas:GAS, gasPrice:GAS_PRICE}, (err, res) => {
  //   if (err) return void showError('to soon to play?', err);
  //   firstBetAfterSpin = true;
  // });
}

function cashOut() {
  contract.methods.cashOut().send({from: web3.eth.defaultAccount, value:0, gas:GAS, gasPrice:GAS_PRICE}, (err, res) => {
    if (err) return void showError('something went wrong with cashOut', err);
  });
}

function toEther(bigNum) {
  return (bigNum / 1000000000000000000).toFixed(2)
}

function updateHTML(value, elId) {
  const span = document.getElementById(elId);
  span.innerText = value;
}

/* call smart contract to get status and update UI */
function getStatus() {

    // web3.eth.getBalance(account, function (error, result) {
    //     if (!error) {
    //       console.log(account + ': ' + result);
    //     };
    //   });


  contract.methods.getStatus().call(function (err, res)  {

    if (err) return void showError('something went wrong with getStatus', err);

    let aux = res;
    // let aux = res.map(x => x.toNumber());
    updateHTML(aux[0],'betsCount');                             // bets count
    aux[1] = toEther(aux[1]);                                   // bets value
    updateHTML(aux[1],'betsValue');
    const now = Math.round(new Date() / 1000);                  // time until next spin
    aux[2] = aux[2] < now ? 0 : (aux[2] - now);
    updateHTML(aux[2],'timeUntilNextSpin');
    aux[3] = toEther(aux[3]);                                   // roulette balance
    updateHTML(aux[3],'balance');
    aux[4] = toEther(aux[4]);                                   // winnings
    updateHTML(aux[4],'winnings');
    web3.eth.getBalance(web3.eth.defaultAccount, (err, balance) => {  // player balance
      balance = toEther(balance);
      updateHTML(balance, 'yourBalance');
    });

  });
}

/* every second query smart contract for status */
function updateUI() {
  getStatus();

  setInterval(function () {
    getStatus();
  }, 1000);
}

document.addEventListener('DOMContentLoaded', function() {
  /* adds click event to roulette table */
  var areas = document.getElementsByTagName('area');
  for (i=0; i<areas.length; i++) {
    areas[i].onclick = placeBet;
  };
  init();
})

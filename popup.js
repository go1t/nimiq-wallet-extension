/* jshint esversion: 6 */

// Cache all document node pointers
var $address          = document.getElementById('activeWalletAddress'),
    $name             = document.getElementById('activeWalletName'),
    $identicon        = document.getElementById('activeWalletIdenticon'),
    $balance          = document.getElementById('activeWalletBalance'),
    $newTx            = document.getElementById('new-tx'),
    $txsList          = document.getElementById('txs-list'),
    $statusIndicator  = document.getElementById('statusIndicator'),
    $status           = document.getElementById('status'),
    $height           = document.getElementById('height'),
    $loadingScreen    = document.getElementById('loading-screen'),
    $loadingHeight    = document.getElementById('loading-height'),
    $loadingProgress  = document.getElementById('loading-progress-bar'),
    $peers            = document.getElementById('peers'),
    $walletManagement = document.getElementById('wallet-management'),
    $walletImport     = document.getElementById('wallet-import'),
    $walletList       = document.getElementById('wallet-list'),
    $toast            = document.getElementById('toast');

// Cache all input elements
var $buttonCopyAddress        = document.getElementById('buttonActiveWalletCopyAddress'),
    $buttonNewTx              = document.getElementById('buttonNewTx'),
    $buttonCloseNewTx         = document.getElementById('button-close-new-tx'),
    $inputTxReceiver          = document.getElementById('input-tx-receiver'),
    $inputTxValue             = document.getElementById('input-tx-value'),
    $buttonSendTx             = document.getElementById('button-send-tx'),
    $buttonToggleMining       = document.getElementById('buttonToggleMining'),
    $buttonShowMyWallets      = document.getElementById('buttonShowMyWallets'),
    $buttonCloseMyWallets     = document.getElementById('button-close-my-wallets'),
    $buttonShowImportWallets  = document.getElementById('button-show-import-wallets'),
    $buttonCloseImportWallets = document.getElementById('button-close-import-wallets'),
    $inputPrivKey             = document.getElementById('input-privKey'),
    $buttonImportPrivKey      = document.getElementById('button-import-privKey'),
    $buttonImportBetanet      = document.getElementById('button-import-betanet'),
    $buttonNewWallet          = document.getElementById('button-create-new-wallet');

// Helper functions
function formatBalance(value) {
    if(isNaN(value)) return value;

    // If the value has no decimal places below 0.01, display 0 decimals
    if(parseFloat(value.toFixed(2)) === value) {
        return value.toFixed(2);
    }
    // Otherwise, all required decimals will be displayed automatically
    else return value;
}

// Set up initial values
var bgPage = chrome.extension.getBackgroundPage(),
    state  = bgPage.state;

if(state.status !== 'Consensus established' && state.numberOfWallets > 0) $loadingScreen.classList.add('show-instant');
state.restarting = false;

$buttonShowMyWallets.setAttribute('title', 'My Wallets (' + state.numberOfWallets + ')');
$name.innerText            = state.activeWallet.name;
$address.innerText         = state.activeWallet.address;
$balance.innerText         = formatBalance(state.activeWallet.balance);
$status.innerText          = state.status;
$height.innerText          = state.height;
// $targetHeight.innerText    = state.targetHeight;
$peers.innerText           = state.peers;

if(state.numberOfWallets === 0) $walletImport.classList.add('show-instant');

function setStatusIndicator(status) {
    if(status === 'Consensus established') {
        $statusIndicator.classList.add('green');
    }
    else if(status === 'Syncing') {
        $statusIndicator.classList.remove('green');
        $statusIndicator.classList.add('yellow');
    }
    else {
        $statusIndicator.classList.remove('green', 'yellow');
    }
}
setStatusIndicator(state.status);

function createIdenticon(hash) {
    return blockies.create({seed: hash, size: 8, scale: 5});
}
$identicon.replaceChild(createIdenticon(state.activeWallet.address), $identicon.firstChild);

function setMinerStatus(mining) {
    if(mining) {
        $buttonToggleMining.innerHTML = 'Miner <i class="fa fa-gear fa-spin"></i>';
        $buttonToggleMining.classList.add('mining');
    }
    else {
        $buttonToggleMining.innerHTML = 'Miner <i class="fa fa-power-off"></i>';
        $buttonToggleMining.classList.remove('mining');
    }
}
setMinerStatus(state.mining);

function formatHashrate(value) {
    var resultValue = 0;
    var resultUnit = 'H/s';

    if(value < 1000) {
        resultValue = value;
    }
    else {
        let kilo = value / 1000;
        if(kilo < 1000) {
            resultValue = kilo;
            resultUnit = 'kH/s';
        }
        else {
            let mega = kilo / 1000;
            if(mega < 1000) {
                resultValue = mega;
                resultUnit = 'MH/s';
            }
            else {
                resultValue = mega / 1000;
                resultUnit = 'GH/s';
            }
        }
    }

    resultValue = Math.round(resultValue * 100) / 100;
    return resultValue + " " + resultUnit;
}
$buttonToggleMining.setAttribute('data-hashrate', formatHashrate(state.hashrate));

async function updateWalletList() {
    if(state.status !== 'Consensus established') return;

    var wallets = await bgPage.listWallets();

    let walletListItems = document.createDocumentFragment();

    for(let address in wallets) {
        let listItem = document.createElement('div');
        listItem.classList.add('wallet-list-item');

        let active = false;

        if(address === state.activeWallet.address) {
            listItem.classList.add('active');
            active = true;
        }

        listItem.innerHTML = `
            ${active ? `<div class="wallet-identicon" title="Active wallet"></div>` : `<button class="use-wallet wallet-identicon" data-wallet="${address}" title="Use wallet">Use</button>`}&nbsp;

            <span class="wallet-name">${wallets[address].name}</span> <i class="fa fa-pencil wallet-edit-name" title="Edit name"></i>

            <span class="wallet-name-input">
                <input type="text" value="${wallets[address].name}" data-original-value="${wallets[address].name}">
                <i class="fa fa-check wallet-update-name" data-wallet="${address}" title="Save"></i>
                <i class="fa fa-times wallet-cancel-name" title="Cancel"></i>
            </span>

            <hash class="wallet-address">${address}</hash>
            <i class="fa fa-copy wallet-copy-address" data-wallet="${address}" title="Copy address"></i><br>
            <i class="fa fa-key fa-fw wallet-export-privkey" data-wallet="${address}" title="Copy private key"></i>
            ${active ? `` : `<i class="fa fa-trash-o fa-fw wallet-remove" data-wallet="${address}" title="Remove wallet"></i>`}
            <span class="wallet-balance icon-nimiq">${formatBalance(wallets[address].balance)}</span>
        `;

        listItem.querySelector('.wallet-identicon').insertBefore(createIdenticon(address), listItem.querySelector('.wallet-identicon').firstChild);

        walletListItems.appendChild(listItem);

        /* html += '<input type="text" value="' + wallets[address].name + '" id="' + address + '-name">';
        html += '<button data-wallet="' + address + '" class="update-name">Edit</button> ';
        html += '<button data-wallet="' + address + '" class="use-wallet">Use</button> ';
        if(state.activeWallet.address && state.activeWallet.address !== address)
            html += '<button data-wallet="' + address + '" class="remove-wallet">Remove</button><br>';
        html += '<hash>' + address + '</hash><br>';
        html += 'Balance: ' + formatBalance(wallets[address].balance);
        html += '</li>'; */
    }

    while ($walletList.firstChild) {
        $walletList.removeChild($walletList.firstChild);
    }

    $walletList.appendChild(walletListItems);
}
updateWalletList();

function renderTxs(outgoingTx, incomingTx) {
    var html = '';

    if(outgoingTx.length) {
        html += '<strong>Pending Outgoing Transactions</strong><ul>';
        for(tx of outgoingTx) {
            html += '<li>To: <hash style="font-size: 11px;">' + tx.receiver + '</hash><br>- <span class="icon-nimiq">' + formatBalance(tx.value)  + '</span>' + /*'<br><em>' + tx.message + '</em>' + */'</li>';
        }
        html += '</ul>';
    }

    if(incomingTx.length) {
        html += '<strong>Pending Incoming Transactions</strong><ul>';
        for(tx of incomingTx) {
            html += '<li>From: <hash style="font-size: 11px;">' + tx.sender + '</hash><br>+ <span class="icon-nimiq">' + formatBalance(tx.value) + '</span>' + /*'<br><em>' + tx.message + '</em>' + */'</li>';
        }
        html += '</ul>';
    }

    if(html !== '') html = html + '<hr>';

    $txsList.innerHTML = html;
}
renderTxs(state.outgoingTx, state.incomingTx);

function handleStatus(status) {
    if(state.restarting && status === 'Consensus lost')
        state.restarting = false;

    $status.innerText = status;
    setStatusIndicator(status);
    updateWalletList();
}

function handleHeight(height) {
    if(state.status === 'Consensus established') {
        $height.innerText = height;
        updateWalletList();
    }
    else {
        // TODO Check if consensus established is triggered before the last height updateWalletList
        // If not, the above conditional section has to be triggered manually

        $loadingHeight.innerText = height;

        // Set loading-bar progress
        $loadingProgress.style.width = ((height - state.startHeight) / (state.targetHeight - state.startHeight) * 100) + '%';
    }
}

function handleTargetHeight(targetHeight) {
    if(targetHeight > 0) {
        state.startHeight = state.startHeight || state.height;
        document.getElementById('loading-targetHeight').innerText = '/' + targetHeight;
    }
    else if(!state.restarting) {
        delete state.startHeight;
        handleHeight(state.height);
        $loadingScreen.classList.remove('show-instant');
        document.getElementById('loading-targetHeight').innerText = '';
    }
}
if(state.targetHeight > 0) handleTargetHeight(state.targetHeight);

// Listen for updates from the background script
async function messageReceived(update) {
    console.log("message received:", update);

    var key = Object.keys(update)[0];

    if(key === 'privKey') {
        var address = await importPrivateKey(update.privKey);
        if(!state.activeWallet.address) switchWallet(address);
        $buttonCloseImportWallets.click();
    }
    else {
        if(key === 'balance') {
            // Skip balance updates during wallet switch
            if(state.balance === 'loading...' && state.status !== 'Consensus established')
                return;
        }

        Object.assign(state, update);

        switch(key) {
            case 'numberOfWallets': $buttonShowMyWallets.setAttribute('title', 'My Wallets (' + state.numberOfWallets + ')'); break;
            case 'activeWallet': $name.innerText         = state.activeWallet.name;
                                 $address.innerText      = state.activeWallet.address;
                                 $balance.innerText      = formatBalance(state.activeWallet.balance);
                                 $identicon.replaceChild(createIdenticon(state.activeWallet.address), $identicon.firstChild);
                                 updateWalletList();
                                 break;
            case 'status':       handleStatus(state.status); break;
            case 'height':       handleHeight(state.height); break;
            case 'targetHeight': handleTargetHeight(state.targetHeight); break;
            case 'peers':        $peers.innerText        = state.peers; break;
            case 'mining':       setMinerStatus(state.mining); break;
            case 'hashrate':     $buttonToggleMining.setAttribute('data-hashrate', formatHashrate(state.hashrate)); break;
            case 'outgoingTx':   /* since outgoing and incoming txs are always send after each other, only work on incomingTx */ break;
            case 'incomingTx':   renderTxs(state.outgoingTx, state.incomingTx); break;
        }
    }
}
chrome.runtime.onMessage.addListener(messageReceived);

async function sendTransaction() {
    var address = $inputTxReceiver.value;
    var value = parseFloat($inputTxValue.value);

    var error = await bgPage.sendTransaction(address, value);

    if(error) {
        alert(error);
    }
    else $buttonCloseNewTx.click();
}

async function importPrivateKey(key) {
    var address = await bgPage.importPrivateKey(key);
    updateWalletList();
    return address;
}

async function updateName(address, name) {
    await bgPage.updateName(address, name);
    updateWalletList();
}

async function createNewWallet() {
    var address = await bgPage.createNewWallet();
    updateWalletList();
    return address;
}

async function removeWallet(address) {
    if(!confirm('Do you really want to un-manage this wallet?\n\n' + address.toUpperCase())) return;

    await bgPage.removeWallet(address);
    updateWalletList();
}

function switchWallet(address) {
    if(state.activeWallet.address)
        state.restarting = true;

    $loadingScreen.classList.add('show-instant');

    bgPage.switchWallet(address);
}

function clipboard(data) {
    var input = document.createElement('input');
    input.setAttribute('type', 'text');
    input.value = data;

    $walletList.appendChild(input);
    input.select();
    document.execCommand('copy');
    $walletList.removeChild(input);

    $toast.classList.remove('show', 'fade-out');
    $toast.classList.add('show');

    window.setTimeout(() => {
        $toast.classList.add('fade-out');
    }, 200);

    window.setTimeout(() => {
        $toast.classList.remove('show', 'fade-out');
    }, 500); // 200 + 300 from CSS transition
}

// Attach input listeners
$buttonCopyAddress.addEventListener('click', e => {
    clipboard(state.activeWallet.address);
});
$buttonNewTx.addEventListener('click', e => {
    $newTx.classList.add('show');
});
$buttonCloseNewTx.addEventListener('click', e => {
    $newTx.classList.remove('show');
})
$buttonSendTx.addEventListener('click', sendTransaction);

$buttonToggleMining.addEventListener('click', e => {
    if(!state.mining) bgPage.startMining();
    else bgPage.stopMining();
});

$buttonShowMyWallets.addEventListener('click', e => {
    $walletManagement.classList.toggle('show');
});
$buttonCloseMyWallets.addEventListener('click', e => {
    $walletManagement.classList.remove('show');
});

$buttonShowImportWallets.addEventListener('click', e => {
    $walletImport.classList.add('show');
});
$buttonCloseImportWallets.addEventListener('click', e => {
    $walletImport.classList.remove('show', 'show-instant');
});

$walletList.addEventListener('click', e => {
    var target = e.target;

    if(e.target.matches('canvas'))
        target = e.target.parentNode;

    if(target.matches('button.use-wallet')) {
        const address = target.getAttribute('data-wallet');
        switchWallet(address);
        $buttonCloseMyWallets.click();
    }
    else if(target.matches('i.wallet-edit-name')) {
        target.parentNode.querySelector('.wallet-name').style.display = 'none';
        target.style.display = 'none';

        target.parentNode.querySelector('.wallet-name-input').style.display = 'initial';
        target.parentNode.querySelector('input').select();
    }
    else if(target.matches('i.wallet-update-name')) {
        const address = target.getAttribute('data-wallet');
        const name = target.parentNode.querySelector('input').value;
        updateName(address, name);
    }
    else if(target.matches('i.wallet-cancel-name')) {
        var input = target.parentNode.querySelector('input');
        input.parentNode.style.display = 'none';
        input.value = input.getAttribute('data-original-value');

        target.parentNode.parentNode.querySelector('.wallet-name').style.display = 'initial';
        target.parentNode.parentNode.querySelector('.wallet-edit-name').style.display = 'initial';
    }
    else if(target.matches('i.wallet-copy-address')) {
        const address = target.getAttribute('data-wallet');
        clipboard(address);
    }
    else if(target.matches('i.wallet-export-privkey')) {
        const address = target.getAttribute('data-wallet');
        bgPage.store.get('wallets', function(items) {
            var wallets = items.wallets;
            var key = wallets[address].key;
            clipboard(key);
        });
    }
    else if(target.matches('i.wallet-remove')) {
        const address = target.getAttribute('data-wallet');
        removeWallet(address);
    }
});

$buttonImportPrivKey.addEventListener('click', async e => {
    var address = await importPrivateKey($inputPrivKey.value);
    if(!state.activeWallet.address) switchWallet(address);
    $buttonCloseImportWallets.click();
});
$buttonImportBetanet.addEventListener('click', e => {
    chrome.tabs.query({active: true}, tabs => {
        var tab = tabs[0];
        if(tab.url === 'https://nimiq.com/betanet/') {
            chrome.tabs.executeScript({file: "extract_betanet_key.js"});
        }
        else {
            window.open('https://nimiq.com/betanet','_newtab');
        }
    });
});
$buttonNewWallet.addEventListener('click', async e => {
    var address = await createNewWallet();
    if(!state.activeWallet.address) switchWallet(address);
    $buttonCloseImportWallets.click();
});

ninja.wallets.paperwallet = {
	open: function () {
		document.getElementById("main").setAttribute("class", "paper"); // add 'paper' class to main div
		var paperArea = document.getElementById("paperarea");
		paperArea.style.display = "block";
		var perPageLimitElement = document.getElementById("paperlimitperpage");
		var limitElement = document.getElementById("paperlimit");
		var pageBreakAt = (ninja.wallets.paperwallet.useArtisticWallet) ? ninja.wallets.paperwallet.pageBreakAtArtisticDefault : ninja.wallets.paperwallet.pageBreakAtDefault;
		if (perPageLimitElement && perPageLimitElement.value < 1) {
			perPageLimitElement.value = pageBreakAt;
		}
		if (limitElement && limitElement.value < 1) {
			limitElement.value = pageBreakAt;
		}
		if (document.getElementById("paperkeyarea").innerHTML == "") {
			document.getElementById("paperpassphrase").disabled = true;
			document.getElementById("paperencrypt").checked = false;
			ninja.wallets.paperwallet.encrypt = false;
			ninja.wallets.paperwallet.build(pageBreakAt, pageBreakAt, !document.getElementById('paperart').checked, document.getElementById('paperpassphrase').value);
		}
	},

	close: function () {
		document.getElementById("paperarea").style.display = "none";
		document.getElementById("main").setAttribute("class", ""); // remove 'paper' class from main div
	},

	remaining: null, // use to keep track of how many addresses are left to process when building the paper wallet
	count: 0,
	pageBreakAtDefault: 7,
	pageBreakAtArtisticDefault: 3,
	useArtisticWallet: true,
	pageBreakAt: null,

	build: function (numWallets, pageBreakAt, useArtisticWallet, passphrase) {
		if (numWallets < 1) numWallets = 1;
		if (pageBreakAt < 1) pageBreakAt = 1;
		ninja.wallets.paperwallet.remaining = numWallets;
		ninja.wallets.paperwallet.count = 0;
		ninja.wallets.paperwallet.useArtisticWallet = useArtisticWallet;
		ninja.wallets.paperwallet.pageBreakAt = pageBreakAt;
		document.getElementById("paperkeyarea").innerHTML = "";
		if (ninja.wallets.paperwallet.encrypt) {
			document.getElementById("busyblock").className = "busy";
			ninja.privateKey.BIP38GenerateIntermediatePointAsync(passphrase, null, null, function (intermediate) {
				ninja.wallets.paperwallet.intermediatePoint = intermediate;
				document.getElementById("busyblock").className = "";
				setTimeout(ninja.wallets.paperwallet.batch, 0);
			});
		}
		else {
			setTimeout(ninja.wallets.paperwallet.batch, 0);
		}
	},

	batch: function () {
		if (ninja.wallets.paperwallet.remaining > 0) {
			var paperArea = document.getElementById("paperkeyarea");
			ninja.wallets.paperwallet.count++;
			var i = ninja.wallets.paperwallet.count;
			var pageBreakAt = ninja.wallets.paperwallet.pageBreakAt;
			var div = document.createElement("div");
			div.setAttribute("id", "keyarea" + i);
			if (ninja.wallets.paperwallet.useArtisticWallet) {
				div.innerHTML = ninja.wallets.paperwallet.templateArtisticHtml(i);
				div.setAttribute("class", "keyarea art");
			}
			else {
				div.innerHTML = ninja.wallets.paperwallet.templateHtml(i);
				div.setAttribute("class", "keyarea");
			}
			if (paperArea.innerHTML != "") {
				// page break
				if ((i - 1) % pageBreakAt == 0 && i >= pageBreakAt) {
					var pBreak = document.createElement("div");
					pBreak.setAttribute("class", "pagebreak");
					document.getElementById("paperkeyarea").appendChild(pBreak);
					div.style.pageBreakBefore = "always";
					if (!ninja.wallets.paperwallet.useArtisticWallet) {
						div.style.borderTop = "2px solid green";
					}
				}
			}
			document.getElementById("paperkeyarea").appendChild(div);
			ninja.wallets.paperwallet.generateNewWallet(i);
			ninja.wallets.paperwallet.remaining--;
			setTimeout(ninja.wallets.paperwallet.batch, 0);
		}
	},

	// generate bitcoin address, private key, QR Code and update information in the HTML
	// idPostFix: 1, 2, 3, etc.
	generateNewWallet: function (idPostFix) {
		if (ninja.wallets.paperwallet.encrypt) {
			ninja.privateKey.BIP38GenerateECAddressAsync(ninja.wallets.paperwallet.intermediatePoint, false, function (address, encryptedKey) {
				if (ninja.wallets.paperwallet.useArtisticWallet) {
					ninja.wallets.paperwallet.showArtisticWallet(idPostFix, address, encryptedKey);
				}
				else {
					ninja.wallets.paperwallet.showWallet(idPostFix, address, encryptedKey);
				}
			});
		}
		else {
			var key = new Bitcoin.ECKey(false);
			var bitcoinAddress = key.getBitcoinAddress();
			var privateKeyWif = key.getBitcoinWalletImportFormat();
			if (ninja.wallets.paperwallet.useArtisticWallet) {
				ninja.wallets.paperwallet.showArtisticWallet(idPostFix, bitcoinAddress, privateKeyWif);
			}
			else {
				ninja.wallets.paperwallet.showWallet(idPostFix, bitcoinAddress, privateKeyWif);
			}
		}
	},

	templateHtml: function (i) {
		var privateKeyLabel = ninja.translator.get("paperlabelprivatekey");
		if (ninja.wallets.paperwallet.encrypt) {
			privateKeyLabel = ninja.translator.get("paperlabelencryptedkey");
		}

		var walletHtml =
							"<div class='public'>" +
								"<div id='qrcode_public" + i + "' class='qrcode_public'></div>" +
								"<div class='pubaddress'>" +
									"<span class='label'>" + ninja.translator.get("paperlabelbitcoinaddress") + "</span>" +
									"<span class='output' id='btcaddress" + i + "'></span>" +
								"</div>" +
							"</div>" +
							"<div class='private'>" +
								"<div id='qrcode_private" + i + "' class='qrcode_private'></div>" +
								"<div class='privwif'>" +
									"<span class='label'>" + privateKeyLabel + "</span>" +
									"<span class='output' id='btcprivwif" + i + "'></span>" +
								"</div>" +
							"</div>";
		return walletHtml;
	},

	showWallet: function (idPostFix, bitcoinAddress, privateKey) {
		document.getElementById("btcaddress" + idPostFix).innerHTML = bitcoinAddress;
		document.getElementById("btcprivwif" + idPostFix).innerHTML = privateKey;
		var keyValuePair = {};
		keyValuePair["qrcode_public" + idPostFix] = bitcoinAddress;
		keyValuePair["qrcode_private" + idPostFix] = privateKey;
		ninja.qrCode.showQrCode(keyValuePair);
		document.getElementById("keyarea" + idPostFix).style.display = "block";
	},

	templateArtisticHtml: function (i) {
		var keyelement = 'btcprivwif';
		var image = 'data:image/png;base64,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';;
		if (ninja.wallets.paperwallet.encrypt) {
			keyelement = 'btcencryptedkey'
		}

		var walletHtml =
							"<div class='artwallet' id='artwallet" + i + "'>" +
		//"<iframe src='bitcoin-wallet-01.svg' id='papersvg" + i + "' class='papersvg' ></iframe>" +
								"<img id='papersvg" + i + "' class='papersvg' src='" + image + "' />" +
								"<div id='qrcode_public" + i + "' class='qrcode_public'></div>" +
								"<div id='qrcode_private" + i + "' class='qrcode_private'></div>" +
								"<div class='btcaddress' id='btcaddress" + i + "'></div>" +
								"<div class='" + keyelement + "' id='" + keyelement + i + "'></div>" +
							"</div>";
		return walletHtml;
	},

	showArtisticWallet: function (idPostFix, bitcoinAddress, privateKey) {
		var keyValuePair = {};
		keyValuePair["qrcode_public" + idPostFix] = bitcoinAddress;
		keyValuePair["qrcode_private" + idPostFix] = privateKey;
		ninja.qrCode.showQrCode(keyValuePair, 2.5);
		document.getElementById("btcaddress" + idPostFix).innerHTML = bitcoinAddress;

		if (ninja.wallets.paperwallet.encrypt) {
			var half = privateKey.length / 2;
			document.getElementById("btcencryptedkey" + idPostFix).innerHTML = privateKey.slice(0, half) + '<br />' + privateKey.slice(half);
		}
		else {
			document.getElementById("btcprivwif" + idPostFix).innerHTML = privateKey;
		}

		// CODE to modify SVG DOM elements
		//var paperSvg = document.getElementById("papersvg" + idPostFix);
		//if (paperSvg) {
		//	svgDoc = paperSvg.contentDocument;
		//	if (svgDoc) {
		//		var bitcoinAddressElement = svgDoc.getElementById("bitcoinaddress");
		//		var privateKeyElement = svgDoc.getElementById("privatekey");
		//		if (bitcoinAddressElement && privateKeyElement) {
		//			bitcoinAddressElement.textContent = bitcoinAddress;
		//			privateKeyElement.textContent = privateKeyWif;
		//		}
		//	}
		//}
	},

	toggleArt: function (element) {
		ninja.wallets.paperwallet.resetLimits();
	},

	toggleEncrypt: function (element) {
		// enable/disable passphrase textbox
		document.getElementById("paperpassphrase").disabled = !element.checked;
		ninja.wallets.paperwallet.encrypt = element.checked;
		ninja.wallets.paperwallet.resetLimits();
	},

	resetLimits: function () {
		var hideArt = document.getElementById("paperart");
		var paperEncrypt = document.getElementById("paperencrypt");
		var limit;
		var limitperpage;

		document.getElementById("paperkeyarea").style.fontSize = "100%";
		if (!hideArt.checked) {
			limit = ninja.wallets.paperwallet.pageBreakAtArtisticDefault;
			limitperpage = ninja.wallets.paperwallet.pageBreakAtArtisticDefault;
		}
		else if (hideArt.checked && paperEncrypt.checked) {
			limit = ninja.wallets.paperwallet.pageBreakAtDefault;
			limitperpage = ninja.wallets.paperwallet.pageBreakAtDefault;
			// reduce font size
			document.getElementById("paperkeyarea").style.fontSize = "95%";
		}
		else if (hideArt.checked && !paperEncrypt.checked) {
			limit = ninja.wallets.paperwallet.pageBreakAtDefault;
			limitperpage = ninja.wallets.paperwallet.pageBreakAtDefault;
		}
		document.getElementById("paperlimitperpage").value = limitperpage;
		document.getElementById("paperlimit").value = limit;
	}
};

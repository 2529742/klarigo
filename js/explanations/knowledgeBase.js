if (!window.kbAPI) {
    window.kbAPI = {};
}
var xmlDoc;

jQuery.extend(window.kbAPI, {
	init: function(){
		xmlDoc = loadXMLDoc("utils/kb.xml");
		return xmlDoc;
	},
	save: function (xmlDoc){
		$.ajax({
			type: 'POST',
			url: 'utils/saveXML.php',
			processData: false,
			contentType: 'text/xml',
			data: xmlDoc
		});
	},
	staticKB: function(){
			return xmlDoc.getElementsByTagName("Static")[0];
		},
	IEKB: function(){
			return xmlDoc.getElementsByTagName("InterfaceElements")[0];
		},
	HistoryKB: function(){
			return xmlDoc.getElementsByTagName("InteractionHistory")[0];
		},
	getIEtype: function (id){
	}
});	

jQuery.extend(window.kbAPI.staticKB, {
	addRecord: function(record){
	},
	updateRecord: function(oldR,newR){
	}
});

function loadXMLDoc(docName){
	if (window.XMLHttpRequest){
		xhttp=new XMLHttpRequest();
	}
	else{
		xhttp=new ActiveXObject("Microsoft.XMLHTTP");
	}
	xhttp.open("GET",docName,false);
	xhttp.send();
	return xhttp.responseXML;
}


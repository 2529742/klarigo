if (!window.kbAPI) {
    window.kbAPI = {};
}
var xmlDoc;

jQuery.extend(window.kbAPI, {
	initKB: function(){
		xmlDoc = loadXMLDoc("utils/kb.xml");
		return xmlDoc;
	},
	saveKB: function (xmlDoc){
		$.ajax({
			type: 'POST',
			url: 'utils/saveXML.php',
			processData: false,
			contentType: 'text/xml',
			data: xmlDoc
		});
	},
	getIEtype: function (id){
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


var xmlDoc;

function initKB(){
	xmlDoc = loadXMLDoc("utils/kb.xml");
	return xmlDoc;
}

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

function saveKB(xmlDoc){
	$.ajax({
		type: 'POST',
		url: 'utils/saveXML.php',
		processData: false,
		contentType: 'text/xml',
		data: xmlDoc
	});
}

function getIEtype(id){
	
}

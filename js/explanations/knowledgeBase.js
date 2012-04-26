var kbAPI = {};
var xmlDoc;

jQuery.extend(kbAPI, {
	kb: function(){	
		return xmlDoc;
	},
	init: function(){
		xmlDoc = loadXMLDoc("utils/kb.xml");
		return xmlDoc;
	},
	save: function (){
		$.ajax({
			type: 'POST',
			url: 'utils/saveXML.php',
			processData: false,
			contentType: 'text/xml',
			data: xmlDoc
		});
	},
	staticKB: {
			getAll: function(){
				return xmlDoc.getElementsByTagName("Static")[0];
				},
			addRecord: function(record){
				},
			updateRecord: function(oldR,newR){
				}
		},
	interfaceElementsKB: {
			getAll:	function(){
				return xmlDoc.getElementsByTagName("InterfaceElements")[0];
				},
			addRecord: function(id,type){
				var iElements = xmlDoc.getElementsByTagName("InterfaceElements")[0];
				var kbElement = xmlDoc.createElement("Element");
				xmlDoc.createTextNode(id);
				kbElement.setAttribute("id",id);
				kbElement.setAttribute("type",type);
				iElements.appendChild(kbElement);
				},	
			getElementType: function (id){
				var type = xmlDoc.getElementById(id).getAttributeNode("type").value;
				return type;
				},	
		},
	historyKB: {
			getAll: function(){
				return xmlDoc.getElementsByTagName("InteractionHistory")[0];
				},
			addRecord: function(record){
				}
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


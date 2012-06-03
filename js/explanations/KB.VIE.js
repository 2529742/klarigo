var kbVIE = new VIE();
kbVIE.namespaces.add('explanation','http://ontology.vie.js/explanation/');
var kbAPI = {};

jQuery.extend(kbAPI, {
	kb: function(){	
		return kbVIE;
	},
	init: function(){
		return kbVIE;
	},
	save: function (){},
	staticKB:  {
		addRecord: function(subject){
			kbVIE.entities.add({
				'@type': '<http://ontology.vie.js/explanation/static>', 
				'@subject': subject
			});
		}
	},
	interfaceKB: {
		addRecord:function(id,type){
			kbVIE.entities.add({
				'@type': '<http://ontology.vie.js/explanation/interface>', 
				'@subject': id,
				'elementType': type
			});
		},
		getElementType: function (id){
			var type = kbVIE.entities.get(id).get('elementType');
			return type;
		},
		updateRecord: function(){}
	},
	historyKB: {
		addRecord: function(id,stack){
			kbVIE.entities.add({
				'@type': '<http://ontology.vie.js/explanation/history>', 
				'@subject': id,
				'stack': stack 
			});

		},
		updateRecord: function(){}
	}
	
	
});

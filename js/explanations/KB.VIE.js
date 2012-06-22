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
	
	removeRecord: function(record){
		kbVIE.entities.remove(record);
	},
	getAll: function(){
		return kbVIE.entities.models;//TODO introduce a general Type for the expl. records and apply filtering here
	},
	staticKB:  {
		idCount: 0,
		newID: function(){
			return "static"+this.idCount++;
		},
		getAll: function(){	
			var records = [];
			try{
				records = kbVIE.entities.filter(function(c){return c.isof('<http://ontology.vie.js/explanation/static>')});
			}
			catch (e){}
			return records;
		},
		newRecord: function(){
			var subject = this.newID();
			kbVIE.entities.add({
				'@type': '<http://ontology.vie.js/explanation/static>', 
				'@subject': subject,
				'description':'',
				'purpose':'',
				'use':'',
				'elementType':''
			});
			return subject;
		},
		addRecord: function(id,attr){
			var desc = attr.desription;
			var purp = attr.purpose;
			var use = attr.use;
			var elType = attr.elementType;
			kbVIE.entities.add({
				'@type': '<http://ontology.vie.js/explanation/static>', 
				'@subject': id,
				'description': desc,
				'purpose': purp,
				'use': use,
				'elementType': elementType
			});
		},
		removeRecord: function(record){
			kbVIE.entities.remove(record);
		},
		getRecord: function(id){
			return kbVIE.entities.get(id);
		}
	},
	interfaceKB: {
		getAll: function(){	
			var records = [];
			try{
				records = kbVIE.entities.filter(function(c){return c.isof('<http://ontology.vie.js/explanation/interface>')});
			}
			catch (e){}
			return records;
		},
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
		getAll: function(){	
			var records =  [];
			try{
				records = kbVIE.entities.filter(function(c){return c.isof('<http://ontology.vie.js/explanation/history>')});
			}
			catch (e) {}
			return records;
		},
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

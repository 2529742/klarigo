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
		newRecord: function(subject){
			var record = kbVIE.entities.addOrUpdate({
				'@type': '<http://ontology.vie.js/explanation/static>', 
				'@subject': subject,
				'title':'',
				'description':'',
				'purpose':'',
				'use':'',
				'elementType':subject
			});
			return record;
		},
		addRecord: function(attr){
			var desc = attr.description;
			var purp = attr.purpose;
			var use = attr.use;
			var elType = attr.elementType;
			var title = attr.title;
			var start = attr.start;
			kbVIE.entities.add({
				'@type': '<http://ontology.vie.js/explanation/static>', 
				'@subject': elType,
				'title': title,
				'description': desc,
				'purpose': purp,
				'use': use,
				'elementType': elType,
				'start': start
			});
		},
		updateRecord: function(record){
			kbVIE.entities.addOrUpdate(record);
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
		addRecord:function(id,type,events){
			kbVIE.entities.add({
				'@type': '<http://ontology.vie.js/explanation/interface>', 
				'@subject': id,
				'elementType': type,
				'events': events
			});
		},
		getElementType: function (id){
			var type = kbVIE.entities.get(id).get('elementType');
			return type;
		},
		getEvents: function (id){
			var events = kbVIE.entities.get(id).get('events');
			return events;
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

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
		schema: {
			attributes:[
				'@type',
				'@subject',
				'title',
				'description',
				'purpose',
				'use',
				'start',
				'elementType'
				]
		},
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
				'elementType':subject,
				'start':''
			});
			return record;
		},
		addRecord: function(record){
			var attributes = {
				'@type': '<http://ontology.vie.js/explanation/static>', 
				'@subject': record.elementType
			};
			for(var a in record){
				attributes[a] = record[a];
			}
			kbVIE.entities.add(attributes);
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
		schema: {
			attributes:[
				'@type', 
				'@subject',
				'elementType',
				'events',
				'status'
			]
		},
		getAll: function(){	
			var records = [];
			try{
				records = kbVIE.entities.filter(function(c){return c.isof('<http://ontology.vie.js/explanation/interface>')});
			}
			catch (e){}
			return records;
		},
		addRecord:function(record){
			var attributes = {
				'@type': '<http://ontology.vie.js/explanation/interface>', 
				'@subject': record.id
			};
			for(var a in record){
				attributes[a] = record[a];
			}
			kbVIE.entities.add(attributes);
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
		schema: {
			attributes:[
				'@type', 
				'@subject',
				'timeStamp',
				'eventType',
				'element',
				'relatedNode',
				'callstack',
				'rootEvent'
			]
		},
		getAll: function(){	
			var records =  [];
			try{
				records = kbVIE.entities.filter(function(c){return c.isof('<http://ontology.vie.js/explanation/history>')});
			}
			catch (e) {}
			return records;
		},
		addRecord: function(record){
			var attributes = {
				'@type': '<http://ontology.vie.js/explanation/history>', 
				'@subject': record.id
			};
			for(var a in record){
				attributes[a] = record[a];
			}
			kbVIE.entities.add(attributes);

		},
		updateRecord: function(){}
	}
	
	
});

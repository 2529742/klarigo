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

	getRecord: function(id){
		id = VIE.Util.isUri? id: "<"+id+">";
		return kbVIE.entities.get(id);
	},
	
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
		}
	},
	interfaceKB: {
		schema: {
			attributes:[
				'@type', 
				'@subject',
				'elementType',
				'events',
				'status',
				'metadata_about',
				'metadata_type'
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
		
		getWhat: function(){	
			var records = [];
			try{
				records = kbVIE.entities.filter(function(c){return c.isof('<http://ontology.vie.js/explanation/interface>') && c.get('category') == 'what'});
			}
			catch (e){}
			return records;
		},
		
		getHow: function(){	
			var records = [];
			try{
				records = kbVIE.entities.filter(function(c){return c.isof('<http://ontology.vie.js/explanation/interface>') && c.get('category') == 'how'});
			}
			catch (e){}
			return records;
		},
		
		getWhy: function(){	
			var records = [];
			try{
				records = kbVIE.entities.filter(function(c){return c.isof('<http://ontology.vie.js/explanation/interface>') && c.get('category') == 'why'});
			}
			catch (e){}
			return records;
		},
		
		getCustom: function(){	
			var records = [];
			try{
				records = kbVIE.entities.filter(function(c){return c.isof('<http://ontology.vie.js/explanation/interface>') && c.get('category') == 'custom'});
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
		
		getHistory: function(elementID){
			var records =  [];
			try{
				records = kbVIE.entities.filter(
					function(c){
						return c.isof('<http://ontology.vie.js/explanation/history>') && c.get('element')==elementID 
					}
				);
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
	},
	
	templates: {
		schema: {
			attributes:[
				'@type', 
				'@subject',
				'related_elements',
				'title',
				'label',
				'context'
			]
		},
		getAll: function(){	
			var records =  [];
			try{
				records = kbVIE.entities.filter(function(c){return c.isof('<http://ontology.vie.js/explanation/template>')});
			}
			catch (e) {}
			return records;
		},
		
		getQuestionsMappings: function(){
			var questions_mappings =  {};
			try{
				//records = kbVIE.entities.filter(function(c){return c.isof('<http://ontology.vie.js/explanation/template>') && c.get('category')=='how'});
				
			}
			catch (e) {}
			return questions_mappings;
		},
		
		getRecord: function(id){
			return kbVIE.entities.get(id);
		},
		
		addRecord: function(record){
			var attributes = {
				'@type': '<http://ontology.vie.js/explanation/template>', 
				'@subject': record.id
			};
			for(var a in record){
				attributes[a] = record[a];
			}
			kbVIE.entities.addOrUpdate(attributes);

		},
		
		newRecord: function(attributes){
			var record = {
				'title': '',
				'label': '',
				'context': []
			};
			for(var a in attributes){
				record[a] = attributes[a];
			}
			return record;
		},
		
		updateRecord: function(attributes){
			var template = kbVIE.entities.get(attributes.id);
			for(var attr in attributes){
				template.set(attr,attributes[attr]);
			}
		}
	},
	
	explanations: {
		getAll: function(){	
			var records =  [];
			try{
				records = kbVIE.entities.filter(function(c){return c.isof('<http://ontology.vie.js/explanation/explanation>')});
			}
			catch (e) {}
			return records;
		},
		
		getRecord: function(id){
			return kbVIE.entities.get(id);
		},
		
		addRecord: function(record){
			kbVIE.entities.addOrUpdate(record);
			return kbVIE.entities.get(record['@subject']);
		}
	}
	
	
});

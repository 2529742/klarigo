/*

Copyright (c) 2013 Andrey Tikhomirov

may be freely distributed under the MIT license

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
*/

function accordion(element){
	element.click(function(){
		if($(this).hasClass('collapsed')){
			$(this).addClass('expanded');
			$(this).removeClass('collapsed');
			var data = $(this).parent().find('.item-body:first');
			if(data){
				data
				.removeClass('hidden')
				.addClass('show');
			}
		}
		else{
			$(this).removeClass('expanded');
			$(this).addClass('collapsed');
			var data = $(this).parent().find('.item-body:first');
			if(data){
				data
				.addClass('hidden')
				.removeClass('show');
			}
		}
	});		
};var kbVIE = new VIE();
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
				'context',
				'types',
				'category'
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
				'context': [],
				'types': []
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
var explanationBuilder = {};
var explanationInstanceIDcounter = 0;

jQuery.extend(explanationBuilder,{
	build: function(question,element){
		var elementID = $(element).attr('id');
		var interfaceRecord = kbAPI.getRecord(elementID);
		var elementType = kbAPI.interfaceKB.getElementType(elementID);
		var staticRecord = kbAPI.getRecord(elementType);
		var history = kbAPI.historyKB.getHistory(elementID);
		
		explanationInstanceIDcounter++;
		var attributes = {
			'@type': '<http://ontology.vie.js/explanation/explanation>',
			'@subject': 'explanationInstanceID' + explanationInstanceIDcounter,
			label: question,
			id: elementID
		};
		
		var trace = [];
		if(history.length>0){
			var last_record = history[history.length-1];
			var history_record = last_record;
			var rootEventID = last_record.get('rootEvent');
			var rootEvent = kbAPI.getRecord(rootEventID);
			do{
				if(history_record.get('eventType')=='ajax'){
					var query = history_record.get('query');
					query = (query.isEntity || query.isCollection)? query.models[0].attributes: query;
					var query_string = '';
					for(var q in query){
						if(q!='@type' && q!='@subject'){
							query_string = query_string + '<li>' + q.replace("http://schema.org/",'').replace(/[<>]/g,'') + ': ' + query[q] + '</li>';
						}
					}
					trace.push('<li>Ajax query with parameters: <ul>' + query_string + '</ul></li>');
				}
				else{
					var relatedElement = history_record.get('element')? $('#'+history_record.get('element'))[0].innerHTML: '';
					trace.push('<li><b>' + relatedElement + '</b> - ' + history_record.get('eventType') + '</li>');
				}
				rootEventID = history_record.get('rootEvent');
				history_record = rootEvent;
				rootEvent = kbAPI.getRecord(rootEventID);
			}
			while(rootEventID != rootEvent.get('rootEvent'))
			history_record = rootEvent;
			relatedElement = history_record.get('element')? $('#'+history_record.get('element'))[0].innerHTML: '';
			trace.push('<li><b>' + relatedElement + '</b> - ' + history_record.get('eventType') + '</li>');	
		}
		
		var trace_string = '';
		for(var i = trace.length-1; i>=0; i--){	
			trace_string = trace_string + trace[i];
		}
		attributes.trace = '<ul>' + trace_string + '</ul>';
		
		var schemaAttr = kbAPI.staticKB.schema.attributes;
		if(staticRecord){
			for(var a in schemaAttr){
				if(schemaAttr[a] != '@type' && schemaAttr[a] != '@subject'){
					var value = staticRecord.get(schemaAttr[a]);
					if(value){
						value = (value.isEntity)? value.getSubjectUri(): value;
					}
					attributes[schemaAttr[a]] = value;
				}
			}
		}
		schemaAttr = kbAPI.interfaceKB.schema.attributes;
		if(interfaceRecord){
			for(var a in schemaAttr){
				if(schemaAttr[a] != '@type' && schemaAttr[a] != '@subject'){
					var value = interfaceRecord.get(schemaAttr[a]);
					if(value){
						value = (value.isEntity)? value.getSubjectUri(): value;
					}
					attributes[schemaAttr[a]] = value;
				}
			}
		}
		var explanationModel = kbAPI.explanations.addRecord(attributes);
		return this.construct_explanation(explanationModel);
	},
	
	construct_explanation: function(model) {
		var explanation = $('<div>');
		var question = model.get('label');
		var explantionStructure = kbAPI.templates.getRecord('<'+question+'>');
		var element = $('#'+model.get('id'))[0];
		var label = explantionStructure.get('label');
		var context = explantionStructure.get('context');
		var contextHTML = '';
		if(context[0]){
			context = ($.isArray(context[0]))? context: [context];
		}
		for(var c in context){
			var line = context[c];
			var item = "";
			if($.isArray(line)){
				for(var i in line){
					var context_item = line[i];
					if(context_item.type == 'reference'){
						item = model.get(context_item.value);
						if(item){
							item = (item.isEntity)? item.getSubjectUri(): item;
							contextHTML = contextHTML + item;
						}
					}
					else{
						item = context_item.value;
						contextHTML = contextHTML + item;
					}
				}
			}
			else{
				item = model.get(line[i]);
				if(item){
					item = (item.isEntity)? item.getSubjectUri(): item;
					contextHTML = contextHTML + item;
				}
				else{
					contextHTML = contextHTML + line[i];
				}
			};
			contextHTML = contextHTML + '<br/>';
		}
		
		explanation.append('<b>'+ element.innerHTML + '</b><br/><br/>' + label + ' explanation.<br/></br/>' + contextHTML + '<div class="explanation-breakline">');
		
		//List other questions related to the element:
		var other_questions = $('<ul></ul>');
		var questions = get_elementRelated_questions(element.id);
		questions.splice(questions.indexOf(question),1);
		if(questions.length>0){
			explanation.append('<div style="margin: 10px;">This information might be also interesting:</div>');
		}
		render_questions(element,questions,other_questions);
		explanation.append(other_questions);
		
		return explanation;
  }
});
var ajaxID = 0;
Error.stackTraceLimit = 30;
var explElementsCounter = 1;

function eventsFilter(elements){
	var trace = "";
	if(!$.ajaxSettings.beforeSend){
		$.ajaxSetup({
			beforeSend: function(){
				ajaxID++;
				this.ajaxID = 'ajaxID'+ajaxID;
				$.ajaxSettings.ajaxID = ajaxID;
				console.log('Start query'+ajaxID);
				trace = printStackTrace({
					e: new Error()
				});
				var rootEvent = traceStack();
				var record = {id: this.ajaxID};
				var url = this.url;
				record.url = url;
				if(url.indexOf('?')>=0){
					var query_parameters = url.substr(url.indexOf('?')+1,url.length-url.indexOf('?'));
					query_parameters = query_parameters.split('&');
					z = {};
					z.url = url.substr(0, url.indexOf('?'));
					for(var p in query_parameters){
						d = query_parameters[p]; 
						e = d.substr(d.indexOf('=')+1,d.length-d.indexOf('='));
						g = d.substr(0,d.indexOf('='));
						z[g] = e;
					}
					record.query = z;
 				}
				record.eventType = 'ajax';
				record.ajaxID = this.ajaxID;
				record.stack = trace;
				if(rootEvent){record.rootEvent = generateEventID(rootEvent);}
				record.timeStamp = new Date().getTime();
				kbAPI.historyKB.addRecord(record);
			}
		});
	}
	if(!$.ajaxSettings.success){
		$.ajaxSetup({
			complete: function(result){
				console.log('End query'+this.ajaxID);
			}
		});
	}
	for(var eventName in eventTypes){
		if(eventTypes[eventName]){
			$(elements).livequery(
				eventName,
				function(event){
					var element = event.delegateTarget;
					if(event.type == 'DOMNodeInserted' || event.type == 'DOMNodeRemoved'){ //TODO: check another event types
						element = event.target;
					}
					if(!$(element).hasClass("explIcon")){
						listener(event,element);
					}
				}
			);
		}
	};
}

function listener(event,element){
	var trace = printStackTrace({
		e: new Error()
	});
	//TODO: exclude first items in trace which are related only to the printStackTrace call.
	
	var rootEvent = traceStack();
	
	var record = {};
	record.eventType = event.type;
	record.timeStamp = event.timeStamp;
	//index element if it has no id
	if(element.id){
		record.element = element.id;
	}
	else{
		element.id = (explElementsCounter)? 'explID'+explElementsCounter++: undefined;
		record.element = element.id;
	}
	record.id = generateEventID(record);
	record.stack = trace;
	if(event.relatedNode){record.relatedNode = event.relatedNode.id;}
				//TODO: test with different callstacks, e.g. which have a click rootevent and also contain a ajax request reference somethere in the callstack.
//				Then it's probably better to store separately the generated rootEventID and the ajaxID
	if(rootEvent){
		record.rootEvent = rootEvent.ajaxID? rootEvent.ajaxID: generateEventID(rootEvent);
	}
	
	kbAPI.historyKB.addRecord(record);

	console.warn(element);
	console.log(event.name + '\n\n');
	console.log(trace);
	return record;
}

//trace through function's call stack to the root
function traceStack(){
	var rootEvent = undefined;
	var ajaxID = undefined;
	var callee = arguments.callee.caller;
	var i = 0;
	var args = callee.arguments;
	while(callee.caller && i<Error.stackTraceLimit){
		callee = callee.caller;
		//If a callstack contains a ajax request reference, then save the ajaxID
		for(var a in args){
			if(args[a] && args[a].ajaxID){
				ajaxID = args[a].ajaxID;
			}
		}
		i++;
		args = callee.arguments;
	}
	for(var a in args){
		if(args[a] instanceof Event){
			rootEvent = {};
			rootEvent.timeStamp = args[a].timeStamp;
			rootEvent.eventType = args[a].type;
			rootEvent.element = (args[a].currentTarget.id)? args[a].currentTarget.id: (explElementsCounter)? 'explID'+explElementsCounter++: undefined;
			if(ajaxID){
				rootEvent.ajaxID = ajaxID;
			}
			console.log('Root event: ' + args[a]);
		}
	}
	
	return rootEvent;
}

function parseEventID(id){
	var eventObject = {};
	var attrs = id.split('@');
	if(attrs.length == 3){
		eventObject.element = attrs[0];
		eventObject.type = attrs[1];
		eventObject.timeStamp = attrs[2];
	}
	else{
		throw new Exception('Failed to parse event ID: '+id);
	}
	return eventObject;
}

function generateEventID(eventObject){
	var id = eventObject.element + '@' + eventObject.eventType + '@' +  eventObject.timeStamp;
	return id;
}

function indexInterfaceElements(predicate){
	for(var type in predicate){
		eventsFilter(predicate[type]);
		var explainable = $(predicate[type]);
		explainable.livequery(function(){
			indexElement(this,predicate);
		});
	}
}

function indexElement(element,predicate){
	var elType = undefined;
	//set the type
	for(var t in predicate){
		if($(element).is(predicate[t])){
			elType = t;
		}
	}
	if(elType){
		var id;
		if(element.id){
			id = element.id;
		}
		else{
			id = 'explID'+explElementsCounter++;
			element.id = id;
		}
		var events = [];
		for(var e in $(element).data('events')){
			if(e == "click" || e == "ondblclick"){
				events.push(e);//TODO: exclude system events
			}
		};
		
		var record = {
			id: id,
			events: events,
			elementType: elType,
			status: 'added'
		};
		//Get data about hidden markup	
		if(elType == 'annotated'){
			record.metadata_about = $(element).attr('about');
			if($(element).attr('typeof')){
				record.metadata_type = $(element).attr('typeof');
			}
		};
		
		kbAPI.interfaceKB.addRecord(record);
	}
	else{
		console.log('Element:' + element + ' does not match the elements type predicate');
	}
}

var eventTypes = {
//doc events
load: false,
onunload: false,
//DOM mutation events
DOMNodeInserted: true,
DOMNodeRemoved: false,
//form events
onblur: false,
onchange: false,
onfocus: false,
onreset: false,
onselect: false,
onsubmit: false,
//image events
onabort: false,
//keyboard events
onkeydown: false,
onkeypress: false,
onkeyup: false,
//mouse events
click: true,
ondblclick: false,
onmousedown: false,
onmousemove: false,
onmouseout: false,
onmouseover: false,
onmouseup: false
};var explanationEditor = {};

jQuery.extend(explanationEditor,{
	create: function(){
		var dialogEl = $('<div id="explanation_editor">')
		.dialog({title:'Knowledge Base', width: '500px'});
	},
	
	open: function(){
		if(jQuery('#explanation_editor').length == 0){
			this.create();
		};
		var dialogEl = $('#explanation_editor');
		dialogEl.empty();
		this.render(dialogEl);
		dialogEl.dialog('open');
	},
	
	render: function(dialogEl){
		var self = this;
		var list =  $('<ul>');
		var staticKB = $('<li id="staticKB"></li>');
		var sKBh = $('<h5 class="item-header collapsed"><a href="#1">Static descriptive knowledge</a></h5>');
		accordion(sKBh);
		staticKB
		.append(sKBh)
		.append('<div class="item-body hidden">');

		var interfaceKB = $('<li id="interfaceKB"></li>');
		var iKBh = $('<h5 class="item-header collapsed"><a href="#1">Interface elements</a></h5>');
		accordion(iKBh);
		interfaceKB
		.append(iKBh)
		.append('<div class="item-body hidden">');

		var historyKB = $('<li id="historyKB"></li>');
		var hKBh = $('<h5 class="item-header collapsed"><a href="#1">Interaction history</a></h5>');
		accordion(hKBh);
		historyKB
		.append(hKBh)
		.append('<div class="item-body hidden">');
		
		var add_button = $('<div class="explanation-editor-add">')
		.append('<button>add record</button>');
		add_button.click(function(){
			var add_dialog = $('<div>Please set the element type:<input id="record-type"></div>')
						.dialog({
							buttons:[
								{
									text: "OK",
									click: function(){
											var record = kbAPI.staticKB.newRecord($(this).find('input')[0].value);
											var record_div = self.render_record(record,kbAPI.staticKB,{addControls: true}).el;
											$('#staticKB').find('.item-body:first').append(record_div);
											$(this).dialog('close');	
									}
								},
								{
									text: "Cancel",
									click: function(){
										$(this).dialog('close');
									}
								}
							],
							title: "New record"
						});
			
		});
		staticKB.find('.item-body:first').append(add_button);

		var records = kbAPI.staticKB.getAll();
		for(var r in records){
			var record = records[r];
			var record_div = self.render_record(record,kbAPI.staticKB,{addControls: true}).el;
			var item_body = staticKB.find(' .item-body:first');
			if(item_body){
				item_body.append(record_div);
			}
		}
		records = kbAPI.interfaceKB.getAll();
		for(var r in records){
			var record = records[r];
			var record_div = self.render_record(record,kbAPI.interfaceKB,{addControls: false}).el;
			var item_body = interfaceKB.find(' .item-body:first');
			if(item_body){
				item_body.append(record_div);
			}
		}
		records = kbAPI.historyKB.getAll();
		for(var r in records){
			var record = records[r];
			var record_div = self.render_record(record,kbAPI.historyKB,{addControls: false}).el;
			var item_body = historyKB.find(' .item-body:first');
			if(item_body){
				item_body.append(record_div);
			}
		}
		
		list
		.append(staticKB)
		.append(interfaceKB)
		.append(historyKB)
		.appendTo(dialogEl);
	},
	render_record: function(record, KB, options){
			options = options? options: {};
			var recordView = Backbone.View.extend({
				className: "explanation-record",
				initialize: function(){
					this.render();
				},
				render: function(){
					var view = this;
					var $el = $(this.el);
					var record_id = record.id? ('Record - ' + record.id.replace(/<|>/g,'')): 'Record';
					var record_header = $('<h5 class="item-header collapsed"><a href="#1">' + record_id + '</a></h5>');
					accordion(record_header);
					var delete_btn = $('<div class="explanation-record-delete ui-icon ui-icon-trash">del</div>');
					delete_btn.click(function(){
						var confirm_dialog = $('<div>Attention!!!<br/> The record will be deleted!<br/> Do you want to proceed?</div>')
						.dialog({
							buttons:[
								{
									text: "OK",
									click: function(){
											KB.removeRecord(record);
											$el.remove();
											$(this).dialog('close');	
									}
								},
								{
									text: "Cancel",
									click: function(){
										$(this).dialog('close');
									}
								}
							],
							dialogClass: "alert",
							title: "Attention!"
						});
					});
					$el.append(record_header);
					var ok_btn = $('<button class="explanation-record-save ui-button">Save changes</Button>')
					.css({'float':'left', 'margin-right':'10px'});
					ok_btn.click(function(){
						var confirm_dialog = $('<div><br/>Save changes?</div>')
						.dialog({
							buttons:[
								{
									text: "OK",
									click: function(){
											var attr_divs = $el.find('.explanation-record-attribute');
											attr_divs.each(function(){
												var attr = $(this).find('.explanation-record-attribute-label').text();
												var value = $(this).find('.explanation-record-attribute-value textarea')[0].value;
												record.setOrAdd(attr,value);
											});
											KB.updateRecord(record);
											$(this).dialog('close');	
									}
								},
								{
									text: "Cancel",
									click: function(){
										$(this).dialog('close');
									}
								}
							],
							dialogClass: "confirm",
							title: "Confirm"
						});
					});
					var card = $('<table class="item-body hidden">');
					var card_header = $('<tr></tr>')
					.append('<td>')
					.append($('<td class="explanation-record-header">').append(ok_btn).append(delete_btn));
					if(options.addControls){
						card.append(card_header);
					}
					var attrs = record.attributes;
					for(var a in attrs){
						var tr = jQuery('<tr class="explanation-record-attribute"></tr>');
						tr
						.append('<td class="explanation-record-attribute-label">' + a.replace(/<|>/g,'') + '</td>')
						.append('<td class="explanation-record-attribute-value"><textarea>' + attrs[a] + '</textarea></td>')
						card.append(tr);
					};
					$el.append(card);
				}
			});
			return new recordView({model:record});
		}
});
var templateEditor = {};
var template_types = {
	'what': {label: 'What..?'},
	'how': {label: 'How..?'},
	'why': {label:'Why..?'},
	'custom': {label:'Custom explanation:'}
};

jQuery.extend(templateEditor,{
	create: function(){
		var dialogEl = $('<div id="template_editor">')
		.dialog({
			title:'Template editor', 
			width: 'auto',
			position: {my: 'left bottom',at: 'left'},
			resizable: 'false'
		});
		this.render_main(dialogEl);
	},
	
	open: function(){
		var self = this;
		if(jQuery('#template_editor').length == 0){
			self.create();
		};
		var dialogEl = $('#template_editor');
		this.render_main(dialogEl);
		dialogEl.dialog('open');
	},
	
	render_main: function(dialogEl){
		var self = this;
		dialogEl.empty();
		//***** Add new template *****

		var add_new = $('<ul class="ui-corner-all"></ul>')
		.css({
			padding: '10px 0px 10px 30px',
			'-webkit-box-shadow': 'rgba(0, 0, 0, 0.2) 0 2px 4px 0'
		});
		for(var type in template_types){
			var entry = $('<li  style="cursor:pointer;">');
			var label_div = $('<div class="ui-state-default ui-corner-all" style="width:190px; min-height: 20px; margin-bottom: 2px;">'+template_types[type].label+'</div>');
			entry.append(label_div);
			var add_btn = $('<div class="ui-icon ui-icon-plus">')
			.css({
				position: 'relative',
				left: '170px',
				'margin-top': '-20px'
			});
			label_div.append(add_btn);
			entry.click(function(){
				var category = '';
				for(var t in template_types){
					if(template_types[t].label == $(this).text()){
						category = t;
					}
				}
				var templateObject = kbAPI.templates.newRecord({category:category});
				self.render_editor(dialogEl,templateObject);
			})
			entry.appendTo(add_new);
		};
		dialogEl.append('Add a new template of type:');
		dialogEl.append(add_new);
		
		//***** Open existing templates *****
		var templates_list = $('<ul class="ui-corner-all"></ul>')
		.css({
			padding: '10px 0px 10px 30px',
			'-webkit-box-shadow': 'rgba(0, 0, 0, 0.2) 0 2px 4px 0'
		});
		var templates = kbAPI.templates.getAll();
		$(templates).each(function(){
			var name = this.get('id');
			var t = $('<li style="cursor:pointer;text-decoration: underline;color: darkblue;">' + name + '</li>');
			t.click(function(){
				var id = '<'+$(this).text()+'>';
				var attributes = kbAPI.templates.schema.attributes;
				var template = kbAPI.templates.getRecord(id);
				var templateObject = {};
				for(var a in attributes){
					var attr = attributes[a];
					templateObject[attr] = template.get(attr);
				};
				self.render_editor(dialogEl,templateObject);
			});
			templates_list.append(t);
		});
		
		dialogEl.append('Open a template:');
		dialogEl.append(templates_list);
	},
	
	render_editor: function(dialogEl, templateObject){
		var self = this;
		dialogEl.empty();
		var kbDiv = self.render_kb();
		var canvasDiv = self.render_canvas(templateObject);
		
		dialogEl
		.append(kbDiv)
		.append(canvasDiv);
	},
	
	render_kb: function(){
		var kbDiv = $('<div class="explanation-template-editor-kb">');
		var kbSchema = $('<div class="explanation-template-editor-kb-schema">');
		kbDiv
		.append('<h4>KB Schema</h4>')
		.append(kbSchema);
		var self = this;
		var list =  $('<ul>');
		
		var staticKB = $('<li id="explanation-template-editor-staticKB"></li>');
		var sKBh = $('<h5 class="item-header collapsed"><a href="#1">Static descriptive knowledge</a></h5>');
		accordion(sKBh);
		staticKB
		.append(sKBh)
		.append('<div class="item-body hidden">');
		
		var attr = kbAPI.staticKB.schema.attributes;
		var item_body = staticKB.find(' .item-body:first');
		self.render_nodes(attr, item_body);
		
		var interfaceKB = $('<li id="explanation-template-editor-interfaceKB"></li>');
		var iKBh = $('<h5 class="item-header collapsed"><a href="#1">Interface elements</a></h5>');
		accordion(iKBh);
		interfaceKB
		.append(iKBh)
		.append('<div class="item-body hidden">');

		attr = kbAPI.interfaceKB.schema.attributes;
		item_body = interfaceKB.find(' .item-body:first');
		self.render_nodes(attr, item_body);
		
		var historyKB = $('<li id="explanation-template-editor-historyKB"></li>');
		var hKBh = $('<h5 class="item-header collapsed"><a href="#1">Interaction history</a></h5>');
		accordion(hKBh);
		historyKB
		.append(hKBh)
		.append('<div class="item-body hidden">');
		
		attr = kbAPI.historyKB.schema.attributes;
		item_body = historyKB.find(' .item-body:first');
		self.render_nodes(attr, item_body);
		
		var annotationsKB = $('<li id="explanation-template-editor-annotationsKB"></li>');
		var aKBh = $('<h5 class="item-header collapsed"><a href="#1">Annotations</a></h5>');
		accordion(aKBh);
		annotationsKB
		.append(aKBh)
		.append('<div class="item-body hidden">');
		
		attr = ["metadata_about","metadata_type"];
		item_body = annotationsKB.find(' .item-body:first');
		self.render_nodes(attr, item_body);
		
		list
		.append(staticKB)
		.append(interfaceKB)
		.append(historyKB)
//		.append(annotationsKB)
		.appendTo(kbSchema);

		return kbDiv;
	},
	
	render_nodes: function(attr,body){
		for(var a in attr){
			var node = $('<div class="explanation-template-editor-KB-node">')
			.append('<h5>' + attr[a] + '</h5>')
			.draggable({
				stop: function(){
						$(this).css({
							left: '',
							top: ''
						});
					}
			});
			body.append(node);
		};
	},
	
	render_canvas: function(templateObject){
		var self = this;
		var canvasDiv = $('<div class="explanation-template-editor-canvas">')
		.css({'float':'left'})
		.append('<h4>Template</h4>');
		var label = $('<input class="explanation-template-editor-canvas-label">')
		var typesList = $('<input class="explanation-template-editor-canvas-types">');
		var canvasField = $('<div class="explanation-template-editor-canvas-field">');
		for(var i=1; i<25; i++){
			var line = $('<div class="explanation-template-editor-canvas-field-line">')
			.droppable({
				drop: function(event, ui){
					var entry = ui.draggable.clone()
					.removeClass()
					.css({
						left: '',
						top: '',
						'float': 'left'
					});
					var item = self.render_field_item(this,entry);
				}
			});
			var textInput = $('<input class="explanation-template-editor-canvas-field-line-input">');
			
			line.append(textInput);
			canvasField.append(line);
		};
		
		var save_btn = $('<button class="explanation-template-editor-canvas-save">Save</button>')
		.click(function(){
			self.save_template();
		});		
		
		//Fill the field this template's context
		if($.isArray(templateObject.types)){
			typesList.val(templateObject.types.join(', '));
		}
		else{
			typesList.val(templateObject.types);
		}
		label.val(templateObject.label);
		canvasDiv
		.append(label)
		.append(save_btn)
		.append(typesList);
		var context  = templateObject.context;
		if(context){
			context = ($.isArray(context[0]))? context: [context];
		
			for(var i = 0; i < context.length; i++){
				var context_entry = context[i];
				var line = canvasField.children()[i];
				for(var j in context_entry){
					var val = context_entry[j].value;
					var width = (context_entry[j].type == "reference")? 'auto': val.length*7 + 'px';
					var entry = (context_entry[j].type == "reference")? $('<h5>'+val+'</h5>'):$('<input class="explanation-template-editor-canvas-field-line-input" value="'+val+'">');
					entry.css({
						height: '14px',
						border: 'none',
						'font-size': '12px',
						'float': 'left',
						width: width
					});
					self.render_field_item(line,entry); 			
				}

			};
		}
		canvasField.appendTo(canvasDiv);
		
		return canvasDiv;
	},
	
	render_field_item: function(line,entry){
		var item = $('<div class="explanation-template-editor-canvas-field-line-item">');
		item.append(entry);
		var removeBtn = $('<div class="ui-icon ui-icon-circle-close" style="cursor:pointer;">');
		removeBtn.click(function(){
			item.remove();
		});
		item.append(removeBtn);
		
		var input = $(line).children().last();
		input.css({
			'width': 'auto'
		});
		
		//TODO: check if the input contains a text, then need to insert one blank input as last child
		if(input.val()){
			if(input.val().length>0){
				input.remove();
				$(line).append($('<input class="explanation-template-editor-canvas-field-line-input">'));
				this.render_field_item(line,input);
				item.insertBefore($(line).children().last());
			}
		}
		else{
			item.insertBefore($(line).children().last());
		}
	},
	
	save_template: function(){
		var label = $('.explanation-template-editor-canvas-label').val();
		if(label==''){
			alert('Please give a valide');
		}
		var typesList = $('.explanation-template-editor-canvas-types').val();
		var types = typesList.replace(/ /g,"").split(',');
		types = ($.isArray(types))? types: [types];
		var template_object = {
				id: label.replace(/ /g,'_').replace('?',''),
				label: label,
				types: types
		};
		var context = [];
		var canvasField = $('.explanation-template-editor-canvas-field');
		canvasField.children().each(function(){
			var line = $(this);
			var context_line = [];
			line.children().each(function(){
				var item = $(this);
				var node = item.hasClass('explanation-template-editor-canvas-field-line-input')? item[0]:item.children().first();
				var type = $(node).is('input')? 'manual': 'reference';
				var value = $(node).is('input')? $(node).val(): $(node).text();
				if(value.length > 0){
					context_line.push({value: value, type: type});
				}
			});	
			if(context_line.length > 0){
				context.push(context_line);
			}
		});
		template_object.context = context;
		if(kbAPI.templates.getRecord(template_object.id)){
			kbAPI.templates.updateRecord(template_object);
		}
		else{
			kbAPI.templates.addRecord(template_object);
		}
		ESUI.refresh();
		return template_object;
	}
	
	
});
var history = [];

var questions_mappings = {};
	
var ESUI = {};
	

$(window).load(function () {
	loadSampleKB();
	ESUI.init();
});

jQuery.extend(ESUI,{	
	init: function(){
		var self = this;
		self.renderSidePanel();
		construct_questions_mappings();
		indexInterfaceElements(self.options.predicate);
		self.renderExplControls(self.options.predicate);	
		//to make the Side panel visible by default
		$('.slide-out-div-handle').click();
	},

	refresh: function(){
		var self = this;
		construct_questions_mappings();
		setupExplMenu(self.options.predicate);
	},
	
	renderExplControls: function(predicate){
		var self = this;
		/******Create a node to render context menu******/
		var contextMenu = $('<ul id="myMenu" class="contextMenu"/>');
		$('body')
		.append(contextMenu)
		.click(function(event){
			event.stopPropagation();
			if($('.contextMenu').hasClass('show')){
				$('.contextMenu')
				.removeClass('show')
				.hide();
			}
		});
		/************************************************/
		
		/******Assign Explanation Menu to the predicated elements******/
		setupExplMenu(predicate);
	},
	
	renderSidePanel: function(){
		var self = this;
		//add to the document's body new elements to control and display explanations
		var userMode = $('<div id="explanation-usermode"><input type ="checkbox" checked>Advanced user mode</div>');
		var kbButton = $('<button id="kbButton" class="admin_controls show">KnowledgeBase</button>');
		var templButton = $('<button id="TEButton" class="admin_controls show">Template Editor</button>');
		var explDiv = $('<div class="slide-out-div">'+
						   '<div class="slide-out-div-handle"></div>'+
						'</div>');
		$('body').append(explDiv);
		
		userMode.find('input')
		.click(function(){
			if($(this).attr('checked')){
				$('.admin_controls').addClass('show');
				$('.admin_controls').removeClass('hidden');
			}
			else{
				$('.admin_controls').addClass('hidden');
				$('.admin_controls').removeClass('show');
			};
		});
		userMode.prependTo($('.slide-out-div'));	
		
		kbButton
		.click(function(){
			self.options.KBeditor();
		})
		.prependTo($('.slide-out-div'));	
		
		templButton
		.click(function(){
			self.options.templateEditor();
		})
		.prependTo($('.slide-out-div'));
		var nav_controls = render_navigation_controls();
		explDiv.append(nav_controls);
		explDiv.append('<div class="explanation-block">You can click blue question mark icons near the explainable interface element to request for information related to this element</div>');
		$('.slide-out-div').tabSlideOut({
				tabHandle: '.slide-out-div-handle',                     //class of the element that will become your tab
				pathToTabImage: 'https://github.com/2529742/klarigo/blob/master/img/explanation.png?raw=true', //path to the image for the tab //Optionally can be set using css
				imageHeight: '199px',                     //height of tab image           //Optionally can be set using css
				imageWidth: '44px',                       //width of tab image            //Optionally can be set using css
				tabLocation: 'right',                      //side of screen where tab lives, top, right, bottom, or left
				speed: 300,                               //speed of animation
				action: 'click',                          //options: 'click' or 'hover', action to trigger animation
				topPos: '0px',                          //position from the top/ use if tabLocation is left or right
				leftPos: '0px',                          //position from left/ use if tabLocation is bottom or top
				fixedPosition: true                      //options: true makes it stick(fixed position) on scroll
		});
	},
	
	/*Options for the ESUI API
	  templatEditor: a function to open the Template editor 
	  KBeditr: a function to open the Knowledge Base editor
	*/
	options: {
		predicate: {
			"main": 'h1',
			"annotated": '[typeof="Person"],[typeof="Place"],[typeof="City"]',
			"result": '.view-vieImageSearch-image',
			"results_set": '#image_container'
		},
		templateEditor: function(){
			templateEditor.open();
		},
		KBeditor: function(){
			explanationEditor.open();
		}
	}
});

function setupExplMenu(predicate){
	for(var type in predicate){
		eventsFilter(predicate[type]);
		var explainable = $(predicate[type]);
		explainable.livequery(function(){
			assign_menu(this);
		});
	}
}


function assign_menu(element){
		var explIcon = $('<div class = "explIcon"></div>');
		$(explIcon).insertAfter($(element));
		if(element instanceof HTMLHeadingElement){
			$(element).css({'float':'left'});
		}
		var id = $(element).attr("id");
		if(id){
			var questions = get_elementRelated_questions(id);
			var type = kbAPI.interfaceKB.getElementType(id);
			if(type){
				$(explIcon)
				.click(function(event){
						event.stopPropagation();
						var contextMenu = $('#myMenu');
						contextMenu.empty();

						render_questions(element,questions,contextMenu);

						contextMenu
						.show()
						.addClass('show')
						.offset({
							top : ($(this).offset().top + $(this).width()), 
							left: ($(this).offset().left + $(this).height())
							})
						.find('A')
						.mouseover( function() {
								$(contextMenu).find('LI.hover').removeClass('hover');
								$(this).parent().addClass('hover');
							})
						.mouseout( function() {
								$(contextMenu).find('LI.hover').removeClass('hover');
							});
			});
				
			}
		}
}

function render_questions(element,questions,target){
	for(var i = 0; i < questions.length; i++){
		var q = questions[i];
		var label = kbAPI.templates.getRecord('<'+q+'>').get('label');//TODO consider the right place for this part of the script
		var li = $('<li class="explain"><a href="#' + q + '">' + label + '</a></li>')
		.click(function(){
			var q = '';
			try{
				q = $(this).find('a').attr('href').substring(1);}
			catch(e){
				console.log(e);
			}
			var explanation = explanationBuilder.build(q,element);
			navigationCounter = explanationInstanceIDcounter;
			$('.explanation-navigation-forward').removeClass('show');
			$('.explanation-navigation-forward').addClass('hidden');	
			if(navigationCounter>1){
				$('.explanation-navigation-backward').removeClass('hidden');
				$('.explanation-navigation-backward').addClass('show');	
			}	
			$('.explanation-block').empty();
			$('.explanation-block').append(explanation);
			if(!$('.slide-out-div').hasClass('open')){
				$('.handle').click();
			}
		});
		target.append(li);
	};
}


//Based on saved templates constructs mapping of questions to the interface elements
function construct_questions_mappings(){
	$(kbAPI.templates.getAll()).each(function(){ 
		var cat = this.get('category');
		if(cat){
			var q = this.getSubjectUri();
			questions_mappings[cat] = questions_mappings[cat]? questions_mappings[cat]: {};
			questions_mappings[cat][q] = {label: this.get('label'), types: this.get('types')};
		}
		else{
			questions_mappings['custom'][this.getSubjectUri()] = {label: this.get('label'), types: this.get('types')};
		}
	});
	return questions_mappings;
}

//Returns questions related to the element type by it's ID
function get_elementRelated_questions(id){
	var type = kbAPI.interfaceKB.getElementType(id);
	var questions = [];

	for(var category in questions_mappings){
		for(var q in questions_mappings[category]){
			var mapping_types = questions_mappings[category][q].types;
			mapping_types = $.isArray(mapping_types)? mapping_types: [mapping_types];
			for(var i = 0; i < mapping_types.length; i++){
				if(mapping_types[i] == type){
					questions.push(q);
				}
			}
		}
	}
	return questions;
}

var navigationCounter = 0;

//Renders arrows for navigating the already rendered explanations
function render_navigation_controls(){
	var nav_panel = $('<div class="explanation-navigation">');
	var forward = $('<div class="explanation-navigation-forward hidden">>></div>');
	var backward = $('<div class="explanation-navigation-backward hidden"><<</div>');
	forward.click(function(){
		navigationCounter++;
		var explanationModel = kbAPI.explanations.getRecord('<explanationInstanceID'+navigationCounter+'>');
		var explanation = explanationBuilder.construct_explanation(explanationModel);	
		$('.explanation-block').empty();
		$('.explanation-block').append(explanation);
		if(navigationCounter == explanationInstanceIDcounter){
			$(this).removeClass('show');
			$(this).addClass('hidden');
		}
		if(navigationCounter > 1){
			$('.explanation-navigation-backward').removeClass('hidden');
			$('.explanation-navigation-backward').addClass('show');
		}
	});
	backward.click(function(){
		navigationCounter--;
		var explanationModel = kbAPI.explanations.getRecord('<explanationInstanceID'+navigationCounter+'>');
		var explanation = explanationBuilder.construct_explanation(explanationModel);	
		$('.explanation-block').empty();
		$('.explanation-block').append(explanation);
		if(navigationCounter == 1){
			$(this).removeClass('show');
			$(this).addClass('hidden');
		}
		if(navigationCounter < explanationInstanceIDcounter){
			$('.explanation-navigation-forward').removeClass('hidden');
			$('.explanation-navigation-forward').addClass('show');
		}
	});
	nav_panel.append(backward);
	nav_panel.append(forward);
	return nav_panel;
}

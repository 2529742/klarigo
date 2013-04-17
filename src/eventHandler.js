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
};
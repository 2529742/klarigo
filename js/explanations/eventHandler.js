if (!window.mappingFunctionsAPI) {
    window.mappingFunctionsAPI = {};
}

jQuery.extend(window.mappingFunctionsAPI, {
	newID: function(phase){
		var id = (phase? phase: 'id') + (new Date()).getTime();
		return id;
		},
	startPoint: function(id){
		var trace = printStackTrace();
		var callStack = {id: id, phase: 'start', trace: trace};
		return callStack;
		},
	endPoint: function(id){
		var trace = printStackTrace();
		var callStack = {id: id, phase: 'end', trace: trace};
		return callStack;
		},
	bindStack: function(id){
		var callStack = printStackTrace();
		var elementId =  $(element).id();
		var record = {
			id: elementId,
			stack: callStack
		}
		kbAPI.historyKB.addRecord(record);
		return callStack;
		}
});
var ajaxID = 0;
Error.stackTraceLimit = 30;

function eventsFilter(elements){
	var trace = "";
	if(!$.ajaxSettings.beforeSend){
		$.ajaxSetup({
			beforeSend: function(){
				ajaxID++;
				this.ajaxID = 'ajaxID'+ajaxID;
				console.log('Start query'+ajaxID);
				trace = printStackTrace({
					e: new Error()
				});
				console.log(trace);
				var rootEvent = traceStack();
				//TODO: recognize a root event (click) by its timeStamp, type and target attrs.
				var record = {id: 'eventID'+eventID++};
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
					listener(event,element);
				}
			);
		}
	};
}
var eventID = 0;

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
	if(rootEvent){record.rootEvent = generateEventID(rootEvent);}
	
	kbAPI.historyKB.addRecord(record);

	console.warn(element);
	console.log(event.name + '\n\n');
	console.log(trace);
	return record;
}

//trace through function's call stack to the root
function traceStack(){
	var rootEvent = undefined;
	var callee = arguments.callee.caller;
	var i = 0;
	while(callee.caller && i<Error.stackTraceLimit){
		callee = callee.caller;
		i++;
	}
	var args = callee.arguments;
	for(var a in args){
		if(args[a] instanceof Event){
			rootEvent = {};
			rootEvent.timeStamp = args[a].timeStamp;
			rootEvent.eventType = args[a].type;
			rootEvent.element = (args[a].currentTarget.id)? args[a].currentTarget.id: (explElementsCounter)? 'explID'+explElementsCounter++: undefined;
			console.log('Root event: ' + args[a]);
			//TODO: recognize ajax requests events and address the eventID
			
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

var eventTypes = {
//doc events
load: false,
onunload: false,
//DOM Nodes events
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
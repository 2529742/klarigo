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
				this.ajaxID = ajaxID;
				console.log('Start query'+ajaxID);
				trace = printStackTrace({
					e: new Error()
				});
				console.log(trace);
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
			$('body').delegate(
				elements,
				eventName,
				function(event){
					event.stopPropagation();
					var element;
					if(event.type == 'DOMNodeInserted' || 'DOMNodeRemoved'){
						element = event.target;
					}
					else{
						element = this;
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
	var rootEvent = traceStack(event);

	var record = {id: 'eventID '+eventID++};
	record.eventType = event.type;
	record.timeStamp = event.timeStamp;
	record.element = element.id;
	record.stack = trace;
	if(event.relatedNode){record.relatedNode = event.relatedNode.id;}
	if(rootEvent){record.rootEvent = traceStack(event);}
	
	kbAPI.historyKB.addRecord(record);

	console.warn(element);
	console.log(event.name + '\n\n');
	console.log(trace);
	return record;
}

//trace through function's call stack to the root
function traceStack(event){
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
			rootEvent.name = args[a].type;
			rootEvent.target = args[a].target.id;
			console.log('Root event: ' + args[a]);
		}
	}
	return rootEvent;
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
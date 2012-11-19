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
Error.stackTraceLimit = 100;

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
					listener(event.type,element);
				}
			);
		}
	};
}

function listener(eventName,element){
	console.warn(element);
	console.log(eventName + '\n\n');
	console.trace(function(e){
	debugger;})
	
	var trace = printStackTrace({
		e: new Error()
	});
	console.log(trace);
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
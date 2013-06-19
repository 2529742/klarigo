function accordion(a){a.click(function(){if($(this).hasClass("collapsed")){$(this).addClass("expanded");$(this).removeClass("collapsed");var b=$(this).parent().find(".item-body:first");if(b){b.removeClass("hidden").addClass("show")}}else{$(this).removeClass("expanded");$(this).addClass("collapsed");var b=$(this).parent().find(".item-body:first");if(b){b.addClass("hidden").removeClass("show")}}})}var kbVIE=new VIE();kbVIE.namespaces.add("explanation","http://ontology.vie.js/explanation/");var kbAPI={};jQuery.extend(kbAPI,{kb:function(){return kbVIE},init:function(){return kbVIE},save:function(){},getRecord:function(a){a=VIE.Util.isUri(a)?a:"<"+a+">";return kbVIE.entities.get(a)},removeRecord:function(a){kbVIE.entities.remove(a)},getAll:function(){return kbVIE.entities.models},staticKB:{idCount:0,schema:{attributes:["@type","@subject","title","description","purpose","use","start","elementType"]},newID:function(){return"static"+this.idCount++},getAll:function(){var a=[];try{a=kbVIE.entities.filter(function(f){return f.isof("<http://ontology.vie.js/explanation/static>")})}catch(b){}return a},newRecord:function(b){var a=kbVIE.entities.addOrUpdate({"@type":"<http://ontology.vie.js/explanation/static>","@subject":b,title:"",description:"",purpose:"",use:"",elementType:b,start:""});return a},addRecord:function(c){var f={"@type":"<http://ontology.vie.js/explanation/static>","@subject":c.elementType};for(var b in c){f[b]=c[b]}kbVIE.entities.add(f)},updateRecord:function(a){kbVIE.entities.addOrUpdate(a)},removeRecord:function(a){kbVIE.entities.remove(a)}},interfaceKB:{schema:{attributes:["@type","@subject","elementType","events","status","metadata_about","metadata_type"]},getAll:function(){var a=[];try{a=kbVIE.entities.filter(function(f){return f.isof("<http://ontology.vie.js/explanation/interface>")})}catch(b){}return a},getWhat:function(){var a=[];try{a=kbVIE.entities.filter(function(f){return f.isof("<http://ontology.vie.js/explanation/interface>")&&f.get("category")=="what"})}catch(b){}return a},getHow:function(){var a=[];try{a=kbVIE.entities.filter(function(f){return f.isof("<http://ontology.vie.js/explanation/interface>")&&f.get("category")=="how"})}catch(b){}return a},getWhy:function(){var a=[];try{a=kbVIE.entities.filter(function(f){return f.isof("<http://ontology.vie.js/explanation/interface>")&&f.get("category")=="why"})}catch(b){}return a},getCustom:function(){var a=[];try{a=kbVIE.entities.filter(function(f){return f.isof("<http://ontology.vie.js/explanation/interface>")&&f.get("category")=="custom"})}catch(b){}return a},addRecord:function(c){var f={"@type":"<http://ontology.vie.js/explanation/interface>","@subject":c.id};for(var b in c){f[b]=c[b]}kbVIE.entities.add(f)},getElementType:function(b){var a=kbVIE.entities.get(b).get("elementType");a=a.isEntity?a.getSubjectUri():a;return a},getEvents:function(b){var a=kbVIE.entities.get(b).get("events");return a},updateRecord:function(){}},historyKB:{schema:{attributes:["@type","@subject","timeStamp","eventType","element","relatedNode","callstack","rootEvent"]},getAll:function(){var a=[];try{a=kbVIE.entities.filter(function(f){return f.isof("<http://ontology.vie.js/explanation/history>")})}catch(b){}return a},getHistory:function(a){var b=[];try{b=kbVIE.entities.filter(function(f){return f.isof("<http://ontology.vie.js/explanation/history>")&&f.get("element")==a})}catch(c){}return b},addRecord:function(c){var f={"@type":"<http://ontology.vie.js/explanation/history>","@subject":c.id};for(var b in c){f[b]=c[b]}kbVIE.entities.add(f)},updateRecord:function(){}},templates:{schema:{attributes:["@type","@subject","related_elements","title","label","context","types","category"]},getAll:function(){var a=[];try{a=kbVIE.entities.filter(function(f){return f.isof("<http://ontology.vie.js/explanation/template>")})}catch(b){}return a},getQuestionsMappings:function(){var b={};try{}catch(a){}return b},getRecord:function(a){return kbVIE.entities.get(a)},addRecord:function(c){var f={"@type":"<http://ontology.vie.js/explanation/template>","@subject":c.id};for(var b in c){f[b]=c[b]}kbVIE.entities.addOrUpdate(f)},newRecord:function(f){var c={title:"",label:"",context:[],types:[]};for(var b in f){c[b]=f[b]}return c},updateRecord:function(b){var c=kbVIE.entities.get(b.id);for(var a in b){c.set(a,b[a])}}},explanations:{getAll:function(){var a=[];try{a=kbVIE.entities.filter(function(f){return f.isof("<http://ontology.vie.js/explanation/explanation>")})}catch(b){}return a},getRecord:function(a){return kbVIE.entities.get(a)},addRecord:function(a){kbVIE.entities.addOrUpdate(a);return kbVIE.entities.get(a["@subject"])}}});var explanationBuilder={};var explanationInstanceIDcounter=0;jQuery.extend(explanationBuilder,{build:function(r,f){var h=$(f).attr("id");var c=kbAPI.getRecord(h);var v=kbAPI.interfaceKB.getElementType(h);var b=kbAPI.getRecord(v);var s=kbAPI.historyKB.getHistory(h);explanationInstanceIDcounter++;var n={"@type":"<http://ontology.vie.js/explanation/explanation>","@subject":"explanationInstanceID"+explanationInstanceIDcounter,label:r,id:h};var C=[];if(s.length>0){var x=s[s.length-1];var p=x;var o=x.get("rootEvent");o=o.isEntity?o.getSubjectUri():o;var D=kbAPI.getRecord(o);do{if(p.get("eventType")=="ajax"){var k=p.get("query");k=(k.isEntity||k.isCollection)?k.models[0].attributes:k;var j="";for(var u in k){if(u!="@type"&&u!="@subject"){j=j+"<li>"+u.replace("http://schema.org/","").replace(/[<>]/g,"")+": "+k[u]+"</li>"}}C.push("<li>Ajax query with parameters: <ul>"+j+"</ul></li>")}else{var t=p.get("element")?$("#"+p.get("element"))[0].innerHTML:"";C.push("<li><b>"+t+"</b> - "+p.get("eventType")+"</li>")}o=p.get("rootEvent");o=o.isEntity?o.getSubjectUri():o;p=D;D=kbAPI.getRecord(o);var l=D.get("rootEvent");l=l.isEntity?l.getSubjectUri():l}while(o!=l);p=D;t=p.get("element")?$("#"+p.get("element"))[0].innerHTML:"";C.push("<li><b>"+t+"</b> - "+p.get("eventType")+"</li>")}var m="";for(var B=C.length-1;B>=0;B--){m=m+C[B]}n.trace="<ul>"+m+"</ul>";var y=kbAPI.staticKB.schema.attributes;if(b){for(var E in y){if(y[E]!="@type"&&y[E]!="@subject"){var w=b.get(y[E]);if(w){w=(w.isEntity)?w.getSubjectUri():w}n[y[E]]=w}}}y=kbAPI.interfaceKB.schema.attributes;if(c){for(var E in y){if(y[E]!="@type"&&y[E]!="@subject"){var w=c.get(y[E]);if(w){w=(w.isEntity)?w.getSubjectUri():w}n[y[E]]=w}}}var A=kbAPI.explanations.addRecord(n);return this.construct_explanation(A)},construct_explanation:function(o){var a=$("<div>");var k=o.get("label");k=k.isEntity?k.getSubjectUri():k;var t=kbAPI.templates.getRecord("<"+k+">");var r=o.get("id");r=r.isEntity?r.getSubjectUri():r;var n=$("#"+r)[0];var q=t.get("label");var b=t.get("context");var j="";if(b[0]){b=($.isArray(b[0]))?b:[b]}for(var p in b){var u=b[p];var s="";if($.isArray(u)){for(var m in u){var f=u[m];if(f.type=="reference"){s=o.get(f.value);if(s){s=(s.isEntity)?s.getSubjectUri():s;j=j+s}}else{s=f.value;j=j+s}}}else{s=o.get(u[m]);if(s){s=(s.isEntity)?s.getSubjectUri():s;j=j+s}else{j=j+u[m]}}j=j+"<br/>"}a.append("<b>"+n.innerHTML+"</b><br/><br/>"+q+" explanation.<br/></br/>"+j+'<div class="explanation-breakline">');var h=$("<ul></ul>");var l=get_elementRelated_questions(n.id);l.splice(l.indexOf(k),1);if(l.length>0){a.append('<div style="margin: 10px;">This information might be also interesting:</div>')}render_questions(n,l,h);a.append(h);return a}});var ajaxID=0;Error.stackTraceLimit=30;var explElementsCounter=1;function eventsFilter(c){var b="";if(!$.ajaxSettings.beforeSend){$.ajaxSetup({beforeSend:function(){ajaxID++;this.ajaxID="ajaxID"+ajaxID;$.ajaxSettings.ajaxID=ajaxID;console.log("Start query"+ajaxID);b=printStackTrace({e:new Error()});var i=traceStack();var f={id:this.ajaxID};var h=this.url;f.url=h;if(h.indexOf("?")>=0){var j=h.substr(h.indexOf("?")+1,h.length-h.indexOf("?"));j=j.split("&");z={};z.url=h.substr(0,h.indexOf("?"));for(var k in j){d=j[k];e=d.substr(d.indexOf("=")+1,d.length-d.indexOf("="));g=d.substr(0,d.indexOf("="));z[g]=e}f.query=z}f.eventType="ajax";f.ajaxID=this.ajaxID;f.stack=b;if(i){f.rootEvent=generateEventID(i)}f.timeStamp=new Date().getTime();kbAPI.historyKB.addRecord(f)}})}if(!$.ajaxSettings.success){$.ajaxSetup({complete:function(f){console.log("End query"+this.ajaxID)}})}for(var a in eventTypes){if(eventTypes[a]){$(c).livequery(a,function(h){var f=h.delegateTarget;if(h.type=="DOMNodeInserted"||h.type=="DOMNodeRemoved"){f=h.target}if(!$(f).hasClass("explIcon")){listener(h,f)}})}}}function listener(f,c){var h=printStackTrace({e:new Error()});var b=traceStack();var a={};a.eventType=f.type;a.timeStamp=f.timeStamp;if(c.id){a.element=c.id}else{c.id=(explElementsCounter)?"explID"+explElementsCounter++:undefined;a.element=c.id}a.id=generateEventID(a);a.stack=h;if(f.relatedNode){a.relatedNode=f.relatedNode.id}if(b){a.rootEvent=b.ajaxID?b.ajaxID:generateEventID(b)}kbAPI.historyKB.addRecord(a);console.warn(c);console.log(f.name+"\n\n");console.log(h);return a}function traceStack(){var j=undefined;var c=undefined;var k=arguments.callee.caller;var h=0;var f=k.arguments;while(k.caller&&h<Error.stackTraceLimit){k=k.caller;for(var b in f){if(f[b]&&f[b].ajaxID){c=f[b].ajaxID}}h++;f=k.arguments}for(var b in f){if(f[b] instanceof Event){j={};j.timeStamp=f[b].timeStamp;j.eventType=f[b].type;j.element=(f[b].currentTarget.id)?f[b].currentTarget.id:(explElementsCounter)?"explID"+explElementsCounter++:undefined;if(c){j.ajaxID=c}console.log("Root event: "+f[b])}}return j}function parseEventID(c){var a={};var b=c.split("@");if(b.length==3){a.element=b[0];a.type=b[1];a.timeStamp=b[2]}else{throw new Exception("Failed to parse event ID: "+c)}return a}function generateEventID(a){var b=a.element+"@"+a.eventType+"@"+a.timeStamp;return b}function indexInterfaceElements(a){for(var b in a){eventsFilter(a[b]);var c=$(a[b]);c.livequery(function(){indexElement(this,a)})}}function indexElement(i,a){var c=undefined;for(var h in a){if($(i).is(a[h])){c=h}}if(c){var k;if(i.id){k=i.id}else{k="explID"+explElementsCounter++;i.id=k}var f=[];for(var j in $(i).data("events")){if(j=="click"||j=="ondblclick"){f.push(j)}}var b={id:k,events:f,elementType:c,status:"added"};if(c=="annotated"){b.metadata_about=$(i).attr("about");if($(i).attr("typeof")){b.metadata_type=$(i).attr("typeof")}}kbAPI.interfaceKB.addRecord(b)}else{console.log("Element:"+i+" does not match the elements type predicate")}}var eventTypes={load:false,onunload:false,DOMNodeInserted:true,DOMNodeRemoved:false,onblur:false,onchange:false,onfocus:false,onreset:false,onselect:false,onsubmit:false,onabort:false,onkeydown:false,onkeypress:false,onkeyup:false,click:true,ondblclick:false,onmousedown:false,onmousemove:false,onmouseout:false,onmouseover:false,onmouseup:false};var explanationEditor={};jQuery.extend(explanationEditor,{create:function(){var a=$('<div id="explanation_editor">').dialog({title:"Knowledge Base",width:"500px"})},open:function(){if(jQuery("#explanation_editor").length==0){this.create()}var a=$("#explanation_editor");a.empty();this.render(a);a.dialog("open")},render:function(q){var p=this;var m=$("<ul>");var c=$('<li id="staticKB"></li>');var o=$('<h5 class="item-header collapsed"><a href="#1">Static descriptive knowledge</a></h5>');accordion(o);c.append(o).append('<div class="item-body hidden">');var k=$('<li id="interfaceKB"></li>');var i=$('<h5 class="item-header collapsed"><a href="#1">Interface elements</a></h5>');accordion(i);k.append(i).append('<div class="item-body hidden">');var s=$('<li id="historyKB"></li>');var n=$('<h5 class="item-header collapsed"><a href="#1">Interaction history</a></h5>');accordion(n);s.append(n).append('<div class="item-body hidden">');var b=$('<div class="explanation-editor-add">').append("<button>add record</button>");b.click(function(){var r=$('<div>Please set the element type:<input id="record-type"></div>').dialog({buttons:[{text:"OK",click:function(){var t=kbAPI.staticKB.newRecord($(this).find("input")[0].value);var u=p.render_record(t,kbAPI.staticKB,{addControls:true}).el;$("#staticKB").find(".item-body:first").append(u);$(this).dialog("close")}},{text:"Cancel",click:function(){$(this).dialog("close")}}],title:"New record"})});c.find(".item-body:first").append(b);var h=kbAPI.staticKB.getAll();for(var a in h){var j=h[a];var l=p.render_record(j,kbAPI.staticKB,{addControls:true}).el;var f=c.find(" .item-body:first");if(f){f.append(l)}}h=kbAPI.interfaceKB.getAll();for(var a in h){var j=h[a];var l=p.render_record(j,kbAPI.interfaceKB,{addControls:false}).el;var f=k.find(" .item-body:first");if(f){f.append(l)}}h=kbAPI.historyKB.getAll();for(var a in h){var j=h[a];var l=p.render_record(j,kbAPI.historyKB,{addControls:false}).el;var f=s.find(" .item-body:first");if(f){f.append(l)}}m.append(c).append(k).append(s).appendTo(q)},render_record:function(a,f,b){b=b?b:{};var c=Backbone.View.extend({className:"explanation-record",initialize:function(){this.render()},render:function(){var n=this;var r=$(this.el);var m=a.id?("Record - "+a.id.replace(/<|>/g,"")):"Record";var q=$('<h5 class="item-header collapsed"><a href="#1">'+m+"</a></h5>");accordion(q);var j=$('<div class="explanation-record-delete ui-icon ui-icon-trash">del</div>');j.click(function(){var s=$("<div>Attention!!!<br/> The record will be deleted!<br/> Do you want to proceed?</div>").dialog({buttons:[{text:"OK",click:function(){f.removeRecord(a);r.remove();$(this).dialog("close")}},{text:"Cancel",click:function(){$(this).dialog("close")}}],dialogClass:"alert",title:"Attention!"})});r.append(q);var h=$('<button class="explanation-record-save ui-button">Save changes</Button>').css({"float":"left","margin-right":"10px"});h.click(function(){var s=$("<div><br/>Save changes?</div>").dialog({buttons:[{text:"OK",click:function(){var t=r.find(".explanation-record-attribute");t.each(function(){var u=$(this).find(".explanation-record-attribute-label").text();var v=$(this).find(".explanation-record-attribute-value textarea")[0].value;a.setOrAdd(u,v)});f.updateRecord(a);$(this).dialog("close")}},{text:"Cancel",click:function(){$(this).dialog("close")}}],dialogClass:"confirm",title:"Confirm"})});var i=$('<table class="item-body hidden">');var k=$("<tr></tr>").append("<td>").append($('<td class="explanation-record-header">').append(h).append(j));if(b.addControls){i.append(k)}var p=a.attributes;for(var o in p){var l=jQuery('<tr class="explanation-record-attribute"></tr>');l.append('<td class="explanation-record-attribute-label">'+o.replace(/<|>/g,"")+"</td>").append('<td class="explanation-record-attribute-value"><textarea>'+p[o]+"</textarea></td>");i.append(l)}r.append(i)}});return new c({model:a})}});var templateEditor={};var template_types={what:{label:"What..?"},how:{label:"How..?"},why:{label:"Why..?"},custom:{label:"Custom explanation:"}};jQuery.extend(templateEditor,{create:function(){var a=$('<div id="template_editor">').dialog({title:"Template editor",width:"auto",position:{my:"left bottom",at:"left"},resizable:"false"});this.render_main(a)},open:function(){var a=this;if(jQuery("#template_editor").length==0){a.create()}var b=$("#template_editor");this.render_main(b);b.dialog("open")},render_main:function(k){var j=this;k.empty();var c=$('<ul class="ui-corner-all"></ul>').css({padding:"10px 0px 10px 30px","-webkit-box-shadow":"rgba(0, 0, 0, 0.2) 0 2px 4px 0"});for(var f in template_types){var i=$('<li  style="cursor:pointer;">');var a=$('<div class="ui-state-default ui-corner-all" style="width:190px; min-height: 20px; margin-bottom: 2px;">'+template_types[f].label+"</div>");i.append(a);var l=$('<div class="ui-icon ui-icon-plus">').css({position:"relative",left:"170px","margin-top":"-20px"});a.append(l);i.click(function(){var n="";for(var m in template_types){if(template_types[m].label==$(this).text()){n=m}}var o=kbAPI.templates.newRecord({category:n});j.render_editor(k,o)});i.appendTo(c)}k.append("Add a new template of type:");k.append(c);var b=$('<ul class="ui-corner-all"></ul>').css({padding:"10px 0px 10px 30px","-webkit-box-shadow":"rgba(0, 0, 0, 0.2) 0 2px 4px 0"});var h=kbAPI.templates.getAll();$(h).each(function(){var m=this.get("id");m=m.isEntity?m.getSubjectUri():m;var n=$('<li style="cursor:pointer;text-decoration: underline;color: darkblue;">'+m+"</li>");n.click(function(){var w="<"+$(this).text()+">";var r=kbAPI.templates.schema.attributes;var s=kbAPI.templates.getRecord(w);var t={};for(var p in r){var o=r[p];var u=s.get(o);if(u){u=u.isEntity?u.getSubjectUri():u;if($.isArray(u)){for(var q in u){if(u[q].isEntity){u[q]=u[q].getSubjectUri()}}}}t[o]=u}j.render_editor(k,t)});b.append(n)});k.append("Open a template:");k.append(b)},render_editor:function(h,f){var b=this;h.empty();var a=b.render_kb();var c=b.render_canvas(f);h.append(a).append(c)},render_kb:function(){var c=$('<div class="explanation-template-editor-kb">');var h=$('<div class="explanation-template-editor-kb-schema">');c.append("<h4>KB Schema</h4>").append(h);var p=this;var k=$("<ul>");var a=$('<li id="explanation-template-editor-staticKB"></li>');var o=$('<h5 class="item-header collapsed"><a href="#1">Static descriptive knowledge</a></h5>');accordion(o);a.append(o).append('<div class="item-body hidden">');var l=kbAPI.staticKB.schema.attributes;var b=a.find(" .item-body:first");p.render_nodes(l,b);var j=$('<li id="explanation-template-editor-interfaceKB"></li>');var f=$('<h5 class="item-header collapsed"><a href="#1">Interface elements</a></h5>');accordion(f);j.append(f).append('<div class="item-body hidden">');l=kbAPI.interfaceKB.schema.attributes;b=j.find(" .item-body:first");p.render_nodes(l,b);var q=$('<li id="explanation-template-editor-historyKB"></li>');var n=$('<h5 class="item-header collapsed"><a href="#1">Interaction history</a></h5>');accordion(n);q.append(n).append('<div class="item-body hidden">');l=kbAPI.historyKB.schema.attributes;b=q.find(" .item-body:first");p.render_nodes(l,b);var m=$('<li id="explanation-template-editor-annotationsKB"></li>');var i=$('<h5 class="item-header collapsed"><a href="#1">Annotations</a></h5>');accordion(i);m.append(i).append('<div class="item-body hidden">');l=["metadata_about","metadata_type"];b=m.find(" .item-body:first");p.render_nodes(l,b);k.append(a).append(j).append(q).appendTo(h);return c},render_nodes:function(c,b){for(var f in c){var h=$('<div class="explanation-template-editor-KB-node">').append("<h5>"+c[f]+"</h5>").draggable({stop:function(){$(this).css({left:"",top:""})}});b.append(h)}},render_canvas:function(n){var t=this;var v=$('<div class="explanation-template-editor-canvas">').css({"float":"left"}).append("<h4>Template</h4>");var p=$('<input class="explanation-template-editor-canvas-label">');var f=$('<input class="explanation-template-editor-canvas-category" style="visibility:hidden;">');var k=$('<input class="explanation-template-editor-canvas-types">');var s=$('<div class="explanation-template-editor-canvas-field">');for(var o=1;o<25;o++){var u=$('<div class="explanation-template-editor-canvas-field-line">').droppable({drop:function(w,x){var j=x.draggable.clone().removeClass().css({left:"",top:"","float":"left"});var i=t.render_field_item(this,j)}});var l=$('<input class="explanation-template-editor-canvas-field-line-input">');u.append(l);s.append(u)}var r=$('<button class="explanation-template-editor-canvas-save">Save</button>').click(function(){t.save_template()});if($.isArray(n.types)){k.val(n.types.join(", "))}else{k.val(n.types)}p.val(n.label);f.val(n.category);v.append(p).append(r).append(k).append(f);var c=n.context;if(c){c=($.isArray(c[0]))?c:[c];for(var o=0;o<c.length;o++){var a=c[o];var u=s.children()[o];for(var m in a){var h=a[m].value;var b=(a[m].type=="reference")?"auto":h.length*7+"px";var q=(a[m].type=="reference")?$("<h5>"+h+"</h5>"):$('<input class="explanation-template-editor-canvas-field-line-input" value="'+h+'">');q.css({height:"14px",border:"none","font-size":"12px","float":"left",width:b});t.render_field_item(u,q)}}}s.appendTo(v);return v},render_field_item:function(a,h){var f=$('<div class="explanation-template-editor-canvas-field-line-item">');f.append(h);var c=$('<div class="ui-icon ui-icon-circle-close" style="cursor:pointer;">');c.click(function(){f.remove()});f.append(c);var b=$(a).children().last();b.css({width:"auto"});if(b.val()){if(b.val().length>0){b.remove();$(a).append($('<input class="explanation-template-editor-canvas-field-line-input">'));this.render_field_item(a,b);f.insertBefore($(a).children().last())}}else{f.insertBefore($(a).children().last())}},save_template:function(){var c=$(".explanation-template-editor-canvas-label").val();var j=$(".explanation-template-editor-canvas-category").val();if(c==""){alert("Please give a valide")}var i=$(".explanation-template-editor-canvas-types").val();var h=i.replace(/ /g,"").split(",");h=($.isArray(h))?h:[h];var b={id:c.replace(/ /g,"_").replace("?",""),label:c,types:h,category:j};var f=[];var a=$(".explanation-template-editor-canvas-field");a.children().each(function(){var k=$(this);var l=[];k.children().each(function(){var o=$(this);var n=o.hasClass("explanation-template-editor-canvas-field-line-input")?o[0]:o.children().first();var m=$(n).is("input")?"manual":"reference";var p=$(n).is("input")?$(n).val():$(n).text();if(p.length>0){l.push({value:p,type:m})}});if(l.length>0){f.push(l)}});b.context=f;if(kbAPI.templates.getRecord(b.id)){kbAPI.templates.updateRecord(b)}else{kbAPI.templates.addRecord(b)}ESUI.refresh();return b}});var history=[];var questions_mappings={};var ESUI={};$(window).load(function(){loadSampleKB();ESUI.init()});jQuery.extend(ESUI,{init:function(){var a=this;a.renderSidePanel();construct_questions_mappings();indexInterfaceElements(a.options.predicate);a.renderExplControls(a.options.predicate)},refresh:function(){var a=this;construct_questions_mappings();setupExplMenu(a.options.predicate)},renderExplControls:function(a){var b=this;var c=$('<ul id="myMenu" class="contextMenu"/>');$("body").append(c).click(function(f){f.stopPropagation();if($(".contextMenu").hasClass("show")){$(".contextMenu").removeClass("show").hide()}});setupExplMenu(a)},renderSidePanel:function(){var b=this;var a=$('<div id="explanation-usermode"><input type ="checkbox" checked>Advanced user mode</div>');var h=$('<button id="kbButton" class="admin_controls show">KnowledgeBase</button>');var i=$('<button id="TEButton" class="admin_controls show">Template Editor</button>');var c=$('<div class="slide-out-div"><div class="slide-out-div-handle"></div></div>');$("body").append(c);a.find("input").click(function(){if($(this).attr("checked")){$(".admin_controls").addClass("show");$(".admin_controls").removeClass("hidden")}else{$(".admin_controls").addClass("hidden");$(".admin_controls").removeClass("show")}});a.prependTo($(".slide-out-div"));h.click(function(){b.options.KBeditor()}).prependTo($(".slide-out-div"));i.click(function(){b.options.templateEditor()}).prependTo($(".slide-out-div"));var f=render_navigation_controls();c.append(f);c.append('<div class="explanation-block">You can click blue question mark icons near the explainable interface element to request for information related to this element</div>');$(".slide-out-div").tabSlideOut({tabHandle:".slide-out-div-handle",pathToTabImage:"https://github.com/2529742/klarigo/blob/master/css/img/explanation.png?raw=true",imageHeight:"199px",imageWidth:"44px",tabLocation:"right",speed:300,action:"click",topPos:"0px",leftPos:"0px",fixedPosition:true})},options:{predicate:{main:"h1",annotated:'[typeof="Person"],[typeof="Place"],[typeof="City"]',result:".view-vieImageSearch-image",results_set:"#image_container"},templateEditor:function(){templateEditor.open()},KBeditor:function(){explanationEditor.open()}}});function setupExplMenu(a){$(".explIcon").remove();for(var b in a){eventsFilter(a[b]);var c=$(a[b]);c.livequery(function(){if($(this).next().is(".explIcon")){$(this).next().remove()}assign_menu(this)})}}function assign_menu(a){var f=$('<div class = "explIcon"></div>');$(f).insertAfter($(a));if(a instanceof HTMLHeadingElement){$(a).css({"float":"left"})}var h=$(a).attr("id");if(h){var c=get_elementRelated_questions(h);var b=kbAPI.interfaceKB.getElementType(h);if(b){$(f).click(function(j){j.stopPropagation();var i=$("#myMenu");i.empty();render_questions(a,c,i);i.show().addClass("show").offset({top:($(this).offset().top+$(this).width()),left:($(this).offset().left+$(this).height())}).find("A").mouseover(function(){$(i).find("LI.hover").removeClass("hover");$(this).parent().addClass("hover")}).mouseout(function(){$(i).find("LI.hover").removeClass("hover")})})}}}function render_questions(f,h,k){for(var c=0;c<h.length;c++){var j=h[c];var b=kbAPI.templates.getRecord("<"+j+">").get("label");var a=$('<li class="explain"><a href="#'+j+'">'+b+"</a></li>").click(function(){var l="";try{l=$(this).find("a").attr("href").substring(1)}catch(m){console.log(m)}var i=explanationBuilder.build(l,f);navigationCounter=explanationInstanceIDcounter;$(".explanation-navigation-forward").removeClass("show");$(".explanation-navigation-forward").addClass("hidden");if(navigationCounter>1){$(".explanation-navigation-backward").removeClass("hidden");$(".explanation-navigation-backward").addClass("show")}$(".explanation-block").empty();$(".explanation-block").append(i);if(!$(".slide-out-div").hasClass("open")){$(".slide-out-div-handle").click()}});k.append(a)}}function construct_questions_mappings(){$(kbAPI.templates.getAll()).each(function(){var a=this.get("category");if(a){var b=this.getSubjectUri();questions_mappings[a]=questions_mappings[a]?questions_mappings[a]:{};questions_mappings[a][b]={label:this.get("label"),types:this.get("types")}}else{questions_mappings.custom[this.getSubjectUri()]={label:this.get("label"),types:this.get("types")}}});return questions_mappings}function get_elementRelated_questions(l){var h=kbAPI.interfaceKB.getElementType(l);var f=[];for(var j in questions_mappings){for(var k in questions_mappings[j]){var b=questions_mappings[j][k].types;b=$.isArray(b)?b:[b];for(var c=0;c<b.length;c++){var a=b[c];a=a.isEntity?a.getSubjectUri():a;if(a==h){f.push(k)}}}}return f}var navigationCounter=0;function render_navigation_controls(){var c=$('<div class="explanation-navigation">');var a=$('<div class="explanation-navigation-forward hidden">>></div>');var b=$('<div class="explanation-navigation-backward hidden"><<</div>');a.click(function(){navigationCounter++;var h=kbAPI.explanations.getRecord("<explanationInstanceID"+navigationCounter+">");var f=explanationBuilder.construct_explanation(h);$(".explanation-block").empty();$(".explanation-block").append(f);if(navigationCounter==explanationInstanceIDcounter){$(this).removeClass("show");$(this).addClass("hidden")}if(navigationCounter>1){$(".explanation-navigation-backward").removeClass("hidden");$(".explanation-navigation-backward").addClass("show")}});b.click(function(){navigationCounter--;var h=kbAPI.explanations.getRecord("<explanationInstanceID"+navigationCounter+">");var f=explanationBuilder.construct_explanation(h);$(".explanation-block").empty();$(".explanation-block").append(f);if(navigationCounter==1){$(this).removeClass("show");$(this).addClass("hidden")}if(navigationCounter<explanationInstanceIDcounter){$(".explanation-navigation-forward").removeClass("hidden");$(".explanation-navigation-forward").addClass("show")}});c.append(b);c.append(a);return c};
var history = [];
var explElementsCounter = 1;
var predicate = {
	"main": 'h1',
	"annotated": '[typeof="Person"],[typeof="Place"],[typeof="City"]',
	"result": '.view-vieImageSearch-image',
	"results_set": '#image_container'
	
	};
var questions_mappings = {};
	

$(window).load(function () {
	loadSampleKB();	
	renderSidePanel();
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
	construct_questions_mappings();
	indexInterfaceElements();
});

function indexInterfaceElements(){
	for(var type in predicate){
		eventsFilter(predicate[type]);
		var explainable = $(predicate[type]);
		explainable.livequery(function(){
			var elType = type;
			for(var t in predicate){
				if($(this).is(predicate[t])){
					elType = t;
				}
			}
			var id;
			if(this.id){
				id = this.id;
			}
			else{
				id = 'explID'+explElementsCounter++;
				this.id = id;
			}
			var events = [];
			for(var e in $(this).data('events')){
				events.push(e);//TODO: exclude system events
			}
			var record = {
				id: id,
				events: events,
				elementType: elType,
				status: 'added'
			};
			kbAPI.interfaceKB.addRecord(record);
			assign_menu(this);
		});
	}
}



function renderSidePanel(){
	//add to the document's body new elements to control and display explanations
	var userMode = '<p style="height:40px;"><input type ="checkbox" style="margin-bottom:50px;float:right;" checked><span style="float:right;">Advanced user mode</span></p>';
	var kbButton = '<p><button id="kbButton" class="admin_controls" style="visibility:visible;">KnowledgeBase</button></p>';
	var templButton = '<p><button id="TEButton" class="admin_controls" style="visibility:visible;">Template Editor</button></p>';
	var explDiv = '<div class="slide-out-div">'+
					'<div class="handle"></div>'+
				'<div class="explanation_block">EXPLANATIONS</div></div>';
	$('body').append(explDiv);
	$(userMode)
	.click(function(){
		if($(this).find('input').attr('checked')){
			$('.admin_controls').css({visibility: 'visible'});
		}
		else{
			$('.admin_controls').css({visibility: 'hidden'});
		};
	})
	.prependTo($('.slide-out-div'));	
	$(kbButton)
	.click(function(){
		explanationEditor.open();
	})
	.prependTo($('.slide-out-div'));	
	$(templButton)
	.click(function(){
		templateEditor.open();
	})
	.prependTo($('.slide-out-div'));
    $('.slide-out-div').tabSlideOut({
            tabHandle: '.handle',                     //class of the element that will become your tab
            pathToTabImage: 'img/explanation.png', //path to the image for the tab //Optionally can be set using css
            imageHeight: '199px',                     //height of tab image           //Optionally can be set using css
            imageWidth: '44px',                       //width of tab image            //Optionally can be set using css
            tabLocation: 'right',                      //side of screen where tab lives, top, right, bottom, or left
            speed: 300,                               //speed of animation
            action: 'click',                          //options: 'click' or 'hover', action to trigger animation
            topPos: '0px',                          //position from the top/ use if tabLocation is left or right
            leftPos: '0px',                          //position from left/ use if tabLocation is bottom or top
            fixedPosition: true                      //options: true makes it stick(fixed position) on scroll
    });
	$('.handle').click();
}

function assign_menu(element){
		//version with indroduction of new interface elements: new icons to navigate explanation
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
			$('.explanation_block').empty();
			$('.explanation_block').append(explanation);
		});
		target.append(li);
	};
}

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
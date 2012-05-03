var history = [];
var counter = 1;
var predicate = {
	"annotated": '[typeof="Person"],[typeof="Place"],[typeof="City"]',
	"result": '.view-vieImageSearch-image'
	};

$(window).load(function () {
	//eventsFilter('[about]');
	this.renderSidePanel();
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
	this.indexInterfaceElements();
	for(var type in predicate){
		var explainable = $(predicate[type]);
		explainable.each(function(){
			assign_menu(this);}
		);
	};
});

$('.view-vieImageSearch-image >img').live('load',function(){
	assign_menu(this);
});

function indexInterfaceElements(){
	kbAPI.init();
	for(var type in predicate){
		$(predicate[type]).each(function(){
			var id;
			if(this.id){
				id = this.id;
			}
			else{
				id = 'explID'+counter++;
				this.id = id;
			}
			kbAPI.interfaceElementsKB.addRecord(id,type);
		});
	}
	kbAPI.save();
}



function renderSidePanel(){
	//add to the document's body new elements to control and display explanations
	var userMode = '<p style="height:40px;"><input type ="checkbox" style="margin-bottom:50px;float:right;"><span style="float:right;">Advanced user mode</span></p>';
	var explDiv = '<div class="slide-out-div">'+
					'<div class="handle"></div>'+
				'<div class="explanation_block">EXPLANATIONS</div></div>';
	$('body').append(explDiv);
	$(userMode).prependTo($('.slide-out-div'));	
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
		var explIcon = $('<div class = "explIcon"><img src="img/question.png" style="height: 15px; width:15px"></div>');
		$(explIcon).insertAfter($(element));
		var id = $(element).attr("id");
		kbAPI.init();
		if(id){
			var type = kbAPI.interfaceElementsKB.getElementType(id);
			var questions = [];
			for(var q in questions_mappings){
				var mapping_types = questions_mappings[q].types;
				for(var i = 0; i < mapping_types.length; i++){
					if(mapping_types[i] == type){
						questions.push(q);
					}
				}
			}
			if(type){
				$(explIcon)
				.css('display','inline')		
				.click(function(event){
						event.stopPropagation();
						var contextMenu = $('#myMenu');
						contextMenu.empty();
						
						for(var i = 0; i < questions.length; i++){
							var q = questions[i];
							var label = questions_mappings[q].label;
							var li = $('<li class="explain"><a href="#annotated">' + label + '</a></li>')
							.click(function(){
								//backbone...
								var metadata = new metadataModel({
									element: element,
									label: label,
									id: $(element).attr('id'),
									metadata: {
										about: $(element).attr('about'),
										type: $(element).attr('typeof')
									}
								});
								var view = new metadataView({model: metadata});
								$('.explanation_block').empty();
								$('.explanation_block').append(view.el);
								}
							);
							contextMenu.append(li);
						}
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
/* 					function(action, el, pos) {
						
						switch(action){
							case 'annotated': //'What Is It?' explanation
								explHtml = element.innerHTML+'<br/><br/>"What is it?" explanation.<br/></br/>'+(dynamic? 'This is an image from the Flickr image library.':('This is annotated element of TYPE: <b>'+$(element).attr('typeof')+'</b>.'));
							break;
							case 'dynamic':
								explHtml = element.innerHTML+'<br/><br/>"Why is it here?" explanation.<br/><br/>This is a <b>'+ (dynamic? 'dynamic':'static')+'</b> element. '+
								(dynamic? 'It is a result of image search query.':'');
							break;
						}
						$('.explanation_block').empty();
						$('.explanation_block').append(explHtml);
 */				});
				
			}
		}
		/*$(this).contextMenu({
			menu: 'myMenu'
			},
			function(action, el, pos) {
				var explHtml;
				switch(action){
					case 'wii': //'What Is It?' explanation
						explHtml = '"What is it?" explanation should come here.';
					break;
					case 'htui':
						explHtml = '"How to use it?" explanation should come here.';
					break;
				}
				$('.explanation_block').empty();
				$('.explanation_block').append(explHtml);		
		});*/
}
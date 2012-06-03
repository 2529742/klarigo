var explanationBuilder = {};

jQuery.extend(explanationBuilder,{
	build: function(question,element){
			var model = Backbone.Model.extend({
				type:'metadata',
				element: '',
				label: '',
				metadata: {
					about:'',
					type:''
				}
			});
			var label = questions_mappings[question].label;
			var metadata = new model({
				element: element,
				label: label,
				id: $(element).attr('id'),
				metadata: {
					about: $(element).attr('about'),
					type: $(element).attr('typeof')
				}
			});
			var view = undefined;
			if(question == 'what_is_it'){
				view = new witView({model: metadata});
			}
			else if(question == 'metadata'){
				view = new metadataView({model: metadata});
			}
			$('.explanation_block').empty();
			
			if(view){
				$('.explanation_block').append(view.el)
			}
	}
});

// VIE Widgets - Vienna IKS Editable Widgets
// (c) 2011 Sebastian Germesin, IKS Consortium
// VIE Widgets may be freely distributed under the MIT license.
// (see LICENSE)

(function($, undefined) {
    $.widget('view.vieImageSearch', {
        
        _create: function () {
            this._initOntology();
            return this;
        },
        
        _init: function () {
            this._triggerSearch(this.options.entity);
        },
        
        useService : function (serviceId, use) {
        	if (this.options.services[serviceId]) {
        		this.options.services[serviceId]["use"] = (use === undefined)? true : use;
        	}
        },
        
        _triggerSearch: function (entityUri) {
            var widget = this;
            
            if (widget.options.timer) {
            	//clear any other running query
                clearTimeout(widget.options.timer);
            }
            widget.options.query_id++;
            var queryId = this.options.query_id;
            
            widget.options.objects = {};
            
            var entity = undefined;
            if (typeof entityUri === "string") {
                entity = widget.options.vie.entities.get(entityUri);
            } else {
                entity = entityUri;
            }

            if (entity) {
                var queryPerformed = false;
                for (var serviceId in widget.options.services) {
                    var service = widget.options.services[serviceId];
                    if (service.use) {
                        this._trigger('start_query', undefined, {entity: entity, service: serviceId, time: new Date(), queryId : queryId});
                        service.query.call(widget, serviceId, entity, queryId);
                        queryPerformed = true;
                    }
                }
                if (queryPerformed) {
                	widget.options.timer = setTimeout(function (widget) {
                        return function () {
                            // discard all results that return after this timeout happened
                            widget.options.query_id++;
                        };
                    }(widget), widget.options.timeout, "JavaScript");
                } else {
                	widget._trigger('error', undefined, {msg: "No services registered! Please use $(...).vieImageWidget('useService', 'gimage', true)", id : entityUri});
                }
            } else {
            	widget._trigger('error', undefined, {msg: "Entity needs to be registered in VIE.", id : entityUri});
            }
            return widget;
        },
        
        render: function (data) {
        	var widget = this;
        	
        	clearTimeout(widget.options.timer);
            
        	data.time = (data.time)? data.time : new Date();
            if (data.queryId === widget.options.query_id) {
                for (var p = 0; p < data.objects.length; p++) {
                    this._triplifyObject(data.objects[p], data.time, data.serviceId, data.entityId, data.queryId);
                }
                var render = (widget.options.render)? widget.options.render : widget._defaultRender;
            	var objEntities = 
            		widget.options.vie.entities.select(
            				function (entity) {
            					return entity.isof("VIEImageResult") && entity.get("query") === data.queryId;
            					}
        					);
                var objEntitiesSorted = widget._sortObjectsByWeight.call(widget, objEntities);
                render.call(widget, objEntitiesSorted);
            } else {
                //discard results as they depend on an old query
            }
        },
        
        _sortObjectsByWeight : function (objEntities) {
        	var widget = this;
            var ret = [];
            
        	var maxIdx = 10;
        	for (var idx = 0; idx < maxIdx; idx++) {
	        	for (var serviceId in widget.options.services) {
	        		var objectsOfService = _.select(objEntities, function (obj) {return obj.get("service") === serviceId;});
	        		
	        		if (idx < objectsOfService.length) {
	        			var obj = objectsOfService[idx];
	        			
	        			var objWeight = widget.options.services[serviceId].weight;
	        			
	        			for (var r = 0; r <= ret.length; r++) {
	        				if (r === ret.length) {
	        					ret.push(obj);
	        					break;
	        				}
		        			var retWeight = widget.options.services[ret[r].get("service")].weight;
	        				if (objWeight >= retWeight) {
	        					ret.splice(r, 0, obj);
	        					break;
	        				}
	        			}
	        		}
	        	}
        	}
        	
        	return ret.reverse();
        },
        
        _defaultRender: function (objEntities) {
            var widget = this;
            
            // clear the container element
            $(widget.element).empty();
                        
            //rendering
            for (var p = 0; p < objEntities.length && p < widget.options.max_objects; p++) {
                var object = objEntities[p];
                var imgEntity = widget.options.vie.entities.get(object.get("object"));
                var image = $('<a class="' + widget.widgetBaseClass + '-image " target="_blank" href="' + imgEntity.get("image").getSubjectUri().replace(/[<>]/g, "") + '"></a>')
                    .append($("<img class=\"" + object.get("service") + "\" src=\"" + (imgEntity.getSubjectUri()).replace(/[<>]/g, "")  + "\" width=\"50px\" />"));
                $(widget.element).append(image);
            }
            return this;
        },
        
        _initOntology : function () {
        	//extend VIE with an ontological representation of the images
            var v = this.options.vie;
            if (!v.types.get("ImageObject")) {
            	//initialize the ontological rep. if not existing!
            	v.types.add("ImageObject").inherit("Thing");
            }
			if (v.types.get("ImageObject").attributes.get("about") === undefined) {
				v.types.get("ImageObject").attributes.add("about", ["Thing"]);
			}
			if (v.types.get("Thing").attributes.get("image").range.indexOf("ImageObject") === -1) {
				v.types.get("Thing").attributes.get("image").range.push("ImageObject");
        	}
			if (!v.types.get("VIEMediaObjectResult")) {
				v.types.add("VIEMediaObjectResult", [
				   {
				   "id"    : "query",
				   "range" : ["Text", "Thing"]
				   },
				   {
				   "id"    : "object",
				   "range" : ["Thing"]
				   },
				   {
				   "id"    : "service",
				   "range" : ["Text", "Thing"]
				   },
				   {
					"id"    : "time",
					"range" : "Date"
				   },
				   {
					"id"    : "entity",
					"range" : "Thing"
				   }]
				).inherit(v.types.get("Thing"));
			}
			if (!v.types.get("VIEImageResult")) {
				v.types.add("VIEImageResult", [
				   {
					"id"    : "object",
					"range" : "ImageObject"
				   }]
				).inherit(v.types.get("VIEMediaObjectResult"));
			}
			return this;
        },
             
        _triplifyObject : function (object, time, serviceId, entityId, queryId) {
        	var widget = this;
            var entity = widget.options.vie.entities.get(entityId);
            var imageId = "<" + object.original + ">";
            var imgEntity = this.options.vie.entities.addOrUpdate({
                '@subject' : imageId, 
                '@type'    : "ImageObject",
                "image"    : object.original
            });
            var attrs = {};
            if (object["thumbnail"]) {
	            var thumbnail = this.options.vie.entities.addOrUpdate({
	                '@subject' : "<" + object["thumbnail"] + ">", 
	                '@type'    : "ImageObject"});
            	attrs["thumbnail"] = thumbnail.getSubject();
            }
            if (object["height"])
            	attrs["height"] = object["height"];
            if (object["width"])
            	attrs["width"] = object["width"];
            
            attrs["about"] = entity.getSubjectUri();
            
            imgEntity.set(attrs);
            
            var imgResultEntity = this.options.vie.entities.addOrUpdate({
                '@type'    : "VIEImageResult",
                "time"     : time.toUTCString(),
                "query"    : queryId,
                "service"  : serviceId,
                "entity"   : entity.getSubject(),
                "object"   : imgEntity.getSubject()
            });
            entity.setOrAdd('image', imgEntity.getSubject());
        },
        
        _entityToUrlData : function (entity, serviceId) {
        	var widget = this;
            var service = widget.options.services[serviceId];
            
            entity = ($.isArray(entity))? entity[0] : [ entity ];
            entity = entity[0];

            var types = entity.get('@type');
            types = ($.isArray(types))? types : [ types ];
            
            for (var t = 0; t < types.length; t++) {
                var type = widget.options.vie.types.get(types[t]);
                if (type) {
                    var tsKeys = [];
                    for (var q in widget.options.ts_url) {
                        tsKeys.push(q);
                    }
                    //sort the keys in ascending order!
                    tsKeys = widget.options.vie.types.sort(tsKeys, false);
                    for (var q = 0; q < tsKeys.length; q++) {
                        var key = tsKeys[q];
                        if (type.isof(key) && 
                        		widget.options.ts_url[key][serviceId] && 
                        		widget.options.ts_url[key][serviceId].call(widget, entity, serviceId)) {
                        	var ret = {};
                            ret["url"] = widget.options.ts_url[key][serviceId].call(widget, entity, serviceId);
                            ret["data"] = (widget.options.ts_data[key] && widget.options.ts_data[key][serviceId])? 
                        			widget.options.ts_data[key][serviceId].call(widget, entity, serviceId) :
                        			undefined;
                            if (ret["url"]) {
                                return ret;
                            }
                        }
                    }
                } else {
                	widget._trigger('warn', undefined, {msg: "No such type known: '" + types[t] + "'"});
                }
            }
            return undefined;
        },
        
        options: {
            vie         : new VIE(),
            lang        : ["en"],
            timeout     : 10000,
            max_objects : 10,
            services    : {
            	'ookaboo' : {
            		use       : false,
            		weight    : 1.0,
                    base_url : "http://dev.iks-project.eu:8081",
                    _entityHubPath : "/entityhub/site/ookaboo/query",
                    tail_url  : undefined,
                    query : function (serviceId, entity, queryId) {
                    	var widget = this;
                    	var service = widget.options.services[serviceId];
                    	var ret = widget._entityToUrlData.call(widget, entity, serviceId);
                        
                    	if (ret && ret["url"]) {
                    		jQuery.ajax({
                        		url : ret["url"],
                        		data : JSON.stringify(ret["data"]),
                        		dataType : "application/json",
                        		contentType : "application/json",
                        		type : "POST",
                        		complete : service.callback(widget, entity.getSubjectUri(), serviceId, queryId)
                    		});
                    	} else {
                    		widget._trigger("error", undefined, {
                                 msg: "No type-specific URL can be acquired for entity. Please add/overwrite widget.options[\"Thing\"][" + serviceId + "]!", 
                                 id : entity.getSubjectUri(), 
                                 service : serviceId, 
                                 queryId : queryId});
                    	}
                    },
                    callback  : function (widget, entityId, serviceId, queryId) {
                        return function (data) {
                        	var objects = [];
                        	var service = widget.options.services[serviceId];
                            if (data && data.status === 200) {
                                var response = JSON.parse(data.responseText);
                                for (var r = 0; r < response.results.length; r++) {
                                	var res = response.results[r];
                                	for (var img = 0; img < res["http://schema.org/image"].length; img++) {
                                		var image = res["http://schema.org/image"][img];
	                                	var object = {
	                                		"weight" : (service.weight)? service.weight : 1.0,
                                			"original" : image.value
	                                	};
	                                	objects.push(object);
                                	}
                                }
                            }
                            var data = {entityId : entityId, serviceId: serviceId, queryId : queryId, time: new Date(), objects: objects};
                            widget._trigger('end_query', undefined, data);
                            widget.render(data);
                          };
                    }
            	},
                'gimage' : {
            		use       : false,
            		weight    : 1.0,
                    api_key   : undefined,
                    base_url  : "https://ajax.googleapis.com/ajax/services/search/images?v=1.0",
                    safe      : "active", //active,moderate,off
                    query : function (serviceId, entity, queryId) {
                    	var widget = this;
                    	var service = widget.options.services[serviceId];
                    	var ret = widget._entityToUrlData.call(widget, entity, serviceId);
                    	
                    	if (ret && ret["url"]) {
                    		jQuery.getJSON(ret["url"], service.callback(widget, entity.getSubjectUri(), serviceId, queryId));
                    	} else {
                    		widget._trigger("error", undefined, {
                                 msg: "No type-specific URL can be acquired for entity. Please add/overwrite widget.options[\"Thing\"][" + serviceId + "]!", 
                                 id : entity.getSubjectUri(), 
                                 service : serviceId, 
                                 queryId : queryId});
                    	}
                    },
                    tail_url  : function (widget, service) {
                        var url = "&safe=" + service.safe;                    
                        url += "&hl=" + widget.options["lang"][0];    
                        url += "&rsz=" + widget.options.max_objects;
                        url += "&start=0";
                        url += "&callback=?";
                        
                        return url;
                    },
                    callback  : function (widget, entityId, serviceId, queryId) {
                        return function (data) {
                        	var service = widget.options.services[serviceId];
                            var objects = [];
                            if (data && data.responseStatus === 200) {
                                var rData = data.responseData.results;
                                for (var r = 0; r < rData.length; r++) {
                                    var thumnail = rData[r].tbUrl;
                                    var original = rData[r].url;
                                    var context = rData[r].originalContextUrl;
                                    var title = rData[r].titleNoFormatting;
                                    var width = rData[r].width;
                                    var height = rData[r].height;
                                    
                                    var obj = {
                                		"weight" : (service.weight)? service.weight : 1.0,
                                        "thumbnail" : thumnail,
                                        "original" : original,
                                        "context" : context,
                                        "title" : title,
                                        "width" : width,
                                        "height" : height
                                    };
                                    objects.push(obj);
                                }
                            }
                            var data = {entityId : entityId, serviceId: serviceId, queryId : queryId, time: new Date(), objects: objects};
                            widget._trigger('end_query', undefined, data);
                            widget.render(data);
                          };
                    }
                },
                'flickr' : {
            		use       : false,
            		weight    : 1.0,
                    api_key   : undefined,
                    sort      : 'relevance',
                    safe      : 1,
                    base_url  : "http://api.flickr.com/services/rest/?method=flickr.photos.search",
                    query : function (serviceId, entity, queryId) {
                    	var widget = this;
                    	var service = widget.options.services[serviceId];
                    	var ret = widget._entityToUrlData.call(widget, entity, serviceId);
                    	
                    	if (ret && ret["url"]) {
                    		jQuery.getJSON(ret["url"], service.callback(widget, entity.getSubjectUri(), serviceId, queryId));
                    	} else {
                    		widget._trigger("error", undefined, {
                                 msg: "No type-specific URL can be acquired for entity. Please add/overwrite widget.options[\"Thing\"][" + serviceId + "]!", 
                                 id : entity.getSubjectUri(), 
                                 service : serviceId, 
                                 queryId : queryId});
                    	}
                    },
                    tail_url  : function (widget, service) {
                        var url = "&sort=" + service.sort;
                        url += "&per_page=" + widget.options.max_objects;
                        url += "&page=1";
                        url += "&api_key=" + service.api_key;
                        url += "&safe_search=" + service.safe; // safe search
                        url += "&extras=geo,media,url_m,url_z&format=json&jsoncallback=?";
                        
                        return url;
                    },
                    callback  : function (widget, entityId, serviceId, queryId) {
                        return function (data) {
                        	  var service = widget.options.services[serviceId];
                              var objects = [];
                              if (data.stat === 'ok' && data.photos.total > 0) {
                                  //put them into bins
                                  for (var i = 0; i < data.photos.photo.length; i++) {
                                      var photo = data.photos.photo[i];
                                      
                                      var obj = {
  	                                		  "weight" : (service.weight)? service.weight : 1.0,
                                              "thumbnail" : photo["url_m"],
                                              "original" : photo["url_z"],
                                              "height" : photo["height_z"],
                                              "width" : photo["width_z"],
                                              "latitude" : photo["latitude"],
                                              "longitude" : photo["longitude"]
                                      };
                                      objects.push(obj);
                                  }
                              }
                              var data = {entityId : entityId, serviceId: serviceId, queryId : queryId, time: new Date(), objects: objects};
                              widget._trigger('end_query', undefined, data);
                              widget.render(data);
                          };
                    }
                }
            },
            ts_url : {
                "Thing" : {
		        	'ookaboo' : function (entity, serviceId) {
		        		var widget = this;
		        		var service = widget.options.services[serviceId];
		        		
		        		var url = service.base_url.replace("\/$", "");
		        		url += service._entityHubPath;
		        		url += (service.tail_url)? service.tail_url(widget, service) : "";
		        		
		                return url;
		        	},
                    'flickr' : function (entity, serviceId) {
                    	var widget = this;
		        		var service = widget.options.services[serviceId];
		        		
                        var url = service.base_url.replace("\/$", "");
                        var name = VIE.Util.getPreferredLangForPreferredProperty(entity, ["name", "rdf:label"], widget.options.lang)
                        
                        if (name) {
                        	url += "&text=" + name; // *no* type-specific keywords
    		        		url += (service.tail_url)? service.tail_url(widget, service) : "";
                            return url;
                        } else {
                        	return undefined;
                        }
                    },
                    'gimage' : function (entity, serviceId) {
		        		var widget = this;
		        		var service = widget.options.services[serviceId];
		        		
                        var url = service.base_url.replace("\/$", "");
                        var name = VIE.Util.getPreferredLangForPreferredProperty(entity, ["name", "rdf:label"], widget.options.lang)
                        
                        if (name) {
                            url += "&q=" + name.replace(/ /g, '+'); // *no* type-specific keywords
    		        		url += (service.tail_url)? service.tail_url(widget, service) : "";
                            return url;
                        } else {
                        	return undefined;
                        }
                    }
                },
                "Person" : {
                    'flickr' : function (entity, serviceId) {
                    	var widget = this;
		        		var service = widget.options.services[serviceId];
		        		
                        var url = service.base_url.replace("\/$", "");
                        var name = VIE.Util.getPreferredLangForPreferredProperty(entity, ["name", "rdf:label"], widget.options.lang)
                        
                        if (name) {
                        	url += "&text=portrait " + name; // *no* type-specific keywords
    		        		url += (service.tail_url)? service.tail_url(widget, service) : "";
                            return url;
                        } else {
                        	return undefined;
                        }
                    },
                    'gimage' : function (entity, serviceId) {
		        		var widget = this;
		        		var service = widget.options.services[serviceId];
		        		
                        var url = service.base_url.replace("\/$", "");
                        var name = VIE.Util.getPreferredLangForPreferredProperty(entity, ["name", "rdf:label"], widget.options.lang)
                        
                        if (name) {
                        	url += "&imgtype=face"; // type-specific search for faces
                            url += "&q=" + name.replace(/ /g, '+');
    		        		url += (service.tail_url)? service.tail_url(widget, service) : "";
                            return url;
                        } else {
                        	return undefined;
                        }
                    }
                },
                "GeoCoordinates" : {
                    'flickr' : function (entity, serviceId) {
                    	var widget = this;
		        		var service = widget.options.services[serviceId];
		        		
                        var url = service.base_url.replace("\/$", "");
                        if (entity.has('latitude') && 
                                entity.has('longitude')) {
                        	var ts = Math.round((new Date()).getTime() / 1000);
                            var minUploadDate = ts - 604800 * 100; // last 100 weeks
                            var radius = 10;
                            var radiusUnits = "km";
                            
                            var lat = entity.get("latitude");
                            if ($.isArray(lat) && lat.length > 0) {
                                lat = lat[0]; //just take the first
                            }
                            var lon = entity.get("longitude");
                            if ($.isArray(lon) && lon.length > 0) {
                                lon = lon[0]; //just take the first
                            }
                            
                            url += "&lat=" + lat + "&lon=" + lon;
                            url += "&min_upload_date=" + minUploadDate;
                            url += "&radius=" + radius;
                            url += "&text=tourist attraction"; // type-specific keywords!
                            url += "&radius_units=" + radiusUnits;
                            
    		        		url += (service.tail_url)? service.tail_url(widget, service) : "";
                            return url;
                        } else {
                        	return undefined;
                        }
                    },
                    'gimage' : function (entity, serviceId) {
		        		return undefined;
                    }
                },
                "Place" : {
                    'flickr' : function (entity, serviceId) {
                    	var widget = this;
		        		var service = widget.options.services[serviceId];
		        		var url = service.base_url.replace("\/$", "");
		        		
                        var name = VIE.Util.getPreferredLangForPreferredProperty(entity, ["name", "rdf:label"], widget.options.lang)
                        
                        if (entity.has('geo')) {
                            var geo = entity.get("geo");
                            var ret = widget._entityToUrlData.call(widget, geo, serviceId);
                            if (ret && ret["url"]) {
                            	return ret["url"];
                            }
                        } else if (entity.has('containedIn')) {
                            var containedIn = entity.get('containedIn');
                            var ret = widget._entityToUrlData.call(widget, containedIn, serviceId);
                            if (ret && ret["url"]) {
                            	return ret["url"];
                            }
                        } else if (name) {
                        	url += "&text=tourist attraction " + name; // *no* type-specific keywords
    		        		url += (service.tail_url)? service.tail_url(widget, service) : "";
                            return url;
                        }
                        return undefined;
                    },
                    'gimage' : function (entity, serviceId) {
		        		var widget = this;
		        		var service = widget.options.services[serviceId];
		        		
                        var url = service.base_url.replace("\/$", "");
                        var name = VIE.Util.getPreferredLangForPreferredProperty(entity, ["name", "rdf:label"], widget.options.lang)
                        
                        if (name) {
                        	url += "&imgtype=photo"; // type-specific commands
                            url += "&q=" + name.replace(/ /g, '+');
    		        		url += (service.tail_url)? service.tail_url(widget, service) : "";
                            return url;
                        } else {
                        	return undefined;
                        }
                    }
                }
            },
            ts_data : {
            	"Thing" : {
            		'ookaboo' : function (entity, serviceId) {
                		var widget = this;
                		var service = widget.options.services[serviceId];
                		return {
                			   "ldpath": "@prefix oo : <http://rdf.ookaboo.com/object/>; schema:name = oo:label; schema:image = ^oo:depicts; owl:sameAs;",
                			   "constraints": [
                			       {
                			           "type": "reference",
                			           "field": "http://www.w3.org/2002/07/owl#sameAs",
                			           "value": entity.getSubjectUri(),
                			       }
                			   ],
                			   "offset": "0",
                			   "limit": widget.options.max_objects,
                			};
            		}
            	}
            },
            // helper
            render      : undefined,
            timer       : undefined,
            query_id    : 0,
            entity      : undefined,
            
            // events
            start_query : function () {},
            end_query   : function () {},
            warn        : function () {},
            error       : function () {}
        }
        
    });
})(jQuery);

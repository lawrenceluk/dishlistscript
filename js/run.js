Parse.initialize("dmq07tEG39xubkof59l2UyXnZJcojifl3jlYQ0af", "wHkRLFgELqtUWCAnoXKPdJi7pWfYMJnNisEhuNS2");
var Restaurant = Parse.Object.extend("Restaurant");
var Dish = Parse.Object.extend("Dish");
var auth = {
  // "hidden" keys hahaha
  consumerKey: "PYJ9fp4Zs357x8GKEcc2OA",
  consumerSecret: "Svw5yWnPK26_WYOrbkcvsC4PMNU",
  accessToken: "_o14KmTq969arSh-BdJBIHIBLanS3h2J",
  accessTokenSecret: "MLFvYopfLQVy8YWpN7WObb8u_EA",
  serviceProvider: {
    signatureMethod: "HMAC-SHA1"
  }
};
var accessor = {
  consumerSecret: auth.consumerSecret,
  tokenSecret: auth.accessTokenSecret
};

function makeLocuSearch(rname, address, parseobject) {
	var message = "https://api.locu.com/v1_0/venue/search/"
	var parameters = {
		name: rname,
		street_address: address,
		//api_key: "30cea3a865def155ddf7c9d321c4d7c14855c3b0" // lluk
		api_key: "4232cdc3ccb9ea2140dab81b36109d9532ae1bf0" // jenovaaqua
		// 7c23a8b8d7e1ec7e147e6e7a2cee9a55c3d24e07 // will
	};
	$.ajax({
	  'url': message,
	  'data': parameters,
	  'cache': true,
	  'dataType': 'jsonp',
	  'success': function(data, textStats, XMLHttpRequest) {
	   	if (data.objects.length == 0 || data.objects[0].has_menu == false) {
	   		show(rname+" does not have an entry with Locu.");
	   	} else {
	   		show("<span class='greenish'>"+rname+" has a menu listed with Locu.</span>");
	   		getMenuFromLocu(data.objects[0].id, parseobject);
	   	}
	  }
	});
}

var getMenuFromLocu = function(id, parserestaurant) {
	var base = "https://api.locu.com/v1_0/venue/"+id+"/";
	var parameters = {
		//api_key: "30cea3a865def155ddf7c9d321c4d7c14855c3b0" // lluk
		api_key: "4232cdc3ccb9ea2140dab81b36109d9532ae1bf0" // jenovaaqua
		// 7c23a8b8d7e1ec7e147e6e7a2cee9a55c3d24e07 // will
	};
	$.ajax({
	  'url': base,
	  'data': parameters,
	  'cache': true,
	  'dataType': 'jsonp',
	  'success': function(data, textStats, XMLHttpRequest) {
	  	//console.log(data.objects[0].menus);
	   	var menu = data.objects[0].menus;
	   	for (var section=0;section<menu.length;section++) {
	   		var itemsonly = [];
				getItems(menu[section].sections, itemsonly);
				//console.log(itemsonly);
				show(parserestaurant.attributes.name+": Retrieved "+itemsonly.length+" dishes from Locu.");
				for (var dd=0;dd<itemsonly.length;dd++) {
					addDishToParse(itemsonly[dd], parserestaurant);
				}
				show("Saving to Parse. Please wait, this might take a while...");
	   	}
	  },
	  'error': function(error) {
	  	console.log("Error: "+error);
	  }
	});
}

var addDishToParse = function(dish, parserestaurant) {
	var d = new Dish();
	if (!dish.price)
		dish.price = -1;
  d.save(
  	{
  		name: dish.name,
  		description: dish.description,
  		price: dish.price.toString(),
  		restaurant: parserestaurant
  	}, 
	  {
	  success: function(object) {
	  	showDish(parserestaurant.attributes.name+" : "+object.attributes.name);
	  },
	  error: function(model, error) {
	    console.log("Error: "+JSON.stringify(error));
	  }
	});
}

// recursively gets the dishes from the stupid hierarchical menu
function getItems(section, results) {
    for (var i=0;i<section.length;i++) {
        var value = section[i];
        if (typeof value === 'array') {
            getItems(value, results);
        } else if (typeof value == 'object') {
        	if (value.subsections) {
        		getItems(value.subsections, results);
        	} else if (value.contents) {
        		getItems(value.contents, results);
        	} else if (value.type && value.type=="ITEM") {
        		results.push({
        			name: value.name,
        			description: value.description,
        			price: value.price
        		});
        	}
        }
    }
    return results;
}

function makeSearch(terms, location) {
	var parameters = [];
	parameters.push(['limit', 5]);
	parameters.push(['term', terms]);
	parameters.push(['location', location]);
	parameters.push(['callback', 'cb']);
	parameters.push(['oauth_consumer_key', auth.consumerKey]);
	parameters.push(['oauth_consumer_secret', auth.consumerSecret]);
	parameters.push(['oauth_token', auth.accessToken]);
	parameters.push(['oauth_signature_method', 'HMAC-SHA1']);
	var message = {
	  'action': 'http://api.yelp.com/v2/search',
	  'method': 'GET',
	  'parameters': parameters
	};
	OAuth.setTimestampAndNonce(message);
	OAuth.SignatureMethod.sign(message, accessor);
	var parameterMap = OAuth.getParameterMap(message.parameters);
	parameterMap.oauth_signature = OAuth.percentEncode(parameterMap.oauth_signature)
	$.ajax({
	  'url': message.action,
	  'data': parameterMap,
	  'cache': true,
	  'dataType': 'jsonp',
	  'jsonpCallback': 'cb',
	  'success': function(data, textStats, XMLHttpRequest) {
	   	var bs = data.businesses;
	   	show("Yelp retrieved "+bs.length+" locations:");
	   	for (var i=0;i<bs.length;i++) {
	   		// set up for a save
	   		var loc = bs[i].location;
	   		var long_addr = "";
	   		for (var l=0;l<loc.display_address.length;l++) {
	   			long_addr += loc.display_address[l]+", ";
	   		}
	   		long_addr = long_addr.substring(0, long_addr.length-2);
	   		// check if it already exists
	   		checkExists(bs[i], long_addr);
	   	}
	  }
	});
}
checkExists = function(bb, uniq) {
	var query = new Parse.Query(Restaurant);
	var exists = 0;
	query.equalTo("full_address", uniq);
	show("Constructed query for "+bb.name);
	query.find({
	  success: function(results) {
	  	//show(bb.name+" exists: "+(results.length!=0));
	  	// add a new place
	    if (results.length > 0) {
	    	show(results[0].attributes.name+" exists in the database.");
	    	exists = 1;
	    } else {
	    	addToParse(bb);
	    }
	  },
	  error: function(error) {
	    console.log("Error: " + error.code + " " + error.message);
	  }
	});
}

addToParse = function(bb) {
	show("<span class='greenish'>"+bb.name+" isn't in the database. Adding...</span>");
	var cats = "";
	var disp_cats = "";
	var cat = bb.categories;
	for (var c=0;c<cat.length;c++) {
		disp_cats += cat[c][0]+", ";
		cats += cat[c][1]+", ";
	}
	cats = cats.substring(0, cats.length-2);
	disp_cats = disp_cats.substring(0, disp_cats.length-2);
	var loc = bb.location;
	var short_addr = loc.address[0]+", "+loc.city;
	var long_addr = "";
	for (var l=0;l<loc.display_address.length;l++) {
		long_addr += loc.display_address[l]+", ";
	}
	long_addr = long_addr.substring(0, long_addr.length-2);
	var neg = "";
	if (loc.neighborhoods) neg = loc.neighborhoods[0];

	var r = new Restaurant();
	saveRestaurant(r, bb, disp_cats, cats, neg, short_addr, long_addr);
}

function saveRestaurant(r, bb, disp_cats, cats, neg, short_addr, long_addr) {
	 r.save(
  	{
  		name: bb.name,
  		rating: bb.rating,
  		review_count: bb.review_count,
  		yelp_image_url: bb.image_url,
  		display_yelp_categories: disp_cats,
  		yelp_categories: cats,
  		display_phone_number: bb.display_phone,
  		phone_number: bb.phone,
  		closed: bb.is_closed,
  		neighborhood: neg,
  		short_address: short_addr,
  		full_address: long_addr
  	}, 
	  {
	  success: function(object) {
	  	show(object.attributes.name+" saved to Parse. Checking for menu...");
	  	makeLocuSearch(object.attributes.name, object.attributes.short_address.split(",")[0], r); 
	  },
	  error: function(model, error) {
	    show("Error: "+error);
	  }
	});
}

var OUT = $("#output");
var OUT2 = $("#dishoutput1");
var OUT3 = $("#dishoutput2");
var s1 = $("#searchbox1");
var s2 = $("#searchbox2");
var time = Date.now();

function show(str) {
	OUT.append("<span class='d'>"+((Date.now()-time)/1000).toFixed(3)+"</span> : "+str+"<br />");
	$("html, body").scrollTop($(document).height());
}

function showDish(str) {
	OUT2.html("<span class='d'>"+((Date.now()-time)/1000).toFixed(3)+"</span><span class='greenish'> Saved dish: "+str+"</span>");
	OUT3.html("<span class='d'>"+((Date.now()-time)/1000).toFixed(3)+"</span><span class='greenish'> Saved dish: "+str+"</span>");
}

show("Initialized.");
//makeSearch("dinner", "La+Jolla");

$("#gobutton").click(function() {
	time = Date.now();
	OUT.html("");
	OUT2.html("");
	OUT3.html("");
	show("Initialized.");
	if (s1.val().length == 0 || s2.val().length == 0) {
		show("Invalid query.");
	} else {
		$("#gobutton").addClass("hide");
		$("#important").removeClass("hide");
		setTimeout(function() {
			$("#gobutton").removeClass("hide");
			$("#important").addClass("hide");
		}, 10000);
		makeSearch(s1.val(), s2.val());
	}
});
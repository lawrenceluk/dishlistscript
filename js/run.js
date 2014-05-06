Parse.initialize("dmq07tEG39xubkof59l2UyXnZJcojifl3jlYQ0af", "wHkRLFgELqtUWCAnoXKPdJi7pWfYMJnNisEhuNS2");
var Restaurant = Parse.Object.extend("Restaurant");
var auth = {
  //
  // Update with your auth tokens.
  //
  consumerKey: "PYJ9fp4Zs357x8GKEcc2OA",
  consumerSecret: "Svw5yWnPK26_WYOrbkcvsC4PMNU",
  accessToken: "_o14KmTq969arSh-BdJBIHIBLanS3h2J",
  // This example is a proof of concept, for how to use the Yelp v2 API with javascript.
  // You wouldn't actually want to expose your access token secret like this in a real application.
  accessTokenSecret: "MLFvYopfLQVy8YWpN7WObb8u_EA",
  serviceProvider: {
    signatureMethod: "HMAC-SHA1"
  }
};
var accessor = {
  consumerSecret: auth.consumerSecret,
  tokenSecret: auth.accessTokenSecret
};

function makeSearch(terms, location) {
	var parameters = [];
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
	   		//show(bb.name+" ("+bb.rating+"/5 in "+bb.review_count+" reviews)");
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
	  	show(object.attributes.name+" saved to Parse.");
	  	console.log(object);
	  },
	  error: function(model, error) {
	    show("Error: "+error);
	  }
	});
}

var OUT = $("#output");
var s1 = $("#searchbox1");
var s2 = $("#searchbox2");
var time = Date.now();

function show(str) {
	OUT.append("<span class='d'>"+((Date.now()-time)/1000).toFixed(3)+"</span> : "+str+"<br />");
}

show("Initialized.");
//makeSearch("dinner", "La+Jolla");

$("#gobutton").click(function() {
	time = Date.now();
	OUT.html("");
	$("#gobutton").addClass("hide");
	show("Initialized.");
	if (s1.val().length == 0 || s2.val().length == 0) {
		show("Invalid query.");
	} else {
		makeSearch(s1.val(), s2.val());
	}
	setTimeout(function() {
		$("#gobutton").removeClass("hide");
	}, 2000);
});
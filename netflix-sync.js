$=jQuery;

if(!document.location.href.startsWith("https://www.netflix.com/viewingactivity")) {
	alert("This sync script must be injected into the the netflix activity page.");
	throw("This sync script must be injected into the the netflix activity page.");
}
if($(".trakt-dialog").length > 0) {
	alert("This sync script was already executed. Please reload the page and try again.");
	throw("This sync script was already executed. Please reload the page and try again.");
}

// Load the list of watched shows from netflix.
var watched = $(".retableRow").map(function() {
	var date = $(".date", this).text();
	var text = $(".title", this).text();
	text = text.replace(": Part ", " - Part ");
	if(text.indexOf("Mystery Science Theater 3000: The Return: Season ") !== false)
		text = text.replace(": The Return: Season ", ": Season 1");
	
	var [show, season, title] = text.split(/: Season |: Series |: Collection |: "/);
	var isShow = !title ? false : true;
	title = isShow ? title.replace(/^(.*)"$/, "$1") : $(".title", this).text();
	season = parseInt(season);
	
	show = show.replace(" (U.S.)", "");
	date = decode_date(date);

	return {
		item: $(this),
		date: date,
		isShow: isShow,
		show: show,
		season: season,
		title: title
	};
});

//Posibly enumberate episode # for series

// Convert netflix date.
function decode_date(date_str) {
	var [month, day, year] = date_str.split("/");
	year = parseInt(year) > parseInt(new Date().getFullYear().toString().substring(2)) ? year : "20" + year;
	return new Date(year, month - 1, day);
}

// Record the oldest date in netflix history so we don't loade more then we need from trakt.
var start_date = watched.last()[0].date;
start_date = new Date(start_date - (86400 * 1000 * 7));

// Get authentication status.
var has_access_token = document.cookie.search(/access_token/) >= 0;
var has_refresh_token = document.cookie.search(/refresh_token/) >= 0;
var has_code = window.location.search.search((/code=[^&]+/)) >= 0;

// Store new watches.
var watched_history;

// Prompt for trakt.tv login.
if (!has_access_token && !has_refresh_token && !has_code)
	window.location = "https://trakt.tv/oauth/authorize?response_type=code&client_id=c14f3c7ac7b41e9f45cb07b4d314b454647c36365d32d151cf8193e5ff3b2fd8&redirect_uri=https%3A%2F%2Fwww.netflix.com%2Fviewingactivity";

// Run the tool.
else if (has_access_token) {
	do_setup();
	do_scrape();
} else if (has_refresh_token || has_code) {
	// Re-authenticate with trakt.tv.
	if (has_refresh_token)
		var body = {
			'refresh_token': document.cookie.replace(/^.*refresh_token=([^;]+).*$/, "$1"),
			'client_id': 'c14f3c7ac7b41e9f45cb07b4d314b454647c36365d32d151cf8193e5ff3b2fd8',
			'client_secret': '77136073644c3ed408c32633a6bfe274112fd306dbd5de161c404ee7b65af784',
			'redirect_uri': 'https://www.netflix.com/viewingactivity',
			'grant_type': 'refresh_token'
		};
	// Get access token from trakt.tv.
	else if (has_code)
		var body = {
			'code': window.location.search.replace(/^.*code=([^&]+).*$/, "$1"),
			'client_id': 'c14f3c7ac7b41e9f45cb07b4d314b454647c36365d32d151cf8193e5ff3b2fd8',
			'client_secret': '77136073644c3ed408c32633a6bfe274112fd306dbd5de161c404ee7b65af784',
			'redirect_uri': 'https://www.netflix.com/viewingactivity',
			'grant_type': 'authorization_code'
		};
	
	$.post("https://api.trakt.tv/oauth/token", body, function(data) {
		console.log("Sucessfully Authenticated");
		//access_token, token_type, expires_in, refresh_token, scope, created_at
		document.cookie = "access_token=" + data.access_token + "; expires=" + new Date((data.created_at + data.expires_in) * 1000).toUTCString();
		document.cookie = "refresh_token=" + data.refresh_token + "; expires=" + new Date((data.created_at + (data.expires_in * 4)) * 1000).toUTCString();
		do_setup();
		do_scrape();
	});
} else
	alert("Unexpected error authenticating.");

// Configure default ajax settings.
function do_setup() {
	$.ajaxSetup({
		async: true,
		dataType: "json",
		contentType: "application/json",
		headers: {
			"Authorization": "Bearer " + document.cookie.replace(/^.*access_token=([^;]+).*$/, "$1"),
			"trakt-api-version": 2,
			"trakt-api-key": "c14f3c7ac7b41e9f45cb07b4d314b454647c36365d32d151cf8193e5ff3b2fd8"
		}
	});
	create_dialog();
}

// Remove special charectors and other bit to simplify title matching.
function clean_title(title, remove_parts) {
	if (remove_parts)
		return title.replace("&", "and").replace(/ \(\d+\)$|: Part \d+$| - Part \d+$/, "").toLowerCase().replace(/\W/g, "");
	else
		return title.replace("&", "and").replace(/ \((\d+)\)$/, " - Part $1").toLowerCase().replace(/\W/g, "");
}

function add_episode(row, item) {
	if(row.isShow) {
		var title = $(".title a:first-child", row.item);
		if(title.text().indexOf(": Episode ") == -1)
			title.text(title.text() + ": Episode " + item.episode.number);
	}
}

function add_link(row, item) {
	if($(".title a.open-link", row.item).length > 0)
		return;
	var title = $(".title a:first-child", row.item);
	var url = row.isShow ? "https://trakt.tv/shows/"+item.show.ids.slug+"/seasons/"+item.episode.season+"/episodes/"+item.episode.number : "https://trakt.tv/movies/"+item.movie.ids.slug;
	var link = $("<a>")
		.attr("href", url)
		.attr("target", "trakt")
		.addClass("open-link")
		.html(" &mdash; Trakt.tv");
	link.insertAfter(title);
}

function create_dialog() {
	var dialog = $("<div class='trakt-dialog' draggable='true'>\
	<h1>Trakt.tv Sync<span class='nf-spinner'></span></h1>\
	<div class='trakt-missing-trakt'>\
	<h2>Unknown Plays in Trakt.tv</h2>\
	<p>You can drag items below to match them to a play.</p>\
	<ul class='list'></ul>\
	<p class='no-errors'>There are no unknown plays.</p>\
	</div><hr />\
	<div class='trakt-missing-netflix'>\
	<h2>Unknown Plays in Netflix</h2>\
	<p>You can specify a episode number to correct these.</p>\
	<ul class='list'></ul>\
	<p class='no-errors'>There are no unknown plays.</p>\
	</div><hr />\
	<div class='trakt-to-sync'>\
	<h2>Data to Sync</h2>\
	<p>This shows a list of the new play's to sync.</p>\
	<ul class='list'></ul>\
	<p class='no-data'>There is no data to sync.</p>\
	<button class='trakt-do-close btn btn-gray btn-small'>Close</button>\
	<button class='trakt-do-sync btn btn-blue btn-small' disabled='disabled'>Sync Now</button>\
	</div>\
	<div class='trakt-sync-results hidden'><hr />\
	<h2>Sync Results</h2>\
	<p><span class='added-episodes'></span> episodes and <span class='added-movies'></span> movies were synced.</p>\
	<p><span class='404-episodes'></span> episodes and <span class='404-movies'></span> movies had unexpected errors.</p>\
	</div>\
	</div>");
	
	dialog.appendTo($("body"));
	
	$(".trakt-do-close").click(function() {
		dialog.hide();
	});
	$(".trakt-do-sync").click(function() {
		if($(this).is(":disabled"))
			return;
		do_track(watched_history);
	});
}

// Process the trakt history and disable any matched show from being synced.
function do_scrape() {
	$.get("https://api.trakt.tv/sync/history?limit=1000000", function(data) {
		$.each(data, function() {
			var item = this;
			if (item.action == "scrobble" || new Date(item.watched_at) < start_date) 
				return;

			// Get a list of watched items from the netflix list.
			var matches = watched.filter(function() {
				if (item.type == "episode" && this.isShow) {
					return clean_title(item.show.title) == clean_title(this.show) &&
						item.episode.season == this.season &&
						clean_title(item.episode.title) == clean_title(this.title) && // Needs extra matching for Part inconstencies.
						this.date.getFullYear().toString() == item.watched_at.substring(0, 4);
				} else if (item.type == "movie" && !this.isShow) {
					return clean_title(item.movie.title) == clean_title(this.title) &&
						this.date.getFullYear().toString() == item.watched_at.substring(0, 4);
				}

				return false;
			});
			// If no matches try match without Part text.
			if (matches.length == 0 && item.type == "episode") {
				matches = watched.filter(function() {
					if (item.type == "episode" && this.isShow) {
						return clean_title(item.show.title) == clean_title(this.show) &&
						item.episode.season == this.season &&
						clean_title(item.episode.title, true) == clean_title(this.title, true) &&
						this.date.getFullYear().toString() == item.watched_at.substring(0, 4);
					}
					return false;
				});
			}
			
			if (matches.length > 0)
				matches.each(function() {
					this.item.data("item-was-synced", true).addClass("item-was-synced");
					add_episode(this, item);
					add_link(this, item);
				});
			else {
				if (item.type == "episode")
					$("<li draggable='true'>")
						.text([new Date(item.watched_at).toLocaleDateString(), item.show.title, item.episode.season, item.episode.title].join(", "))
						.appendTo($(".trakt-dialog .trakt-missing-trakt .list"));
				else if (item.type == "movie")
					$("<li draggable='true'>")
						.text([new Date(item.watched_at).toLocaleDateString(), item.movie.title].join(", "))
						.appendTo($(".trakt-dialog .trakt-missing-trakt .list"));
			}
		});
		
		$(".trakt-dialog .trakt-missing-trakt .no-errors").toggleClass("hidden", $(".trakt-dialog .trakt-missing-trakt .list").length > 0);

		do_sync();
	});
}

function do_sync() {
	// We need to disable parallel requests to that season's and show's aren't repeatedly loaded.
	$.ajaxSetup({
		async: false
	});
	var que_count = 0;
	var que_done = false;
	var watched_movies = [];
	var watched_shows = [];
	var show_cache = [];

	watched.each(function() {
		var item = this;

		if (this.item.data("item-was-synced") == true)
			return;

		que_count++;

		if (this.isShow) {
			var load_show = $.Deferred();

			if (show_cache[item.show])
				load_show.resolve();
			else
				$.get("https://api.trakt.tv/search/show?query=" + item.show.replace(/(?!\s)\W/g, "") + "&field=title", function(data) {
					console.log("Loaded: " + data[0].show.title);
					show_cache[item.show] = data[0].show;
					show_cache[item.show].seasons = [];
					load_show.resolve();
				});

			load_show.done(function() {
				var show = show_cache[item.show];

				var load_season = $.Deferred();

				if (show.seasons.filter(function(self) {
						return self.number == item.season;
					}).length == 1)
					load_season.resolve();
				else
					$.get("https://api.trakt.tv/shows/" + show.ids.slug + "/seasons/" + item.season, function(data) {
						show.seasons.push({
							'number': item.season,
							'episodes': data
						});
						load_season.resolve();
					});

				load_season.done(function() {
					var season = show.seasons.filter(function(self) {
						return self.number == item.season;
					})[0];

					var episode = season.episodes.filter(function(self) {
						if (item.title.match(/^Episode \d+$/))
							return item.title.endsWith(" " + self.number);
						if(self.title == null)
							return false;
						return clean_title(self.title) == clean_title(item.title);
					});
					
					// If episode not found try searching without the Part sufix or failing that be watched order.
					if (episode.length == 0) {
						episode = season.episodes.filter(function(self) {
							return clean_title(self.title, true) == clean_title(item.title, true);
						});
					}

					if (episode.length == 1) {
						if (!episode[0].watched_at) {
							console.log("Record: " + [show.title, episode[0].title].join(", "));

							item.item.data("new-recorded", true).addClass("new-recorded");
							episode[0].watched_at = item.date.toJSON();
							$("<li draggable='true' title='" + item.title + "'>")
								.text([new Date(item.date).toLocaleDateString(), show.title, season.number, episode[0].title].join(", "))
								.appendTo($(".trakt-dialog .trakt-to-sync .list"));

							var temp_show = watched_shows.filter(function(self) {
								return self.ids.slug == show.ids.slug
							});
							if (temp_show.length == 0) {
								temp_show = [JSON.parse(JSON.stringify(show))];
								temp_show[0].seasons = [];
								watched_shows.push(temp_show[0]);
							}
							var temp_season = temp_show[0].seasons.filter(function(self) {
								return self.number == season.number
							});
							if (temp_season.length == 0) {
								temp_season = [{
									'number': season.number,
									'episodes': []
								}];
								temp_show[0].seasons.push(temp_season[0]);
							}
							var temp_episode = temp_season[0].episodes.filter(function(self) {
								return self.number == episode[0].number
							});
							if (temp_episode.length == 0) {
								temp_episode = [{
									'number': episode[0].number,
									'watched_at': episode[0].watched_at
								}];
								temp_season[0].episodes.push(temp_episode[0]);
							}
						} else {
							item.item.data("is_duplicate", true).addClass("is_duplicate");
						}
					}

					que_count--;
					if (que_count == 0 && que_done)
						do_sync_done(watched_movies, watched_shows);
				});

			});

		} else if (!this.isShow) {
			$.get("https://api.trakt.tv/search/movie?query=" + this.title + "&field=title", function(data) {
				if(data[0] == null) {
					console.log("Coudn't find movie: " + this);
					return;
				}

				console.log("Record: " + [data[0].movie.title].join(", "));
				
				item.item.data("new-recorded", true).addClass("new-recorded");
				data[0].movie.watched_at = item.date.toJSON();
				watched_movies.push(data[0].movie);
				$("<li draggable='true'>")
					.text([new Date(item.date).toLocaleDateString(), data[0].movie.title].join(", "))
					.appendTo($(".trakt-dialog .trakt-to-sync .list"));

				que_count--;
				if (que_count == 0 && que_done)
					do_sync_done(watched_movies, watched_shows);
			});
		}
	});

	que_done = true;
	if (que_count == 0 && que_done)
		do_sync_done(watched_movies, watched_shows);
}

function do_sync_done(watched_movies, watched_shows) {
	$(".trakt-dialog .trakt-to-sync .no-data").toggleClass("hidden", $(".trakt-dialog .trakt-to-sync .list").length > 0);
	
	var missing = watched.filter(function() {
		return this.item.data("new-recorded") != true && this.item.data("item-was-synced") != true;
	});
	
	$.each(missing, function() {
		var item = this;
		if (item.isShow)
			$("<li draggable='true'>")
				.text([new Date(item.date).toLocaleDateString(), item.show, item.season, item.title].join(", "))
				.appendTo($(".trakt-dialog .trakt-missing-netflix .list"));
		else
			$("<li draggable='true'>")
				.text([new Date(item.date).toLocaleDateString(), item.title].join(", "))
				.appendTo($(".trakt-dialog .trakt-missing-netflix .list"));
	});

	$(".trakt-dialog .trakt-missing-netflix .no-errors").toggleClass("hidden", $(".trakt-dialog .trakt-missing-netflix .list").length > 0);
	
	$(".trakt-do-sync").attr('disabled', null);
	$(".trakt-dialog .nf-spinner").hide();
	
	watched_history = {
		'movies': watched_movies,
		'shows': watched_shows
	};
}

function do_track(watched_history) {
	$(".trakt-do-sync").attr('disabled', 'disabled');
	console.log(watched_history);
	$.post("https://api.trakt.tv/sync/history", JSON.stringify(watched_history), function(data) {
		console.log(data);
		
		$(".trakt-dialog .trakt-sync-results").show();
		$(".trakt-dialog .trakt-sync-results .episodes-added").text(data.added.episodes);
		$(".trakt-dialog .trakt-sync-results .movies-added").text(data.added.movies);
		$(".trakt-dialog .trakt-sync-results .episodes-added").text(data.not_found.episodes.length);
		$(".trakt-dialog .trakt-sync-results .movies-added").text(data.not_found.movies.length);
	});
}
